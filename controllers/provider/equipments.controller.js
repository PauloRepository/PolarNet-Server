const pool = require('../../lib/db');
const ResponseHandler = require('../../helpers/responseHandler');

class ProviderEquipmentsController {
  
  // GET /api/provider/equipments - Lista de equipos bajo gestión del proveedor
  async getEquipments(req, res) {
    try {
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        status = '', 
        client_id = '',
        equipment_type = '',
        sortBy = 'updated_at',
        sortOrder = 'desc'
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = [`(
        sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        OR e.provider_company_id = $1
      )`];
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (search.trim()) {
        paramCount++;
        whereConditions.push(`(
          e.equipment_name ILIKE $${paramCount} 
          OR e.model ILIKE $${paramCount} 
          OR e.serial_number ILIKE $${paramCount}
          OR c.company_name ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search.trim()}%`);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`e.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (client_id) {
        paramCount++;
        whereConditions.push(`e.company_id = $${paramCount}`);
        queryParams.push(client_id);
      }

      if (equipment_type) {
        paramCount++;
        whereConditions.push(`e.equipment_type = $${paramCount}`);
        queryParams.push(equipment_type);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar sortBy para prevenir SQL injection
      const validSortFields = ['equipment_name', 'status', 'updated_at', 'company_name', 'equipment_type'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
      const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Query principal con información completa
      const equipmentsQuery = `
        SELECT DISTINCT
          e.equipment_id,
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          e.status,
          e.installation_date,
          e.last_maintenance_date,
          e.next_maintenance_date,
          e.warranty_expiry_date,
          e.created_at,
          e.updated_at,
          c.company_id,
          c.company_name,
          c.contact_phone,
          c.contact_email,
          el.location_name,
          el.address,
          -- Estadísticas del equipo
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id) as total_service_requests,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id AND status = 'PENDIENTE') as pending_requests,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id) as total_maintenances,
          (SELECT MAX(created_at) FROM temperature_readings WHERE equipment_id = e.equipment_id) as last_temperature_reading,
          (SELECT MAX(created_at) FROM energy_readings WHERE equipment_id = e.equipment_id) as last_energy_reading,
          -- Datos más recientes
          (SELECT temperature FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY created_at DESC LIMIT 1) as current_temperature,
          (SELECT energy_consumption FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY created_at DESC LIMIT 1) as current_energy_consumption
        FROM equipments e
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        ${whereClause}
        ORDER BY ${safeSortBy === 'company_name' ? 'c.company_name' : 'e.' + safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(DISTINCT e.equipment_id) as total
        FROM equipments e
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        ${whereClause}
      `;

      const [equipmentsResult, countResult] = await Promise.all([
        pool.query(equipmentsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)) // Remover limit y offset para count
      ]);

      const equipments = equipmentsResult.rows;
      const totalEquipments = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalEquipments / limit);

      // Estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT e.company_id) as total_clients,
          COUNT(CASE WHEN e.status = 'ACTIVO' THEN 1 END) as active_equipments,
          COUNT(CASE WHEN e.status = 'MANTENIMIENTO' THEN 1 END) as maintenance_equipments,
          COUNT(CASE WHEN e.status = 'INACTIVO' THEN 1 END) as inactive_equipments,
          COUNT(CASE WHEN sr.status = 'PENDIENTE' THEN 1 END) as pending_service_requests,
          COUNT(CASE WHEN m.status = 'PROGRAMADO' THEN 1 END) as scheduled_maintenances
        FROM equipments e
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        WHERE (
          sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          OR e.provider_company_id = $1
        )
      `;

      const statsResult = await pool.query(statsQuery, [providerCompanyId]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Equipos obtenidos exitosamente', {
        equipments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalEquipments,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        stats: {
          totalEquipments: parseInt(stats.total_equipments) || 0,
          totalClients: parseInt(stats.total_clients) || 0,
          activeEquipments: parseInt(stats.active_equipments) || 0,
          maintenanceEquipments: parseInt(stats.maintenance_equipments) || 0,
          inactiveEquipments: parseInt(stats.inactive_equipments) || 0,
          pendingServiceRequests: parseInt(stats.pending_service_requests) || 0,
          scheduledMaintenances: parseInt(stats.scheduled_maintenances) || 0
        },
        filters: {
          search,
          status,
          client_id,
          equipment_type,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        }
      });

    } catch (error) {
      console.error('Error en getEquipments:', error);
      return ResponseHandler.error(res, 'Error al obtener equipos', 'FETCH_EQUIPMENTS_ERROR');
    }
  }

  // POST /api/provider/equipments - Crear nuevo equipo para cliente
  async createEquipment(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const providerCompanyId = req.user.company_id;
      const {
        company_id,
        equipment_name,
        equipment_type,
        model,
        serial_number,
        installation_date,
        warranty_expiry_date,
        location_id,
        specifications = {},
        initial_temperature,
        initial_energy_consumption
      } = req.body;

      // Validaciones
      if (!company_id || !equipment_name || !equipment_type) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Campos requeridos: company_id, equipment_name, equipment_type', 'VALIDATION_ERROR');
      }

      // Verificar que el cliente existe y el proveedor puede crear equipos para él
      const clientCheckQuery = `
        SELECT c.company_id, c.company_name 
        FROM companies c
        WHERE c.company_id = $1 AND c.company_type = 'CLIENTE'
      `;
      
      const clientResult = await client.query(clientCheckQuery, [company_id]);
      
      if (clientResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Cliente no encontrado o no válido', 'CLIENT_NOT_FOUND');
      }

      // Verificar que el serial_number no exista
      if (serial_number) {
        const serialCheckQuery = 'SELECT equipment_id FROM equipments WHERE serial_number = $1';
        const serialResult = await client.query(serialCheckQuery, [serial_number]);
        
        if (serialResult.rows.length > 0) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'El número de serie ya existe', 'SERIAL_NUMBER_EXISTS');
        }
      }

      // Crear el equipo
      const insertEquipmentQuery = `
        INSERT INTO equipments (
          company_id, 
          equipment_name, 
          equipment_type, 
          model, 
          serial_number, 
          status,
          installation_date,
          warranty_expiry_date,
          location_id,
          specifications,
          provider_company_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;

      const equipmentValues = [
        company_id,
        equipment_name,
        equipment_type,
        model,
        serial_number,
        'ACTIVO',
        installation_date || new Date(),
        warranty_expiry_date,
        location_id,
        JSON.stringify(specifications),
        providerCompanyId
      ];

      const equipmentResult = await client.query(insertEquipmentQuery, equipmentValues);
      const newEquipment = equipmentResult.rows[0];

      // Si se proporcionan lecturas iniciales, agregarlas
      if (initial_temperature !== undefined) {
        const tempQuery = `
          INSERT INTO temperature_readings (equipment_id, temperature, reading_date, created_at)
          VALUES ($1, $2, NOW(), NOW())
        `;
        await client.query(tempQuery, [newEquipment.equipment_id, initial_temperature]);
      }

      if (initial_energy_consumption !== undefined) {
        const energyQuery = `
          INSERT INTO energy_readings (equipment_id, energy_consumption, reading_date, created_at)
          VALUES ($1, $2, NOW(), NOW())
        `;
        await client.query(energyQuery, [newEquipment.equipment_id, initial_energy_consumption]);
      }

      // Obtener el equipo creado con información completa
      const fullEquipmentQuery = `
        SELECT 
          e.*,
          c.company_name,
          c.contact_phone,
          c.contact_email,
          el.location_name,
          el.address as location_address
        FROM equipments e
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE e.equipment_id = $1
      `;

      const fullEquipmentResult = await client.query(fullEquipmentQuery, [newEquipment.equipment_id]);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Equipo creado exitosamente', {
        equipment: fullEquipmentResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en createEquipment:', error);
      return ResponseHandler.error(res, 'Error al crear equipo', 'CREATE_EQUIPMENT_ERROR');
    } finally {
      client.release();
    }
  }

  // GET /api/provider/equipments/:id - Detalles de equipo específico
  async getEquipmentDetails(req, res) {
    try {
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;

      // Verificar acceso del proveedor al equipo
      const accessQuery = `
        SELECT COUNT(*) as has_access
        FROM equipments e
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        WHERE e.equipment_id = $1 AND (
          sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR e.provider_company_id = $2
        )
      `;

      const accessResult = await pool.query(accessQuery, [id, providerCompanyId]);
      
      if (parseInt(accessResult.rows[0].has_access) === 0) {
        return ResponseHandler.error(res, 'No tiene acceso a este equipo', 'EQUIPMENT_ACCESS_DENIED');
      }

      // Obtener detalles completos del equipo
      const equipmentQuery = `
        SELECT 
          e.*,
          c.company_name,
          c.contact_phone,
          c.contact_email,
          c.address as company_address,
          el.location_name,
          el.address as location_address,
          el.coordinates,
          -- Estadísticas del equipo
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id) as total_service_requests,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id AND status = 'PENDIENTE') as pending_requests,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id AND status = 'COMPLETADO') as completed_requests,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id) as total_maintenances,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'PROGRAMADO') as scheduled_maintenances,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'COMPLETADO') as completed_maintenances,
          -- Lecturas más recientes
          (SELECT temperature FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_temperature,
          (SELECT reading_date FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as last_temperature_reading,
          (SELECT energy_consumption FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_energy_consumption,
          (SELECT reading_date FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as last_energy_reading
        FROM equipments e
        INNER JOIN companies c ON e.company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE e.equipment_id = $1
      `;

      const equipmentResult = await pool.query(equipmentQuery, [id]);
      
      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND');
      }

      const equipment = equipmentResult.rows[0];

      // Obtener historial reciente de solicitudes de servicio
      const recentRequestsQuery = `
        SELECT 
          sr.request_id,
          sr.request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.created_at,
          sr.updated_at,
          u.first_name,
          u.last_name
        FROM service_requests sr
        LEFT JOIN users u ON sr.requester_user_id = u.user_id
        WHERE sr.equipment_id = $1
        ORDER BY sr.created_at DESC
        LIMIT 5
      `;

      // Obtener historial reciente de mantenimientos
      const recentMaintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.maintenance_type,
          m.scheduled_date,
          m.status,
          m.description,
          m.created_at,
          u.first_name,
          u.last_name
        FROM maintenances m
        LEFT JOIN users u ON m.technician_user_id = u.user_id
        WHERE m.equipment_id = $1
        ORDER BY m.scheduled_date DESC
        LIMIT 5
      `;

      // Obtener lecturas recientes de temperatura
      const recentTemperatureQuery = `
        SELECT temperature, reading_date
        FROM temperature_readings
        WHERE equipment_id = $1
        ORDER BY reading_date DESC
        LIMIT 10
      `;

      // Obtener lecturas recientes de energía
      const recentEnergyQuery = `
        SELECT energy_consumption, reading_date
        FROM energy_readings
        WHERE equipment_id = $1
        ORDER BY reading_date DESC
        LIMIT 10
      `;

      const [requestsResult, maintenancesResult, temperatureResult, energyResult] = await Promise.all([
        pool.query(recentRequestsQuery, [id]),
        pool.query(recentMaintenancesQuery, [id]),
        pool.query(recentTemperatureQuery, [id]),
        pool.query(recentEnergyQuery, [id])
      ]);

      return ResponseHandler.success(res, 'Detalles del equipo obtenidos exitosamente', {
        equipment,
        recentServiceRequests: requestsResult.rows,
        recentMaintenances: maintenancesResult.rows,
        recentTemperatureReadings: temperatureResult.rows,
        recentEnergyReadings: energyResult.rows
      });

    } catch (error) {
      console.error('Error en getEquipmentDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del equipo', 'FETCH_EQUIPMENT_DETAILS_ERROR');
    }
  }

  // PUT /api/provider/equipments/:id - Actualizar equipo
  async updateEquipment(req, res) {
    try {
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;
      const updates = req.body;

      // Verificar acceso del proveedor al equipo
      const accessQuery = `
        SELECT e.equipment_id, e.company_id
        FROM equipments e
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        WHERE e.equipment_id = $1 AND (
          sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR e.provider_company_id = $2
        )
      `;

      const accessResult = await pool.query(accessQuery, [id, providerCompanyId]);
      
      if (accessResult.rows.length === 0) {
        return ResponseHandler.error(res, 'No tiene acceso a este equipo', 'EQUIPMENT_ACCESS_DENIED');
      }

      // Campos permitidos para actualizar
      const allowedFields = [
        'equipment_name', 'equipment_type', 'model', 'serial_number', 'status',
        'installation_date', 'last_maintenance_date', 'next_maintenance_date',
        'warranty_expiry_date', 'location_id', 'specifications'
      ];

      // Construir query dinámico
      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field) && updates[field] !== undefined) {
          fieldsToUpdate.push(`${field} = $${paramCount}`);
          
          // Manejar JSON para specifications
          if (field === 'specifications') {
            values.push(JSON.stringify(updates[field]));
          } else {
            values.push(updates[field]);
          }
          paramCount++;
        }
      });

      if (fieldsToUpdate.length === 0) {
        return ResponseHandler.error(res, 'No hay campos válidos para actualizar', 'NO_VALID_FIELDS');
      }

      // Verificar serial_number único si se está actualizando
      if (updates.serial_number) {
        const serialCheckQuery = 'SELECT equipment_id FROM equipments WHERE serial_number = $1 AND equipment_id != $2';
        const serialResult = await pool.query(serialCheckQuery, [updates.serial_number, id]);
        
        if (serialResult.rows.length > 0) {
          return ResponseHandler.error(res, 'El número de serie ya existe', 'SERIAL_NUMBER_EXISTS');
        }
      }

      // Agregar updated_at
      fieldsToUpdate.push(`updated_at = NOW()`);
      
      // Construir y ejecutar query
      values.push(id);
      const updateQuery = `
        UPDATE equipments 
        SET ${fieldsToUpdate.join(', ')}
        WHERE equipment_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND');
      }

      return ResponseHandler.success(res, 'Equipo actualizado exitosamente', {
        equipment: result.rows[0]
      });

    } catch (error) {
      console.error('Error en updateEquipment:', error);
      return ResponseHandler.error(res, 'Error al actualizar equipo', 'UPDATE_EQUIPMENT_ERROR');
    }
  }

  // DELETE /api/provider/equipments/:id - Eliminar equipo
  async deleteEquipment(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;

      // Verificar acceso del proveedor al equipo
      const accessQuery = `
        SELECT e.equipment_id, e.equipment_name, e.company_id
        FROM equipments e
        WHERE e.equipment_id = $1 AND e.provider_company_id = $2
      `;

      const accessResult = await client.query(accessQuery, [id, providerCompanyId]);
      
      if (accessResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'No tiene acceso a este equipo o no puede eliminarlo', 'EQUIPMENT_ACCESS_DENIED');
      }

      const equipment = accessResult.rows[0];

      // Verificar si tiene solicitudes de servicio activas
      const activeRequestsQuery = `
        SELECT COUNT(*) as active_count
        FROM service_requests 
        WHERE equipment_id = $1 AND status IN ('PENDIENTE', 'EN_PROCESO')
      `;

      const activeRequestsResult = await client.query(activeRequestsQuery, [id]);
      const activeCount = parseInt(activeRequestsResult.rows[0].active_count);

      if (activeCount > 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'No se puede eliminar: el equipo tiene solicitudes de servicio activas', 'EQUIPMENT_HAS_ACTIVE_REQUESTS');
      }

      // Verificar si tiene mantenimientos programados
      const scheduledMaintenanceQuery = `
        SELECT COUNT(*) as scheduled_count
        FROM maintenances 
        WHERE equipment_id = $1 AND status = 'PROGRAMADO'
      `;

      const scheduledResult = await client.query(scheduledMaintenanceQuery, [id]);
      const scheduledCount = parseInt(scheduledResult.rows[0].scheduled_count);

      if (scheduledCount > 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'No se puede eliminar: el equipo tiene mantenimientos programados', 'EQUIPMENT_HAS_SCHEDULED_MAINTENANCE');
      }

      // Eliminar en orden (FK constraints)
      // 1. Lecturas de temperatura y energía
      await client.query('DELETE FROM temperature_readings WHERE equipment_id = $1', [id]);
      await client.query('DELETE FROM energy_readings WHERE equipment_id = $1', [id]);

      // 2. Mantenimientos históricos
      await client.query('DELETE FROM maintenances WHERE equipment_id = $1', [id]);

      // 3. Solicitudes de servicio históricas
      await client.query('DELETE FROM service_requests WHERE equipment_id = $1', [id]);

      // 4. El equipo en sí
      await client.query('DELETE FROM equipments WHERE equipment_id = $1', [id]);

      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Equipo eliminado exitosamente', {
        deletedEquipment: {
          equipment_id: id,
          equipment_name: equipment.equipment_name
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en deleteEquipment:', error);
      return ResponseHandler.error(res, 'Error al eliminar equipo', 'DELETE_EQUIPMENT_ERROR');
    } finally {
      client.release();
    }
  }

  // GET /api/provider/equipments/:id/readings - Lecturas del equipo (temp/energía)
  async getEquipmentReadings(req, res) {
    try {
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;
      const { 
        type = 'both', // 'temperature', 'energy', 'both'
        days = 7,
        limit = 100 
      } = req.query;

      // Verificar acceso del proveedor al equipo
      const accessQuery = `
        SELECT COUNT(*) as has_access
        FROM equipments e
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        WHERE e.equipment_id = $1 AND (
          sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR e.provider_company_id = $2
        )
      `;

      const accessResult = await pool.query(accessQuery, [id, providerCompanyId]);
      
      if (parseInt(accessResult.rows[0].has_access) === 0) {
        return ResponseHandler.error(res, 'No tiene acceso a este equipo', 'EQUIPMENT_ACCESS_DENIED');
      }

      const dateFilter = `reading_date >= NOW() - INTERVAL '${parseInt(days)} days'`;

      let temperatureReadings = [];
      let energyReadings = [];

      if (type === 'temperature' || type === 'both') {
        const tempQuery = `
          SELECT temperature, reading_date, created_at
          FROM temperature_readings
          WHERE equipment_id = $1 AND ${dateFilter}
          ORDER BY reading_date DESC
          LIMIT $2
        `;
        const tempResult = await pool.query(tempQuery, [id, limit]);
        temperatureReadings = tempResult.rows;
      }

      if (type === 'energy' || type === 'both') {
        const energyQuery = `
          SELECT energy_consumption, reading_date, created_at
          FROM energy_readings
          WHERE equipment_id = $1 AND ${dateFilter}
          ORDER BY reading_date DESC
          LIMIT $2
        `;
        const energyResult = await pool.query(energyQuery, [id, limit]);
        energyReadings = energyResult.rows;
      }

      // Estadísticas de lecturas
      const statsQuery = `
        SELECT 
          -- Temperatura
          (SELECT AVG(temperature) FROM temperature_readings WHERE equipment_id = $1 AND ${dateFilter}) as avg_temperature,
          (SELECT MIN(temperature) FROM temperature_readings WHERE equipment_id = $1 AND ${dateFilter}) as min_temperature,
          (SELECT MAX(temperature) FROM temperature_readings WHERE equipment_id = $1 AND ${dateFilter}) as max_temperature,
          (SELECT COUNT(*) FROM temperature_readings WHERE equipment_id = $1 AND ${dateFilter}) as temperature_count,
          -- Energía
          (SELECT AVG(energy_consumption) FROM energy_readings WHERE equipment_id = $1 AND ${dateFilter}) as avg_energy,
          (SELECT MIN(energy_consumption) FROM energy_readings WHERE equipment_id = $1 AND ${dateFilter}) as min_energy,
          (SELECT MAX(energy_consumption) FROM energy_readings WHERE equipment_id = $1 AND ${dateFilter}) as max_energy,
          (SELECT COUNT(*) FROM energy_readings WHERE equipment_id = $1 AND ${dateFilter}) as energy_count
      `;

      const statsResult = await pool.query(statsQuery, [id]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Lecturas del equipo obtenidas exitosamente', {
        equipment_id: id,
        type,
        days: parseInt(days),
        temperatureReadings,
        energyReadings,
        stats: {
          temperature: {
            average: parseFloat(stats.avg_temperature) || 0,
            minimum: parseFloat(stats.min_temperature) || 0,
            maximum: parseFloat(stats.max_temperature) || 0,
            count: parseInt(stats.temperature_count) || 0
          },
          energy: {
            average: parseFloat(stats.avg_energy) || 0,
            minimum: parseFloat(stats.min_energy) || 0,
            maximum: parseFloat(stats.max_energy) || 0,
            count: parseInt(stats.energy_count) || 0
          }
        }
      });

    } catch (error) {
      console.error('Error en getEquipmentReadings:', error);
      return ResponseHandler.error(res, 'Error al obtener lecturas del equipo', 'FETCH_EQUIPMENT_READINGS_ERROR');
    }
  }

  // POST /api/provider/equipments/:id/readings - Agregar lectura manual
  async addEquipmentReading(req, res) {
    try {
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;
      const { temperature, energy_consumption, reading_date } = req.body;

      // Validar que al menos una lectura se proporcione
      if (temperature === undefined && energy_consumption === undefined) {
        return ResponseHandler.error(res, 'Debe proporcionar al menos temperatura o consumo energético', 'VALIDATION_ERROR');
      }

      // Verificar acceso del proveedor al equipo
      const accessQuery = `
        SELECT COUNT(*) as has_access
        FROM equipments e
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        WHERE e.equipment_id = $1 AND (
          sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          OR e.provider_company_id = $2
        )
      `;

      const accessResult = await pool.query(accessQuery, [id, providerCompanyId]);
      
      if (parseInt(accessResult.rows[0].has_access) === 0) {
        return ResponseHandler.error(res, 'No tiene acceso a este equipo', 'EQUIPMENT_ACCESS_DENIED');
      }

      const readingDate = reading_date || new Date();
      const results = {};

      // Agregar lectura de temperatura si se proporciona
      if (temperature !== undefined) {
        const tempQuery = `
          INSERT INTO temperature_readings (equipment_id, temperature, reading_date, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
        `;
        const tempResult = await pool.query(tempQuery, [id, temperature, readingDate]);
        results.temperatureReading = tempResult.rows[0];
      }

      // Agregar lectura de energía si se proporciona
      if (energy_consumption !== undefined) {
        const energyQuery = `
          INSERT INTO energy_readings (equipment_id, energy_consumption, reading_date, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING *
        `;
        const energyResult = await pool.query(energyQuery, [id, energy_consumption, readingDate]);
        results.energyReading = energyResult.rows[0];
      }

      return ResponseHandler.success(res, 'Lectura agregada exitosamente', {
        equipment_id: id,
        readings: results
      });

    } catch (error) {
      console.error('Error en addEquipmentReading:', error);
      return ResponseHandler.error(res, 'Error al agregar lectura', 'ADD_EQUIPMENT_READING_ERROR');
    }
  }
}

module.exports = new ProviderEquipmentsController();
