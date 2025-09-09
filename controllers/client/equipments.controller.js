const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientEquipmentsController {
  
  // GET /api/client/equipments - Lista de equipos del cliente
  async getEquipments(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        status = '', 
        equipment_type = '',
        location_id = '',
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = ['e.company_id = $1'];
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (search.trim()) {
        paramCount++;
        whereConditions.push(`(
          e.name ILIKE $${paramCount} 
          OR e.model ILIKE $${paramCount} 
          OR e.serial_number ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search.trim()}%`);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`e.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (equipment_type) {
        paramCount++;
        whereConditions.push(`e.equipment_type = $${paramCount}`);
        queryParams.push(equipment_type);
      }

      if (location_id) {
        paramCount++;
        whereConditions.push(`e.equipment_location_id = $${paramCount}`);
        queryParams.push(location_id);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Validar sortBy para prevenir SQL injection
      const validSortFields = ['name', 'equipment_type', 'status', 'installation_date'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'name';
      const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Query principal
      const equipmentsQuery = `
        SELECT 
          e.equipment_id,
          e.name,
          e.type as equipment_type,
          e.model,
          e.serial_number,
          e.status,
          e.manufacturer,
          e.code,
          e.technical_detail as specifications,
          e.power,
          e.consumption,
          e.notes,
          el.address as location_address,
          -- Lecturas más recientes
          (SELECT value FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as current_temperature,
          (SELECT timestamp FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as last_temperature_reading,
          (SELECT consumption FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as current_energy_consumption,
          (SELECT timestamp FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as last_energy_reading,
          -- Estadísticas
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id) as total_service_requests,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id AND status = 'OPEN') as pending_requests,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'SCHEDULED') as scheduled_maintenances
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        ${whereClause}
        ORDER BY e.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        ${whereClause}
      `;

      const [equipmentsResult, countResult] = await Promise.all([
        pool.query(equipmentsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const equipments = equipmentsResult.rows;
      const totalEquipments = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalEquipments / limit);

      return ResponseHandler.success(res, {
        equipments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalEquipments,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          search,
          status,
          equipment_type,
          location_id,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        }
      }, 'Equipos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getEquipments:', error);
      return ResponseHandler.error(res, 'Error al obtener equipos', 'FETCH_EQUIPMENTS_ERROR');
    }
  }

  // GET /api/client/equipments/:id - Detalles de un equipo específico
  async getEquipmentDetails(req, res) {
    try {
      const { id } = req.params;
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const equipmentQuery = `
        SELECT 
          e.*,
          el.address as location_name,
          el.address as location_address,
          el.lat,
          el.lng,
          -- Lecturas más recientes
          (SELECT value FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as current_temperature,
          (SELECT timestamp FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as last_temperature_reading,
          (SELECT consumption FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as current_energy_consumption,
          (SELECT timestamp FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY timestamp DESC LIMIT 1) as last_energy_reading,
          -- Estadísticas
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id) as total_service_requests,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id AND status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')) as active_requests,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id) as total_maintenances,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'SCHEDULED') as scheduled_maintenances
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE e.equipment_id = $1 AND e.company_id = $2
      `;

      const equipmentResult = await pool.query(equipmentQuery, [id, clientCompanyId]);
      
      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND');
      }

      const equipment = equipmentResult.rows[0];

      // Obtener historial reciente de temperaturas
      const temperatureHistoryQuery = `
        SELECT value as temperature, timestamp as reading_date
        FROM temperature_readings
        WHERE equipment_id = $1
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      // Obtener historial reciente de energía
      const energyHistoryQuery = `
        SELECT consumption as energy_consumption, timestamp as reading_date
        FROM energy_readings
        WHERE equipment_id = $1
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      // Obtener solicitudes de servicio recientes
      const serviceRequestsQuery = `
        SELECT 
          sr.service_request_id,
          sr.issue_type as request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.request_date as created_at,
          sr.scheduled_date,
          sr.completion_date as completed_date
        FROM service_requests sr
        WHERE sr.equipment_id = $1
        ORDER BY sr.request_date DESC
        LIMIT 5
      `;

      // Obtener próximos mantenimientos
      const maintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.type as maintenance_type,
          m.date as scheduled_date,
          m.status,
          m.notes as description
        FROM maintenances m
        WHERE m.equipment_id = $1 AND m.status = 'SCHEDULED'
        ORDER BY m.date ASC
        LIMIT 5
      `;

      const [temperatureHistory, energyHistory, serviceRequests, maintenances] = await Promise.all([
        pool.query(temperatureHistoryQuery, [id]),
        pool.query(energyHistoryQuery, [id]),
        pool.query(serviceRequestsQuery, [id]),
        pool.query(maintenancesQuery, [id])
      ]);

      return ResponseHandler.success(res, {
        equipment,
        temperatureHistory: temperatureHistory.rows,
        energyHistory: energyHistory.rows,
        recentServiceRequests: serviceRequests.rows,
        upcomingMaintenances: maintenances.rows
      }, 'Detalles del equipo obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getEquipmentDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del equipo', 'FETCH_EQUIPMENT_DETAILS_ERROR');
    }
  }

  // GET /api/client/equipments/available - Lista de equipos disponibles para solicitar
  async getAvailableEquipments(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        equipment_type = '',
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      // Mostrar equipos que no pertenecen al cliente actual o que no tienen dueño
      // Y que no tienen solicitudes pendientes
      let whereConditions = [
        `(e.company_id IS NULL OR e.company_id != $1)`, // Sin dueño o no pertenecen al cliente actual
        `e.equipment_id NOT IN (
          SELECT DISTINCT equipment_id FROM service_requests 
          WHERE status IN ('OPEN', 'ASSIGNED') 
          AND equipment_id IS NOT NULL
        )` // No tienen solicitudes pendientes
      ];
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (search.trim()) {
        paramCount++;
        whereConditions.push(`(
          e.name ILIKE $${paramCount} 
          OR e.model ILIKE $${paramCount} 
          OR e.manufacturer ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search.trim()}%`);
      }

      if (equipment_type) {
        paramCount++;
        whereConditions.push(`e.type = $${paramCount}`);
        queryParams.push(equipment_type);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Validar sortBy para prevenir SQL injection
      const validSortFields = ['name', 'type', 'manufacturer', 'power'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'name';
      const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Query principal
      const equipmentsQuery = `
        SELECT 
          e.equipment_id,
          e.name,
          e.type as equipment_type,
          e.model,
          e.manufacturer,
          e.technical_detail as specifications,
          e.power,
          e.consumption,
          e.optimal_temperature,
          e.min_temperature,
          e.max_temperature,
          e.drive_type,
          e.cooling_type
        FROM equipments e
        ${whereClause}
        ORDER BY e.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM equipments e
        ${whereClause}
      `;

      const [equipmentsResult, countResult] = await Promise.all([
        pool.query(equipmentsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const equipments = equipmentsResult.rows;
      const totalEquipments = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalEquipments / limit);

      return ResponseHandler.success(res, {
        equipments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalEquipments,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          search,
          equipment_type,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        }
      }, 'Equipos disponibles obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getAvailableEquipments:', error);
      return ResponseHandler.error(res, 'Error al obtener equipos disponibles', 'FETCH_AVAILABLE_EQUIPMENTS_ERROR');
    }
  }

  // POST /api/client/equipments/request - Solicitar un equipo disponible
  async requestEquipment(req, res) {
    try {
      const clientUserId = req.user.id;
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const {
        equipment_id,
        requested_location,
        priority = 'MEDIUM',
        justification,
        preferred_start_date
      } = req.body;

      // Validaciones
      if (!equipment_id || !justification) {
        return ResponseHandler.error(res, 'Campos requeridos: equipment_id, justification', 'VALIDATION_ERROR');
      }

      // Verificar que el equipo existe y está disponible
      const equipmentQuery = `
        SELECT equipment_id, name, type, model, manufacturer
        FROM equipments 
        WHERE equipment_id = $1 
        AND (company_id IS NULL OR company_id != $2)
        AND equipment_id NOT IN (
          SELECT DISTINCT equipment_id FROM service_requests 
          WHERE status IN ('OPEN', 'ASSIGNED') 
          AND equipment_id IS NOT NULL
        )
      `;

      const equipmentResult = await pool.query(equipmentQuery, [equipment_id, clientCompanyId]);
      
      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no disponible, ya asignado o tiene solicitudes pendientes', 'EQUIPMENT_NOT_AVAILABLE');
      }

      const equipment = equipmentResult.rows[0];

      // Crear la solicitud de equipo
      const insertQuery = `
        INSERT INTO service_requests (
          equipment_id,
          user_id,
          issue_type,
          priority,
          status,
          description,
          scheduled_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const requestDescription = `SOLICITUD DE EQUIPO: ${justification}${requested_location ? ' - Ubicación solicitada: ' + requested_location : ''}`;

      const requestValues = [
        equipment_id,
        clientUserId,
        'GENERAL', // Tipo de solicitud para equipos nuevos
        priority,
        'OPEN',
        requestDescription,
        preferred_start_date || null
      ];

      const result = await pool.query(insertQuery, requestValues);

      return ResponseHandler.success(res, {
        equipmentRequest: result.rows[0],
        equipment: {
          equipment_id: equipment.equipment_id,
          name: equipment.name,
          type: equipment.type,
          model: equipment.model,
          manufacturer: equipment.manufacturer
        }
      }, 'Solicitud de equipo enviada exitosamente');

    } catch (error) {
      console.error('Error en requestEquipment:', error);
      return ResponseHandler.error(res, 'Error al solicitar equipo', 'REQUEST_EQUIPMENT_ERROR');
    }
  }
}

module.exports = new ClientEquipmentsController();
