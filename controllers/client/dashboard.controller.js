const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientDashboardController {
  
  // GET /api/client/dashboard - Dashboard principal del cliente
  async getDashboardData(req, res) {
    try {
      const clientUserId = req.user.id;
      const clientCompanyId = req.user.company_id;

      // Validar que el usuario tenga una empresa asignada
      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Usuario no tiene empresa asignada', 'NO_COMPANY_ASSIGNED', 400);
      }

      // Obtener métricas generales del cliente
      const metricsQuery = `
        SELECT 
          -- Equipos
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT CASE WHEN e.status = 'ACTIVE' THEN e.equipment_id END) as active_equipments,
          COUNT(DISTINCT CASE WHEN e.status = 'MAINTENANCE' THEN e.equipment_id END) as maintenance_equipments,
          COUNT(DISTINCT CASE WHEN e.status = 'INACTIVE' THEN e.equipment_id END) as inactive_equipments,
          
          -- Solicitudes de servicio
          COUNT(DISTINCT sr.service_request_id) as total_service_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'OPEN' THEN sr.service_request_id END) as pending_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'IN_PROGRESS' THEN sr.service_request_id END) as in_progress_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'CLOSED' THEN sr.service_request_id END) as completed_requests,
          
          -- Mantenimientos
          COUNT(DISTINCT m.maintenance_id) as total_maintenances,
          COUNT(DISTINCT CASE WHEN m.status = 'SCHEDULED' THEN m.maintenance_id END) as scheduled_maintenances,
          COUNT(DISTINCT CASE WHEN m.status = 'DONE' THEN m.maintenance_id END) as completed_maintenances,
          
          -- Alertas de temperatura
          COUNT(DISTINCT CASE 
            WHEN tr.value > 25 OR tr.value < -18 THEN tr.temperature_reading_id 
          END) as temperature_alerts,
          
          -- Consumo energético promedio (últimos 30 días)
          AVG(er.consumption) as avg_energy_consumption
        FROM equipments e
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        LEFT JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id 
          AND tr.timestamp >= NOW() - INTERVAL '24 hours'
        LEFT JOIN energy_readings er ON e.equipment_id = er.equipment_id
          AND er.timestamp >= NOW() - INTERVAL '30 days'
        WHERE e.company_id = $1
      `;

      // Próximos mantenimientos
      const upcomingMaintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.type as maintenance_type,
          m.date as scheduled_date,
          m.notes as description,
          e.name as equipment_name,
          e.type as equipment_type,
          u.name as technician_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN users u ON m.maintenance_id = u.user_id
        WHERE e.company_id = $1 
        AND m.status = 'SCHEDULED'
        AND m.date >= NOW()
        ORDER BY m.date ASC
        LIMIT 5
      `;

      // Solicitudes recientes
      const recentRequestsQuery = `
        SELECT 
          sr.service_request_id as request_id,
          sr.issue_type as request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.request_date as created_at,
          e.name as equipment_name,
          e.type as equipment_type
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE e.company_id = $1
        ORDER BY sr.request_date DESC
        LIMIT 5
      `;

      // Temperaturas críticas actuales
      const criticalTemperaturesQuery = `
        SELECT DISTINCT ON (e.equipment_id)
          e.equipment_id,
          e.name as equipment_name,
          tr.value as temperature,
          tr.timestamp as reading_date,
          el.address as location_name
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE e.company_id = $1
        AND (tr.value > 25 OR tr.value < -18)
        AND tr.timestamp >= NOW() - INTERVAL '2 hours'
        ORDER BY e.equipment_id, tr.timestamp DESC
        LIMIT 10
      `;

      // Consumo energético del día
      const todayEnergyQuery = `
        SELECT 
          SUM(er.consumption) as total_consumption,
          AVG(er.consumption) as avg_consumption,
          COUNT(er.energy_reading_id) as total_readings
        FROM energy_readings er
        INNER JOIN equipments e ON er.equipment_id = e.equipment_id
        WHERE e.company_id = $1
        AND DATE(er.timestamp) = CURRENT_DATE
      `;

      const [
        metricsResult,
        upcomingMaintenancesResult,
        recentRequestsResult,
        criticalTemperaturesResult,
        todayEnergyResult
      ] = await Promise.all([
        pool.query(metricsQuery, [clientCompanyId]),
        pool.query(upcomingMaintenancesQuery, [clientCompanyId]),
        pool.query(recentRequestsQuery, [clientCompanyId]),
        pool.query(criticalTemperaturesQuery, [clientCompanyId]),
        pool.query(todayEnergyQuery, [clientCompanyId])
      ]);

      const metrics = metricsResult.rows[0];
      const todayEnergy = todayEnergyResult.rows[0];

      return ResponseHandler.success(res, {
        metrics: {
          equipments: {
            total: parseInt(metrics.total_equipments) || 0,
            active: parseInt(metrics.active_equipments) || 0,
            maintenance: parseInt(metrics.maintenance_equipments) || 0,
            inactive: parseInt(metrics.inactive_equipments) || 0
          },
          serviceRequests: {
            total: parseInt(metrics.total_service_requests) || 0,
            pending: parseInt(metrics.pending_requests) || 0,
            inProgress: parseInt(metrics.in_progress_requests) || 0,
            completed: parseInt(metrics.completed_requests) || 0
          },
          maintenances: {
            total: parseInt(metrics.total_maintenances) || 0,
            scheduled: parseInt(metrics.scheduled_maintenances) || 0,
            completed: parseInt(metrics.completed_maintenances) || 0
          },
          alerts: {
            temperature: parseInt(metrics.temperature_alerts) || 0
          },
          energy: {
            avgMonthlyConsumption: parseFloat(metrics.avg_energy_consumption) || 0,
            todayTotal: parseFloat(todayEnergy.total_consumption) || 0,
            todayAverage: parseFloat(todayEnergy.avg_consumption) || 0,
            todayReadings: parseInt(todayEnergy.total_readings) || 0
          }
        },
        upcomingMaintenances: upcomingMaintenancesResult.rows,
        recentServiceRequests: recentRequestsResult.rows,
        criticalTemperatures: criticalTemperaturesResult.rows
      }, 'Dashboard del cliente obtenido exitosamente');

    } catch (error) {
      console.error('Error en getDashboardData:', error);
      return ResponseHandler.error(res, 'Error al obtener datos del dashboard', 'FETCH_DASHBOARD_ERROR');
    }
  }

  // GET /api/client/dashboard/metrics - Métricas específicas
  async getDashboardMetrics(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      // Validar que el usuario tenga una empresa asignada
      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Usuario no tiene empresa asignada', 'NO_COMPANY_ASSIGNED', 400);
      }

      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT CASE WHEN e.status = 'ACTIVE' THEN e.equipment_id END) as active_equipments,
          COUNT(DISTINCT sr.service_request_id) as total_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'OPEN' THEN sr.service_request_id END) as pending_requests,
          COUNT(DISTINCT m.maintenance_id) as total_maintenances,
          COUNT(DISTINCT CASE WHEN m.date > NOW() AND m.status = 'SCHEDULED' THEN m.maintenance_id END) as upcoming_maintenances
        FROM equipments e
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        WHERE e.company_id = $1
      `;

      const result = await pool.query(metricsQuery, [clientCompanyId]);
      const metrics = result.rows[0];

      return ResponseHandler.success(res, {
        totalEquipments: parseInt(metrics.total_equipments) || 0,
        activeEquipments: parseInt(metrics.active_equipments) || 0,
        totalRequests: parseInt(metrics.total_requests) || 0,
        pendingRequests: parseInt(metrics.pending_requests) || 0,
        totalMaintenances: parseInt(metrics.total_maintenances) || 0,
        upcomingMaintenances: parseInt(metrics.upcoming_maintenances) || 0
      }, 'Métricas obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getDashboardMetrics:', error);
      return ResponseHandler.error(res, 'Error al obtener métricas', 'FETCH_METRICS_ERROR');
    }
  }

  // GET /api/client/dashboard/temperature - Datos de temperatura para dashboard
  async getTemperatureData(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      // Validar que el usuario tenga una empresa asignada
      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Usuario no tiene empresa asignada', 'NO_COMPANY_ASSIGNED', 400);
      }

      const temperatureQuery = `
        SELECT 
          e.equipment_id,
          e.name as equipment_name,
          tr.value as temperature,
          tr.timestamp as reading_date,
          el.address as location_name,
          CASE 
            WHEN tr.value > 25 OR tr.value < -18 THEN 'CRITICAL'
            WHEN tr.value > 20 OR tr.value < -15 THEN 'WARNING'
            ELSE 'NORMAL'
          END as status
        FROM equipments e
        INNER JOIN (
          SELECT DISTINCT ON (equipment_id) 
            equipment_id, value, timestamp
          FROM temperature_readings 
          WHERE timestamp >= NOW() - INTERVAL '2 hours'
          ORDER BY equipment_id, timestamp DESC
        ) tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE e.company_id = $1
        ORDER BY tr.timestamp DESC
      `;

      const result = await pool.query(temperatureQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        temperatureReadings: result.rows
      }, 'Datos de temperatura obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getTemperatureData:', error);
      return ResponseHandler.error(res, 'Error al obtener datos de temperatura', 'FETCH_TEMPERATURE_DATA_ERROR');
    }
  }

  // GET /api/client/dashboard/energy - Datos de energía para dashboard
  async getEnergyData(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      // Validar que el usuario tenga una empresa asignada
      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Usuario no tiene empresa asignada', 'NO_COMPANY_ASSIGNED', 400);
      }

      const energyQuery = `
        SELECT 
          e.equipment_id,
          e.name as equipment_name,
          er.consumption as energy_consumption,
          er.timestamp as reading_date,
          el.address as location_name
        FROM equipments e
        INNER JOIN (
          SELECT DISTINCT ON (equipment_id) 
            equipment_id, consumption, timestamp
          FROM energy_readings 
          WHERE timestamp >= NOW() - INTERVAL '24 hours'
          ORDER BY equipment_id, timestamp DESC
        ) er ON e.equipment_id = er.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE e.company_id = $1
        ORDER BY er.timestamp DESC
      `;

      const result = await pool.query(energyQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        energyReadings: result.rows
      }, 'Datos de energía obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getEnergyData:', error);
      return ResponseHandler.error(res, 'Error al obtener datos de energía', 'FETCH_ENERGY_DATA_ERROR');
    }
  }

  // GET /api/client/dashboard/service-requests - Solicitudes recientes
  async getRecentServiceRequests(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      // Validar que el usuario tenga una empresa asignada
      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Usuario no tiene empresa asignada', 'NO_COMPANY_ASSIGNED', 400);
      }

      const requestsQuery = `
        SELECT 
          sr.service_request_id as request_id,
          sr.issue_type as request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.request_date as created_at,
          sr.scheduled_date,
          e.name as equipment_name,
          e.type as equipment_type
        FROM service_requests sr
        INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE e.company_id = $1
        ORDER BY sr.request_date DESC
        LIMIT 10
      `;

      const result = await pool.query(requestsQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        serviceRequests: result.rows
      }, 'Solicitudes recientes obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getRecentServiceRequests:', error);
      return ResponseHandler.error(res, 'Error al obtener solicitudes recientes', 'FETCH_RECENT_REQUESTS_ERROR');
    }
  }

  // GET /api/client/dashboard/maintenances - Próximos mantenimientos
  async getUpcomingMaintenances(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      // Validar que el usuario tenga una empresa asignada
      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Usuario no tiene empresa asignada', 'NO_COMPANY_ASSIGNED', 400);
      }

      const maintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.type as maintenance_type,
          m.date as scheduled_date,
          m.notes as description,
          e.name as equipment_name,
          e.type as equipment_type,
          u.name as technician_name,
          el.address as location_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN users u ON m.maintenance_id = u.user_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE e.company_id = $1 
        AND m.status = 'SCHEDULED'
        AND m.date >= NOW()
        ORDER BY m.date ASC
        LIMIT 10
      `;

      const result = await pool.query(maintenancesQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        upcomingMaintenances: result.rows
      }, 'Próximos mantenimientos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getUpcomingMaintenances:', error);
      return ResponseHandler.error(res, 'Error al obtener próximos mantenimientos', 'FETCH_UPCOMING_MAINTENANCES_ERROR');
    }
  }
}

module.exports = new ClientDashboardController();
