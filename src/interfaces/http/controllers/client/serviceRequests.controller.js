const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');

class ServiceRequestsController {
  // GET /api/client/service-requests - Obtener solicitudes de servicio
  async getServiceRequests(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        priority, 
        equipmentId,
        startDate,
        endDate,
        search 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE sr.client_company_id = $1`;
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND sr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (priority) {
        whereClause += ` AND sr.priority = $${++paramCount}`;
        queryParams.push(priority);
      }

      if (equipmentId) {
        whereClause += ` AND sr.equipment_id = $${++paramCount}`;
        queryParams.push(equipmentId);
      }

      if (startDate) {
        whereClause += ` AND sr.request_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND sr.request_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      if (search) {
        whereClause += ` AND (sr.title ILIKE $${++paramCount} OR sr.description ILIKE $${++paramCount})`;
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const query = `
        SELECT 
          sr.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          provider.name as provider_name,
          provider.phone as provider_phone,
          u.name as technician_name,
          u.phone as technician_phone,
          el.name as location_name,
          el.address as location_address,
          -- Calcular tiempo transcurrido
          CASE 
            WHEN sr.completion_date IS NOT NULL THEN 
              EXTRACT(epoch FROM (sr.completion_date - sr.request_date)) / 3600
            ELSE 
              EXTRACT(epoch FROM (CURRENT_TIMESTAMP - sr.request_date)) / 3600
          END as hours_elapsed
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN companies provider ON sr.provider_company_id = provider.company_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        ${whereClause}
        ORDER BY 
          CASE sr.priority
            WHEN 'URGENT' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
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
        serviceRequestId: sr.service_request_id.toString(),
        title: sr.title,
        description: sr.description,
        status: sr.status,
        priority: sr.priority,
        requestDate: sr.request_date,
        scheduledDate: sr.scheduled_date,
        completionDate: sr.completion_date,
        estimatedCost: sr.estimated_cost ? parseFloat(sr.estimated_cost) : null,
        finalCost: sr.final_cost ? parseFloat(sr.final_cost) : null,
        equipment: {
          equipmentId: sr.equipment_id.toString(),
          name: sr.equipment_name,
          type: sr.equipment_type,
          model: sr.equipment_model
        },
        provider: {
          name: sr.provider_name,
          phone: sr.provider_phone
        },
        technician: sr.technician_name ? {
          name: sr.technician_name,
          phone: sr.technician_phone
        } : null,
        location: {
          name: sr.location_name,
          address: sr.location_address
        },
        hoursElapsed: parseFloat(sr.hours_elapsed),
        notes: sr.notes,
        workCompleted: sr.work_completed
      }));

      // Obtener estadísticas para filtros
      const statsQuery = `
        SELECT 
          sr.status,
          COUNT(*) as count
        FROM service_requests sr
        WHERE sr.client_company_id = $1
        GROUP BY sr.status
      `;

      const statsResult = await db.query(statsQuery, [clientCompanyId]);
      const statusStats = {};
      statsResult.rows.forEach(row => {
        statusStats[row.status] = parseInt(row.count);
      });

      return ResponseHandler.success(res, {
        serviceRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRequests,
          totalPages: Math.ceil(totalRequests / limit)
        },
        stats: statusStats
      }, 'Solicitudes de servicio obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getServiceRequests:', error);
      return ResponseHandler.error(res, 'Error al obtener solicitudes de servicio', 'GET_SERVICE_REQUESTS_ERROR', 500);
    }
  }

  // POST /api/client/service-requests - Crear nueva solicitud de servicio
  async createServiceRequest(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const {
        equipmentId,
        title,
        description,
        priority = 'MEDIUM',
        scheduledDate
      } = req.body;

      // Verificar que el equipo está rentado por este cliente
      const equipmentCheck = await db.query(`
        SELECT ar.provider_company_id, e.name as equipment_name
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.equipment_id = $1 AND ar.client_company_id = $2 AND ar.status = 'ACTIVE'
      `, [equipmentId, clientCompanyId]);

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado o no rentado por su empresa', 'EQUIPMENT_NOT_FOUND', 404);
      }

      const providerCompanyId = equipmentCheck.rows[0].provider_company_id;

      const insertQuery = `
        INSERT INTO service_requests (
          equipment_id, 
          client_company_id, 
          provider_company_id,
          title, 
          description, 
          priority, 
          status,
          scheduled_date,
          request_date
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, CURRENT_TIMESTAMP)
        RETURNING service_request_id
      `;

      const result = await db.query(insertQuery, [
        equipmentId, 
        clientCompanyId, 
        providerCompanyId,
        title, 
        description, 
        priority,
        scheduledDate
      ]);

      const serviceRequestId = result.rows[0].service_request_id;

      // Obtener la solicitud creada con detalles
      const serviceRequest = await this.getServiceRequestById(serviceRequestId, clientCompanyId);

      return ResponseHandler.success(res, {
        serviceRequest
      }, 'Solicitud de servicio creada exitosamente', 201);

    } catch (error) {
      console.error('Error en createServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al crear solicitud de servicio', 'CREATE_SERVICE_REQUEST_ERROR', 500);
    }
  }

  // GET /api/client/service-requests/:id - Obtener detalles de una solicitud
  async getServiceRequestDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      const serviceRequest = await this.getServiceRequestById(id, clientCompanyId);

      if (!serviceRequest) {
        return ResponseHandler.error(res, 'Solicitud de servicio no encontrada', 'SERVICE_REQUEST_NOT_FOUND', 404);
      }

      // Obtener historial de actualizaciones
      const updatesQuery = `
        SELECT 
          sru.*,
          u.name as updated_by_name
        FROM service_request_updates sru
        LEFT JOIN users u ON sru.updated_by = u.user_id
        WHERE sru.service_request_id = $1
        ORDER BY sru.update_date DESC
      `;

      const updatesResult = await db.query(updatesQuery, [id]);

      const updates = updatesResult.rows.map(update => ({
        updateId: update.update_id.toString(),
        status: update.status,
        notes: update.notes,
        updateDate: update.update_date,
        updatedBy: update.updated_by_name
      }));

      return ResponseHandler.success(res, {
        serviceRequest: {
          ...serviceRequest,
          updates
        }
      }, 'Detalles de solicitud obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getServiceRequestDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de solicitud', 'GET_SERVICE_REQUEST_DETAILS_ERROR', 500);
    }
  }

  // PUT /api/client/service-requests/:id - Actualizar solicitud de servicio
  async updateServiceRequest(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const {
        title,
        description,
        priority,
        scheduledDate,
        notes
      } = req.body;

      // Verificar que la solicitud pertenece al cliente
      const existingRequest = await this.getServiceRequestById(id, clientCompanyId);
      if (!existingRequest) {
        return ResponseHandler.error(res, 'Solicitud de servicio no encontrada', 'SERVICE_REQUEST_NOT_FOUND', 404);
      }

      // Solo permitir actualizar si está en estado PENDING
      if (existingRequest.status !== 'PENDING') {
        return ResponseHandler.error(res, 'Solo se pueden modificar solicitudes pendientes', 'CANNOT_UPDATE_REQUEST', 400);
      }

      const updateQuery = `
        UPDATE service_requests 
        SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          priority = COALESCE($3, priority),
          scheduled_date = COALESCE($4, scheduled_date),
          notes = COALESCE($5, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE service_request_id = $6 AND client_company_id = $7
        RETURNING service_request_id
      `;

      await db.query(updateQuery, [
        title, description, priority, scheduledDate, notes, id, clientCompanyId
      ]);

      const updatedRequest = await this.getServiceRequestById(id, clientCompanyId);

      return ResponseHandler.success(res, {
        serviceRequest: updatedRequest
      }, 'Solicitud de servicio actualizada exitosamente');

    } catch (error) {
      console.error('Error en updateServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al actualizar solicitud', 'UPDATE_SERVICE_REQUEST_ERROR', 500);
    }
  }

  // DELETE /api/client/service-requests/:id - Cancelar solicitud de servicio
  async cancelServiceRequest(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      // Verificar que la solicitud pertenece al cliente
      const existingRequest = await this.getServiceRequestById(id, clientCompanyId);
      if (!existingRequest) {
        return ResponseHandler.error(res, 'Solicitud de servicio no encontrada', 'SERVICE_REQUEST_NOT_FOUND', 404);
      }

      // Solo permitir cancelar si está en estado PENDING o APPROVED
      if (!['PENDING', 'APPROVED'].includes(existingRequest.status)) {
        return ResponseHandler.error(res, 'Solo se pueden cancelar solicitudes pendientes o aprobadas', 'CANNOT_CANCEL_REQUEST', 400);
      }

      const cancelQuery = `
        UPDATE service_requests 
        SET 
          status = 'CANCELLED',
          updated_at = CURRENT_TIMESTAMP
        WHERE service_request_id = $1 AND client_company_id = $2
      `;

      await db.query(cancelQuery, [id, clientCompanyId]);

      return ResponseHandler.success(res, {
        message: 'Solicitud de servicio cancelada exitosamente'
      }, 'Solicitud cancelada exitosamente');

    } catch (error) {
      console.error('Error en cancelServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al cancelar solicitud', 'CANCEL_SERVICE_REQUEST_ERROR', 500);
    }
  }

  // GET /api/client/service-requests/stats - Estadísticas de solicitudes
  async getServiceRequestsStats(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { startDate, endDate } = req.query;

      let dateFilter = '';
      let queryParams = [clientCompanyId];

      if (startDate || endDate) {
        let conditions = [];
        if (startDate) {
          conditions.push(`sr.request_date >= $${queryParams.length + 1}`);
          queryParams.push(startDate);
        }
        if (endDate) {
          conditions.push(`sr.request_date <= $${queryParams.length + 1}`);
          queryParams.push(endDate);
        }
        dateFilter = `AND ${conditions.join(' AND ')}`;
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'PENDING' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN sr.status = 'APPROVED' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN sr.status = 'IN_PROGRESS' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN sr.status = 'CANCELLED' THEN 1 END) as cancelled_requests,
          COUNT(CASE WHEN sr.priority = 'URGENT' THEN 1 END) as urgent_requests,
          AVG(CASE 
            WHEN sr.completion_date IS NOT NULL THEN 
              EXTRACT(epoch FROM (sr.completion_date - sr.request_date)) / 3600
          END) as avg_completion_hours,
          SUM(sr.final_cost) as total_service_cost,
          AVG(sr.final_cost) as avg_service_cost
        FROM service_requests sr
        WHERE sr.client_company_id = $1 ${dateFilter}
      `;

      const result = await db.query(statsQuery, queryParams);
      const stats = result.rows[0];

      // Estadísticas por equipo
      const equipmentStatsQuery = `
        SELECT 
          e.name as equipment_name,
          e.type as equipment_type,
          COUNT(sr.service_request_id) as total_requests,
          SUM(sr.final_cost) as total_cost
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.client_company_id = $1 ${dateFilter}
        GROUP BY e.equipment_id, e.name, e.type
        ORDER BY total_requests DESC
        LIMIT 10
      `;

      const equipmentResult = await db.query(equipmentStatsQuery, queryParams);

      return ResponseHandler.success(res, {
        summary: {
          totalRequests: parseInt(stats.total_requests),
          pendingRequests: parseInt(stats.pending_requests),
          approvedRequests: parseInt(stats.approved_requests),
          inProgressRequests: parseInt(stats.in_progress_requests),
          completedRequests: parseInt(stats.completed_requests),
          cancelledRequests: parseInt(stats.cancelled_requests),
          urgentRequests: parseInt(stats.urgent_requests),
          avgCompletionHours: stats.avg_completion_hours ? parseFloat(stats.avg_completion_hours) : null,
          totalServiceCost: stats.total_service_cost ? parseFloat(stats.total_service_cost) : 0,
          avgServiceCost: stats.avg_service_cost ? parseFloat(stats.avg_service_cost) : null
        },
        equipmentStats: equipmentResult.rows.map(item => ({
          equipmentName: item.equipment_name,
          equipmentType: item.equipment_type,
          totalRequests: parseInt(item.total_requests),
          totalCost: item.total_cost ? parseFloat(item.total_cost) : 0
        }))
      }, 'Estadísticas de solicitudes obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getServiceRequestsStats:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas', 'GET_STATS_ERROR', 500);
    }
  }

  // Método auxiliar para obtener solicitud por ID
  async getServiceRequestById(serviceRequestId, clientCompanyId) {
    try {
      const query = `
        SELECT 
          sr.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          provider.name as provider_name,
          provider.phone as provider_phone,
          provider.email as provider_email,
          u.name as technician_name,
          u.phone as technician_phone,
          el.name as location_name,
          el.address as location_address
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN companies provider ON sr.provider_company_id = provider.company_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        WHERE sr.service_request_id = $1 AND sr.client_company_id = $2
      `;

      const result = await db.query(query, [serviceRequestId, clientCompanyId]);

      if (result.rows.length === 0) {
        return null;
      }

      const sr = result.rows[0];

      return {
        serviceRequestId: sr.service_request_id.toString(),
        title: sr.title,
        description: sr.description,
        status: sr.status,
        priority: sr.priority,
        requestDate: sr.request_date,
        scheduledDate: sr.scheduled_date,
        completionDate: sr.completion_date,
        estimatedCost: sr.estimated_cost ? parseFloat(sr.estimated_cost) : null,
        finalCost: sr.final_cost ? parseFloat(sr.final_cost) : null,
        equipment: {
          equipmentId: sr.equipment_id.toString(),
          name: sr.equipment_name,
          type: sr.equipment_type,
          model: sr.equipment_model
        },
        provider: {
          name: sr.provider_name,
          phone: sr.provider_phone,
          email: sr.provider_email
        },
        technician: sr.technician_name ? {
          name: sr.technician_name,
          phone: sr.technician_phone
        } : null,
        location: {
          name: sr.location_name,
          address: sr.location_address
        },
        notes: sr.notes,
        workCompleted: sr.work_completed
      };

    } catch (error) {
      console.error('Error en getServiceRequestById:', error);
      throw error;
    }
  }
}

module.exports = new ServiceRequestsController();
