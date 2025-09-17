const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');

class DashboardController {
  // GET /api/client/dashboard - Dashboard principal del cliente
  async getDashboardMetrics(req, res) {
    try {
      const { clientCompanyId } = req.user;

      // Métricas principales
      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT ar.equipment_id) as rented_equipments,
          COUNT(DISTINCT CASE WHEN sr.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') THEN sr.service_request_id END) as pending_services,
          COUNT(DISTINCT CASE WHEN i.status = 'PENDING' AND i.due_date < CURRENT_DATE THEN i.invoice_id END) as overdue_invoices,
          COUNT(DISTINCT CASE WHEN i.status = 'PENDING' THEN i.invoice_id END) as pending_invoices,
          SUM(ar.monthly_rate) as monthly_cost,
          COUNT(DISTINCT CASE WHEN m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days' THEN m.maintenance_id END) as upcoming_maintenances
        FROM active_rentals ar
        LEFT JOIN service_requests sr ON ar.client_company_id = sr.client_company_id
        LEFT JOIN invoices i ON ar.client_company_id = i.client_company_id
        LEFT JOIN maintenances m ON ar.equipment_id = m.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
      `;

      const metricsResult = await db.query(metricsQuery, [clientCompanyId]);
      const metrics = metricsResult.rows[0];

      // Alertas de temperatura críticas
      const alertsQuery = `
        SELECT 
          COUNT(*) as critical_alerts,
          COUNT(CASE WHEN tr.status = 'ALERT' AND tr.timestamp >= CURRENT_DATE THEN 1 END) as todays_alerts
        FROM temperature_readings tr
        INNER JOIN equipments e ON tr.equipment_id = e.equipment_id
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1 
          AND ar.status = 'ACTIVE'
          AND tr.status = 'ALERT'
          AND tr.timestamp >= CURRENT_DATE - interval '7 days'
      `;

      const alertsResult = await db.query(alertsQuery, [clientCompanyId]);
      const alerts = alertsResult.rows[0];

      // Equipos por ubicación
      const locationStatsQuery = `
        SELECT 
          el.name as location_name,
          COUNT(DISTINCT ar.equipment_id) as equipment_count,
          AVG(tr.value) as avg_temperature
        FROM equipment_locations el
        INNER JOIN equipments e ON el.equipment_location_id = e.current_location_id
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id 
          AND tr.timestamp >= CURRENT_DATE - interval '1 day'
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
        GROUP BY el.equipment_location_id, el.name
        ORDER BY equipment_count DESC
      `;

      const locationStatsResult = await db.query(locationStatsQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        metrics: {
          rentedEquipments: parseInt(metrics.rented_equipments) || 0,
          pendingServices: parseInt(metrics.pending_services) || 0,
          overdueInvoices: parseInt(metrics.overdue_invoices) || 0,
          pendingInvoices: parseInt(metrics.pending_invoices) || 0,
          monthlyCost: parseFloat(metrics.monthly_cost) || 0,
          upcomingMaintenances: parseInt(metrics.upcoming_maintenances) || 0,
          criticalAlerts: parseInt(alerts.critical_alerts) || 0,
          todaysAlerts: parseInt(alerts.todays_alerts) || 0
        },
        locationStats: locationStatsResult.rows.map(location => ({
          locationName: location.location_name,
          equipmentCount: parseInt(location.equipment_count),
          avgTemperature: location.avg_temperature ? parseFloat(location.avg_temperature).toFixed(1) : null
        }))
      }, 'Dashboard obtenido exitosamente');

    } catch (error) {
      console.error('Error en getDashboardMetrics:', error);
      return ResponseHandler.error(res, 'Error al obtener dashboard', 'GET_DASHBOARD_ERROR', 500);
    }
  }

  // GET /api/client/dashboard/activities - Actividades recientes
  async getRecentActivities(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { limit = 10 } = req.query;

      const activitiesQuery = `
        (
          SELECT 
            'service_request' as type,
            sr.service_request_id::text as entity_id,
            'Solicitud de servicio: ' || sr.title as description,
            COALESCE(c.name, 'Proveedor no asignado') as provider_name,
            sr.request_date as activity_date,
            sr.priority
          FROM service_requests sr
          LEFT JOIN companies c ON sr.provider_company_id = c.company_id
          WHERE sr.client_company_id = $1
            AND sr.request_date >= CURRENT_DATE - interval '7 days'
        )
        UNION ALL
        (
          SELECT 
            'maintenance' as type,
            m.maintenance_id::text as entity_id,
            'Mantenimiento programado: ' || COALESCE(m.title, m.type) as description,
            c.name as provider_name,
            m.scheduled_date::timestamp as activity_date,
            'MEDIUM' as priority
          FROM maintenances m
          LEFT JOIN companies c ON m.provider_company_id = c.company_id
          WHERE m.client_company_id = $1
            AND m.scheduled_date >= CURRENT_DATE - interval '7 days'
        )
        UNION ALL
        (
          SELECT 
            'invoice' as type,
            i.invoice_id::text as entity_id,
            'Nueva factura por $' || i.total_amount::text as description,
            c.name as provider_name,
            i.issue_date::timestamp as activity_date,
            CASE WHEN i.due_date < CURRENT_DATE THEN 'HIGH' ELSE 'LOW' END as priority
          FROM invoices i
          LEFT JOIN companies c ON i.provider_company_id = c.company_id
          WHERE i.client_company_id = $1
            AND i.issue_date >= CURRENT_DATE - interval '7 days'
        )
        ORDER BY activity_date DESC
        LIMIT $2
      `;

      const result = await db.query(activitiesQuery, [clientCompanyId, limit]);

      const activities = result.rows.map(activity => ({
        type: activity.type,
        entityId: activity.entity_id,
        description: activity.description,
        providerName: activity.provider_name,
        activityDate: activity.activity_date,
        priority: activity.priority
      }));

      return ResponseHandler.success(res, {
        activities
      }, 'Actividades recientes obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getRecentActivities:', error);
      return ResponseHandler.error(res, 'Error al obtener actividades', 'GET_ACTIVITIES_ERROR', 500);
    }
  }

  // GET /api/client/dashboard/alerts - Alertas importantes
  async getAlerts(req, res) {
    try {
      const { clientCompanyId } = req.user;

      const alertsQuery = `
        (
          SELECT 
            'temperature_alert' as type,
            'HIGH' as priority,
            'Alerta de temperatura en ' || e.name || ': ' || tr.value || '°C' as message,
            tr.timestamp as alert_date,
            e.equipment_id::text as entity_id
          FROM temperature_readings tr
          INNER JOIN equipments e ON tr.equipment_id = e.equipment_id
          INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
          WHERE ar.client_company_id = $1 
            AND ar.status = 'ACTIVE'
            AND tr.status = 'ALERT'
            AND tr.timestamp >= CURRENT_DATE - interval '1 day'
        )
        UNION ALL
        (
          SELECT 
            'overdue_invoice' as type,
            'HIGH' as priority,
            'Factura vencida: ' || c.name || ' - $' || i.total_amount as message,
            i.due_date::timestamp as alert_date,
            i.invoice_id::text as entity_id
          FROM invoices i
          LEFT JOIN companies c ON i.provider_company_id = c.company_id
          WHERE i.client_company_id = $1 
            AND i.status = 'PENDING'
            AND i.due_date < CURRENT_DATE
        )
        UNION ALL
        (
          SELECT 
            'maintenance_due' as type,
            'MEDIUM' as priority,
            'Mantenimiento programado: ' || e.name || ' - ' || m.scheduled_date as message,
            m.scheduled_date::timestamp as alert_date,
            m.maintenance_id::text as entity_id
          FROM maintenances m
          INNER JOIN equipments e ON m.equipment_id = e.equipment_id
          INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
          WHERE ar.client_company_id = $1 
            AND ar.status = 'ACTIVE'
            AND m.status = 'SCHEDULED'
            AND m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 days'
        )
        UNION ALL
        (
          SELECT 
            'service_urgent' as type,
            'HIGH' as priority,
            'Servicio urgente pendiente: ' || sr.title as message,
            sr.request_date as alert_date,
            sr.service_request_id::text as entity_id
          FROM service_requests sr
          WHERE sr.client_company_id = $1 
            AND sr.priority = 'CRITICAL'
            AND sr.status IN ('OPEN', 'ASSIGNED')
        )
        ORDER BY 
          CASE priority 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            ELSE 3 
          END,
          alert_date DESC
        LIMIT 20
      `;

      const result = await db.query(alertsQuery, [clientCompanyId]);

      const alerts = result.rows.map(alert => ({
        type: alert.type,
        priority: alert.priority,
        message: alert.message,
        alertDate: alert.alert_date,
        entityId: alert.entity_id
      }));

      return ResponseHandler.success(res, {
        alerts
      }, 'Alertas obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getAlerts:', error);
      return ResponseHandler.error(res, 'Error al obtener alertas', 'GET_ALERTS_ERROR', 500);
    }
  }

  // GET /api/client/dashboard/energy-summary - Resumen de consumo energético
  async getEnergySummary(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { period = '30' } = req.query; // days

      const energyQuery = `
        SELECT 
          e.name as equipment_name,
          e.equipment_id,
          AVG(er.consumption_kwh) as avg_consumption,
          SUM(er.consumption_kwh) as total_consumption,
          AVG(er.cost_estimate) as avg_cost,
          SUM(er.cost_estimate) as total_cost
        FROM energy_readings er
        INNER JOIN equipments e ON er.equipment_id = e.equipment_id
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1 
          AND ar.status = 'ACTIVE'
          AND er.timestamp >= CURRENT_DATE - interval '${period} days'
        GROUP BY e.equipment_id, e.name
        ORDER BY total_consumption DESC
      `;

      const result = await db.query(energyQuery, [clientCompanyId]);

      const energySummary = result.rows.map(equipment => ({
        equipmentId: equipment.equipment_id.toString(),
        equipmentName: equipment.equipment_name,
        avgConsumption: parseFloat(equipment.avg_consumption).toFixed(2),
        totalConsumption: parseFloat(equipment.total_consumption).toFixed(2),
        avgCost: parseFloat(equipment.avg_cost).toFixed(2),
        totalCost: parseFloat(equipment.total_cost).toFixed(2)
      }));

      const totalPeriodCost = energySummary.reduce((sum, eq) => sum + parseFloat(eq.totalCost), 0);

      return ResponseHandler.success(res, {
        energySummary,
        periodTotals: {
          totalCost: totalPeriodCost.toFixed(2),
          period: parseInt(period)
        }
      }, 'Resumen energético obtenido exitosamente');

    } catch (error) {
      console.error('Error en getEnergySummary:', error);
      return ResponseHandler.error(res, 'Error al obtener resumen energético', 'GET_ENERGY_SUMMARY_ERROR', 500);
    }
  }
}

module.exports = new DashboardController();
