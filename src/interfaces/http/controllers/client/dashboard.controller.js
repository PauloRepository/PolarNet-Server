/**
 * Controller: Client Dashboard Management
 * Handles CLIENT dashboard operations using DDD architecture
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ClientDashboardController {
  constructor(container) {
    this.container = container;
    this.dashboardUseCase = container.resolve('getClientDashboard');
    this.logger = container.resolve('logger');
  }

  /**
   * Get unified client dashboard (replaces all separate dashboard endpoints)
   * GET /api/client/dashboard
   */
  async getDashboard(req, res) {
    try {
      const clientCompanyId = req.user.clientCompanyId;
      
      this.logger.info('Getting unified dashboard data', { clientCompanyId, userId: req.user?.userId });

      // Get repositories from container
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');
      const invoiceRepository = this.container.resolve('invoiceRepository');
      const activeRentalRepository = this.container.resolve('activeRentalRepository');
      const equipmentRepository = this.container.resolve('equipmentRepository');

      // Get all dashboard data in parallel
      const [
        equipmentStats,
        serviceRequestStats,
        invoiceStats,
        temperatureStats,
        recentActivities,
        alerts,
        energySummary
      ] = await Promise.all([
        equipmentRepository.getClientStatistics(clientCompanyId),
        serviceRequestRepository.getClientStatistics(clientCompanyId),
        invoiceRepository.getClientStatistics(clientCompanyId),
        temperatureRepository.getClientSummary(clientCompanyId),
        this.getRecentActivitiesData(clientCompanyId),
        this.getAlertsData(clientCompanyId),
        this.getEnergySummaryData(clientCompanyId)
      ]);

      const dashboard = {
        // Equipment metrics
        equipments: {
          total: equipmentStats.totalEquipments || 0,
          active: equipmentStats.activeEquipments || 0,
          monitored: temperatureStats.monitoredEquipments || 0,
          categories: equipmentStats.categoryCounts || {}
        },

        // Service requests metrics
        serviceRequests: {
          total: serviceRequestStats.totalRequests || 0,
          pending: serviceRequestStats.pendingRequests || 0,
          inProgress: serviceRequestStats.inProgressRequests || 0,
          completed: serviceRequestStats.completedRequests || 0
        },

        // Financial metrics
        invoices: {
          total: invoiceStats.totalInvoices || 0,
          pending: invoiceStats.pendingInvoices || 0,
          paid: invoiceStats.paidInvoices || 0,
          overdue: invoiceStats.overdueInvoices || 0,
          totalAmount: invoiceStats.totalAmount || 0,
          pendingAmount: invoiceStats.pendingAmount || 0
        },

        // Temperature monitoring
        temperature: {
          totalReadings: temperatureStats.totalReadings || 0,
          avgTemperature: temperatureStats.avgTemperature || 0,
          totalAlerts: temperatureStats.totalAlerts || 0,
          monitoredEquipments: temperatureStats.monitoredEquipments || 0
        },

        // Recent activities (last 10)
        recentActivities: recentActivities.slice(0, 10),

        // Active alerts
        alerts: alerts.slice(0, 5),

        // Energy summary
        energySummary: energySummary,

        // Summary metrics for quick overview
        summary: {
          totalEquipments: equipmentStats.totalEquipments || 0,
          activeContracts: equipmentStats.activeEquipments || 0,
          pendingServices: serviceRequestStats.pendingRequests || 0,
          totalAlerts: alerts.length || 0
        },

        // Last updated timestamp
        lastUpdated: new Date().toISOString()
      };

      return ResponseHandler.success(res, dashboard, 'Unified dashboard data retrieved successfully');

    } catch (error) {
      this.logger.error('Error in getDashboard:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }







  // Private helper methods for unified dashboard

  /**
   * Get recent activities data
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Array>}
   */
  async getRecentActivitiesData(clientCompanyId) {
    try {
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');
      const invoiceRepository = this.container.resolve('invoiceRepository');
      const equipmentRepository = this.container.resolve('equipmentRepository');

      const [recentServices, recentInvoices, recentMaintenances] = await Promise.all([
        serviceRequestRepository.findByClient(clientCompanyId, { limit: 5 }).catch(() => ({ serviceRequests: [] })),
        invoiceRepository.findByClient(clientCompanyId, { limit: 5 }).catch(() => ({ invoices: [] })),
        equipmentRepository.findByClient(clientCompanyId, { limit: 5 }).catch(() => ({ equipments: [] }))
      ]);

      const activities = [];

      // Add service requests
      (recentServices.serviceRequests || []).forEach(sr => {
        activities.push({
          type: 'service_request',
          entityId: sr.id?.toString(),
          description: `Solicitud: ${sr.title || 'Sin título'}`,
          providerName: sr.providerName || 'Proveedor',
          activityDate: sr.createdAt,
          priority: sr.priority || 'MEDIUM',
          status: sr.status || 'PENDING'
        });
      });

      // Add invoices
      (recentInvoices.invoices || []).forEach(invoice => {
        activities.push({
          type: 'invoice',
          entityId: invoice.id?.toString(),
          description: `Factura: ${invoice.invoiceNumber || 'Sin número'}`,
          providerName: 'Sistema de facturación',
          activityDate: invoice.createdAt,
          priority: invoice.status === 'PENDING' ? 'HIGH' : 'LOW',
          status: invoice.status || 'PENDING'
        });
      });

      return activities
        .sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate))
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  /**
   * Get alerts data
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Array>}
   */
  async getAlertsData(clientCompanyId) {
    try {
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');
      const invoiceRepository = this.container.resolve('invoiceRepository');

      const [temperatureAlerts, highPriorityRequests, overdueInvoices] = await Promise.all([
        temperatureRepository.findByClientCompany(clientCompanyId, { alertStatus: 'true', limit: 5 }).catch(() => ({ readings: [] })),
        serviceRequestRepository.findByClient(clientCompanyId, { priority: 'HIGH', limit: 5 }).catch(() => ({ serviceRequests: [] })),
        invoiceRepository.findByClient(clientCompanyId, { status: 'OVERDUE', limit: 5 }).catch(() => ({ invoices: [] }))
      ]);

      const alerts = [];

      // Temperature alerts
      (temperatureAlerts.readings || []).forEach(reading => {
        alerts.push({
          type: 'temperature',
          severity: 'high',
          title: 'Alerta de Temperatura',
          message: `Equipo ${reading.equipment_id} - Temperatura: ${reading.value}°C`,
          timestamp: reading.timestamp,
          entityId: reading.equipment_id?.toString()
        });
      });

      // High priority service requests
      (highPriorityRequests.serviceRequests || []).forEach(sr => {
        alerts.push({
          type: 'service_request',
          severity: 'high',
          title: 'Solicitud Prioritaria',
          message: sr.title || 'Solicitud de servicio prioritaria',
          timestamp: sr.createdAt,
          entityId: sr.id?.toString()
        });
      });

      // Overdue invoices
      (overdueInvoices.invoices || []).forEach(invoice => {
        alerts.push({
          type: 'invoice',
          severity: 'medium',
          title: 'Factura Vencida',
          message: `Factura ${invoice.invoiceNumber || invoice.id} vencida`,
          timestamp: invoice.dueDate,
          entityId: invoice.id?.toString()
        });
      });

      return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  /**
   * Get energy summary data
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getEnergySummaryData(clientCompanyId) {
    try {
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');
      const equipmentRepository = this.container.resolve('equipmentRepository');

      const [equipments, temperatureStats] = await Promise.all([
        equipmentRepository.findByClient(clientCompanyId, { limit: 10 }).catch(() => ({ equipments: [] })),
        temperatureRepository.getClientSummary(clientCompanyId).catch(() => ({}))
      ]);

      return {
        totalConsumption: 0, // Placeholder - would need energy readings
        avgTemperature: temperatureStats.avgTemperature || 0,
        energyEfficiency: 85, // Placeholder calculation
        temperatureTrends: [], // Placeholder - would need trend data
        monitoredEquipments: temperatureStats.monitoredEquipments || 0,
        totalReadings: temperatureStats.totalReadings || 0,
        alertCount: temperatureStats.totalAlerts || 0
      };
    } catch (error) {
      console.error('Error getting energy summary:', error);
      return {
        totalConsumption: 0,
        avgTemperature: 0,
        energyEfficiency: 0,
        temperatureTrends: [],
        monitoredEquipments: 0,
        totalReadings: 0,
        alertCount: 0
      };
    }
  }
}

module.exports = ClientDashboardController;
