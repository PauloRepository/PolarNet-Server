const pool = require('../../lib/db');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientServiceRequestsController {
  
  // GET /api/client/service-requests - Obtener solicitudes de servicio del cliente
  async getServiceRequests(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { 
        status = '',
        priority = '',
        page = 1,
        limit = 20,
        equipment_id = '',
        date_from = '',
        date_to = ''
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = ['sr.company_id = $1'];
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereConditions.push(`sr.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (priority) {
        paramCount++;
        whereConditions.push(`sr.priority = $${paramCount}`);
        queryParams.push(priority);
      }

      if (equipment_id) {
        paramCount++;
        whereConditions.push(`sr.equipment_id = $${paramCount}`);
        queryParams.push(equipment_id);
      }

      if (date_from) {
        paramCount++;
        whereConditions.push(`sr.request_date >= $${paramCount}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereConditions.push(`sr.request_date <= $${paramCount}`);
        queryParams.push(date_to);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const serviceRequestsQuery = `
        SELECT 
          sr.request_id,
          sr.equipment_id,
          sr.request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.request_date,
          sr.scheduled_date,
          sr.completion_date,
          sr.estimated_cost,
          sr.actual_cost,
          sr.notes,
          sr.created_at,
          sr.updated_at,
          e.equipment_name,
          e.equipment_type,
          el.location_name,
          el.address as location_address,
          u.full_name as requested_by_name,
          prov.company_name as provider_name,
          prov_user.full_name as assigned_technician
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN users u ON sr.requested_by = u.user_id
        LEFT JOIN companies prov ON sr.provider_id = prov.company_id
        LEFT JOIN users prov_user ON sr.assigned_technician = prov_user.user_id
        ${whereClause}
        ORDER BY 
          CASE sr.priority 
            WHEN 'ALTA' THEN 1 
            WHEN 'MEDIA' THEN 2 
            WHEN 'BAJA' THEN 3 
          END,
          sr.request_date DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const [requestsResult, countResult] = await Promise.all([
        pool.query(serviceRequestsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const serviceRequests = requestsResult.rows;
      const totalRequests = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRequests / limit);

      // Estadísticas de estado
      const statusStatsQuery = `
        SELECT 
          sr.status,
          COUNT(*) as count,
          AVG(
            CASE 
              WHEN sr.completion_date IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (sr.completion_date - sr.request_date))/86400
            END
          ) as avg_completion_days
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        ${whereClause}
        GROUP BY sr.status
      `;

      const statusStatsResult = await pool.query(statusStatsQuery, queryParams.slice(0, -2));
      const statusStats = statusStatsResult.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          avgCompletionDays: parseFloat(row.avg_completion_days) || 0
        };
        return acc;
      }, {});

      return ResponseHandler.success(res, 'Solicitudes de servicio obtenidas exitosamente', {
        serviceRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRequests,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        statusStatistics: statusStats,
        filters: {
          status,
          priority,
          equipment_id,
          date_from,
          date_to
        }
      });

    } catch (error) {
      console.error('Error en getServiceRequests:', error);
      return ResponseHandler.error(res, 'Error al obtener solicitudes de servicio', 'FETCH_SERVICE_REQUESTS_ERROR');
    }
  }

  // GET /api/client/service-requests/:id - Obtener detalles de solicitud específica
  async getServiceRequestDetails(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { id } = req.params;

      const detailQuery = `
        SELECT 
          sr.request_id,
          sr.equipment_id,
          sr.request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.request_date,
          sr.scheduled_date,
          sr.completion_date,
          sr.estimated_cost,
          sr.actual_cost,
          sr.notes,
          sr.created_at,
          sr.updated_at,
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          el.location_name,
          el.address as location_address,
          el.contact_person,
          el.contact_phone,
          u.full_name as requested_by_name,
          u.email as requested_by_email,
          prov.company_name as provider_name,
          prov.contact_email as provider_email,
          prov.contact_phone as provider_phone,
          prov_user.full_name as assigned_technician,
          prov_user.email as technician_email,
          prov_user.phone as technician_phone
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN users u ON sr.requested_by = u.user_id
        LEFT JOIN companies prov ON sr.provider_id = prov.company_id
        LEFT JOIN users prov_user ON sr.assigned_technician = prov_user.user_id
        WHERE sr.request_id = $1 
        AND sr.company_id = $2
      `;

      const result = await pool.query(detailQuery, [id, clientCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Solicitud de servicio no encontrada');
      }

      const serviceRequest = result.rows[0];

      // Obtener historial de actualizaciones (si existe una tabla de log)
      // Por ahora simulamos algunas actualizaciones basadas en los campos de fecha
      const timeline = [];

      timeline.push({
        event: 'CREADA',
        date: serviceRequest.created_at,
        description: 'Solicitud de servicio creada',
        status: 'PENDIENTE'
      });

      if (serviceRequest.scheduled_date) {
        timeline.push({
          event: 'PROGRAMADA',
          date: serviceRequest.scheduled_date,
          description: `Servicio programado para ${new Date(serviceRequest.scheduled_date).toLocaleDateString()}`,
          status: 'PROGRAMADO'
        });
      }

      if (serviceRequest.completion_date) {
        timeline.push({
          event: 'COMPLETADA',
          date: serviceRequest.completion_date,
          description: 'Servicio completado exitosamente',
          status: 'COMPLETADO'
        });
      }

      return ResponseHandler.success(res, 'Detalles de solicitud obtenidos exitosamente', {
        serviceRequest,
        timeline: timeline.sort((a, b) => new Date(a.date) - new Date(b.date))
      });

    } catch (error) {
      console.error('Error en getServiceRequestDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de solicitud', 'FETCH_SERVICE_REQUEST_DETAILS_ERROR');
    }
  }

  // POST /api/client/service-requests - Crear nueva solicitud de servicio
  async createServiceRequest(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const userId = req.user.user_id;
      const {
        equipment_id,
        request_type,
        priority = 'MEDIA',
        description,
        preferred_date = null,
        location_notes = ''
      } = req.body;

      // Validaciones
      if (!equipment_id || !request_type || !description) {
        return ResponseHandler.badRequest(res, 'Equipo, tipo de solicitud y descripción son obligatorios');
      }

      // Verificar que el equipo pertenezca a la empresa del cliente
      const equipmentCheck = await pool.query(
        'SELECT equipment_id, equipment_name FROM equipments WHERE equipment_id = $1 AND company_id = $2',
        [equipment_id, clientCompanyId]
      );

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Equipo no encontrado o no autorizado');
      }

      // Obtener proveedor por defecto para este tipo de equipo (simplificado)
      // En un sistema real, habría lógica más compleja para asignar proveedores
      const providerQuery = `
        SELECT company_id, company_name 
        FROM companies 
        WHERE company_type = 'PROVEEDOR' 
        AND status = 'ACTIVO'
        ORDER BY created_at ASC 
        LIMIT 1
      `;

      const providerResult = await pool.query(providerQuery);
      const providerId = providerResult.rows.length > 0 ? providerResult.rows[0].company_id : null;

      const createQuery = `
        INSERT INTO service_requests (
          equipment_id,
          company_id,
          requested_by,
          provider_id,
          request_type,
          priority,
          description,
          status,
          request_date,
          preferred_date,
          location_notes,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE', NOW(), $8, $9, NOW())
        RETURNING request_id, request_date, status
      `;

      const result = await pool.query(createQuery, [
        equipment_id,
        clientCompanyId,
        userId,
        providerId,
        request_type,
        priority,
        description,
        preferred_date,
        location_notes
      ]);

      const newRequest = result.rows[0];

      return ResponseHandler.success(res, 'Solicitud de servicio creada exitosamente', {
        request_id: newRequest.request_id,
        status: newRequest.status,
        request_date: newRequest.request_date,
        equipment_name: equipmentCheck.rows[0].equipment_name
      }, 201);

    } catch (error) {
      console.error('Error en createServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al crear solicitud de servicio', 'CREATE_SERVICE_REQUEST_ERROR');
    }
  }

  // PUT /api/client/service-requests/:id - Actualizar solicitud (solo ciertos campos)
  async updateServiceRequest(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { id } = req.params;
      const {
        description,
        preferred_date,
        location_notes,
        priority
      } = req.body;

      // Verificar que la solicitud existe y pertenece al cliente
      const existingRequest = await pool.query(
        'SELECT request_id, status FROM service_requests WHERE request_id = $1 AND company_id = $2',
        [id, clientCompanyId]
      );

      if (existingRequest.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Solicitud de servicio no encontrada');
      }

      // Solo permitir actualizar si está en estado PENDIENTE o PROGRAMADO
      const currentStatus = existingRequest.rows[0].status;
      if (!['PENDIENTE', 'PROGRAMADO'].includes(currentStatus)) {
        return ResponseHandler.badRequest(res, 'No se puede actualizar una solicitud en estado: ' + currentStatus);
      }

      // Construir query de actualización dinámicamente
      const updateFields = [];
      const queryParams = [];
      let paramCount = 0;

      if (description !== undefined) {
        paramCount++;
        updateFields.push(`description = $${paramCount}`);
        queryParams.push(description);
      }

      if (preferred_date !== undefined) {
        paramCount++;
        updateFields.push(`preferred_date = $${paramCount}`);
        queryParams.push(preferred_date);
      }

      if (location_notes !== undefined) {
        paramCount++;
        updateFields.push(`location_notes = $${paramCount}`);
        queryParams.push(location_notes);
      }

      if (priority !== undefined && ['BAJA', 'MEDIA', 'ALTA'].includes(priority)) {
        paramCount++;
        updateFields.push(`priority = $${paramCount}`);
        queryParams.push(priority);
      }

      if (updateFields.length === 0) {
        return ResponseHandler.badRequest(res, 'No hay campos válidos para actualizar');
      }

      paramCount++;
      updateFields.push(`updated_at = NOW()`);
      queryParams.push(id);
      paramCount++;
      queryParams.push(clientCompanyId);

      const updateQuery = `
        UPDATE service_requests 
        SET ${updateFields.join(', ')}
        WHERE request_id = $${paramCount - 1} AND company_id = $${paramCount}
        RETURNING request_id, status, updated_at
      `;

      const result = await pool.query(updateQuery, queryParams);

      return ResponseHandler.success(res, 'Solicitud de servicio actualizada exitosamente', {
        request_id: result.rows[0].request_id,
        status: result.rows[0].status,
        updated_at: result.rows[0].updated_at
      });

    } catch (error) {
      console.error('Error en updateServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al actualizar solicitud de servicio', 'UPDATE_SERVICE_REQUEST_ERROR');
    }
  }

  // DELETE /api/client/service-requests/:id - Cancelar solicitud
  async cancelServiceRequest(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { id } = req.params;
      const { cancellation_reason = '' } = req.body;

      // Verificar que la solicitud existe y pertenece al cliente
      const existingRequest = await pool.query(
        'SELECT request_id, status FROM service_requests WHERE request_id = $1 AND company_id = $2',
        [id, clientCompanyId]
      );

      if (existingRequest.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Solicitud de servicio no encontrada');
      }

      // Solo permitir cancelar si está en estado PENDIENTE o PROGRAMADO
      const currentStatus = existingRequest.rows[0].status;
      if (!['PENDIENTE', 'PROGRAMADO'].includes(currentStatus)) {
        return ResponseHandler.badRequest(res, 'No se puede cancelar una solicitud en estado: ' + currentStatus);
      }

      const cancelQuery = `
        UPDATE service_requests 
        SET status = 'CANCELADO',
            notes = COALESCE(notes || '\n', '') || 'Cancelado por el cliente: ' || $3,
            updated_at = NOW()
        WHERE request_id = $1 AND company_id = $2
        RETURNING request_id, status, updated_at
      `;

      const result = await pool.query(cancelQuery, [id, clientCompanyId, cancellation_reason]);

      return ResponseHandler.success(res, 'Solicitud de servicio cancelada exitosamente', {
        request_id: result.rows[0].request_id,
        status: result.rows[0].status,
        updated_at: result.rows[0].updated_at
      });

    } catch (error) {
      console.error('Error en cancelServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al cancelar solicitud de servicio', 'CANCEL_SERVICE_REQUEST_ERROR');
    }
  }

  // GET /api/client/service-requests/statistics - Estadísticas de solicitudes
  async getServiceRequestStatistics(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { months = 12 } = req.query;

      // Estadísticas por estado
      const statusStatsQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(
            CASE 
              WHEN completion_date IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (completion_date - request_date))/86400
            END
          ) as avg_completion_days
        FROM service_requests 
        WHERE company_id = $1
        AND request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY status
      `;

      // Estadísticas por tipo de servicio
      const typeStatsQuery = `
        SELECT 
          request_type,
          COUNT(*) as count,
          AVG(COALESCE(actual_cost, estimated_cost, 0)) as avg_cost
        FROM service_requests 
        WHERE company_id = $1
        AND request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY request_type
        ORDER BY count DESC
      `;

      // Estadísticas por prioridad
      const priorityStatsQuery = `
        SELECT 
          priority,
          COUNT(*) as count,
          AVG(
            CASE 
              WHEN completion_date IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (completion_date - request_date))/86400
            END
          ) as avg_completion_days
        FROM service_requests 
        WHERE company_id = $1
        AND request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY priority
        ORDER BY 
          CASE priority 
            WHEN 'ALTA' THEN 1 
            WHEN 'MEDIA' THEN 2 
            WHEN 'BAJA' THEN 3 
          END
      `;

      // Tendencia mensual
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', request_date) as month,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'COMPLETADO' THEN 1 END) as completed_requests,
          AVG(COALESCE(actual_cost, estimated_cost, 0)) as avg_cost
        FROM service_requests 
        WHERE company_id = $1
        AND request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY DATE_TRUNC('month', request_date)
        ORDER BY month DESC
      `;

      const [statusResult, typeResult, priorityResult, trendResult] = await Promise.all([
        pool.query(statusStatsQuery, [clientCompanyId]),
        pool.query(typeStatsQuery, [clientCompanyId]),
        pool.query(priorityStatsQuery, [clientCompanyId]),
        pool.query(monthlyTrendQuery, [clientCompanyId])
      ]);

      // Procesar estadísticas por estado
      const statusStats = statusResult.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          avgCompletionDays: parseFloat(row.avg_completion_days) || 0
        };
        return acc;
      }, {});

      // Calcular totales
      const totalRequests = statusResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
      const completedRequests = statusStats.COMPLETADO?.count || 0;
      const completionRate = totalRequests > 0 ? (completedRequests / totalRequests * 100) : 0;

      return ResponseHandler.success(res, 'Estadísticas de solicitudes obtenidas exitosamente', {
        summary: {
          totalRequests,
          completedRequests,
          pendingRequests: statusStats.PENDIENTE?.count || 0,
          scheduledRequests: statusStats.PROGRAMADO?.count || 0,
          inProgressRequests: statusStats.EN_PROGRESO?.count || 0,
          cancelledRequests: statusStats.CANCELADO?.count || 0,
          completionRate: parseFloat(completionRate.toFixed(2)),
          avgCompletionDays: statusStats.COMPLETADO?.avgCompletionDays || 0
        },
        statusStatistics: statusStats,
        typeStatistics: typeResult.rows.map(row => ({
          request_type: row.request_type,
          count: parseInt(row.count),
          avgCost: parseFloat(row.avg_cost) || 0
        })),
        priorityStatistics: priorityResult.rows.map(row => ({
          priority: row.priority,
          count: parseInt(row.count),
          avgCompletionDays: parseFloat(row.avg_completion_days) || 0
        })),
        monthlyTrend: trendResult.rows.map(row => ({
          month: row.month,
          totalRequests: parseInt(row.total_requests),
          completedRequests: parseInt(row.completed_requests),
          avgCost: parseFloat(row.avg_cost) || 0,
          completionRate: row.total_requests > 0 ? (row.completed_requests / row.total_requests * 100) : 0
        })),
        analysisПериод: parseInt(months)
      });

    } catch (error) {
      console.error('Error en getServiceRequestStatistics:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas de solicitudes', 'FETCH_SERVICE_REQUEST_STATISTICS_ERROR');
    }
  }
}

module.exports = new ClientServiceRequestsController();
