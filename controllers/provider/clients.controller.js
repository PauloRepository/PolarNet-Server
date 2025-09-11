const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class ClientsController {
  // GET /api/provider/clients - Obtener lista de clientes
  async getClients(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { page = 1, limit = 20, search, status } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE c.type = 'CLIENT'`;
      let queryParams = [];
      let paramCount = 0;

      // Filtrar por empresas que tengan contratos activos con este proveedor
      let joinClause = `
        INNER JOIN active_rentals ar ON c.company_id = ar.client_company_id 
        AND ar.provider_company_id = $${++paramCount}
      `;
      queryParams.push(providerCompanyId);

      if (search) {
        whereClause += ` AND (c.name ILIKE $${++paramCount} OR c.tax_id ILIKE $${++paramCount})`;
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        whereClause += ` AND c.is_active = $${++paramCount}`;
        queryParams.push(status === 'active');
      }

      const query = `
        SELECT DISTINCT
          c.*,
          COUNT(DISTINCT ar.rental_id) as active_rentals,
          COUNT(DISTINCT sr.service_request_id) as pending_requests,
          COUNT(DISTINCT e.equipment_id) as total_equipments
        FROM companies c
        ${joinClause}
        LEFT JOIN service_requests sr ON c.company_id = sr.client_company_id 
          AND sr.provider_company_id = $1 AND sr.status IN ('PENDING', 'IN_PROGRESS')
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        ${whereClause}
        GROUP BY c.company_id
        ORDER BY c.name ASC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT c.company_id) as total
        FROM companies c
        INNER JOIN active_rentals ar ON c.company_id = ar.client_company_id 
          AND ar.provider_company_id = $1
        ${whereClause.replace(/\$\d+/g, (match) => {
          const num = parseInt(match.slice(1));
          return num > 1 ? `$${num - 1}` : match;
        })}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(1, -2));
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
          u.first_name || ' ' || u.last_name as assigned_technician
        FROM service_requests sr
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.assigned_technician_id = u.user_id
        WHERE sr.client_company_id = $1 AND sr.provider_company_id = $2
        ORDER BY sr.created_at DESC
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
          type: sr.request_type,
          priority: sr.priority,
          status: sr.status,
          description: sr.description,
          equipmentName: sr.equipment_name,
          assignedTechnician: sr.assigned_technician,
          createdAt: sr.created_at,
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
          u.first_name || ' ' || u.last_name as assigned_technician,
          el.name as location_name
        FROM service_requests sr
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.assigned_technician_id = u.user_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        ${whereClause}
        ORDER BY sr.created_at DESC
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
        type: sr.request_type,
        priority: sr.priority,
        status: sr.status,
        description: sr.description,
        equipmentName: sr.equipment_name,
        equipmentType: sr.equipment_type,
        assignedTechnician: sr.assigned_technician,
        locationName: sr.location_name,
        createdAt: sr.created_at,
        scheduledDate: sr.scheduled_date,
        completedAt: sr.completed_at,
        cost: sr.cost ? parseFloat(sr.cost) : null,
        notes: sr.notes
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

  // POST /api/provider/clients/:id/notes - Agregar nota sobre el cliente
  async addClientNote(req, res) {
    try {
      const { providerCompanyId, userId } = req.user;
      const { id } = req.params;
      const { note, type = 'GENERAL' } = req.body;

      // Verificar relación comercial
      const relationCheck = await db.query(`
        SELECT COUNT(*) as count 
        FROM active_rentals 
        WHERE client_company_id = $1 AND provider_company_id = $2
      `, [id, providerCompanyId]);

      if (parseInt(relationCheck.rows[0].count) === 0) {
        return ResponseHandler.error(res, 'Cliente no encontrado o sin relación comercial', 'CLIENT_NOT_FOUND', 404);
      }

      const insertQuery = `
        INSERT INTO client_notes (
          client_company_id, provider_company_id, created_by_user_id,
          note, note_type
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await db.query(insertQuery, [id, providerCompanyId, userId, note, type]);

      return ResponseHandler.success(res, {
        note: result.rows[0]
      }, 'Nota agregada exitosamente');

    } catch (error) {
      console.error('Error en addClientNote:', error);
      return ResponseHandler.error(res, 'Error al agregar nota', 'ADD_NOTE_ERROR', 500);
    }
  }
}

module.exports = new ClientsController();
