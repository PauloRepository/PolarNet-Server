const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

class ProviderMaintenancesController {
  
  // GET /api/provider/maintenances - Mantenimientos asignados al proveedor
  async getMaintenances(req, res) {
    try {
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        status = '', 
        maintenance_type = '',
        client_id = '',
        equipment_id = '',
        sortBy = 'scheduled_date',
        sortOrder = 'asc',
        date_from = '',
        date_to = '',
        overdue = '' // 'true' para vencidos
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = [`m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)`];
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (search.trim()) {
        paramCount++;
        whereConditions.push(`(
          m.description ILIKE $${paramCount} 
          OR e.equipment_name ILIKE $${paramCount}
          OR c.company_name ILIKE $${paramCount}
          OR (u_technician.first_name || ' ' || u_technician.last_name) ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search.trim()}%`);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`m.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (maintenance_type) {
        paramCount++;
        whereConditions.push(`m.maintenance_type = $${paramCount}`);
        queryParams.push(maintenance_type);
      }

      if (client_id) {
        paramCount++;
        whereConditions.push(`e.company_id = $${paramCount}`);
        queryParams.push(client_id);
      }

      if (equipment_id) {
        paramCount++;
        whereConditions.push(`m.equipment_id = $${paramCount}`);
        queryParams.push(equipment_id);
      }

      if (date_from) {
        paramCount++;
        whereConditions.push(`m.scheduled_date >= $${paramCount}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereConditions.push(`m.scheduled_date <= $${paramCount}`);
        queryParams.push(date_to);
      }

      if (overdue === 'true') {
        whereConditions.push(`m.scheduled_date < NOW() AND m.status = 'PROGRAMADO'`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar sortBy para prevenir SQL injection
      const validSortFields = ['scheduled_date', 'status', 'maintenance_type', 'created_at'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'scheduled_date';
      const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Query principal con información completa
      const maintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.equipment_id,
          m.maintenance_type,
          m.status,
          m.description,
          m.scheduled_date,
          m.completed_date,
          m.estimated_duration_hours,
          m.actual_duration_hours,
          m.estimated_cost,
          m.actual_cost,
          m.notes,
          m.created_at,
          m.updated_at,
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
          -- Información del técnico asignado
          u_technician.user_id as technician_id,
          u_technician.first_name as technician_first_name,
          u_technician.last_name as technician_last_name,
          u_technician.email as technician_email,
          -- Ubicación
          el.location_name,
          el.address as location_address,
          -- Indicadores de estado
          CASE 
            WHEN m.scheduled_date < NOW() AND m.status = 'PROGRAMADO' THEN true 
            ELSE false 
          END as is_overdue,
          EXTRACT(EPOCH FROM (NOW() - m.scheduled_date))/3600 as hours_overdue,
          EXTRACT(EPOCH FROM (m.scheduled_date - NOW()))/3600 as hours_until_scheduled
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u_technician ON m.technician_user_id = u_technician.user_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
        ORDER BY m.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u_technician ON m.technician_user_id = u_technician.user_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
      `;

      const [maintenancesResult, countResult] = await Promise.all([
        pool.query(maintenancesQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const maintenances = maintenancesResult.rows;
      const totalMaintenances = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalMaintenances / limit);

      // Estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN m.status = 'PROGRAMADO' THEN 1 END) as scheduled_maintenances,
          COUNT(CASE WHEN m.status = 'EN_PROCESO' THEN 1 END) as in_progress_maintenances,
          COUNT(CASE WHEN m.status = 'COMPLETADO' THEN 1 END) as completed_maintenances,
          COUNT(CASE WHEN m.status = 'CANCELADO' THEN 1 END) as cancelled_maintenances,
          COUNT(CASE WHEN m.scheduled_date < NOW() AND m.status = 'PROGRAMADO' THEN 1 END) as overdue_maintenances,
          COUNT(CASE WHEN m.scheduled_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND m.status = 'PROGRAMADO' THEN 1 END) as upcoming_week,
          AVG(m.actual_cost) as average_cost,
          SUM(m.actual_cost) as total_revenue,
          AVG(m.actual_duration_hours) as average_duration,
          COUNT(DISTINCT e.company_id) as total_clients,
          COUNT(DISTINCT m.equipment_id) as total_equipments
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        WHERE m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      `;

      const statsResult = await pool.query(statsQuery, [providerCompanyId]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Mantenimientos obtenidos exitosamente', {
        maintenances,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMaintenances,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        stats: {
          totalMaintenances: parseInt(stats.total_maintenances) || 0,
          scheduledMaintenances: parseInt(stats.scheduled_maintenances) || 0,
          inProgressMaintenances: parseInt(stats.in_progress_maintenances) || 0,
          completedMaintenances: parseInt(stats.completed_maintenances) || 0,
          cancelledMaintenances: parseInt(stats.cancelled_maintenances) || 0,
          overdueMaintenances: parseInt(stats.overdue_maintenances) || 0,
          upcomingWeek: parseInt(stats.upcoming_week) || 0,
          averageCost: parseFloat(stats.average_cost) || 0,
          totalRevenue: parseFloat(stats.total_revenue) || 0,
          averageDuration: parseFloat(stats.average_duration) || 0,
          totalClients: parseInt(stats.total_clients) || 0,
          totalEquipments: parseInt(stats.total_equipments) || 0
        },
        filters: {
          search,
          status,
          maintenance_type,
          client_id,
          equipment_id,
          date_from,
          date_to,
          overdue,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        }
      });

    } catch (error) {
      console.error('Error en getMaintenances:', error);
      return ResponseHandler.error(res, 'Error al obtener mantenimientos', 'FETCH_MAINTENANCES_ERROR');
    }
  }

  // POST /api/provider/maintenances - Programar nuevo mantenimiento
  async createMaintenance(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;
      const {
        equipment_id,
        maintenance_type,
        description,
        scheduled_date,
        estimated_duration_hours,
        estimated_cost,
        technician_user_id,
        priority = 'MEDIA'
      } = req.body;

      // Validaciones
      if (!equipment_id || !maintenance_type || !scheduled_date) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Campos requeridos: equipment_id, maintenance_type, scheduled_date', 'VALIDATION_ERROR');
      }

      // Verificar que el equipo existe y el proveedor tiene acceso
      const equipmentQuery = `
        SELECT e.*, c.company_name
        FROM equipments e
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        WHERE e.equipment_id = $1 AND (
          sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR e.provider_company_id = $2
        )
        LIMIT 1
      `;

      const equipmentResult = await client.query(equipmentQuery, [equipment_id, providerCompanyId]);
      
      if (equipmentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Equipo no encontrado o sin acceso', 'EQUIPMENT_ACCESS_DENIED');
      }

      // Verificar técnico si se especifica
      let assignedTechnicianId = technician_user_id || providerUserId;
      
      if (technician_user_id) {
        const technicianQuery = `
          SELECT user_id FROM users 
          WHERE user_id = $1 AND company_id = $2 AND role = 'PROVEEDOR'
        `;
        
        const technicianResult = await client.query(technicianQuery, [technician_user_id, providerCompanyId]);
        
        if (technicianResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Técnico no encontrado en su empresa', 'TECHNICIAN_NOT_FOUND');
        }
      }

      // Verificar conflictos de programación para el técnico
      const conflictQuery = `
        SELECT maintenance_id, scheduled_date, estimated_duration_hours
        FROM maintenances 
        WHERE technician_user_id = $1 
        AND status = 'PROGRAMADO'
        AND (
          (scheduled_date <= $2 AND scheduled_date + INTERVAL '1 hour' * COALESCE(estimated_duration_hours, 2) >= $2)
          OR
          (scheduled_date <= $2 + INTERVAL '1 hour' * $3 AND scheduled_date >= $2)
        )
      `;

      const conflictResult = await client.query(conflictQuery, [
        assignedTechnicianId, 
        scheduled_date, 
        estimated_duration_hours || 2
      ]);

      if (conflictResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'El técnico ya tiene un mantenimiento programado en ese horario', 'SCHEDULE_CONFLICT');
      }

      // Crear el mantenimiento
      const insertMaintenanceQuery = `
        INSERT INTO maintenances (
          equipment_id,
          technician_user_id,
          maintenance_type,
          status,
          description,
          scheduled_date,
          estimated_duration_hours,
          estimated_cost,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const maintenanceValues = [
        equipment_id,
        assignedTechnicianId,
        maintenance_type,
        'PROGRAMADO',
        description,
        scheduled_date,
        estimated_duration_hours,
        estimated_cost
      ];

      const maintenanceResult = await client.query(insertMaintenanceQuery, maintenanceValues);
      const newMaintenance = maintenanceResult.rows[0];

      // Obtener el mantenimiento creado con información completa
      const fullMaintenanceQuery = `
        SELECT 
          m.*,
          e.equipment_name,
          e.equipment_type,
          c.company_name,
          c.contact_phone,
          u.first_name as technician_first_name,
          u.last_name as technician_last_name,
          el.location_name,
          el.address as location_address
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u ON m.technician_user_id = u.user_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE m.maintenance_id = $1
      `;

      const fullMaintenanceResult = await client.query(fullMaintenanceQuery, [newMaintenance.maintenance_id]);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Mantenimiento programado exitosamente', {
        maintenance: fullMaintenanceResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en createMaintenance:', error);
      return ResponseHandler.error(res, 'Error al programar mantenimiento', 'CREATE_MAINTENANCE_ERROR');
    } finally {
      client.release();
    }
  }

  // GET /api/provider/maintenances/:id - Detalles de mantenimiento específico
  async getMaintenanceDetails(req, res) {
    try {
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;

      // Verificar acceso y obtener detalles completos
      const maintenanceQuery = `
        SELECT 
          m.*,
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          e.status as equipment_status,
          c.company_id,
          c.company_name,
          c.contact_phone,
          c.contact_email,
          c.address as company_address,
          u_technician.first_name as technician_first_name,
          u_technician.last_name as technician_last_name,
          u_technician.email as technician_email,
          el.location_name,
          el.address as location_address,
          el.coordinates,
          -- Historial del equipo
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id) as total_maintenances,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'COMPLETADO') as completed_maintenances,
          (SELECT MAX(completed_date) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'COMPLETADO') as last_maintenance,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id) as total_service_requests,
          -- Lecturas más recientes
          (SELECT temperature FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_temperature,
          (SELECT energy_consumption FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_energy_consumption
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u_technician ON m.technician_user_id = u_technician.user_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE m.maintenance_id = $1 
        AND m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
      `;

      const maintenanceResult = await pool.query(maintenanceQuery, [id, providerCompanyId]);
      
      if (maintenanceResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Mantenimiento no encontrado', 'MAINTENANCE_NOT_FOUND');
      }

      const maintenance = maintenanceResult.rows[0];

      // Obtener historial de mantenimientos previos del equipo
      const maintenanceHistoryQuery = `
        SELECT 
          m.maintenance_id,
          m.maintenance_type,
          m.status,
          m.scheduled_date,
          m.completed_date,
          m.actual_cost,
          m.actual_duration_hours,
          u.first_name,
          u.last_name
        FROM maintenances m
        LEFT JOIN users u ON m.technician_user_id = u.user_id
        WHERE m.equipment_id = $1 AND m.maintenance_id != $2
        ORDER BY m.scheduled_date DESC
        LIMIT 5
      `;

      const historyResult = await pool.query(maintenanceHistoryQuery, [
        maintenance.equipment_id, 
        id
      ]);

      return ResponseHandler.success(res, 'Detalles del mantenimiento obtenidos exitosamente', {
        maintenance,
        maintenanceHistory: historyResult.rows
      });

    } catch (error) {
      console.error('Error en getMaintenanceDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del mantenimiento', 'FETCH_MAINTENANCE_DETAILS_ERROR');
    }
  }

  // PUT /api/provider/maintenances/:id - Actualizar mantenimiento
  async updateMaintenance(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;
      const updates = req.body;

      // Verificar acceso al mantenimiento
      const maintenanceQuery = `
        SELECT m.*, e.equipment_name, c.company_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        WHERE m.maintenance_id = $1 
        AND m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
      `;

      const maintenanceResult = await client.query(maintenanceQuery, [id, providerCompanyId]);
      
      if (maintenanceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Mantenimiento no encontrado', 'MAINTENANCE_NOT_FOUND');
      }

      const currentMaintenance = maintenanceResult.rows[0];

      // Campos permitidos para actualizar
      const allowedFields = [
        'maintenance_type', 'description', 'scheduled_date', 'estimated_duration_hours',
        'estimated_cost', 'status', 'notes', 'technician_user_id'
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

      // Validaciones específicas
      if (updates.technician_user_id) {
        const technicianQuery = `
          SELECT user_id FROM users 
          WHERE user_id = $1 AND company_id = $2 AND role = 'PROVEEDOR'
        `;
        
        const technicianResult = await client.query(technicianQuery, [updates.technician_user_id, providerCompanyId]);
        
        if (technicianResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Técnico no encontrado en su empresa', 'TECHNICIAN_NOT_FOUND');
        }
      }

      // Si se cambia fecha/técnico, verificar conflictos
      if (updates.scheduled_date || updates.technician_user_id || updates.estimated_duration_hours) {
        const checkTechnicianId = updates.technician_user_id || currentMaintenance.technician_user_id;
        const checkDate = updates.scheduled_date || currentMaintenance.scheduled_date;
        const checkDuration = updates.estimated_duration_hours || currentMaintenance.estimated_duration_hours || 2;

        const conflictQuery = `
          SELECT maintenance_id
          FROM maintenances 
          WHERE technician_user_id = $1 
          AND status = 'PROGRAMADO'
          AND maintenance_id != $2
          AND (
            (scheduled_date <= $3 AND scheduled_date + INTERVAL '1 hour' * COALESCE(estimated_duration_hours, 2) >= $3)
            OR
            (scheduled_date <= $3 + INTERVAL '1 hour' * $4 AND scheduled_date >= $3)
          )
        `;

        const conflictResult = await client.query(conflictQuery, [
          checkTechnicianId, 
          id,
          checkDate, 
          checkDuration
        ]);

        if (conflictResult.rows.length > 0) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Conflicto de horario con otro mantenimiento', 'SCHEDULE_CONFLICT');
        }
      }

      // Agregar updated_at
      fieldsToUpdate.push(`updated_at = NOW()`);
      
      // Construir y ejecutar query
      values.push(id);
      const updateQuery = `
        UPDATE maintenances 
        SET ${fieldsToUpdate.join(', ')}
        WHERE maintenance_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Mantenimiento actualizado exitosamente', {
        maintenance: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en updateMaintenance:', error);
      return ResponseHandler.error(res, 'Error al actualizar mantenimiento', 'UPDATE_MAINTENANCE_ERROR');
    } finally {
      client.release();
    }
  }

  // DELETE /api/provider/maintenances/:id - Cancelar mantenimiento
  async deleteMaintenance(req, res) {
    try {
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;

      // Verificar acceso y que no esté completado
      const maintenanceQuery = `
        SELECT m.*, e.equipment_name, c.company_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        WHERE m.maintenance_id = $1 
        AND m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
        AND m.status != 'COMPLETADO'
      `;

      const maintenanceResult = await pool.query(maintenanceQuery, [id, providerCompanyId]);
      
      if (maintenanceResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Mantenimiento no encontrado o ya completado', 'MAINTENANCE_NOT_FOUND_OR_COMPLETED');
      }

      // Cancelar (no eliminar físicamente)
      const cancelQuery = `
        UPDATE maintenances 
        SET status = 'CANCELADO', updated_at = NOW()
        WHERE maintenance_id = $1
        RETURNING *
      `;

      const result = await pool.query(cancelQuery, [id]);

      return ResponseHandler.success(res, 'Mantenimiento cancelado exitosamente', {
        maintenance: result.rows[0]
      });

    } catch (error) {
      console.error('Error en deleteMaintenance:', error);
      return ResponseHandler.error(res, 'Error al cancelar mantenimiento', 'DELETE_MAINTENANCE_ERROR');
    }
  }

  // POST /api/provider/maintenances/:id/complete - Completar mantenimiento
  async completeMaintenance(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { 
        actual_cost, 
        actual_duration_hours, 
        completion_notes, 
        parts_used = [],
        next_maintenance_date,
        equipment_status_update
      } = req.body;
      const providerCompanyId = req.user.company_id;

      if (!actual_cost) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Se requiere el costo real del mantenimiento', 'ACTUAL_COST_REQUIRED');
      }

      // Verificar acceso y que esté en progreso o programado
      const maintenanceQuery = `
        SELECT m.*, e.equipment_name, c.company_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        WHERE m.maintenance_id = $1 
        AND m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
        AND m.status IN ('PROGRAMADO', 'EN_PROCESO')
      `;

      const maintenanceResult = await client.query(maintenanceQuery, [id, providerCompanyId]);
      
      if (maintenanceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Mantenimiento no encontrado o no se puede completar', 'MAINTENANCE_NOT_FOUND');
      }

      const maintenance = maintenanceResult.rows[0];

      // Completar el mantenimiento
      const completeQuery = `
        UPDATE maintenances 
        SET 
          status = 'COMPLETADO',
          actual_cost = $1,
          actual_duration_hours = $2,
          notes = COALESCE($3, notes),
          completed_date = NOW(),
          updated_at = NOW()
        WHERE maintenance_id = $4
        RETURNING *
      `;

      const completeResult = await client.query(completeQuery, [
        actual_cost,
        actual_duration_hours,
        completion_notes,
        id
      ]);

      // Actualizar el equipo
      const equipmentUpdates = [];
      const equipmentValues = [];
      let equipmentParamCount = 1;

      equipmentUpdates.push(`last_maintenance_date = NOW()`);
      
      if (next_maintenance_date) {
        equipmentUpdates.push(`next_maintenance_date = $${equipmentParamCount}`);
        equipmentValues.push(next_maintenance_date);
        equipmentParamCount++;
      }

      if (equipment_status_update) {
        equipmentUpdates.push(`status = $${equipmentParamCount}`);
        equipmentValues.push(equipment_status_update);
        equipmentParamCount++;
      }

      equipmentUpdates.push(`updated_at = NOW()`);
      equipmentValues.push(maintenance.equipment_id);

      const updateEquipmentQuery = `
        UPDATE equipments 
        SET ${equipmentUpdates.join(', ')}
        WHERE equipment_id = $${equipmentParamCount}
      `;

      await client.query(updateEquipmentQuery, equipmentValues);

      // Registrar partes utilizadas si es necesario
      if (parts_used && parts_used.length > 0) {
        const partsNotes = `\nPartes utilizadas: ${JSON.stringify(parts_used)}`;
        await client.query(
          'UPDATE maintenances SET notes = COALESCE(notes, \'\') || $1 WHERE maintenance_id = $2',
          [partsNotes, id]
        );
      }

      // Obtener el mantenimiento completado con información completa
      const fullMaintenanceQuery = `
        SELECT 
          m.*,
          e.equipment_name,
          e.equipment_type,
          c.company_name,
          c.contact_phone,
          u.first_name as technician_first_name,
          u.last_name as technician_last_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u ON m.technician_user_id = u.user_id
        WHERE m.maintenance_id = $1
      `;

      const fullMaintenanceResult = await client.query(fullMaintenanceQuery, [id]);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Mantenimiento completado exitosamente', {
        maintenance: fullMaintenanceResult.rows[0],
        partsUsed: parts_used
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en completeMaintenance:', error);
      return ResponseHandler.error(res, 'Error al completar mantenimiento', 'COMPLETE_MAINTENANCE_ERROR');
    } finally {
      client.release();
    }
  }

  // GET /api/provider/maintenances/calendar - Vista de calendario
  async getMaintenancesCalendar(req, res) {
    try {
      const providerCompanyId = req.user.company_id;
      const { 
        start_date,
        end_date,
        technician_id = '' 
      } = req.query;

      // Fechas por defecto (mes actual)
      const startDate = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const endDate = end_date || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

      let whereConditions = [`m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)`];
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      // Filtro por fechas
      paramCount++;
      whereConditions.push(`m.scheduled_date BETWEEN $${paramCount} AND $${paramCount + 1}`);
      queryParams.push(startDate, endDate);
      paramCount++;

      // Filtro por técnico específico
      if (technician_id) {
        paramCount++;
        whereConditions.push(`m.technician_user_id = $${paramCount}`);
        queryParams.push(technician_id);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const calendarQuery = `
        SELECT 
          m.maintenance_id,
          m.maintenance_type,
          m.status,
          m.description,
          m.scheduled_date,
          m.estimated_duration_hours,
          e.equipment_name,
          e.equipment_type,
          c.company_name,
          c.contact_phone,
          u.first_name as technician_first_name,
          u.last_name as technician_last_name,
          u.user_id as technician_id,
          el.location_name,
          el.address as location_address,
          CASE 
            WHEN m.scheduled_date < NOW() AND m.status = 'PROGRAMADO' THEN true 
            ELSE false 
          END as is_overdue
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN users u ON m.technician_user_id = u.user_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
        ORDER BY m.scheduled_date ASC
      `;

      const calendarResult = await pool.query(calendarQuery, queryParams);

      // Agrupar por fecha para facilitar la vista de calendario
      const maintenancesByDate = {};
      calendarResult.rows.forEach(maintenance => {
        const date = maintenance.scheduled_date.toISOString().split('T')[0];
        if (!maintenancesByDate[date]) {
          maintenancesByDate[date] = [];
        }
        maintenancesByDate[date].push(maintenance);
      });

      // Obtener lista de técnicos para filtros
      const techniciansQuery = `
        SELECT DISTINCT
          u.user_id,
          u.first_name,
          u.last_name,
          COUNT(m.maintenance_id) as scheduled_count
        FROM users u
        LEFT JOIN maintenances m ON u.user_id = m.technician_user_id 
          AND m.scheduled_date BETWEEN $1 AND $2
          AND m.status = 'PROGRAMADO'
        WHERE u.company_id = $3 AND u.role = 'PROVEEDOR'
        GROUP BY u.user_id, u.first_name, u.last_name
        ORDER BY u.first_name, u.last_name
      `;

      const techniciansResult = await pool.query(techniciansQuery, [startDate, endDate, providerCompanyId]);

      return ResponseHandler.success(res, 'Calendario de mantenimientos obtenido exitosamente', {
        startDate,
        endDate,
        maintenances: calendarResult.rows,
        maintenancesByDate,
        technicians: techniciansResult.rows,
        totalMaintenances: calendarResult.rows.length
      });

    } catch (error) {
      console.error('Error en getMaintenancesCalendar:', error);
      return ResponseHandler.error(res, 'Error al obtener calendario de mantenimientos', 'FETCH_CALENDAR_ERROR');
    }
  }
}

module.exports = new ProviderMaintenancesController();
