const pool = require('../../lib/db');
const ResponseHandler = require('../../helpers/responseHandler');

class ProviderServiceRequestsController {
  
  // GET /api/provider/service-requests - Solicitudes asignadas al proveedor
  async getServiceRequests(req, res) {
    try {
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        status = '', 
        priority = '',
        request_type = '',
        client_id = '',
        equipment_id = '',
        sortBy = 'created_at',
        sortOrder = 'desc',
        date_from = '',
        date_to = ''
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = [`sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)`];
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (search.trim()) {
        paramCount++;
        whereConditions.push(`(
          sr.description ILIKE $${paramCount} 
          OR e.equipment_name ILIKE $${paramCount}
          OR c.company_name ILIKE $${paramCount}
          OR (u_requester.first_name || ' ' || u_requester.last_name) ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search.trim()}%`);
      }

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

      if (request_type) {
        paramCount++;
        whereConditions.push(`sr.request_type = $${paramCount}`);
        queryParams.push(request_type);
      }

      if (client_id) {
        paramCount++;
        whereConditions.push(`e.company_id = $${paramCount}`);
        queryParams.push(client_id);
      }

      if (equipment_id) {
        paramCount++;
        whereConditions.push(`sr.equipment_id = $${paramCount}`);
        queryParams.push(equipment_id);
      }

      if (date_from) {
        paramCount++;
        whereConditions.push(`sr.created_at >= $${paramCount}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereConditions.push(`sr.created_at <= $${paramCount}`);
        queryParams.push(date_to);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar sortBy para prevenir SQL injection
      const validSortFields = ['created_at', 'status', 'priority', 'request_type', 'scheduled_date'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Query principal con información completa
      const requestsQuery = `
        SELECT 
          sr.request_id,
          sr.equipment_id,
          sr.request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.scheduled_date,
          sr.completed_date,
          sr.notes,
          sr.estimated_cost,
          sr.actual_cost,
          sr.created_at,
          sr.updated_at,
          -- Información del equipo
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          e.status as equipment_status,
          -- Información del cliente
          c.company_id,
          c.company_name,
          c.contact_phone,
          c.contact_email,
          -- Información del solicitante
          u_requester.user_id as requester_id,
          u_requester.first_name as requester_first_name,
          u_requester.last_name as requester_last_name,
          u_requester.email as requester_email,
          -- Información del técnico asignado
          u_provider.user_id as assigned_technician_id,
          u_provider.first_name as assigned_technician_first_name,
          u_provider.last_name as assigned_technician_last_name,
          u_provider.email as assigned_technician_email,
          -- Ubicación
          el.location_name,
          el.address as location_address,
          -- Tiempo desde creación
          EXTRACT(EPOCH FROM (NOW() - sr.created_at))/3600 as hours_since_created
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u_requester ON sr.requester_user_id = u_requester.user_id
        LEFT JOIN users u_provider ON sr.provider_user_id = u_provider.user_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
        ORDER BY sr.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u_requester ON sr.requester_user_id = u_requester.user_id
        LEFT JOIN users u_provider ON sr.provider_user_id = u_provider.user_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
      `;

      const [requestsResult, countResult] = await Promise.all([
        pool.query(requestsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)) // Remover limit y offset para count
      ]);

      const serviceRequests = requestsResult.rows;
      const totalRequests = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRequests / limit);

      // Estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'PENDIENTE' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN sr.status = 'EN_PROCESO' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN sr.status = 'COMPLETADO' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN sr.status = 'CANCELADO' THEN 1 END) as cancelled_requests,
          COUNT(CASE WHEN sr.priority = 'ALTA' THEN 1 END) as high_priority_requests,
          COUNT(CASE WHEN sr.priority = 'MEDIA' THEN 1 END) as medium_priority_requests,
          COUNT(CASE WHEN sr.priority = 'BAJA' THEN 1 END) as low_priority_requests,
          AVG(sr.actual_cost) as average_cost,
          COUNT(DISTINCT e.company_id) as total_clients,
          COUNT(DISTINCT sr.equipment_id) as total_equipments
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      `;

      const statsResult = await pool.query(statsQuery, [providerCompanyId]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Solicitudes de servicio obtenidas exitosamente', {
        serviceRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRequests,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        stats: {
          totalRequests: parseInt(stats.total_requests) || 0,
          pendingRequests: parseInt(stats.pending_requests) || 0,
          inProgressRequests: parseInt(stats.in_progress_requests) || 0,
          completedRequests: parseInt(stats.completed_requests) || 0,
          cancelledRequests: parseInt(stats.cancelled_requests) || 0,
          highPriorityRequests: parseInt(stats.high_priority_requests) || 0,
          mediumPriorityRequests: parseInt(stats.medium_priority_requests) || 0,
          lowPriorityRequests: parseInt(stats.low_priority_requests) || 0,
          averageCost: parseFloat(stats.average_cost) || 0,
          totalClients: parseInt(stats.total_clients) || 0,
          totalEquipments: parseInt(stats.total_equipments) || 0
        },
        filters: {
          search,
          status,
          priority,
          request_type,
          client_id,
          equipment_id,
          date_from,
          date_to,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        }
      });

    } catch (error) {
      console.error('Error en getServiceRequests:', error);
      return ResponseHandler.error(res, 'Error al obtener solicitudes de servicio', 'FETCH_SERVICE_REQUESTS_ERROR');
    }
  }

  // PUT /api/provider/service-requests/:id - Actualizar estado/asignar técnico
  async updateServiceRequest(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;
      const updates = req.body;

      // Verificar que la solicitud esté asignada al proveedor
      const requestQuery = `
        SELECT sr.*, e.equipment_name, e.company_id, c.company_name
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        WHERE sr.request_id = $1 
        AND sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
      `;

      const requestResult = await client.query(requestQuery, [id, providerCompanyId]);
      
      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Solicitud no encontrada o no asignada a su empresa', 'REQUEST_NOT_FOUND');
      }

      const currentRequest = requestResult.rows[0];

      // Campos permitidos para actualizar
      const allowedFields = [
        'status', 'scheduled_date', 'notes', 'estimated_cost', 
        'actual_cost', 'provider_user_id'
      ];

      // Construir query dinámico
      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field) && updates[field] !== undefined) {
          fieldsToUpdate.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
          paramCount++;
        }
      });

      if (fieldsToUpdate.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'No hay campos válidos para actualizar', 'NO_VALID_FIELDS');
      }

      // Validaciones específicas por estado
      if (updates.status) {
        const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'];
        if (!validStatuses.includes(updates.status)) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Estado no válido', 'INVALID_STATUS');
        }

        // Si se completa, requerir actual_cost
        if (updates.status === 'COMPLETADO' && !updates.actual_cost && !currentRequest.actual_cost) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Se requiere costo real para completar la solicitud', 'ACTUAL_COST_REQUIRED');
        }

        // Si se completa, establecer completed_date
        if (updates.status === 'COMPLETADO') {
          fieldsToUpdate.push(`completed_date = NOW()`);
        }
      }

      // Verificar que el técnico asignado pertenezca a la empresa
      if (updates.provider_user_id) {
        const technicianQuery = `
          SELECT user_id, first_name, last_name 
          FROM users 
          WHERE user_id = $1 AND company_id = $2 AND role = 'PROVEEDOR'
        `;
        
        const technicianResult = await client.query(technicianQuery, [updates.provider_user_id, providerCompanyId]);
        
        if (technicianResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Técnico no encontrado o no pertenece a su empresa', 'TECHNICIAN_NOT_FOUND');
        }
      }

      // Agregar updated_at
      fieldsToUpdate.push(`updated_at = NOW()`);
      
      // Construir y ejecutar query
      values.push(id);
      const updateQuery = `
        UPDATE service_requests 
        SET ${fieldsToUpdate.join(', ')}
        WHERE request_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Error al actualizar solicitud', 'UPDATE_REQUEST_ERROR');
      }

      // Obtener la solicitud actualizada con información completa
      const fullRequestQuery = `
        SELECT 
          sr.*,
          e.equipment_name,
          e.equipment_type,
          c.company_name,
          u_requester.first_name as requester_first_name,
          u_requester.last_name as requester_last_name,
          u_provider.first_name as technician_first_name,
          u_provider.last_name as technician_last_name
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u_requester ON sr.requester_user_id = u_requester.user_id
        LEFT JOIN users u_provider ON sr.provider_user_id = u_provider.user_id
        WHERE sr.request_id = $1
      `;

      const fullRequestResult = await client.query(fullRequestQuery, [id]);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Solicitud de servicio actualizada exitosamente', {
        serviceRequest: fullRequestResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en updateServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al actualizar solicitud de servicio', 'UPDATE_SERVICE_REQUEST_ERROR');
    } finally {
      client.release();
    }
  }

  // GET /api/provider/service-requests/stats - Estadísticas del proveedor
  async getServiceRequestStats(req, res) {
    try {
      const providerCompanyId = req.user.company_id;
      const { period = '30' } = req.query; // días

      // Estadísticas principales
      const mainStatsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'PENDIENTE' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN sr.status = 'EN_PROCESO' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN sr.status = 'COMPLETADO' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN sr.status = 'CANCELADO' THEN 1 END) as cancelled_requests,
          
          COUNT(CASE WHEN sr.priority = 'ALTA' THEN 1 END) as high_priority,
          COUNT(CASE WHEN sr.priority = 'MEDIA' THEN 1 END) as medium_priority,
          COUNT(CASE WHEN sr.priority = 'BAJA' THEN 1 END) as low_priority,
          
          AVG(sr.actual_cost) as average_cost,
          SUM(sr.actual_cost) as total_revenue,
          
          COUNT(DISTINCT sr.equipment_id) as unique_equipments,
          COUNT(DISTINCT e.company_id) as unique_clients,
          
          AVG(EXTRACT(EPOCH FROM (sr.completed_date - sr.created_at))/3600) as avg_completion_time_hours
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        AND sr.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      `;

      // Tendencia por días
      const trendQuery = `
        SELECT 
          DATE(sr.created_at) as date,
          COUNT(*) as requests_count,
          COUNT(CASE WHEN sr.status = 'COMPLETADO' THEN 1 END) as completed_count,
          SUM(sr.actual_cost) as daily_revenue
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        AND sr.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY DATE(sr.created_at)
        ORDER BY DATE(sr.created_at) DESC
        LIMIT 30
      `;

      // Distribución por tipo de solicitud
      const typeDistributionQuery = `
        SELECT 
          sr.request_type,
          COUNT(*) as count,
          AVG(sr.actual_cost) as avg_cost,
          AVG(EXTRACT(EPOCH FROM (sr.completed_date - sr.created_at))/3600) as avg_time_hours
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        AND sr.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY sr.request_type
        ORDER BY count DESC
      `;

      // Top clientes
      const topClientsQuery = `
        SELECT 
          c.company_id,
          c.company_name,
          COUNT(*) as requests_count,
          SUM(sr.actual_cost) as total_revenue,
          AVG(sr.actual_cost) as avg_cost
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        AND sr.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY c.company_id, c.company_name
        ORDER BY requests_count DESC
        LIMIT 10
      `;

      // Técnicos más activos
      const topTechniciansQuery = `
        SELECT 
          u.user_id,
          u.first_name,
          u.last_name,
          COUNT(*) as requests_handled,
          COUNT(CASE WHEN sr.status = 'COMPLETADO' THEN 1 END) as completed_requests,
          AVG(EXTRACT(EPOCH FROM (sr.completed_date - sr.created_at))/3600) as avg_completion_time_hours,
          SUM(sr.actual_cost) as total_revenue
        FROM service_requests sr
        INNER JOIN users u ON sr.provider_user_id = u.user_id
        WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        AND sr.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY u.user_id, u.first_name, u.last_name
        ORDER BY requests_handled DESC
        LIMIT 10
      `;

      const [mainStats, trend, typeDistribution, topClients, topTechnicians] = await Promise.all([
        pool.query(mainStatsQuery, [providerCompanyId]),
        pool.query(trendQuery, [providerCompanyId]),
        pool.query(typeDistributionQuery, [providerCompanyId]),
        pool.query(topClientsQuery, [providerCompanyId]),
        pool.query(topTechniciansQuery, [providerCompanyId])
      ]);

      const stats = mainStats.rows[0];

      return ResponseHandler.success(res, 'Estadísticas obtenidas exitosamente', {
        period: parseInt(period),
        summary: {
          totalRequests: parseInt(stats.total_requests) || 0,
          pendingRequests: parseInt(stats.pending_requests) || 0,
          inProgressRequests: parseInt(stats.in_progress_requests) || 0,
          completedRequests: parseInt(stats.completed_requests) || 0,
          cancelledRequests: parseInt(stats.cancelled_requests) || 0,
          highPriorityRequests: parseInt(stats.high_priority) || 0,
          mediumPriorityRequests: parseInt(stats.medium_priority) || 0,
          lowPriorityRequests: parseInt(stats.low_priority) || 0,
          averageCost: parseFloat(stats.average_cost) || 0,
          totalRevenue: parseFloat(stats.total_revenue) || 0,
          uniqueEquipments: parseInt(stats.unique_equipments) || 0,
          uniqueClients: parseInt(stats.unique_clients) || 0,
          avgCompletionTimeHours: parseFloat(stats.avg_completion_time_hours) || 0
        },
        trend: trend.rows,
        typeDistribution: typeDistribution.rows,
        topClients: topClients.rows,
        topTechnicians: topTechnicians.rows
      });

    } catch (error) {
      console.error('Error en getServiceRequestStats:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas', 'FETCH_STATS_ERROR');
    }
  }

  // POST /api/provider/service-requests/:id/assign - Asignar técnico
  async assignTechnician(req, res) {
    try {
      const { id } = req.params;
      const { technician_user_id, scheduled_date, notes } = req.body;
      const providerCompanyId = req.user.company_id;

      if (!technician_user_id) {
        return ResponseHandler.error(res, 'Se requiere ID del técnico', 'TECHNICIAN_ID_REQUIRED');
      }

      // Verificar que la solicitud existe y pertenece al proveedor
      const requestQuery = `
        SELECT sr.request_id, sr.status, e.equipment_name, c.company_name
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        WHERE sr.request_id = $1 
        AND sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
      `;

      const requestResult = await pool.query(requestQuery, [id, providerCompanyId]);
      
      if (requestResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Solicitud no encontrada', 'REQUEST_NOT_FOUND');
      }

      // Verificar que el técnico pertenece a la empresa
      const technicianQuery = `
        SELECT user_id, first_name, last_name, email
        FROM users 
        WHERE user_id = $1 AND company_id = $2 AND role = 'PROVEEDOR'
      `;
      
      const technicianResult = await pool.query(technicianQuery, [technician_user_id, providerCompanyId]);
      
      if (technicianResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Técnico no encontrado en su empresa', 'TECHNICIAN_NOT_FOUND');
      }

      // Actualizar la solicitud
      const updateQuery = `
        UPDATE service_requests 
        SET 
          provider_user_id = $1,
          status = CASE WHEN status = 'PENDIENTE' THEN 'EN_PROCESO' ELSE status END,
          scheduled_date = COALESCE($2, scheduled_date),
          notes = COALESCE($3, notes),
          updated_at = NOW()
        WHERE request_id = $4
        RETURNING *
      `;

      const updateResult = await pool.query(updateQuery, [
        technician_user_id, 
        scheduled_date, 
        notes, 
        id
      ]);

      const technician = technicianResult.rows[0];
      const updatedRequest = updateResult.rows[0];

      return ResponseHandler.success(res, 'Técnico asignado exitosamente', {
        serviceRequest: updatedRequest,
        assignedTechnician: {
          user_id: technician.user_id,
          first_name: technician.first_name,
          last_name: technician.last_name,
          email: technician.email
        }
      });

    } catch (error) {
      console.error('Error en assignTechnician:', error);
      return ResponseHandler.error(res, 'Error al asignar técnico', 'ASSIGN_TECHNICIAN_ERROR');
    }
  }

  // POST /api/provider/service-requests/:id/complete - Completar servicio
  async completeServiceRequest(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { actual_cost, completion_notes, parts_used = [], next_maintenance_date } = req.body;
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;

      if (!actual_cost) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Se requiere el costo real del servicio', 'ACTUAL_COST_REQUIRED');
      }

      // Verificar que la solicitud existe, pertenece al proveedor y no está completada
      const requestQuery = `
        SELECT sr.*, e.equipment_name, c.company_name
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        WHERE sr.request_id = $1 
        AND sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
        AND sr.status != 'COMPLETADO'
      `;

      const requestResult = await client.query(requestQuery, [id, providerCompanyId]);
      
      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Solicitud no encontrada o ya completada', 'REQUEST_NOT_FOUND_OR_COMPLETED');
      }

      const serviceRequest = requestResult.rows[0];

      // Completar la solicitud
      const completeQuery = `
        UPDATE service_requests 
        SET 
          status = 'COMPLETADO',
          actual_cost = $1,
          notes = COALESCE($2, notes),
          completed_date = NOW(),
          updated_at = NOW()
        WHERE request_id = $3
        RETURNING *
      `;

      const completeResult = await client.query(completeQuery, [
        actual_cost, 
        completion_notes, 
        id
      ]);

      // Actualizar fecha de último mantenimiento del equipo
      const updateEquipmentQuery = `
        UPDATE equipments 
        SET 
          last_maintenance_date = NOW(),
          next_maintenance_date = COALESCE($1, next_maintenance_date),
          updated_at = NOW()
        WHERE equipment_id = $2
      `;

      await client.query(updateEquipmentQuery, [
        next_maintenance_date, 
        serviceRequest.equipment_id
      ]);

      // Si hay partes utilizadas, registrarlas (opcional - depende si tienes tabla de parts_used)
      if (parts_used && parts_used.length > 0) {
        // Aquí podrías insertar en una tabla de parts_used si la tienes
        // Por ahora, las guardamos en las notas
        const partsNotes = `Partes utilizadas: ${JSON.stringify(parts_used)}`;
        const currentNotes = completion_notes || '';
        const finalNotes = currentNotes + '\n\n' + partsNotes;
        
        await client.query(
          'UPDATE service_requests SET notes = $1 WHERE request_id = $2',
          [finalNotes, id]
        );
      }

      // Obtener la solicitud completada con información completa
      const fullRequestQuery = `
        SELECT 
          sr.*,
          e.equipment_name,
          e.equipment_type,
          c.company_name,
          c.contact_phone,
          u_requester.first_name as requester_first_name,
          u_requester.last_name as requester_last_name,
          u_provider.first_name as technician_first_name,
          u_provider.last_name as technician_last_name
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u_requester ON sr.requester_user_id = u_requester.user_id
        LEFT JOIN users u_provider ON sr.provider_user_id = u_provider.user_id
        WHERE sr.request_id = $1
      `;

      const fullRequestResult = await client.query(fullRequestQuery, [id]);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Servicio completado exitosamente', {
        serviceRequest: fullRequestResult.rows[0],
        partsUsed: parts_used
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en completeServiceRequest:', error);
      return ResponseHandler.error(res, 'Error al completar servicio', 'COMPLETE_SERVICE_REQUEST_ERROR');
    } finally {
      client.release();
    }
  }
}

module.exports = new ProviderServiceRequestsController();
