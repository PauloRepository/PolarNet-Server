// controllers/provider/dashboard.controller.js
const db = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

// Dashboard principal para proveedores - métricas generales
const getDashboardMetrics = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    // Ejecutar todas las consultas en paralelo para mejor performance
    const [
      clientsResult,
      equipmentsResult, 
      serviceRequestsResult,
      maintenancesResult,
      revenueResult
    ] = await Promise.all([
      // Total de clientes asignados
      db.query(`
        SELECT COUNT(DISTINCT e.company_id) as total_clients
        FROM equipments e
        WHERE e.company_id IN (
          SELECT DISTINCT company_id 
          FROM service_requests sr 
          WHERE sr.provider_user_id IN (
            SELECT user_id FROM users WHERE company_id = $1
          )
        )
      `, [companyId]),

      // Equipos bajo gestión
      db.query(`
        SELECT 
          COUNT(*) as total_equipments,
          COUNT(CASE WHEN e.status = 'ACTIVO' THEN 1 END) as active_equipments,
          COUNT(CASE WHEN e.status = 'MANTENIMIENTO' THEN 1 END) as maintenance_equipments
        FROM equipments e
        WHERE e.company_id IN (
          SELECT DISTINCT company_id 
          FROM service_requests sr 
          WHERE sr.provider_user_id IN (
            SELECT user_id FROM users WHERE company_id = $1
          )
        )
      `, [companyId]),

      // Solicitudes de servicio
      db.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'PENDIENTE' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN sr.status = 'EN_PROGRESO' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN sr.status = 'COMPLETADA' THEN 1 END) as completed_requests
        FROM service_requests sr
        WHERE sr.provider_user_id IN (
          SELECT user_id FROM users WHERE company_id = $1
        )
        AND sr.requested_date >= NOW() - INTERVAL '30 days'
      `, [companyId]),

      // Mantenimientos
      db.query(`
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN m.status = 'PROGRAMADO' THEN 1 END) as scheduled_maintenances,
          COUNT(CASE WHEN m.status = 'COMPLETADO' THEN 1 END) as completed_maintenances
        FROM maintenances m
        WHERE m.technician_user_id IN (
          SELECT user_id FROM users WHERE company_id = $1
        )
        AND m.scheduled_date >= NOW() - INTERVAL '30 days'
      `, [companyId]),

      // Ingresos estimados (basado en costos de servicios completados)
      db.query(`
        SELECT 
          COALESCE(SUM(sr.actual_cost), 0) as monthly_revenue,
          COALESCE(SUM(m.cost), 0) as maintenance_revenue
        FROM service_requests sr
        FULL OUTER JOIN maintenances m ON m.technician_user_id = sr.provider_user_id
        WHERE (sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
           OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1))
        AND (sr.completed_date >= NOW() - INTERVAL '30 days' 
           OR m.completed_date >= NOW() - INTERVAL '30 days')
        AND (sr.status = 'COMPLETADA' OR m.status = 'COMPLETADO')
      `, [companyId])
    ]);

    const clients = clientsResult.rows[0];
    const equipments = equipmentsResult.rows[0];
    const serviceRequests = serviceRequestsResult.rows[0];
    const maintenances = maintenancesResult.rows[0];
    const revenue = revenueResult.rows[0];

    const metrics = {
      clients: {
        total: parseInt(clients.total_clients) || 0
      },
      equipments: {
        total: parseInt(equipments.total_equipments) || 0,
        active: parseInt(equipments.active_equipments) || 0,
        inMaintenance: parseInt(equipments.maintenance_equipments) || 0
      },
      serviceRequests: {
        total: parseInt(serviceRequests.total_requests) || 0,
        pending: parseInt(serviceRequests.pending_requests) || 0,
        inProgress: parseInt(serviceRequests.in_progress_requests) || 0,
        completed: parseInt(serviceRequests.completed_requests) || 0
      },
      maintenances: {
        total: parseInt(maintenances.total_maintenances) || 0,
        scheduled: parseInt(maintenances.scheduled_maintenances) || 0,
        completed: parseInt(maintenances.completed_maintenances) || 0
      },
      revenue: {
        monthly: parseFloat(revenue.monthly_revenue) || 0,
        fromMaintenance: parseFloat(revenue.maintenance_revenue) || 0,
        total: (parseFloat(revenue.monthly_revenue) || 0) + (parseFloat(revenue.maintenance_revenue) || 0)
      }
    };

    return ResponseHandler.success(res, 'Métricas del dashboard obtenidas correctamente', metrics);

  } catch (error) {
    console.error('Error obteniendo métricas del dashboard:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

// Obtener solicitudes de servicio recientes asignadas al proveedor
const getRecentServiceRequests = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { limit = 10 } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    const query = `
      SELECT 
        sr.service_request_id,
        sr.description,
        sr.priority,
        sr.status,
        sr.requested_date,
        sr.scheduled_date,
        e.name as equipment_name,
        e.type as equipment_type,
        c.name as client_company_name,
        u_requester.name as requester_name
      FROM service_requests sr
      JOIN equipments e ON sr.equipment_id = e.equipment_id
      JOIN companies c ON e.company_id = c.company_id
      LEFT JOIN users u_requester ON sr.requester_user_id = u_requester.user_id
      WHERE sr.provider_user_id IN (
        SELECT user_id FROM users WHERE company_id = $1
      )
      ORDER BY sr.requested_date DESC
      LIMIT $2
    `;

    const result = await db.query(query, [companyId, parseInt(limit)]);

    const serviceRequests = result.rows.map(row => ({
      id: row.service_request_id.toString(),
      description: row.description,
      priority: row.priority,
      status: row.status,
      requestedDate: row.requested_date,
      scheduledDate: row.scheduled_date,
      equipment: {
        name: row.equipment_name,
        type: row.equipment_type
      },
      client: {
        companyName: row.client_company_name,
        requesterName: row.requester_name
      }
    }));

    return ResponseHandler.success(res, 'Solicitudes de servicio recientes obtenidas correctamente', serviceRequests);

  } catch (error) {
    console.error('Error obteniendo solicitudes recientes:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

// Obtener próximos mantenimientos programados
const getUpcomingMaintenances = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { days = 30, limit = 10 } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    const query = `
      SELECT 
        m.maintenance_id,
        m.type,
        m.scheduled_date,
        m.status,
        e.name as equipment_name,
        e.type as equipment_type,
        c.name as client_company_name,
        el.address as equipment_location
      FROM maintenances m
      JOIN equipments e ON m.equipment_id = e.equipment_id
      JOIN companies c ON e.company_id = c.company_id
      LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
      WHERE m.technician_user_id IN (
        SELECT user_id FROM users WHERE company_id = $1
      )
      AND m.status IN ('PROGRAMADO', 'EN_PROGRESO')
      AND m.scheduled_date <= NOW() + INTERVAL '${parseInt(days)} days'
      ORDER BY m.scheduled_date ASC
      LIMIT $2
    `;

    const result = await db.query(query, [companyId, parseInt(limit)]);

    const maintenances = result.rows.map(row => ({
      id: row.maintenance_id.toString(),
      type: row.type,
      scheduledDate: row.scheduled_date,
      status: row.status,
      equipment: {
        name: row.equipment_name,
        type: row.equipment_type,
        location: row.equipment_location
      },
      client: {
        companyName: row.client_company_name
      },
      daysUntilDue: Math.ceil((new Date(row.scheduled_date) - new Date()) / (1000 * 60 * 60 * 24)),
      isOverdue: new Date(row.scheduled_date) < new Date()
    }));

    return ResponseHandler.success(res, 'Próximos mantenimientos obtenidos correctamente', maintenances);

  } catch (error) {
    console.error('Error obteniendo próximos mantenimientos:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

// Obtener alertas críticas que requieren atención inmediata
const getCriticalAlerts = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    const [temperatureAlertsResult, overdueMaintenanceResult] = await Promise.all([
      // Alertas de temperatura crítica
      db.query(`
        SELECT DISTINCT ON (e.equipment_id)
          e.name as equipment_name,
          e.type as equipment_type,
          tr.value as current_temperature,
          e.min_temperature,
          e.max_temperature,
          tr.timestamp,
          c.name as client_company_name
        FROM temperature_readings tr
        JOIN equipments e ON tr.equipment_id = e.equipment_id
        JOIN companies c ON e.company_id = c.company_id
        WHERE e.company_id IN (
          SELECT DISTINCT company_id 
          FROM service_requests sr 
          WHERE sr.provider_user_id IN (
            SELECT user_id FROM users WHERE company_id = $1
          )
        )
        AND (tr.value < e.min_temperature - 2 OR tr.value > e.max_temperature + 2)
        AND tr.timestamp >= NOW() - INTERVAL '2 hours'
        ORDER BY e.equipment_id, tr.timestamp DESC
      `, [companyId]),

      // Mantenimientos vencidos
      db.query(`
        SELECT 
          m.maintenance_id,
          m.type,
          m.scheduled_date,
          e.name as equipment_name,
          c.name as client_company_name,
          EXTRACT(day FROM NOW() - m.scheduled_date) as days_overdue
        FROM maintenances m
        JOIN equipments e ON m.equipment_id = e.equipment_id
        JOIN companies c ON e.company_id = c.company_id
        WHERE m.technician_user_id IN (
          SELECT user_id FROM users WHERE company_id = $1
        )
        AND m.status = 'PROGRAMADO'
        AND m.scheduled_date < NOW()
        ORDER BY m.scheduled_date ASC
        LIMIT 5
      `, [companyId])
    ]);

    const alerts = {
      temperatureAlerts: temperatureAlertsResult.rows.map(row => ({
        type: 'TEMPERATURE_CRITICAL',
        equipmentName: row.equipment_name,
        equipmentType: row.equipment_type,
        currentTemperature: parseFloat(row.current_temperature),
        optimalRange: {
          min: parseFloat(row.min_temperature),
          max: parseFloat(row.max_temperature)
        },
        timestamp: row.timestamp,
        clientCompany: row.client_company_name,
        severity: 'CRITICAL'
      })),
      overdueMaintenances: overdueMaintenanceResult.rows.map(row => ({
        type: 'MAINTENANCE_OVERDUE',
        maintenanceId: row.maintenance_id.toString(),
        maintenanceType: row.type,
        equipmentName: row.equipment_name,
        scheduledDate: row.scheduled_date,
        daysOverdue: parseInt(row.days_overdue),
        clientCompany: row.client_company_name,
        severity: parseInt(row.days_overdue) > 7 ? 'CRITICAL' : 'HIGH'
      }))
    };

    return ResponseHandler.success(res, 'Alertas críticas obtenidas correctamente', alerts);

  } catch (error) {
    console.error('Error obteniendo alertas críticas:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

// Obtener datos completos del dashboard en una sola llamada
const getDashboardData = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    // Ejecutar todas las llamadas en paralelo
    const [metricsResponse, serviceRequestsResponse, maintenancesResponse, alertsResponse] = await Promise.all([
      getDashboardMetrics(req, { ...res, headersSent: false }),
      getRecentServiceRequests(req, { ...res, headersSent: false }),
      getUpcomingMaintenances(req, { ...res, headersSent: false }),
      getCriticalAlerts(req, { ...res, headersSent: false })
    ]);

    // Extraer los datos de las respuestas simuladas
    const dashboard = {
      metrics: metricsResponse?.data || {},
      recentServiceRequests: serviceRequestsResponse?.data || [],
      upcomingMaintenances: maintenancesResponse?.data || [],
      criticalAlerts: alertsResponse?.data || {}
    };

    return ResponseHandler.success(res, 'Datos del dashboard obtenidos correctamente', dashboard);

  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

module.exports = {
  getDashboardMetrics,
  getRecentServiceRequests,
  getUpcomingMaintenances,
  getCriticalAlerts,
  getDashboardData
};
