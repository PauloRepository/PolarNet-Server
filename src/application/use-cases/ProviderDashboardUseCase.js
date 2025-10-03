const ProviderDashboardResponseDTO = require('../dto/ProviderDashboardResponseDTO');

/**
 * Use Case: Get Provider Dashboard
 * Handles dashboard data retrieval for provider companies
 */
class GetProviderDashboardUseCase {
  constructor(
    activeRentalRepository,
    equipmentRepository,
    serviceRequestRepository,
    invoiceRepository,
    temperatureReadingRepository,
    equipmentLocationRepository
  ) {
    this.activeRentalRepository = activeRentalRepository;
    this.equipmentRepository = equipmentRepository;
    this.serviceRequestRepository = serviceRequestRepository;
    this.invoiceRepository = invoiceRepository;
    this.temperatureReadingRepository = temperatureReadingRepository;
    this.equipmentLocationRepository = equipmentLocationRepository;
  }

  /**
   * Get dashboard metrics for provider
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Dashboard metrics
   */
  async getDashboardMetrics(providerCompanyId) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      // Execute all queries in parallel for better performance
      const [
        equipmentMetrics,
        rentalMetrics,
        serviceMetrics,
        revenueMetrics,
        alertsMetrics
      ] = await Promise.all([
        this.equipmentRepository.getProviderStatistics(providerCompanyId),
        this.activeRentalRepository.getProviderStatistics(providerCompanyId),
        this.serviceRequestRepository.getProviderStatistics(providerCompanyId),
        this.invoiceRepository.getProviderStatistics(providerCompanyId),
        this.temperatureReadingRepository.getProviderAlertsSummary(providerCompanyId)
      ]);

      // Combine all metrics
      const dashboardData = {
        totalEquipments: equipmentMetrics.totalEquipments || 0,
        availableEquipments: equipmentMetrics.availableEquipments || 0,
        rentedEquipments: equipmentMetrics.rentedEquipments || 0,
        maintenanceEquipments: equipmentMetrics.maintenanceEquipments || 0,
        activeRentals: rentalMetrics.activeRentals || 0,
        pendingRequests: rentalMetrics.pendingRequests || 0,
        expiringRentals: rentalMetrics.expiringRentals || 0,
        serviceRequests: serviceMetrics.totalRequests || 0,
        pendingServices: serviceMetrics.pendingServices || 0,
        completedServices: serviceMetrics.completedServices || 0,
        monthlyRevenue: parseFloat(revenueMetrics.totalRevenue || 0), // TODO: Implement actual monthly calculation
        totalRevenue: parseFloat(revenueMetrics.totalRevenue || 0),
        pendingPayments: parseFloat(revenueMetrics.pendingRevenue || 0),
        criticalAlerts: alertsMetrics.criticalAlerts || 0,
        warningAlerts: alertsMetrics.warningAlerts || 0,
        totalClients: rentalMetrics.totalClients || 0,
        newClientsThisMonth: rentalMetrics.newClientsThisMonth || 0
      };

      return ProviderDashboardResponseDTO.formatDashboardMetrics(dashboardData);
    } catch (error) {
      console.error('Error in GetProviderDashboardUseCase.getDashboardMetrics:', error);
      throw new Error(`Failed to get provider dashboard metrics: ${error.message}`);
    }
  }

  /**
   * Get recent activities for provider
   * @param {number} providerCompanyId - Provider company ID
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Recent activities
   */
  async getRecentActivities(providerCompanyId, limit = 10) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      const [
        recentRentals,
        recentServices,
        recentPayments
      ] = await Promise.all([
        this.activeRentalRepository.getRecentByProvider(providerCompanyId, 5),
        this.serviceRequestRepository.getRecentByProvider(providerCompanyId, 5),
        this.invoiceRepository.getRecentPaymentsByProvider(providerCompanyId, 5)
      ]);

      const activities = [];

      // Add rental activities
      recentRentals.forEach(rental => {
        activities.push({
          type: 'rental',
          action: 'new_rental',
          entityId: rental.rentalId,
          description: `New rental started for ${rental.equipmentType} #${rental.equipmentSerialNumber}`,
          clientName: rental.clientCompanyName,
          amount: rental.monthlyRate,
          date: rental.startDate,
          status: rental.status
        });
      });

      // Add service activities
      recentServices.forEach(service => {
        activities.push({
          type: 'service',
          action: 'service_request',
          entityId: service.serviceRequestId,
          description: `Service request: ${service.title}`,
          clientName: service.clientCompanyName,
          priority: service.priority,
          date: service.requestDate,
          status: service.status
        });
      });

      // Add payment activities
      recentPayments.forEach(payment => {
        activities.push({
          type: 'payment',
          action: 'payment_received',
          entityId: payment.invoiceId,
          description: `Payment received for invoice #${payment.invoiceNumber}`,
          clientName: payment.clientCompanyName,
          amount: payment.totalAmount,
          date: payment.paidDate,
          status: 'completed'
        });
      });

      // Sort by date and limit
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return ProviderDashboardResponseDTO.formatRecentActivities(activities.slice(0, limit));
    } catch (error) {
      console.error('Error in GetProviderDashboardUseCase.getRecentActivities:', error);
      throw new Error(`Failed to get recent activities: ${error.message}`);
    }
  }

  /**
   * Get provider statistics summary
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Provider statistics
   */
  async getProviderStats(providerCompanyId) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      // Use existing methods instead of non-existing ones
      const [
        equipmentStats,
        revenueStats,
        clientStats,
        alertStats
      ] = await Promise.all([
        this.equipmentRepository.getProviderStatistics(providerCompanyId),
        this.invoiceRepository.getProviderStatistics(providerCompanyId),
        this.activeRentalRepository.getProviderStatistics(providerCompanyId),
        this.temperatureReadingRepository.getProviderAlertsSummary(providerCompanyId)
      ]);

      const stats = {
        equipmentBreakdown: {
          total: equipmentStats.totalEquipments || 0,
          available: equipmentStats.availableEquipments || 0,
          rented: equipmentStats.rentedEquipments || 0,
          maintenance: equipmentStats.maintenanceEquipments || 0
        },
        revenueAnalytics: {
          totalRevenue: revenueStats.totalRevenue || 0,
          paidRevenue: revenueStats.paidRevenue || 0,
          pendingRevenue: revenueStats.pendingRevenue || 0,
          totalInvoices: revenueStats.totalInvoices || 0
        },
        clientAnalytics: {
          totalClients: clientStats.totalClients || 0,
          activeClients: clientStats.activeClients || 0,
          newClients: clientStats.newClientsThisMonth || 0
        },
        alertsBreakdown: {
          critical: alertStats.criticalAlerts || 0,
          warning: alertStats.warningAlerts || 0,
          total: alertStats.totalAlerts || 0
        }
      };

      return ProviderDashboardResponseDTO.formatProviderStats(stats);
    } catch (error) {
      console.error('Error in GetProviderDashboardUseCase.getProviderStats:', error);
      throw new Error(`Failed to get provider statistics: ${error.message}`);
    }
  }

  /**
   * Get alerts summary for provider
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Alerts summary
   */
  async getAlertsStatus(providerCompanyId) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      const alertsData = await this.temperatureReadingRepository.getProviderAlertsSummary(providerCompanyId);
      
      return ProviderDashboardResponseDTO.formatAlertsStatus(alertsData);
    } catch (error) {
      console.error('Error in GetProviderDashboardUseCase.getAlertsStatus:', error);
      throw new Error(`Failed to get alerts status: ${error.message}`);
    }
  }
}

module.exports = GetProviderDashboardUseCase;
