const pool = require('../../lib/database');
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
      let whereConditions = ['e.company_id = $1'];
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
          sr.service_request_id as request_id,
          sr.equipment_id,
          sr.issue_type as request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.request_date,
          sr.scheduled_date,
          sr.completion_date,
          sr.description as notes,
          e.name as equipment_name,
          e.type as equipment_type,
          el.address as location_name,
          el.address as location_address,
          u.name as requested_by_name
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        LEFT JOIN users u ON sr.user_id = u.user_id
        ${whereClause}
        ORDER BY 
          CASE sr.priority 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            WHEN 'LOW' THEN 3 
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

      return ResponseHandler.success(res, {
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
      }, 'Solicitudes de servicio obtenidas exitosamente');

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
          sr.service_request_id as request_id,
          sr.equipment_id,
          sr.issue_type as request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.request_date,
          sr.scheduled_date,
          sr.completion_date,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model,
          e.serial_number,
          el.address as location_name,
          el.address as location_address,
          u.name as requested_by_name,
          u.email as requested_by_email
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        LEFT JOIN users u ON sr.user_id = u.user_id
        WHERE sr.service_request_id = $1 
        AND e.company_id = $2
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

      return ResponseHandler.success(res, {
        serviceRequest,
        timeline: timeline.sort((a, b) => new Date(a.date) - new Date(b.date))
      }, 'Detalles de solicitud obtenidos exitosamente');

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
        priority = 'MEDIUM',
        description
      } = req.body;

      // Validaciones
      if (!equipment_id || !request_type || !description) {
        return ResponseHandler.badRequest(res, 'Equipo, tipo de solicitud y descripción son obligatorios');
      }

        // Verificar que el equipo pertenezca a la empresa del cliente
        const equipmentCheck = await pool.query(
          'SELECT equipment_id, name FROM equipments WHERE equipment_id = $1 AND company_id = $2',
          [equipment_id, clientCompanyId]
        );      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Equipo no encontrado o no autorizado');
      }

        // Obtener proveedor por defecto para este tipo de equipo (simplificado)
        // En un sistema real, habría lógica más compleja para asignar proveedores
        const providerQuery = `
          SELECT company_id, name 
          FROM companies 
          WHERE business_type = 'PROVEEDOR' 
          ORDER BY company_id ASC 
          LIMIT 1
        `;      const providerResult = await pool.query(providerQuery);
      const providerId = providerResult.rows.length > 0 ? providerResult.rows[0].company_id : null;

        const createQuery = `
          INSERT INTO service_requests (
            equipment_id,
            user_id,
            description,
            priority,
            issue_type,
            status,
            request_date
          )
          VALUES ($1, $2, $3, $4, $5, 'OPEN', NOW())
          RETURNING service_request_id, request_date, status
        `;

        const result = await pool.query(createQuery, [
          equipment_id,
          userId,
          description,
          priority,
          request_type
        ]);

        const newRequest = result.rows[0];

        return ResponseHandler.success(res, {
          request_id: newRequest.service_request_id,
          status: newRequest.status,
          request_date: newRequest.request_date,
          equipment_name: equipmentCheck.rows[0].name
        }, 'Solicitud de servicio creada exitosamente', 201);

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
        request_type,
        priority = 'MEDIUM',
        description
      } = req.body;

      // Verificar que la solicitud existe y pertenece al cliente
      const existingRequest = await pool.query(
        `SELECT sr.service_request_id, sr.status 
         FROM service_requests sr
         INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
         WHERE sr.service_request_id = $1 AND e.company_id = $2`,
        [id, clientCompanyId]
      );

      if (existingRequest.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Solicitud de servicio no encontrada');
      }

      // Solo permitir actualizar si está en estado PENDIENTE o PROGRAMADO
      const currentStatus = existingRequest.rows[0].status;
      if (!['OPEN', 'ASSIGNED'].includes(currentStatus)) {
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

      if (request_type !== undefined) {
        paramCount++;
        updateFields.push(`issue_type = $${paramCount}`);
        queryParams.push(request_type);
      }

      if (priority !== undefined && ['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
        paramCount++;
        updateFields.push(`priority = $${paramCount}`);
        queryParams.push(priority);
      }

      if (updateFields.length === 0) {
        return ResponseHandler.badRequest(res, 'No hay campos válidos para actualizar');
      }

      queryParams.push(id);

      const updateQuery = `
        UPDATE service_requests 
        SET ${updateFields.join(', ')}
        WHERE service_request_id = $${paramCount + 1}
        RETURNING service_request_id, status
      `;

      const result = await pool.query(updateQuery, queryParams);

      return ResponseHandler.success(res, {
        request_id: result.rows[0].service_request_id,
        status: result.rows[0].status
      }, 'Solicitud de servicio actualizada exitosamente');

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
        `SELECT sr.service_request_id, sr.status 
         FROM service_requests sr
         INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
         WHERE sr.service_request_id = $1 AND e.company_id = $2`,
        [id, clientCompanyId]
      );

      if (existingRequest.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Solicitud de servicio no encontrada');
      }

      // Solo permitir cancelar si está en estado PENDIENTE o PROGRAMADO
      const currentStatus = existingRequest.rows[0].status;
      if (!['OPEN', 'ASSIGNED'].includes(currentStatus)) {
        return ResponseHandler.badRequest(res, 'No se puede cancelar una solicitud en estado: ' + currentStatus);
      }

      const cancelQuery = `
        UPDATE service_requests 
        SET status = 'CANCELED'
        WHERE service_request_id = $1
        RETURNING service_request_id, status
      `;

      const result = await pool.query(cancelQuery, [id]);

      return ResponseHandler.success(res, {
        request_id: result.rows[0].service_request_id,
        status: result.rows[0].status
      }, 'Solicitud de servicio cancelada exitosamente');

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
        WHERE e.company_id = $1
        AND sr.request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY sr.status
      `;

      // Estadísticas por tipo de servicio
      const typeStatsQuery = `
        SELECT 
          sr.issue_type as request_type,
          COUNT(*) as count,
          0 as avg_cost
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE e.company_id = $1
        AND sr.request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY sr.issue_type
        ORDER BY count DESC
      `;

      // Estadísticas por prioridad
      const priorityStatsQuery = `
        SELECT 
          sr.priority,
          COUNT(*) as count,
          AVG(
            CASE 
              WHEN sr.completion_date IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (sr.completion_date - sr.request_date))/86400
            END
          ) as avg_completion_days
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE e.company_id = $1
        AND sr.request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY sr.priority
        ORDER BY 
          CASE sr.priority 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            WHEN 'LOW' THEN 3 
          END
      `;

      // Tendencia mensual
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', sr.request_date) as month,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'CLOSED' THEN 1 END) as completed_requests,
          0 as avg_cost
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE e.company_id = $1
        AND sr.request_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY DATE_TRUNC('month', sr.request_date)
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
      const completedRequests = statusStats.CLOSED?.count || 0;
      const completionRate = totalRequests > 0 ? (completedRequests / totalRequests * 100) : 0;

      return ResponseHandler.success(res, {
        summary: {
          totalRequests,
          completedRequests,
          openRequests: statusStats.OPEN?.count || 0,
          assignedRequests: statusStats.ASSIGNED?.count || 0,
          inProgressRequests: statusStats.IN_PROGRESS?.count || 0,
          cancelledRequests: statusStats.CANCELED?.count || 0,
          completionRate: parseFloat(completionRate.toFixed(2)),
          avgCompletionDays: statusStats.CLOSED?.avgCompletionDays || 0
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
      }, 'Estadísticas de solicitudes obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getServiceRequestStatistics:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas de solicitudes', 'FETCH_SERVICE_REQUEST_STATISTICS_ERROR');
    }
  }
}

module.exports = new ClientServiceRequestsController();
