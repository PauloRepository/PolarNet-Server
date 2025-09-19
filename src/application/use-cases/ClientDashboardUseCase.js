const ClientDashboardResponseDTO = require('../dto/ClientDashboardResponseDTO');

/**
 * Use Case: Get Client Dashboard
 * Handles dashboard data retrieval for client companies
 */
class GetClientDashboardUseCase {
  constructor(
    activeRentalRepository,
    serviceRequestRepository,
    invoiceRepository,
    temperatureReadingRepository,
    equipmentLocationRepository
  ) {
    this.activeRentalRepository = activeRentalRepository;
    this.serviceRequestRepository = serviceRequestRepository;
    this.invoiceRepository = invoiceRepository;
    this.temperatureReadingRepository = temperatureReadingRepository;
    this.equipmentLocationRepository = equipmentLocationRepository;
  }

  /**
   * Get dashboard metrics for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Dashboard metrics
   */
  async getDashboardMetrics(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      // Execute all queries in parallel for better performance
      const [
        rentalMetrics,
        serviceMetrics,
        invoiceMetrics,
        temperatureAlerts,
        locationStats
      ] = await Promise.all([
        this.activeRentalRepository.getClientStatistics(clientCompanyId),
        this.serviceRequestRepository.getClientStatistics(clientCompanyId),
        this.invoiceRepository.getClientPaymentSummary(clientCompanyId),
        this.temperatureReadingRepository.getClientSummary(clientCompanyId),
        this.equipmentLocationRepository.getClientLocationAnalytics(clientCompanyId)
      ]);

      // Combine all metrics
      const dashboardData = {
        rentedEquipments: rentalMetrics.activeRentals || 0,
        pendingServices: serviceMetrics.pending || 0,
        overdueInvoices: invoiceMetrics.overdue || 0,
        pendingInvoices: invoiceMetrics.pending || 0,
        monthlyCost: rentalMetrics.totalMonthlyCost || 0,
        upcomingMaintenances: rentalMetrics.upcomingMaintenances || 0,
        criticalAlerts: temperatureAlerts.critical || 0,
        todaysAlerts: temperatureAlerts.today || 0,
        locationStats: locationStats || []
      };

      return {
        success: true,
        data: ClientDashboardResponseDTO.formatDashboardMetrics(dashboardData)
      };

    } catch (error) {
      console.error('Error in GetClientDashboardUseCase.getDashboardMetrics:', error);
      throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    }
  }

  /**
   * Get recent activities for client
   * @param {number} clientCompanyId - Client company ID
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Object>} Recent activities
   */
  async getRecentActivities(clientCompanyId, limit = 10) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const activities = await this.serviceRequestRepository.getClientRecentActivities(
        clientCompanyId,
        limit
      );

      return {
        success: true,
        data: ClientDashboardResponseDTO.formatRecentActivities(activities)
      };

    } catch (error) {
      console.error('Error in GetClientDashboardUseCase.getRecentActivities:', error);
      throw new Error(`Failed to get recent activities: ${error.message}`);
    }
  }

  /**
   * Get equipment alerts for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Equipment alerts
   */
  async getEquipmentAlerts(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const [criticalAlerts, todaysAlerts] = await Promise.all([
        this.temperatureReadingRepository.getClientCriticalAlerts(clientCompanyId),
        this.temperatureReadingRepository.getClientTodaysAlerts(clientCompanyId)
      ]);

      const allAlerts = [...criticalAlerts, ...todaysAlerts];

      return {
        success: true,
        data: ClientDashboardResponseDTO.formatEquipmentAlerts(allAlerts)
      };

    } catch (error) {
      console.error('Error in GetClientDashboardUseCase.getEquipmentAlerts:', error);
      throw new Error(`Failed to get equipment alerts: ${error.message}`);
    }
  }

  /**
   * Get financial summary for client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} dateRange - Date range for summary
   * @returns {Promise<Object>} Financial summary
   */
  async getFinancialSummary(clientCompanyId, dateRange = {}) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const [rentalCosts, invoiceStats] = await Promise.all([
        this.activeRentalRepository.getClientRentalCosts(clientCompanyId, dateRange),
        this.invoiceRepository.getClientInvoiceMetrics(clientCompanyId)
      ]);

      return {
        success: true,
        data: {
          monthlyCosts: rentalCosts,
          invoiceMetrics: invoiceStats,
          totalDebt: invoiceStats.pendingAmount + invoiceStats.overdueAmount
        }
      };

    } catch (error) {
      console.error('Error in GetClientDashboardUseCase.getFinancialSummary:', error);
      throw new Error(`Failed to get financial summary: ${error.message}`);
    }
  }
}

module.exports = GetClientDashboardUseCase;
