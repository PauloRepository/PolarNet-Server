const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');

class ContractsController {
  // GET /api/client/contracts - Obtener contratos de renta
  async getContracts(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        equipmentType,
        startDate,
        endDate,
        search 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE ar.client_company_id = $1`;
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND ar.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (equipmentType) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(equipmentType);
      }

      if (startDate) {
        whereClause += ` AND ar.start_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND ar.end_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      if (search) {
        whereClause += ` AND (e.name ILIKE $${++paramCount} OR e.model ILIKE $${++paramCount})`;
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const query = `
        SELECT 
          ar.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number,
          provider.name as provider_name,
          provider.phone as provider_phone,
          provider.email as provider_email,
          el.name as location_name,
          el.address as location_address,
          -- Calcular días de renta
          EXTRACT(days FROM (ar.end_date - ar.start_date)) as total_rental_days,
          EXTRACT(days FROM (CURRENT_DATE - ar.start_date)) as days_elapsed,
          EXTRACT(days FROM (ar.end_date - CURRENT_DATE)) as days_remaining,
          -- Calcular costos
          ar.monthly_rate * EXTRACT(months FROM (ar.end_date - ar.start_date)) as total_contract_value,
          ar.monthly_rate * EXTRACT(months FROM (CURRENT_DATE - ar.start_date)) as amount_paid,
          -- Verificar pagos pendientes
          COUNT(i.invoice_id) FILTER (WHERE i.status = 'PENDING') as pending_invoices,
          SUM(i.total_amount) FILTER (WHERE i.status = 'PENDING') as pending_amount
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies provider ON ar.provider_company_id = provider.company_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN invoices i ON ar.rental_id = i.rental_id
        ${whereClause}
        GROUP BY ar.rental_id, e.equipment_id, provider.company_id, el.equipment_location_id
        ORDER BY ar.start_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT ar.rental_id) as total
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalContracts = parseInt(countResult.rows[0].total);

      const contracts = result.rows.map(contract => ({
        rentalId: contract.rental_id.toString(),
        contractNumber: `RENT-${contract.rental_id.toString().padStart(6, '0')}`,
        status: contract.status,
        startDate: contract.start_date,
        endDate: contract.end_date,
        monthlyRate: parseFloat(contract.monthly_rate),
        securityDeposit: contract.security_deposit ? parseFloat(contract.security_deposit) : null,
        contractTerms: contract.contract_terms,
        equipment: {
          equipmentId: contract.equipment_id.toString(),
          name: contract.equipment_name,
          type: contract.equipment_type,
          model: contract.equipment_model,
          serialNumber: contract.serial_number
        },
        provider: {
          name: contract.provider_name,
          phone: contract.provider_phone,
          email: contract.provider_email
        },
        location: {
          name: contract.location_name,
          address: contract.location_address
        },
        duration: {
          totalDays: parseInt(contract.total_rental_days),
          daysElapsed: parseInt(contract.days_elapsed),
          daysRemaining: parseInt(contract.days_remaining)
        },
        financials: {
          totalContractValue: parseFloat(contract.total_contract_value),
          amountPaid: parseFloat(contract.amount_paid),
          pendingInvoices: parseInt(contract.pending_invoices),
          pendingAmount: contract.pending_amount ? parseFloat(contract.pending_amount) : 0
        },
        isExpiringSoon: contract.days_remaining <= 30 && contract.days_remaining > 0,
        isExpired: contract.days_remaining < 0
      }));

      // Obtener estadísticas para dashboard
      const statsQuery = `
        SELECT 
          ar.status,
          COUNT(*) as count,
          SUM(ar.monthly_rate) as total_monthly_cost
        FROM active_rentals ar
        WHERE ar.client_company_id = $1
        GROUP BY ar.status
      `;

      const statsResult = await db.query(statsQuery, [clientCompanyId]);
      const statusStats = {};
      statsResult.rows.forEach(row => {
        statusStats[row.status] = {
          count: parseInt(row.count),
          totalMonthlyCost: parseFloat(row.total_monthly_cost)
        };
      });

      return ResponseHandler.success(res, {
        contracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalContracts,
          totalPages: Math.ceil(totalContracts / limit)
        },
        stats: statusStats
      }, 'Contratos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getContracts:', error);
      return ResponseHandler.error(res, 'Error al obtener contratos', 'GET_CONTRACTS_ERROR', 500);
    }
  }

  // GET /api/client/contracts/:id - Obtener detalles de un contrato
  async getContractDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      const contractQuery = `
        SELECT 
          ar.*,
          e.name as equipment_name,
          e.description as equipment_description,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number,
          e.technical_specs,
          provider.name as provider_name,
          provider.phone as provider_phone,
          provider.email as provider_email,
          provider.address as provider_address,
          el.name as location_name,
          el.address as location_address,
          el.contact_person as location_contact,
          el.contact_phone as location_phone,
          -- Cálculos financieros
          ar.monthly_rate * EXTRACT(months FROM (ar.end_date - ar.start_date)) as total_contract_value,
          ar.monthly_rate * EXTRACT(months FROM (CURRENT_DATE - ar.start_date)) as amount_paid,
          EXTRACT(days FROM (ar.end_date - ar.start_date)) as total_rental_days,
          EXTRACT(days FROM (CURRENT_DATE - ar.start_date)) as days_elapsed,
          EXTRACT(days FROM (ar.end_date - CURRENT_DATE)) as days_remaining
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies provider ON ar.provider_company_id = provider.company_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        WHERE ar.rental_id = $1 AND ar.client_company_id = $2
      `;

      const contractResult = await db.query(contractQuery, [id, clientCompanyId]);

      if (contractResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Contrato no encontrado', 'CONTRACT_NOT_FOUND', 404);
      }

      const contract = contractResult.rows[0];

      // Obtener facturas relacionadas
      const invoicesQuery = `
        SELECT 
          i.*,
          COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as payments_made,
          SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END) as total_paid
        FROM invoices i
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id
        WHERE i.rental_id = $1
        GROUP BY i.invoice_id
        ORDER BY i.invoice_date DESC
      `;

      const invoicesResult = await db.query(invoicesQuery, [id]);

      // Obtener pagos realizados
      const paymentsQuery = `
        SELECT 
          p.*,
          i.invoice_number
        FROM payments p
        INNER JOIN invoices i ON p.invoice_id = i.invoice_id
        WHERE i.rental_id = $1
        ORDER BY p.payment_date DESC
      `;

      const paymentsResult = await db.query(paymentsQuery, [id]);

      // Obtener historial de servicios
      const servicesQuery = `
        SELECT 
          sr.service_request_id,
          sr.title,
          sr.status,
          sr.priority,
          sr.request_date,
          sr.completion_date,
          sr.final_cost
        FROM service_requests sr
        WHERE sr.equipment_id = $1 AND sr.client_company_id = $2
        ORDER BY sr.request_date DESC
        LIMIT 10
      `;

      const servicesResult = await db.query(servicesQuery, [contract.equipment_id, clientCompanyId]);

      // Obtener mantenimientos
      const maintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.title,
          m.type,
          m.status,
          m.scheduled_date,
          m.actual_end_time,
          m.actual_cost
        FROM maintenances m
        WHERE m.equipment_id = $1 AND m.client_company_id = $2
        ORDER BY m.scheduled_date DESC
        LIMIT 10
      `;

      const maintenancesResult = await db.query(maintenancesQuery, [contract.equipment_id, clientCompanyId]);

      return ResponseHandler.success(res, {
        contract: {
          rentalId: contract.rental_id.toString(),
          contractNumber: `RENT-${contract.rental_id.toString().padStart(6, '0')}`,
          status: contract.status,
          startDate: contract.start_date,
          endDate: contract.end_date,
          monthlyRate: parseFloat(contract.monthly_rate),
          securityDeposit: contract.security_deposit ? parseFloat(contract.security_deposit) : null,
          contractTerms: contract.contract_terms,
          specialConditions: contract.special_conditions,
          
          equipment: {
            equipmentId: contract.equipment_id.toString(),
            name: contract.equipment_name,
            description: contract.equipment_description,
            type: contract.equipment_type,
            model: contract.equipment_model,
            serialNumber: contract.serial_number,
            technicalSpecs: contract.technical_specs
          },
          
          provider: {
            name: contract.provider_name,
            phone: contract.provider_phone,
            email: contract.provider_email,
            address: contract.provider_address
          },
          
          location: {
            name: contract.location_name,
            address: contract.location_address,
            contactPerson: contract.location_contact,
            contactPhone: contract.location_phone
          },
          
          duration: {
            totalDays: parseInt(contract.total_rental_days),
            daysElapsed: parseInt(contract.days_elapsed),
            daysRemaining: parseInt(contract.days_remaining)
          },
          
          financials: {
            totalContractValue: parseFloat(contract.total_contract_value),
            amountPaid: parseFloat(contract.amount_paid),
            remainingBalance: parseFloat(contract.total_contract_value) - parseFloat(contract.amount_paid)
          }
        },
        
        invoices: invoicesResult.rows.map(invoice => ({
          invoiceId: invoice.invoice_id.toString(),
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          totalAmount: parseFloat(invoice.total_amount),
          status: invoice.status,
          paymentsMade: parseInt(invoice.payments_made),
          totalPaid: parseFloat(invoice.total_paid)
        })),
        
        payments: paymentsResult.rows.map(payment => ({
          paymentId: payment.payment_id.toString(),
          invoiceNumber: payment.invoice_number,
          amount: parseFloat(payment.amount),
          paymentDate: payment.payment_date,
          paymentMethod: payment.payment_method,
          transactionRef: payment.transaction_reference
        })),
        
        serviceHistory: servicesResult.rows.map(service => ({
          serviceId: service.service_request_id.toString(),
          title: service.title,
          status: service.status,
          priority: service.priority,
          requestDate: service.request_date,
          completionDate: service.completion_date,
          finalCost: service.final_cost ? parseFloat(service.final_cost) : null
        })),
        
        maintenanceHistory: maintenancesResult.rows.map(maintenance => ({
          maintenanceId: maintenance.maintenance_id.toString(),
          title: maintenance.title,
          type: maintenance.type,
          status: maintenance.status,
          scheduledDate: maintenance.scheduled_date,
          actualEndTime: maintenance.actual_end_time,
          actualCost: maintenance.actual_cost ? parseFloat(maintenance.actual_cost) : null
        }))
        
      }, 'Detalles del contrato obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getContractDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del contrato', 'GET_CONTRACT_DETAILS_ERROR', 500);
    }
  }

  // GET /api/client/contracts/:id/documents - Obtener documentos del contrato
  async getContractDocuments(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      // Verificar que el contrato pertenece al cliente
      const contractCheck = await db.query(`
        SELECT rental_id 
        FROM active_rentals 
        WHERE rental_id = $1 AND client_company_id = $2
      `, [id, clientCompanyId]);

      if (contractCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Contrato no encontrado', 'CONTRACT_NOT_FOUND', 404);
      }

      const documentsQuery = `
        SELECT 
          rd.*,
          u.name as uploaded_by_name
        FROM rental_documents rd
        LEFT JOIN users u ON rd.uploaded_by = u.user_id
        WHERE rd.rental_id = $1
        ORDER BY rd.upload_date DESC
      `;

      const result = await db.query(documentsQuery, [id]);

      const documents = result.rows.map(doc => ({
        documentId: doc.document_id.toString(),
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        uploadDate: doc.upload_date,
        uploadedBy: doc.uploaded_by_name,
        description: doc.description
      }));

      return ResponseHandler.success(res, {
        documents
      }, 'Documentos del contrato obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getContractDocuments:', error);
      return ResponseHandler.error(res, 'Error al obtener documentos', 'GET_DOCUMENTS_ERROR', 500);
    }
  }

  // GET /api/client/contracts/summary - Resumen de contratos
  async getContractsSummary(req, res) {
    try {
      const { clientCompanyId } = req.user;

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_contracts,
          COUNT(CASE WHEN ar.status = 'ACTIVE' THEN 1 END) as active_contracts,
          COUNT(CASE WHEN ar.status = 'EXPIRED' THEN 1 END) as expired_contracts,
          COUNT(CASE WHEN ar.status = 'TERMINATED' THEN 1 END) as terminated_contracts,
          SUM(ar.monthly_rate) as total_monthly_cost,
          AVG(ar.monthly_rate) as avg_monthly_cost,
          -- Contratos que vencen pronto
          COUNT(CASE WHEN ar.end_date <= CURRENT_DATE + interval '30 days' AND ar.status = 'ACTIVE' THEN 1 END) as expiring_soon,
          -- Equipos por tipo
          string_agg(DISTINCT e.type, ',') as equipment_types,
          -- Proveedores únicos
          COUNT(DISTINCT ar.provider_company_id) as unique_providers
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1
      `;

      const result = await db.query(summaryQuery, [clientCompanyId]);
      const summary = result.rows[0];

      // Top equipos por costo
      const topEquipmentsQuery = `
        SELECT 
          e.name,
          e.type,
          ar.monthly_rate,
          EXTRACT(days FROM (CURRENT_DATE - ar.start_date)) as days_rented
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
        ORDER BY ar.monthly_rate DESC
        LIMIT 5
      `;

      const topEquipmentsResult = await db.query(topEquipmentsQuery, [clientCompanyId]);

      // Contratos que vencen pronto
      const expiringQuery = `
        SELECT 
          ar.rental_id,
          e.name as equipment_name,
          ar.end_date,
          EXTRACT(days FROM (ar.end_date - CURRENT_DATE)) as days_remaining
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1 
          AND ar.status = 'ACTIVE' 
          AND ar.end_date <= CURRENT_DATE + interval '30 days'
        ORDER BY ar.end_date ASC
      `;

      const expiringResult = await db.query(expiringQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        summary: {
          totalContracts: parseInt(summary.total_contracts),
          activeContracts: parseInt(summary.active_contracts),
          expiredContracts: parseInt(summary.expired_contracts),
          terminatedContracts: parseInt(summary.terminated_contracts),
          totalMonthlyCost: parseFloat(summary.total_monthly_cost || 0),
          avgMonthlyCost: parseFloat(summary.avg_monthly_cost || 0),
          expiringSoon: parseInt(summary.expiring_soon),
          equipmentTypes: summary.equipment_types ? summary.equipment_types.split(',') : [],
          uniqueProviders: parseInt(summary.unique_providers)
        },
        topEquipments: topEquipmentsResult.rows.map(equipment => ({
          name: equipment.name,
          type: equipment.type,
          monthlyRate: parseFloat(equipment.monthly_rate),
          daysRented: parseInt(equipment.days_rented)
        })),
        expiringContracts: expiringResult.rows.map(contract => ({
          rentalId: contract.rental_id.toString(),
          equipmentName: contract.equipment_name,
          endDate: contract.end_date,
          daysRemaining: parseInt(contract.days_remaining)
        }))
      }, 'Resumen de contratos obtenido exitosamente');

    } catch (error) {
      console.error('Error en getContractsSummary:', error);
      return ResponseHandler.error(res, 'Error al obtener resumen', 'GET_SUMMARY_ERROR', 500);
    }
  }

  // PUT /api/client/contracts/:id/extend - Solicitar extensión de contrato
  async requestContractExtension(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const { newEndDate, extensionReason } = req.body;

      // Verificar que el contrato pertenece al cliente y está activo
      const contractCheck = await db.query(`
        SELECT rental_id, end_date, status
        FROM active_rentals 
        WHERE rental_id = $1 AND client_company_id = $2
      `, [id, clientCompanyId]);

      if (contractCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Contrato no encontrado', 'CONTRACT_NOT_FOUND', 404);
      }

      const contract = contractCheck.rows[0];

      if (contract.status !== 'ACTIVE') {
        return ResponseHandler.error(res, 'Solo se pueden extender contratos activos', 'INVALID_CONTRACT_STATUS', 400);
      }

      if (new Date(newEndDate) <= new Date(contract.end_date)) {
        return ResponseHandler.error(res, 'La nueva fecha de fin debe ser posterior a la fecha actual del contrato', 'INVALID_END_DATE', 400);
      }

      // Crear solicitud de extensión
      const extensionQuery = `
        INSERT INTO contract_extensions (
          rental_id,
          current_end_date,
          requested_end_date,
          extension_reason,
          status,
          request_date,
          requested_by_company_id
        ) VALUES ($1, $2, $3, $4, 'PENDING', CURRENT_TIMESTAMP, $5)
        RETURNING extension_id
      `;

      const result = await db.query(extensionQuery, [
        id, 
        contract.end_date, 
        newEndDate, 
        extensionReason, 
        clientCompanyId
      ]);

      return ResponseHandler.success(res, {
        extensionId: result.rows[0].extension_id.toString(),
        message: 'Solicitud de extensión enviada exitosamente'
      }, 'Solicitud de extensión creada exitosamente');

    } catch (error) {
      console.error('Error en requestContractExtension:', error);
      return ResponseHandler.error(res, 'Error al solicitar extensión', 'REQUEST_EXTENSION_ERROR', 500);
    }
  }
}

module.exports = new ContractsController();
