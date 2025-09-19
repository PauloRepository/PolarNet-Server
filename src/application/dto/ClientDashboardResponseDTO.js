/**
 * DTO: Client Dashboard Response
 * Structures dashboard data for CLIENT responses
 */
class ClientDashboardResponseDTO {
  
  /**
   * Format dashboard metrics response
   * @param {Object} data - Raw dashboard data
   * @returns {Object} Formatted dashboard response
   */
  static formatDashboardMetrics(data) {
    const {
      rentedEquipments = 0,
      pendingServices = 0,
      overdueInvoices = 0,
      pendingInvoices = 0,
      monthlyCost = 0,
      upcomingMaintenances = 0,
      criticalAlerts = 0,
      todaysAlerts = 0,
      locationStats = []
    } = data;

    return {
      metrics: {
        equipment: {
          rented: parseInt(rentedEquipments),
          needingMaintenance: parseInt(upcomingMaintenances)
        },
        services: {
          pending: parseInt(pendingServices),
          overdue: this.calculateOverdueServices(data.services || [])
        },
        financial: {
          monthlyCost: parseFloat(monthlyCost),
          overdueInvoices: parseInt(overdueInvoices),
          pendingInvoices: parseInt(pendingInvoices),
          totalDebt: this.calculateTotalDebt(data.invoices || [])
        },
        alerts: {
          critical: parseInt(criticalAlerts),
          today: parseInt(todaysAlerts),
          total: parseInt(criticalAlerts) + parseInt(todaysAlerts)
        }
      },
      locationStats: locationStats ? [{
        locationId: 1,
        locationName: 'General',
        equipmentCount: parseInt(locationStats.equipment_at_locations || 0),
        avgTemperature: null,
        alertsCount: 0
      }] : []
    };
  }

  /**
   * Format recent activities response
   * @param {Array} activities - Raw activities data
   * @returns {Array} Formatted activities
   */
  static formatRecentActivities(activities) {
    return activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      entityId: activity.entityId,
      description: activity.description,
      providerName: activity.providerName || 'No asignado',
      status: activity.status,
      priority: activity.priority,
      date: activity.date,
      timeAgo: this.calculateTimeAgo(activity.date)
    }));
  }

  /**
   * Format equipment alerts
   * @param {Array} alerts - Raw alerts data
   * @returns {Array} Formatted alerts
   */
  static formatEquipmentAlerts(alerts) {
    return alerts.map(alert => ({
      equipmentId: alert.equipmentId,
      equipmentName: alert.equipmentName,
      alertType: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      location: alert.location,
      isResolved: alert.isResolved || false
    }));
  }

  // Helper methods
  static calculateOverdueServices(services) {
    return services.filter(service => 
      ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(service.status) &&
      new Date(service.preferredDate) < new Date()
    ).length;
  }

  static calculateTotalDebt(invoices) {
    return invoices
      .filter(invoice => ['PENDING', 'OVERDUE'].includes(invoice.status))
      .reduce((total, invoice) => total + (invoice.totalAmount - invoice.paidAmount), 0);
  }

  static calculateTimeAgo(date) {
    const now = new Date();
    const diffTime = Math.abs(now - new Date(date));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} semanas`;
    return `Hace ${Math.ceil(diffDays / 30)} meses`;
  }
}

module.exports = ClientDashboardResponseDTO;
