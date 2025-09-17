const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class ServiceRequestsController {
  // GET /api/provider/service-requests - Obtener solicitudes de servicio
  async getServiceRequests(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        priority, 
        clientId, 
        equipmentId,
        technicianId,
        startDate,
        endDate 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE sr.provider_company_id = $1`;
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND sr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (priority) {
        whereClause += ` AND sr.priority = $${++paramCount}`;
        queryParams.push(priority);
      }

      if (clientId) {
        whereClause += ` AND sr.client_company_id = $${++paramCount}`;
        queryParams.push(clientId);
      }

      if (equipmentId) {
        whereClause += ` AND sr.equipment_id = $${++paramCount}`;
        queryParams.push(equipmentId);
      }

      if (technicianId) {
        whereClause += ` AND sr.technician_id = $${++paramCount}`;
        queryParams.push(technicianId);
      }

      if (startDate) {
        whereClause += ` AND sr.request_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND sr.request_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      const query = `
        SELECT 
          sr.*,
          c.name as client_name,
          c.phone as client_phone,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          el.name as location_name,
          el.address as location_address,
          u.name as technician_name,
          u.phone as technician_phone
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        ${whereClause}
        ORDER BY 
          CASE sr.priority 
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
          END,
          sr.request_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(*) as total
        FROM service_requests sr
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalRequests = parseInt(countResult.rows[0].total);

      const serviceRequests = result.rows.map(sr => ({
        requestId: sr.service_request_id.toString(),
        type: sr.issue_type,
        priority: sr.priority,
        status: sr.status,
        description: sr.description,
        client: {
          companyId: sr.client_company_id.toString(),
          name: sr.client_name,
          phone: sr.client_phone
        },
        equipment: sr.equipment_id ? {
          equipmentId: sr.equipment_id.toString(),
          name: sr.equipment_name,
          type: sr.equipment_type,
          model: sr.equipment_model
        } : null,
        location: {
          name: sr.location_name,
          address: sr.location_address
        },
        technician: sr.technician_id ? {
          userId: sr.technician_id.toString(),
          name: sr.technician_name,
          phone: sr.technician_phone
        } : null,
        createdAt: sr.request_date,
        scheduledDate: sr.scheduled_date,
        completedAt: sr.completion_date,
        cost: sr.final_cost ? parseFloat(sr.final_cost) : null,
        notes: sr.internal_notes
      }));

      return ResponseHandler.success(res, {
        serviceRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRequests,
          totalPages: Math.ceil(totalRequests / limit)
        }
      }, 'Solicitudes de servicio obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getServiceRequests:', error);
      return ResponseHandler.error(res, 'Error al obtener solicitudes de servicio', 'GET_SERVICE_REQUESTS_ERROR', 500);
    }
  }

  // GET /api/provider/service-requests/:id - Obtener detalles de una solicitud
  async getServiceRequestDetails(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      const query = `
        SELECT 
          sr.*,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email,
          c.address as client_address,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number as equipment_serial,
          el.name as location_name,
          el.address as location_address,
          el.contact_person as location_contact,
          el.contact_phone as location_phone,
          u.name as technician_name,
          u.phone as technician_phone,
          u.email as technician_email
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        WHERE sr.service_request_id = $1 AND sr.provider_company_id = $2
      `;

      const result = await db.query(query, [id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Solicitud de servicio no encontrada', 'SERVICE_REQUEST_NOT_FOUND', 404);
      }

      const sr = result.rows[0];

      return ResponseHandler.success(res, {
        serviceRequest: {
          requestId: sr.service_request_id.toString(),
          type: sr.issue_type,
          priority: sr.priority,
          status: sr.status,
          description: sr.description,
          client: {
            companyId: sr.client_company_id.toString(),
            name: sr.client_name,
            phone: sr.client_phone,
            email: sr.client_email,
            address: sr.client_address
          },
          equipment: sr.equipment_id ? {
            equipmentId: sr.equipment_id.toString(),
            name: sr.equipment_name,
            type: sr.equipment_type,
            model: sr.equipment_model,
            serialNumber: sr.equipment_serial
          } : null,
          location: {
            name: sr.location_name,
            address: sr.location_address,
            contactPerson: sr.location_contact,
            contactPhone: sr.location_phone
          },
          technician: sr.technician_id ? {
            userId: sr.technician_id.toString(),
            name: sr.technician_name,
            phone: sr.technician_phone,
            email: sr.technician_email
          } : null,
          createdAt: sr.request_date,
          scheduledDate: sr.scheduled_date,
          completedAt: sr.completion_date,
          cost: sr.final_cost ? parseFloat(sr.final_cost) : null,
          notes: sr.internal_notes,
          clientRating: sr.client_rating,
          clientFeedback: sr.client_feedback
        }
      }, 'Detalles de solicitud obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getServiceRequestDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de solicitud', 'GET_SERVICE_REQUEST_DETAILS_ERROR', 500);
    }
  }

  // PUT /api/provider/service-requests/:id/assign - Asignar técnico
  async assignTechnician(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { technicianId, scheduledDate, notes } = req.body;

      // Verificar que el técnico pertenece a la empresa
      const technicianCheck = await db.query(
        'SELECT user_id FROM users WHERE user_id = $1 AND company_id = $2 AND role = $3',
        [technicianId, providerCompanyId, 'PROVIDER']
      );

      if (technicianCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Técnico no válido', 'INVALID_TECHNICIAN', 400);
      }

      const updateQuery = `
        UPDATE service_requests SET
          technician_id = $1,
          scheduled_date = $2,
          status = CASE WHEN status = 'OPEN' THEN 'ASSIGNED' ELSE status END,
          internal_notes = COALESCE(internal_notes || E'\\n\\n', '') || $3,
          updated_at = NOW()
        WHERE service_request_id = $4 AND provider_company_id = $5
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        technicianId, 
        scheduledDate, 
        `Técnico asignado: ${new Date().toISOString()} - ${notes || ''}`,
        id, 
        providerCompanyId
      ]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Solicitud no encontrada', 'SERVICE_REQUEST_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        serviceRequest: result.rows[0]
      }, 'Técnico asignado exitosamente');

    } catch (error) {
      console.error('Error en assignTechnician:', error);
      return ResponseHandler.error(res, 'Error al asignar técnico', 'ASSIGN_TECHNICIAN_ERROR', 500);
    }
  }

  // PUT /api/provider/service-requests/:id/status - Actualizar estado
  async updateStatus(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED'];
      if (!validStatuses.includes(status)) {
        return ResponseHandler.error(res, 'Estado no válido', 'INVALID_STATUS', 400);
      }

      const updateQuery = `
        UPDATE service_requests SET
          status = $1,
          internal_notes = COALESCE(internal_notes || E'\\n\\n', '') || $2,
          updated_at = NOW()
        WHERE service_request_id = $3 AND provider_company_id = $4
        RETURNING *
      `;

      const statusNote = `Estado actualizado a ${status}: ${new Date().toISOString()} - ${notes || ''}`;

      const result = await db.query(updateQuery, [status, statusNote, id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Solicitud no encontrada', 'SERVICE_REQUEST_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        serviceRequest: result.rows[0]
      }, 'Estado actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateStatus:', error);
      return ResponseHandler.error(res, 'Error al actualizar estado', 'UPDATE_STATUS_ERROR', 500);
    }
  }

  // PUT /api/provider/service-requests/:id/complete - Completar servicio
  async completeServiceRequest(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { cost, completionNotes, workPerformed } = req.body;

      const updateQuery = `
        UPDATE service_requests SET
          status = 'COMPLETED',
          completion_date = NOW(),
          final_cost = $1,
          internal_notes = COALESCE(internal_notes || E'\\n\\n', '') || $2,
          updated_at = NOW()
        WHERE service_request_id = $3 AND provider_company_id = $4
        RETURNING *
      `;

      const completionNote = `Servicio completado: ${new Date().toISOString()}\nTrabajo realizado: ${workPerformed || ''}\nNotas: ${completionNotes || ''}`;

      const result = await db.query(updateQuery, [cost, completionNote, id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Solicitud no encontrada', 'SERVICE_REQUEST_NOT_FOUND', 404);
      }

      // Note: Removed equipment update since last_maintenance_date doesn't exist in schema

      return ResponseHandler.success(res, {
        serviceRequest: result.rows[0]
      }, 'Servicio completado exitosamente');

    } catch (error) {
      console.error('Error en completeServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al completar servicio', 'COMPLETE_SERVICE_ERROR', 500);
    }
  }

  // GET /api/provider/service-requests/stats - Estadísticas de servicios
  async getServiceStats(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { period = '30' } = req.query; // days

      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN priority IN ('HIGH', 'CRITICAL') THEN 1 END) as high_priority_requests,
          AVG(CASE 
            WHEN status = 'COMPLETED' AND completion_date IS NOT NULL 
            THEN EXTRACT(epoch FROM (completion_date - request_date))/3600 
          END) as avg_completion_hours,
          SUM(CASE WHEN status = 'COMPLETED' THEN final_cost ELSE 0 END) as total_revenue
        FROM service_requests
        WHERE provider_company_id = $1 
          AND request_date >= CURRENT_DATE - interval '${period} days'
      `;

      const statsResult = await db.query(statsQuery, [providerCompanyId]);
      const stats = statsResult.rows[0];

      // Servicios por tipo
      const typeStatsQuery = `
        SELECT 
          issue_type,
          COUNT(*) as count
        FROM service_requests
        WHERE provider_company_id = $1 
          AND request_date >= CURRENT_DATE - interval '${period} days'
        GROUP BY issue_type
        ORDER BY count DESC
      `;

      const typeStatsResult = await db.query(typeStatsQuery, [providerCompanyId]);

      // Técnicos más activos
      const technicianStatsQuery = `
        SELECT 
          u.name as technician_name,
          u.user_id,
          COUNT(sr.service_request_id) as assigned_requests,
          COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END) as completed_requests
        FROM users u
        LEFT JOIN service_requests sr ON u.user_id = sr.technician_id 
          AND sr.request_date >= CURRENT_DATE - interval '${period} days'
        WHERE u.company_id = $1 AND u.role = 'PROVIDER'
        GROUP BY u.user_id, u.name
        ORDER BY completed_requests DESC
        LIMIT 5
      `;

      const technicianStatsResult = await db.query(technicianStatsQuery, [providerCompanyId]);

      return ResponseHandler.success(res, {
        stats: {
          totalRequests: parseInt(stats.total_requests),
          pendingRequests: parseInt(stats.pending_requests),
          inProgressRequests: parseInt(stats.in_progress_requests),
          completedRequests: parseInt(stats.completed_requests),
          highPriorityRequests: parseInt(stats.high_priority_requests),
          avgCompletionHours: stats.avg_completion_hours ? parseFloat(stats.avg_completion_hours).toFixed(1) : '0.0',
          totalRevenue: parseFloat(stats.total_revenue) || 0
        },
        requestsByType: typeStatsResult.rows.map(row => ({
          type: row.issue_type,
          count: parseInt(row.count)
        })),
        technicianPerformance: technicianStatsResult.rows.map(row => ({
          technicianId: row.user_id?.toString(),
          name: row.technician_name,
          assignedRequests: parseInt(row.assigned_requests),
          completedRequests: parseInt(row.completed_requests)
        })),
        period: parseInt(period)
      }, 'Estadísticas de servicios obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getServiceStats:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas', 'GET_SERVICE_STATS_ERROR', 500);
    }
  }
}

module.exports = new ServiceRequestsController();
