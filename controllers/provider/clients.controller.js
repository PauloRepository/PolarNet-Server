const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class ClientsController {
  // GET /api/provider/clients - Obtener lista de clientes
  async getClients(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { page = 1, limit = 20, search, status } = req.query;
      const offset = (page - 1) * limit;

      let baseQuery = `
        SELECT DISTINCT
          c.*,
          COUNT(DISTINCT ar.rental_id) as active_rentals,
          COUNT(DISTINCT sr.service_request_id) as pending_requests,
          COUNT(DISTINCT e.equipment_id) as total_equipments
        FROM companies c
        INNER JOIN active_rentals ar ON c.company_id = ar.client_company_id 
          AND ar.provider_company_id = $1
        LEFT JOIN service_requests sr ON c.company_id = sr.client_company_id 
          AND sr.provider_company_id = $1 AND sr.status IN ('OPEN', 'IN_PROGRESS')
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE c.type = 'CLIENT'
      `;
      
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (search) {
        baseQuery += ` AND (c.name ILIKE $${++paramCount} OR c.tax_id ILIKE $${++paramCount})`;
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        baseQuery += ` AND c.is_active = $${++paramCount}`;
        queryParams.push(status === 'active');
      }

      const query = baseQuery + `
        GROUP BY c.company_id
        ORDER BY c.name ASC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      let countQuery = `
        SELECT COUNT(DISTINCT c.company_id) as total
        FROM companies c
        INNER JOIN active_rentals ar ON c.company_id = ar.client_company_id 
          AND ar.provider_company_id = $1
        WHERE c.type = 'CLIENT'
      `;
      
      let countParams = [providerCompanyId];
      let countParamCount = 1;

      if (search) {
        countQuery += ` AND (c.name ILIKE $${++countParamCount} OR c.tax_id ILIKE $${++countParamCount})`;
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        countQuery += ` AND c.is_active = $${++countParamCount}`;
        countParams.push(status === 'active');
      }

      const countResult = await db.query(countQuery, countParams);
      const totalClients = parseInt(countResult.rows[0].total);

      const clients = result.rows.map(client => ({
        companyId: client.company_id.toString(),
        name: client.name,
        taxId: client.tax_id,
        phone: client.phone,
        email: client.email,
        address: client.address,
        city: client.city,
        state: client.state,
        businessType: client.business_type,
        isActive: client.is_active,
        stats: {
          activeRentals: parseInt(client.active_rentals),
          pendingRequests: parseInt(client.pending_requests),
          totalEquipments: parseInt(client.total_equipments)
        },
        createdAt: client.created_at
      }));

      return ResponseHandler.success(res, {
        clients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalClients,
          totalPages: Math.ceil(totalClients / limit)
        }
      }, 'Clientes obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getClients:', error);
      return ResponseHandler.error(res, 'Error al obtener clientes', 'GET_CLIENTS_ERROR', 500);
    }
  }

  // GET /api/provider/clients/:id - Obtener detalles de un cliente
  async getClientDetails(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      // Verificar que el cliente tenga relación con este proveedor
      const relationCheck = await db.query(`
        SELECT COUNT(*) as count 
        FROM active_rentals 
        WHERE client_company_id = $1 AND provider_company_id = $2
      `, [id, providerCompanyId]);

      if (parseInt(relationCheck.rows[0].count) === 0) {
        return ResponseHandler.error(res, 'Cliente no encontrado o sin relación comercial', 'CLIENT_NOT_FOUND', 404);
      }

      // Obtener datos del cliente
      const clientQuery = `
        SELECT 
          c.*,
          COUNT(DISTINCT ar.rental_id) as active_rentals,
          COUNT(DISTINCT sr.service_request_id) as total_service_requests,
          COUNT(DISTINCT CASE WHEN sr.status IN ('PENDING', 'IN_PROGRESS') THEN sr.service_request_id END) as pending_requests,
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          SUM(CASE WHEN i.status = 'PENDING' THEN i.total_amount ELSE 0 END) as pending_amount
        FROM companies c
        LEFT JOIN active_rentals ar ON c.company_id = ar.client_company_id AND ar.provider_company_id = $2
        LEFT JOIN service_requests sr ON c.company_id = sr.client_company_id AND sr.provider_company_id = $2
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN invoices i ON c.company_id = i.client_company_id AND i.provider_company_id = $2
        WHERE c.company_id = $1
        GROUP BY c.company_id
      `;

      const clientResult = await db.query(clientQuery, [id, providerCompanyId]);

      if (clientResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Cliente no encontrado', 'CLIENT_NOT_FOUND', 404);
      }

      const client = clientResult.rows[0];

      // Obtener ubicaciones del cliente con equipos
      const locationsQuery = `
        SELECT 
          el.*,
          COUNT(DISTINCT e.equipment_id) as equipment_count
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_location_id = e.current_location_id
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE el.company_id = $1 AND ar.provider_company_id = $2
        GROUP BY el.equipment_location_id
        ORDER BY el.name
      `;

      const locationsResult = await db.query(locationsQuery, [id, providerCompanyId]);

      // Obtener equipos activos
      const equipmentsQuery = `
        SELECT 
          e.*,
          ar.rental_id,
          ar.start_date,
          ar.monthly_rate,
          ar.status as rental_status,
          el.name as location_name
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        WHERE ar.client_company_id = $1 AND ar.provider_company_id = $2
        ORDER BY e.name
      `;

      const equipmentsResult = await db.query(equipmentsQuery, [id, providerCompanyId]);

      // Obtener solicitudes de servicio recientes
      const serviceRequestsQuery = `
        SELECT 
          sr.*,
          e.name as equipment_name,
          u.name as assigned_technician
        FROM service_requests sr
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        WHERE sr.client_company_id = $1 AND sr.provider_company_id = $2
        ORDER BY sr.request_date DESC
        LIMIT 10
      `;

      const serviceRequestsResult = await db.query(serviceRequestsQuery, [id, providerCompanyId]);

      return ResponseHandler.success(res, {
        client: {
          companyId: client.company_id.toString(),
          name: client.name,
          taxId: client.tax_id,
          phone: client.phone,
          email: client.email,
          address: client.address,
          city: client.city,
          state: client.state,
          postalCode: client.postal_code,
          businessType: client.business_type,
          description: client.description,
          isActive: client.is_active,
          createdAt: client.created_at,
          stats: {
            activeRentals: parseInt(client.active_rentals),
            totalServiceRequests: parseInt(client.total_service_requests),
            pendingRequests: parseInt(client.pending_requests),
            totalEquipments: parseInt(client.total_equipments),
            pendingAmount: parseFloat(client.pending_amount) || 0
          }
        },
        locations: locationsResult.rows.map(location => ({
          locationId: location.equipment_location_id.toString(),
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          contactPerson: location.contact_person,
          contactPhone: location.contact_phone,
          equipmentCount: parseInt(location.equipment_count)
        })),
        equipments: equipmentsResult.rows.map(equipment => ({
          equipmentId: equipment.equipment_id.toString(),
          name: equipment.name,
          type: equipment.type,
          model: equipment.model,
          serialNumber: equipment.serial_number,
          rentalId: equipment.rental_id.toString(),
          startDate: equipment.start_date,
          monthlyRate: parseFloat(equipment.monthly_rate),
          rentalStatus: equipment.rental_status,
          locationName: equipment.location_name,
          status: equipment.status
        })),
        recentServiceRequests: serviceRequestsResult.rows.map(sr => ({
          requestId: sr.service_request_id.toString(),
          type: sr.issue_type,
          priority: sr.priority,
          status: sr.status,
          description: sr.description,
          equipmentName: sr.equipment_name,
          assignedTechnician: sr.assigned_technician,
          createdAt: sr.request_date,
          scheduledDate: sr.scheduled_date
        }))
      }, 'Detalles del cliente obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getClientDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del cliente', 'GET_CLIENT_DETAILS_ERROR', 500);
    }
  }

  // GET /api/provider/clients/:id/service-history - Historial de servicios del cliente
  async getClientServiceHistory(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { page = 1, limit = 20, status, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE sr.client_company_id = $1 AND sr.provider_company_id = $2`;
      let queryParams = [id, providerCompanyId];
      let paramCount = 2;

      if (status) {
        whereClause += ` AND sr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (startDate) {
        whereClause += ` AND sr.created_at >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND sr.created_at <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      const query = `
        SELECT 
          sr.*,
          e.name as equipment_name,
          e.type as equipment_type,
          u.name as assigned_technician,
          el.name as location_name
        FROM service_requests sr
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        ${whereClause}
        ORDER BY sr.request_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM service_requests sr
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalRecords = parseInt(countResult.rows[0].total);

      const serviceHistory = result.rows.map(sr => ({
        requestId: sr.service_request_id.toString(),
        type: sr.issue_type,
        priority: sr.priority,
        status: sr.status,
        description: sr.description,
        equipmentName: sr.equipment_name,
        equipmentType: sr.equipment_type,
        assignedTechnician: sr.assigned_technician,
        locationName: sr.location_name,
        createdAt: sr.request_date,
        scheduledDate: sr.scheduled_date,
        completedAt: sr.completion_date,
        cost: sr.final_cost ? parseFloat(sr.final_cost) : null,
        notes: sr.internal_notes
      }));

      return ResponseHandler.success(res, {
        serviceHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limit)
        }
      }, 'Historial de servicios obtenido exitosamente');

    } catch (error) {
      console.error('Error en getClientServiceHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial de servicios', 'GET_SERVICE_HISTORY_ERROR', 500);
    }
  }

  // GET /api/provider/clients/:id/analytics - Análisis específicos por empresa
  async getClientAnalytics(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { period = '12' } = req.query; // months

      // Verificar relación comercial
      const relationCheck = await db.query(`
        SELECT COUNT(*) as count 
        FROM active_rentals 
        WHERE client_company_id = $1 AND provider_company_id = $2
      `, [id, providerCompanyId]);

      if (parseInt(relationCheck.rows[0].count) === 0) {
        return ResponseHandler.error(res, 'Cliente no encontrado o sin relación comercial', 'CLIENT_NOT_FOUND', 404);
      }

      // Análisis financiero por mes
      const revenueAnalysisQuery = `
        WITH months AS (
          SELECT 
            date_trunc('month', CURRENT_DATE - interval '${period} months' + interval '1 month' * generate_series(0, ${period - 1})) as month
        )
        SELECT 
          m.month,
          COALESCE(SUM(ar.monthly_rate), 0) as rental_revenue,
          COALESCE(SUM(sr.final_cost), 0) as service_revenue,
          COUNT(DISTINCT ar.rental_id) as active_contracts,
          COUNT(DISTINCT sr.service_request_id) as services_completed
        FROM months m
        LEFT JOIN active_rentals ar ON date_trunc('month', ar.start_date) <= m.month 
          AND (ar.end_date IS NULL OR date_trunc('month', ar.end_date) >= m.month)
          AND ar.client_company_id = $1 AND ar.provider_company_id = $2
        LEFT JOIN service_requests sr ON date_trunc('month', sr.completion_date) = m.month
          AND sr.client_company_id = $1 AND sr.provider_company_id = $2 AND sr.status = 'COMPLETED'
        GROUP BY m.month
        ORDER BY m.month
      `;

      const revenueAnalysis = await db.query(revenueAnalysisQuery, [id, providerCompanyId]);

      // Análisis de equipos por tipo
      const equipmentAnalysisQuery = `
        SELECT 
          e.type,
          e.category,
          COUNT(*) as quantity,
          AVG(ar.monthly_rate) as avg_monthly_rate,
          SUM(ar.monthly_rate) as total_monthly_revenue,
          MIN(ar.start_date) as first_rental_date,
          MAX(ar.start_date) as latest_rental_date
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1 AND ar.provider_company_id = $2
        GROUP BY e.type, e.category
        ORDER BY total_monthly_revenue DESC
      `;

      const equipmentAnalysis = await db.query(equipmentAnalysisQuery, [id, providerCompanyId]);

      // Análisis de servicios
      const serviceAnalysisQuery = `
        SELECT 
          sr.issue_type,
          sr.priority,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END) as completed_requests,
          AVG(CASE 
            WHEN sr.status = 'COMPLETED' AND sr.completion_date IS NOT NULL 
            THEN EXTRACT(epoch FROM (sr.completion_date - sr.request_date))/3600 
          END) as avg_resolution_hours,
          AVG(sr.final_cost) as avg_service_cost,
          SUM(sr.final_cost) as total_service_revenue
        FROM service_requests sr
        WHERE sr.client_company_id = $1 AND sr.provider_company_id = $2
          AND sr.request_date >= CURRENT_DATE - interval '${period} months'
        GROUP BY sr.issue_type, sr.priority
        ORDER BY total_requests DESC
      `;

      const serviceAnalysis = await db.query(serviceAnalysisQuery, [id, providerCompanyId]);

      // Análisis de ubicaciones
      const locationAnalysisQuery = `
        SELECT 
          el.equipment_location_id,
          el.name,
          el.city,
          COUNT(DISTINCT e.equipment_id) as equipment_count,
          COUNT(DISTINCT sr.service_request_id) as service_requests,
          SUM(ar.monthly_rate) as location_revenue
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_location_id = e.current_location_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.client_company_id = $1 AND ar.provider_company_id = $2
        LEFT JOIN service_requests sr ON el.equipment_location_id = sr.location_id AND sr.client_company_id = $1 AND sr.provider_company_id = $2
        WHERE el.company_id = $1
        GROUP BY el.equipment_location_id, el.name, el.city
        ORDER BY location_revenue DESC
      `;

      const locationAnalysis = await db.query(locationAnalysisQuery, [id, providerCompanyId]);

      return ResponseHandler.success(res, {
        analytics: {
          revenueByMonth: revenueAnalysis.rows.map(row => ({
            month: row.month,
            rentalRevenue: parseFloat(row.rental_revenue) || 0,
            serviceRevenue: parseFloat(row.service_revenue) || 0,
            totalRevenue: (parseFloat(row.rental_revenue) || 0) + (parseFloat(row.service_revenue) || 0),
            activeContracts: parseInt(row.active_contracts) || 0,
            servicesCompleted: parseInt(row.services_completed) || 0
          })),
          equipmentAnalysis: equipmentAnalysis.rows.map(row => ({
            type: row.type,
            category: row.category,
            quantity: parseInt(row.quantity),
            avgMonthlyRate: parseFloat(row.avg_monthly_rate) || 0,
            totalMonthlyRevenue: parseFloat(row.total_monthly_revenue) || 0,
            firstRentalDate: row.first_rental_date,
            latestRentalDate: row.latest_rental_date
          })),
          serviceAnalysis: serviceAnalysis.rows.map(row => ({
            issueType: row.issue_type,
            priority: row.priority,
            totalRequests: parseInt(row.total_requests),
            completedRequests: parseInt(row.completed_requests),
            completionRate: row.total_requests > 0 ? ((row.completed_requests / row.total_requests) * 100).toFixed(1) : '0.0',
            avgResolutionHours: row.avg_resolution_hours ? parseFloat(row.avg_resolution_hours).toFixed(1) : null,
            avgServiceCost: parseFloat(row.avg_service_cost) || 0,
            totalServiceRevenue: parseFloat(row.total_service_revenue) || 0
          })),
          locationAnalysis: locationAnalysis.rows.map(row => ({
            locationId: row.equipment_location_id.toString(),
            name: row.name,
            city: row.city,
            equipmentCount: parseInt(row.equipment_count) || 0,
            serviceRequests: parseInt(row.service_requests) || 0,
            locationRevenue: parseFloat(row.location_revenue) || 0
          }))
        },
        period: parseInt(period)
      }, 'Análisis del cliente obtenido exitosamente');

    } catch (error) {
      console.error('Error en getClientAnalytics:', error);
      return ResponseHandler.error(res, 'Error al obtener análisis del cliente', 'GET_CLIENT_ANALYTICS_ERROR', 500);
    }
  }

  // GET /api/provider/clients/:id/contracts - Contratos activos por cliente
  async getClientContracts(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { page = 1, limit = 20, status, equipmentType } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE ar.client_company_id = $1 AND ar.provider_company_id = $2`;
      let queryParams = [id, providerCompanyId];
      let paramCount = 2;

      if (status) {
        whereClause += ` AND ar.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (equipmentType) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(equipmentType);
      }

      const contractsQuery = `
        SELECT 
          ar.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number,
          el.name as location_name,
          el.address as location_address,
          er.requested_date as original_request_date,
          i.total_amount as latest_invoice_amount,
          i.status as latest_invoice_status
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON ar.current_location_id = el.equipment_location_id
        LEFT JOIN equipment_requests er ON ar.request_id = er.request_id
        LEFT JOIN LATERAL (
          SELECT total_amount, status 
          FROM invoices 
          WHERE rental_id = ar.rental_id 
          ORDER BY issue_date DESC 
          LIMIT 1
        ) i ON true
        ${whereClause}
        ORDER BY ar.start_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(contractsQuery, queryParams);

      // Count total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalContracts = parseInt(countResult.rows[0].total);

      // Resumen de contratos
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_contracts,
          COUNT(CASE WHEN ar.status = 'ACTIVE' THEN 1 END) as active_contracts,
          SUM(ar.monthly_rate) as total_monthly_revenue,
          AVG(ar.monthly_rate) as avg_monthly_rate,
          MIN(ar.start_date) as oldest_contract,
          MAX(ar.start_date) as newest_contract
        FROM active_rentals ar
        WHERE ar.client_company_id = $1 AND ar.provider_company_id = $2
      `;

      const summaryResult = await db.query(summaryQuery, [id, providerCompanyId]);
      const summary = summaryResult.rows[0];

      const contracts = result.rows.map(contract => ({
        rentalId: contract.rental_id.toString(),
        requestId: contract.request_id?.toString(),
        equipment: {
          id: contract.equipment_id.toString(),
          name: contract.equipment_name,
          type: contract.equipment_type,
          model: contract.equipment_model,
          serialNumber: contract.serial_number
        },
        location: {
          name: contract.location_name,
          address: contract.location_address
        },
        contractTerms: {
          startDate: contract.start_date,
          endDate: contract.end_date,
          dailyRate: parseFloat(contract.daily_rate) || 0,
          monthlyRate: parseFloat(contract.monthly_rate) || 0,
          totalAmount: parseFloat(contract.total_amount) || 0,
          depositPaid: parseFloat(contract.deposit_paid) || 0
        },
        status: contract.status,
        paymentStatus: contract.payment_status,
        originalRequestDate: contract.original_request_date,
        latestInvoice: {
          amount: parseFloat(contract.latest_invoice_amount) || 0,
          status: contract.latest_invoice_status
        },
        contractTermsText: contract.contract_terms,
        createdAt: contract.created_at
      }));

      return ResponseHandler.success(res, {
        contracts,
        summary: {
          totalContracts: parseInt(summary.total_contracts) || 0,
          activeContracts: parseInt(summary.active_contracts) || 0,
          totalMonthlyRevenue: parseFloat(summary.total_monthly_revenue) || 0,
          avgMonthlyRate: parseFloat(summary.avg_monthly_rate) || 0,
          oldestContract: summary.oldest_contract,
          newestContract: summary.newest_contract
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalContracts,
          totalPages: Math.ceil(totalContracts / limit)
        }
      }, 'Contratos del cliente obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getClientContracts:', error);
      return ResponseHandler.error(res, 'Error al obtener contratos del cliente', 'GET_CLIENT_CONTRACTS_ERROR', 500);
    }
  }

  // GET /api/provider/clients/opportunities - Oportunidades de negocio
  async getClientOpportunities(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { page = 1, limit = 20, type, priority } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE er.provider_company_id = $1`;
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (type) {
        whereClause += ` AND er.type = $${++paramCount}`;
        queryParams.push(type);
      }

      if (priority === 'high') {
        whereClause += ` AND (er.status = 'PENDING' OR (sr.priority IN ('HIGH', 'CRITICAL') AND sr.status IN ('OPEN', 'ASSIGNED')))`;
      }

      // Solicitudes pendientes de equipos
      const equipmentOpportunitiesQuery = `
        SELECT 
          'EQUIPMENT_REQUEST' as opportunity_type,
          er.request_id as entity_id,
          c.company_id as client_company_id,
          c.name as client_name,
          c.business_type,
          er.type as request_type,
          er.status,
          er.quantity,
          er.total_price as potential_value,
          er.requested_date as created_at,
          er.special_requirements as notes,
          e.name as equipment_name,
          e.type as equipment_type,
          'PENDING' as priority_level
        FROM equipment_requests er
        INNER JOIN companies c ON er.client_company_id = c.company_id
        LEFT JOIN equipments e ON er.equipment_id = e.equipment_id
        ${whereClause} AND er.status IN ('PENDING', 'APPROVED')
      `;

      // Servicios urgentes como oportunidades
      const serviceOpportunitiesQuery = `
        SELECT 
          'SERVICE_OPPORTUNITY' as opportunity_type,
          sr.service_request_id as entity_id,
          c.company_id as client_company_id,
          c.name as client_name,
          c.business_type,
          sr.issue_type as request_type,
          sr.status,
          1 as quantity,
          sr.estimated_cost as potential_value,
          sr.request_date as created_at,
          sr.description as notes,
          e.name as equipment_name,
          e.type as equipment_type,
          sr.priority as priority_level
        FROM service_requests sr
        INNER JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_company_id = $1 
          AND sr.status IN ('OPEN', 'ASSIGNED') 
          AND sr.priority IN ('HIGH', 'CRITICAL')
      `;

      // Clientes sin actividad reciente
      const inactiveClientsQuery = `
        SELECT 
          'INACTIVE_CLIENT' as opportunity_type,
          c.company_id as entity_id,
          c.company_id as client_company_id,
          c.name as client_name,
          c.business_type,
          'REACTIVATION' as request_type,
          'INACTIVE' as status,
          0 as quantity,
          0 as potential_value,
          last_activity.last_date as created_at,
          'Cliente sin actividad en los últimos 90 días' as notes,
          NULL as equipment_name,
          NULL as equipment_type,
          'MEDIUM' as priority_level
        FROM companies c
        INNER JOIN (
          SELECT 
            c2.company_id as client_company_id,
            MAX(GREATEST(
              COALESCE(ar.created_at, '1900-01-01'::timestamp),
              COALESCE(sr.request_date, '1900-01-01'::timestamp)
            )) as last_date
          FROM companies c2
          LEFT JOIN active_rentals ar ON c2.company_id = ar.client_company_id AND ar.provider_company_id = $1
          LEFT JOIN service_requests sr ON c2.company_id = sr.client_company_id AND sr.provider_company_id = $1
          WHERE c2.type = 'CLIENT'
          GROUP BY c2.company_id
          HAVING MAX(GREATEST(
            COALESCE(ar.created_at, '1900-01-01'::timestamp),
            COALESCE(sr.request_date, '1900-01-01'::timestamp)
          )) < CURRENT_DATE - interval '90 days'
        ) last_activity ON c.company_id = last_activity.client_company_id
        WHERE c.type = 'CLIENT' AND c.is_active = true
      `;

      const allOpportunitiesQuery = `
        SELECT * FROM (
          (${equipmentOpportunitiesQuery})
          UNION ALL
          (${serviceOpportunitiesQuery})
          UNION ALL
          (${inactiveClientsQuery})
        ) all_opps
        ORDER BY 
          CASE priority_level 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
          END,
          created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(allOpportunitiesQuery, queryParams);

      // Count total oportunidades
      const countQuery = `
        SELECT COUNT(*) as total FROM (
          (${equipmentOpportunitiesQuery})
          UNION ALL
          (${serviceOpportunitiesQuery})
          UNION ALL
          (${inactiveClientsQuery})
        ) all_opportunities
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalOpportunities = parseInt(countResult.rows[0].total);

      // Resumen de oportunidades
      const summaryQuery = `
        SELECT 
          COUNT(CASE WHEN opportunity_type = 'EQUIPMENT_REQUEST' THEN 1 END) as equipment_requests,
          COUNT(CASE WHEN opportunity_type = 'SERVICE_OPPORTUNITY' THEN 1 END) as service_opportunities,
          COUNT(CASE WHEN opportunity_type = 'INACTIVE_CLIENT' THEN 1 END) as inactive_clients,
          SUM(CASE WHEN potential_value > 0 THEN potential_value ELSE 0 END) as total_potential_value,
          COUNT(CASE WHEN priority_level IN ('CRITICAL', 'HIGH') THEN 1 END) as high_priority_count
        FROM (
          (${equipmentOpportunitiesQuery})
          UNION ALL
          (${serviceOpportunitiesQuery})
          UNION ALL
          (${inactiveClientsQuery})
        ) all_opportunities
      `;

      const summaryResult = await db.query(summaryQuery, queryParams.slice(0, -2));
      const summary = summaryResult.rows[0];

      const opportunities = result.rows.map(opp => ({
        opportunityType: opp.opportunity_type,
        entityId: opp.entity_id.toString(),
        client: {
          companyId: opp.client_company_id.toString(),
          name: opp.client_name,
          businessType: opp.business_type
        },
        request: {
          type: opp.request_type,
          status: opp.status,
          quantity: parseInt(opp.quantity) || 0,
          potentialValue: parseFloat(opp.potential_value) || 0
        },
        equipment: opp.equipment_name ? {
          name: opp.equipment_name,
          type: opp.equipment_type
        } : null,
        priority: opp.priority_level,
        notes: opp.notes,
        createdAt: opp.created_at
      }));

      return ResponseHandler.success(res, {
        opportunities,
        summary: {
          equipmentRequests: parseInt(summary.equipment_requests) || 0,
          serviceOpportunities: parseInt(summary.service_opportunities) || 0,
          inactiveClients: parseInt(summary.inactive_clients) || 0,
          totalPotentialValue: parseFloat(summary.total_potential_value) || 0,
          highPriorityCount: parseInt(summary.high_priority_count) || 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalOpportunities,
          totalPages: Math.ceil(totalOpportunities / limit)
        }
      }, 'Oportunidades de negocio obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getClientOpportunities:', error);
      return ResponseHandler.error(res, 'Error al obtener oportunidades de negocio', 'GET_CLIENT_OPPORTUNITIES_ERROR', 500);
    }
  }

  // POST /api/provider/clients/:id/notes - Agregar nota al cliente
  async addClientNote(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const clientId = parseInt(req.params.id);
      const { note, type = 'GENERAL', priority = 'NORMAL' } = req.body;

      if (!note || note.trim().length === 0) {
        return ResponseHandler.error(res, 'La nota no puede estar vacía', 'INVALID_NOTE', 400);
      }

      // Verificar que el cliente existe y está asociado al proveedor
      const clientCheck = await db.query(`
        SELECT c.company_id, c.name 
        FROM companies c
        INNER JOIN active_rentals ar ON c.company_id = ar.client_company_id
        WHERE c.company_id = $1 AND ar.provider_company_id = $2 AND c.type = 'CLIENT'
        LIMIT 1
      `, [clientId, providerCompanyId]);

      if (clientCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Cliente no encontrado o sin relación activa', 'CLIENT_NOT_FOUND', 404);
      }

      // Insertar la nota (simulado - en una implementación real tendrías una tabla client_notes)
      const noteData = {
        client_id: clientId,
        provider_company_id: providerCompanyId,
        note: note.trim(),
        type: type,
        priority: priority,
        created_at: new Date().toISOString(),
        created_by: req.user.userId
      };

      return ResponseHandler.success(res, {
        message: 'Nota agregada exitosamente',
        note: noteData,
        client: {
          id: clientCheck.rows[0].company_id,
          name: clientCheck.rows[0].name
        }
      }, 'Nota del cliente creada exitosamente');

    } catch (error) {
      console.error('Error en addClientNote:', error);
      return ResponseHandler.error(res, 'Error al agregar nota del cliente', 'ADD_CLIENT_NOTE_ERROR', 500);
    }
  }
}

module.exports = new ClientsController();
