const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class DashboardController {
  // GET /api/provider/dashboard - Métricas principales del proveedor
  async getDashboardMetrics(req, res) {
    try {
      const { providerCompanyId } = req.user;

      // Métricas principales
      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT ar.client_company_id) as total_clients,
          COUNT(DISTINCT ar.rental_id) as active_rentals,
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT CASE WHEN sr.status IN ('PENDING', 'IN_PROGRESS') THEN sr.service_request_id END) as pending_services,
          SUM(ar.monthly_rate) as monthly_revenue,
          COUNT(DISTINCT CASE WHEN sr.priority = 'HIGH' AND sr.status IN ('PENDING', 'IN_PROGRESS') THEN sr.service_request_id END) as urgent_requests
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN service_requests sr ON ar.client_company_id = sr.client_company_id AND sr.provider_company_id = ar.provider_company_id
        WHERE ar.provider_company_id = $1 AND ar.status = 'ACTIVE'
      `;

      const metricsResult = await db.query(metricsQuery, [providerCompanyId]);
      const metrics = metricsResult.rows[0];

      // Ingresos por mes (últimos 6 meses)
      const revenueQuery = `
        WITH months AS (
          SELECT 
            date_trunc('month', CURRENT_DATE - interval '5 months' + interval '1 month' * generate_series(0, 5)) as month
        )
        SELECT 
          m.month,
          COALESCE(SUM(i.total_amount), 0) as revenue
        FROM months m
        LEFT JOIN invoices i ON date_trunc('month', i.created_at) = m.month 
          AND i.provider_company_id = $1 AND i.status = 'PAID'
        GROUP BY m.month
        ORDER BY m.month
      `;

      const revenueResult = await db.query(revenueQuery, [providerCompanyId]);

      // Distribución de equipos por tipo
      const equipmentTypesQuery = `
        SELECT 
          e.type,
          COUNT(*) as count
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.provider_company_id = $1 AND ar.status = 'ACTIVE'
        GROUP BY e.type
        ORDER BY count DESC
      `;

      const equipmentTypesResult = await db.query(equipmentTypesQuery, [providerCompanyId]);

      // Solicitudes de servicio por estado
      const serviceStatusQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM service_requests
        WHERE provider_company_id = $1 
          AND created_at >= CURRENT_DATE - interval '30 days'
        GROUP BY status
      `;

      const serviceStatusResult = await db.query(serviceStatusQuery, [providerCompanyId]);

      // Top 5 clientes por facturación
      const topClientsQuery = `
        SELECT 
          c.name,
          c.company_id,
          SUM(i.total_amount) as total_billed
        FROM companies c
        INNER JOIN invoices i ON c.company_id = i.client_company_id
        WHERE i.provider_company_id = $1 
          AND i.created_at >= CURRENT_DATE - interval '12 months'
        GROUP BY c.company_id, c.name
        ORDER BY total_billed DESC
        LIMIT 5
      `;

      const topClientsResult = await db.query(topClientsQuery, [providerCompanyId]);

      return ResponseHandler.success(res, {
        metrics: {
          totalClients: parseInt(metrics.total_clients) || 0,
          activeRentals: parseInt(metrics.active_rentals) || 0,
          totalEquipments: parseInt(metrics.total_equipments) || 0,
          pendingServices: parseInt(metrics.pending_services) || 0,
          monthlyRevenue: parseFloat(metrics.monthly_revenue) || 0,
          urgentRequests: parseInt(metrics.urgent_requests) || 0
        },
        revenueByMonth: revenueResult.rows.map(row => ({
          month: row.month,
          revenue: parseFloat(row.revenue)
        })),
        equipmentByType: equipmentTypesResult.rows.map(row => ({
          type: row.type,
          count: parseInt(row.count)
        })),
        servicesByStatus: serviceStatusResult.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count)
        })),
        topClients: topClientsResult.rows.map(row => ({
          companyId: row.company_id.toString(),
          name: row.name,
          totalBilled: parseFloat(row.total_billed)
        }))
      }, 'Métricas del dashboard obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getDashboardMetrics:', error);
      return ResponseHandler.error(res, 'Error al obtener métricas del dashboard', 'GET_DASHBOARD_METRICS_ERROR', 500);
    }
  }

  // GET /api/provider/dashboard/recent-activities - Actividades recientes
  async getRecentActivities(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { limit = 10 } = req.query;

      const activitiesQuery = `
        (
          SELECT 
            'service_request' as type,
            sr.service_request_id::text as entity_id,
            'Nueva solicitud de servicio: ' || sr.request_type as description,
            c.name as client_name,
            sr.created_at as activity_date,
            sr.priority
          FROM service_requests sr
          JOIN companies c ON sr.client_company_id = c.company_id
          WHERE sr.provider_company_id = $1
            AND sr.created_at >= CURRENT_DATE - interval '7 days'
        )
        UNION ALL
        (
          SELECT 
            'rental' as type,
            ar.rental_id::text as entity_id,
            'Nuevo contrato de arriendo para ' || e.name as description,
            c.name as client_name,
            ar.start_date as activity_date,
            'MEDIUM' as priority
          FROM active_rentals ar
          JOIN equipments e ON ar.equipment_id = e.equipment_id
          JOIN companies c ON ar.client_company_id = c.company_id
          WHERE ar.provider_company_id = $1
            AND ar.start_date >= CURRENT_DATE - interval '7 days'
        )
        UNION ALL
        (
          SELECT 
            'invoice' as type,
            i.invoice_id::text as entity_id,
            'Factura generada por $' || i.total_amount::text as description,
            c.name as client_name,
            i.created_at as activity_date,
            CASE WHEN i.status = 'OVERDUE' THEN 'HIGH' ELSE 'LOW' END as priority
          FROM invoices i
          JOIN companies c ON i.client_company_id = c.company_id
          WHERE i.provider_company_id = $1
            AND i.created_at >= CURRENT_DATE - interval '7 days'
        )
        ORDER BY activity_date DESC
        LIMIT $2
      `;

      const result = await db.query(activitiesQuery, [providerCompanyId, limit]);

      const activities = result.rows.map(activity => ({
        type: activity.type,
        entityId: activity.entity_id,
        description: activity.description,
        clientName: activity.client_name,
        activityDate: activity.activity_date,
        priority: activity.priority
      }));

      return ResponseHandler.success(res, {
        activities
      }, 'Actividades recientes obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getRecentActivities:', error);
      return ResponseHandler.error(res, 'Error al obtener actividades recientes', 'GET_RECENT_ACTIVITIES_ERROR', 500);
    }
  }

  // GET /api/provider/dashboard/alerts - Alertas importantes
  async getAlerts(req, res) {
    try {
      const { providerCompanyId } = req.user;

      const alertsQuery = `
        (
          SELECT 
            'overdue_invoice' as type,
            'HIGH' as priority,
            'Factura vencida: ' || c.name || ' - $' || i.total_amount as message,
            i.due_date as alert_date,
            i.invoice_id::text as entity_id
          FROM invoices i
          JOIN companies c ON i.client_company_id = c.company_id
          WHERE i.provider_company_id = $1 
            AND i.status = 'OVERDUE'
        )
        UNION ALL
        (
          SELECT 
            'urgent_service' as type,
            'HIGH' as priority,
            'Servicio urgente pendiente: ' || c.name || ' - ' || sr.request_type as message,
            sr.created_at as alert_date,
            sr.service_request_id::text as entity_id
          FROM service_requests sr
          JOIN companies c ON sr.client_company_id = c.company_id
          WHERE sr.provider_company_id = $1 
            AND sr.priority = 'HIGH' 
            AND sr.status = 'PENDING'
        )
        UNION ALL
        (
          SELECT 
            'equipment_issue' as type,
            'MEDIUM' as priority,
            'Equipo con problemas: ' || e.name || ' - ' || c.name as message,
            NOW() as alert_date,
            e.equipment_id::text as entity_id
          FROM equipments e
          JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
          JOIN companies c ON ar.client_company_id = c.company_id
          WHERE ar.provider_company_id = $1 
            AND e.status = 'MALFUNCTIONING'
        )
        UNION ALL
        (
          SELECT 
            'maintenance_due' as type,
            'MEDIUM' as priority,
            'Mantenimiento próximo: ' || e.name || ' - ' || c.name as message,
            m.scheduled_date as alert_date,
            m.maintenance_id::text as entity_id
          FROM maintenances m
          JOIN equipments e ON m.equipment_id = e.equipment_id
          JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
          JOIN companies c ON ar.client_company_id = c.company_id
          WHERE ar.provider_company_id = $1 
            AND m.status = 'SCHEDULED'
            AND m.scheduled_date <= CURRENT_DATE + interval '7 days'
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

      const result = await db.query(alertsQuery, [providerCompanyId]);

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

  // GET /api/provider/dashboard/performance - Métricas de rendimiento
  async getPerformanceMetrics(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { period = '30' } = req.query; // days

      const performanceQuery = `
        SELECT 
          COUNT(DISTINCT sr.service_request_id) as total_services,
          COUNT(DISTINCT CASE WHEN sr.status = 'COMPLETED' THEN sr.service_request_id END) as completed_services,
          AVG(CASE 
            WHEN sr.status = 'COMPLETED' AND sr.completed_at IS NOT NULL 
            THEN EXTRACT(epoch FROM (sr.completed_at - sr.created_at))/3600 
          END) as avg_response_hours,
          COUNT(DISTINCT CASE WHEN sr.priority = 'HIGH' THEN sr.service_request_id END) as urgent_services,
          AVG(CASE 
            WHEN sr.status = 'COMPLETED' AND sr.client_rating IS NOT NULL 
            THEN sr.client_rating 
          END) as avg_rating,
          COUNT(DISTINCT ar.client_company_id) as active_clients,
          SUM(ar.monthly_rate) as monthly_revenue
        FROM service_requests sr
        FULL OUTER JOIN active_rentals ar ON sr.provider_company_id = ar.provider_company_id
        WHERE (sr.provider_company_id = $1 OR ar.provider_company_id = $1)
          AND (sr.created_at >= CURRENT_DATE - interval '${period} days' OR ar.status = 'ACTIVE')
      `;

      const result = await db.query(performanceQuery, [providerCompanyId]);
      const performance = result.rows[0];

      // Calcular porcentaje de cumplimiento
      const completionRate = performance.total_services > 0 
        ? (performance.completed_services / performance.total_services * 100).toFixed(1)
        : '0.0';

      return ResponseHandler.success(res, {
        performance: {
          totalServices: parseInt(performance.total_services) || 0,
          completedServices: parseInt(performance.completed_services) || 0,
          completionRate: parseFloat(completionRate),
          avgResponseHours: performance.avg_response_hours ? parseFloat(performance.avg_response_hours).toFixed(1) : '0.0',
          urgentServices: parseInt(performance.urgent_services) || 0,
          avgRating: performance.avg_rating ? parseFloat(performance.avg_rating).toFixed(1) : null,
          activeClients: parseInt(performance.active_clients) || 0,
          monthlyRevenue: parseFloat(performance.monthly_revenue) || 0
        },
        period: parseInt(period)
      }, 'Métricas de rendimiento obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getPerformanceMetrics:', error);
      return ResponseHandler.error(res, 'Error al obtener métricas de rendimiento', 'GET_PERFORMANCE_METRICS_ERROR', 500);
    }
  }
}

module.exports = new DashboardController();
