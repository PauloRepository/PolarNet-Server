const pool = require('../../lib/db');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientEquipmentsController {
  
  // GET /api/client/equipments - Lista de equipos del cliente
  async getEquipments(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        status = '', 
        equipment_type = '',
        location_id = '',
        sortBy = 'equipment_name',
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
          e.equipment_name ILIKE $${paramCount} 
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
        whereConditions.push(`e.location_id = $${paramCount}`);
        queryParams.push(location_id);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Validar sortBy para prevenir SQL injection
      const validSortFields = ['equipment_name', 'equipment_type', 'status', 'installation_date'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'equipment_name';
      const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Query principal
      const equipmentsQuery = `
        SELECT 
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
          e.specifications,
          el.location_name,
          el.address as location_address,
          -- Lecturas más recientes
          (SELECT temperature FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_temperature,
          (SELECT reading_date FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as last_temperature_reading,
          (SELECT energy_consumption FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_energy_consumption,
          (SELECT reading_date FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as last_energy_reading,
          -- Estadísticas
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id) as total_service_requests,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id AND status = 'PENDIENTE') as pending_requests,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'PROGRAMADO') as scheduled_maintenances
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
        ORDER BY e.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
      `;

      const [equipmentsResult, countResult] = await Promise.all([
        pool.query(equipmentsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const equipments = equipmentsResult.rows;
      const totalEquipments = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalEquipments / limit);

      return ResponseHandler.success(res, 'Equipos obtenidos exitosamente', {
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
      });

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

      const equipmentQuery = `
        SELECT 
          e.*,
          el.location_name,
          el.address as location_address,
          el.coordinates,
          -- Lecturas más recientes
          (SELECT temperature FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_temperature,
          (SELECT reading_date FROM temperature_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as last_temperature_reading,
          (SELECT energy_consumption FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as current_energy_consumption,
          (SELECT reading_date FROM energy_readings WHERE equipment_id = e.equipment_id ORDER BY reading_date DESC LIMIT 1) as last_energy_reading,
          -- Estadísticas
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id) as total_service_requests,
          (SELECT COUNT(*) FROM service_requests WHERE equipment_id = e.equipment_id AND status IN ('PENDIENTE', 'EN_PROCESO')) as active_requests,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id) as total_maintenances,
          (SELECT COUNT(*) FROM maintenances WHERE equipment_id = e.equipment_id AND status = 'PROGRAMADO') as scheduled_maintenances
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE e.equipment_id = $1 AND e.company_id = $2
      `;

      const equipmentResult = await pool.query(equipmentQuery, [id, clientCompanyId]);
      
      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND');
      }

      const equipment = equipmentResult.rows[0];

      // Obtener historial reciente de temperaturas
      const temperatureHistoryQuery = `
        SELECT temperature, reading_date
        FROM temperature_readings
        WHERE equipment_id = $1
        ORDER BY reading_date DESC
        LIMIT 10
      `;

      // Obtener historial reciente de energía
      const energyHistoryQuery = `
        SELECT energy_consumption, reading_date
        FROM energy_readings
        WHERE equipment_id = $1
        ORDER BY reading_date DESC
        LIMIT 10
      `;

      // Obtener solicitudes de servicio recientes
      const serviceRequestsQuery = `
        SELECT 
          sr.request_id,
          sr.request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.created_at,
          sr.scheduled_date,
          sr.completed_date
        FROM service_requests sr
        WHERE sr.equipment_id = $1
        ORDER BY sr.created_at DESC
        LIMIT 5
      `;

      // Obtener próximos mantenimientos
      const maintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.maintenance_type,
          m.scheduled_date,
          m.status,
          m.description,
          u.first_name as technician_first_name,
          u.last_name as technician_last_name
        FROM maintenances m
        LEFT JOIN users u ON m.technician_user_id = u.user_id
        WHERE m.equipment_id = $1 AND m.status = 'PROGRAMADO'
        ORDER BY m.scheduled_date ASC
        LIMIT 5
      `;

      const [temperatureHistory, energyHistory, serviceRequests, maintenances] = await Promise.all([
        pool.query(temperatureHistoryQuery, [id]),
        pool.query(energyHistoryQuery, [id]),
        pool.query(serviceRequestsQuery, [id]),
        pool.query(maintenancesQuery, [id])
      ]);

      return ResponseHandler.success(res, 'Detalles del equipo obtenidos exitosamente', {
        equipment,
        temperatureHistory: temperatureHistory.rows,
        energyHistory: energyHistory.rows,
        recentServiceRequests: serviceRequests.rows,
        upcomingMaintenances: maintenances.rows
      });

    } catch (error) {
      console.error('Error en getEquipmentDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del equipo', 'FETCH_EQUIPMENT_DETAILS_ERROR');
    }
  }

  // GET /api/client/equipments/:id/temperature-history - Historial de temperaturas
  async getEquipmentTemperatureHistory(req, res) {
    try {
      const { id } = req.params;
      const clientCompanyId = req.user.company_id;
      const { 
        days = 7,
        limit = 100 
      } = req.query;

      // Verificar que el equipo pertenece al cliente
      const equipmentQuery = `
        SELECT equipment_id, equipment_name 
        FROM equipments 
        WHERE equipment_id = $1 AND company_id = $2
      `;

      const equipmentResult = await pool.query(equipmentQuery, [id, clientCompanyId]);
      
      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND');
      }

      const temperatureQuery = `
        SELECT 
          temperature, 
          reading_date,
          CASE 
            WHEN temperature > 25 OR temperature < -18 THEN 'CRITICAL'
            WHEN temperature > 20 OR temperature < -15 THEN 'WARNING'
            ELSE 'NORMAL'
          END as status
        FROM temperature_readings
        WHERE equipment_id = $1 
        AND reading_date >= NOW() - INTERVAL '${parseInt(days)} days'
        ORDER BY reading_date DESC
        LIMIT $2
      `;

      const result = await pool.query(temperatureQuery, [id, limit]);

      // Estadísticas del período
      const statsQuery = `
        SELECT 
          AVG(temperature) as avg_temperature,
          MIN(temperature) as min_temperature,
          MAX(temperature) as max_temperature,
          COUNT(*) as total_readings,
          COUNT(CASE WHEN temperature > 25 OR temperature < -18 THEN 1 END) as critical_readings
        FROM temperature_readings
        WHERE equipment_id = $1 
        AND reading_date >= NOW() - INTERVAL '${parseInt(days)} days'
      `;

      const statsResult = await pool.query(statsQuery, [id]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Historial de temperaturas obtenido exitosamente', {
        equipment: equipmentResult.rows[0],
        temperatureHistory: result.rows,
        period: parseInt(days),
        statistics: {
          averageTemperature: parseFloat(stats.avg_temperature) || 0,
          minimumTemperature: parseFloat(stats.min_temperature) || 0,
          maximumTemperature: parseFloat(stats.max_temperature) || 0,
          totalReadings: parseInt(stats.total_readings) || 0,
          criticalReadings: parseInt(stats.critical_readings) || 0
        }
      });

    } catch (error) {
      console.error('Error en getEquipmentTemperatureHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial de temperaturas', 'FETCH_TEMPERATURE_HISTORY_ERROR');
    }
  }

  // POST /api/client/equipments/:id/service-request - Solicitar servicio para equipo
  async requestEquipmentService(req, res) {
    try {
      const { id } = req.params;
      const clientUserId = req.user.user_id;
      const clientCompanyId = req.user.company_id;
      const {
        request_type,
        priority = 'MEDIA',
        description,
        scheduled_date
      } = req.body;

      // Validaciones
      if (!request_type || !description) {
        return ResponseHandler.error(res, 'Campos requeridos: request_type, description', 'VALIDATION_ERROR');
      }

      // Verificar que el equipo pertenece al cliente
      const equipmentQuery = `
        SELECT equipment_id, equipment_name, status 
        FROM equipments 
        WHERE equipment_id = $1 AND company_id = $2
      `;

      const equipmentResult = await pool.query(equipmentQuery, [id, clientCompanyId]);
      
      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND');
      }

      const equipment = equipmentResult.rows[0];

      // Crear la solicitud de servicio
      const insertQuery = `
        INSERT INTO service_requests (
          equipment_id,
          requester_user_id,
          request_type,
          priority,
          status,
          description,
          scheduled_date,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;

      const requestValues = [
        id,
        clientUserId,
        request_type,
        priority,
        'PENDIENTE',
        description,
        scheduled_date || null
      ];

      const result = await pool.query(insertQuery, requestValues);

      return ResponseHandler.success(res, 'Solicitud de servicio creada exitosamente', {
        serviceRequest: result.rows[0],
        equipment: {
          equipment_id: equipment.equipment_id,
          equipment_name: equipment.equipment_name
        }
      });

    } catch (error) {
      console.error('Error en requestEquipmentService:', error);
      return ResponseHandler.error(res, 'Error al crear solicitud de servicio', 'CREATE_SERVICE_REQUEST_ERROR');
    }
  }
}

module.exports = new ClientEquipmentsController();
