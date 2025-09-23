/**
 * Controller: Provider Dashboard Management  
 * Handles PROVIDER dashboard operations using DDD architecture
 * Endpoints que corresponden a la BD: equipments, active_rentals, service_requests, maintenances
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderDashboardController {
  constructor(container) {
    if (!container) {
      throw new Error('DI Container is required for ProviderDashboardController');
    }
    
    this.container = container;
    
    try {
      this.dashboardUseCase = container.resolve('providerDashboardUseCase');
      this.ResponseDTO = container.resolve('ProviderDashboardResponseDTO');
      this.logger = container.resolve('logger');
    } catch (error) {
      console.error('Error resolving dependencies in ProviderDashboardController:', error);
      throw error;
    }
  }

  /**
   * Get complete provider dashboard with all metrics
   * GET /api/provider/dashboard
   */
  async getDashboard(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        period = '30days',
        includeComparison = true
      } = req.query;

      const filters = {
        period,
        includeComparison: includeComparison === 'true'
      };

      // Get all dashboard data in one call
      const dashboardMetrics = await this.dashboardUseCase.getDashboardMetrics(providerId);
      const recentActivities = await this.dashboardUseCase.getRecentActivities(providerId, 10);
      const providerStats = await this.dashboardUseCase.getProviderStats(providerId);
      const alertsStatus = await this.dashboardUseCase.getAlertsStatus(providerId);

      // Unified dashboard response
      const unifiedDashboard = {
        // Main metrics
        metrics: dashboardMetrics,
        
        // Statistics summary
        stats: providerStats,
        
        // Equipment performance (subset of metrics)
        equipmentPerformance: {
          totalEquipments: dashboardMetrics.totalEquipments || 0,
          activeRentals: dashboardMetrics.activeRentals || 0,
          maintenanceScheduled: dashboardMetrics.maintenanceScheduled || 0,
          utilizationRate: dashboardMetrics.utilizationRate || 0
        },
        
        // Revenue analytics (subset of metrics)
        revenue: {
          totalRevenue: dashboardMetrics.totalRevenue || 0,
          monthlyRevenue: dashboardMetrics.monthlyRevenue || 0,
          revenueGrowth: dashboardMetrics.revenueGrowth || 0,
          pendingPayments: dashboardMetrics.pendingPayments || 0
        },
        
        // Service trends (subset of metrics)
        serviceRequests: {
          total: dashboardMetrics.totalServiceRequests || 0,
          pending: dashboardMetrics.pendingServiceRequests || 0,
          completed: dashboardMetrics.completedServiceRequests || 0,
          averageResponseTime: dashboardMetrics.averageResponseTime || 0
        },
        
        // Client analytics (subset of metrics)
        clients: {
          totalClients: dashboardMetrics.totalClients || 0,
          activeClients: dashboardMetrics.activeClients || 0,
          newThisMonth: dashboardMetrics.newClientsThisMonth || 0,
          satisfactionScore: dashboardMetrics.clientSatisfactionScore || 0
        },
        
        // Alerts and notifications
        alerts: alertsStatus,
        
        // Recent activities
        recentActivities: recentActivities,
        
        // KPIs summary
        kpis: {
          equipmentUtilization: dashboardMetrics.utilizationRate || 0,
          revenueGrowth: dashboardMetrics.revenueGrowth || 0,
          clientSatisfaction: dashboardMetrics.clientSatisfactionScore || 0,
          serviceEfficiency: dashboardMetrics.serviceEfficiency || 0
        },
        
        // Meta information
        lastUpdated: new Date().toISOString(),
        period: filters.period,
        providerId: providerId
      };

      return ResponseHandler.success(res, unifiedDashboard, 'Dashboard completo del proveedor obtenido exitosamente');
    } catch (error) {
      console.error('ProviderDashboardController.getDashboard error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ProviderDashboardController;
