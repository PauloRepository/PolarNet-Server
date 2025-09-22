/**
 * DTO: Provider Dashboard Response
 * Structures dashboard data for PROVIDER responses
 */
class ProviderDashboardResponseDTO {
  
  /**
   * Format dashboard metrics response
   * @param {Object} data - Raw dashboard data
   * @returns {Object} Formatted dashboard response
   */
  static formatDashboardMetrics(data) {
    const {
      totalEquipments = 0,
      availableEquipments = 0,
      rentedEquipments = 0,
      maintenanceEquipments = 0,
      activeRentals = 0,
      pendingRequests = 0,
      expiringRentals = 0,
      serviceRequests = 0,
      pendingServices = 0,
      completedServices = 0,
      monthlyRevenue = 0,
      totalRevenue = 0,
      pendingPayments = 0,
      criticalAlerts = 0,
      warningAlerts = 0,
      totalClients = 0,
      newClientsThisMonth = 0
    } = data;

    return {
      metrics: {
        equipment: {
          total: parseInt(totalEquipments),
          available: parseInt(availableEquipments),
          rented: parseInt(rentedEquipments),
          maintenance: parseInt(maintenanceEquipments),
          utilizationRate: totalEquipments > 0 ? 
            parseFloat(((rentedEquipments / totalEquipments) * 100).toFixed(2)) : 0
        },
        rentals: {
          active: parseInt(activeRentals),
          pending: parseInt(pendingRequests),
          expiring: parseInt(expiringRentals),
          totalClients: parseInt(totalClients),
          newClientsThisMonth: parseInt(newClientsThisMonth)
        },
        services: {
          total: parseInt(serviceRequests),
          pending: parseInt(pendingServices),
          completed: parseInt(completedServices),
          completionRate: serviceRequests > 0 ? 
            parseFloat(((completedServices / serviceRequests) * 100).toFixed(2)) : 0
        },
        financial: {
          monthlyRevenue: parseFloat(monthlyRevenue),
          totalRevenue: parseFloat(totalRevenue),
          pendingPayments: parseFloat(pendingPayments),
          averageRevenuePerEquipment: totalEquipments > 0 ? 
            parseFloat((monthlyRevenue / totalEquipments).toFixed(2)) : 0
        },
        alerts: {
          critical: parseInt(criticalAlerts),
          warning: parseInt(warningAlerts),
          total: parseInt(criticalAlerts) + parseInt(warningAlerts)
        }
      },
      summary: {
        businessHealth: this.calculateBusinessHealth(data),
        topPerformingCategory: this.getTopPerformingCategory(data),
        mainConcern: this.getMainConcern(data)
      }
    };
  }

  /**
   * Format recent activities response
   * @param {Array} activities - Raw activities data
   * @returns {Object} Formatted activities response
   */
  static formatRecentActivities(activities) {
    return {
      activities: activities.map(activity => ({
        id: `${activity.type}_${activity.entityId}`,
        type: activity.type,
        action: activity.action,
        description: activity.description,
        clientName: activity.clientName || 'N/A',
        amount: activity.amount ? parseFloat(activity.amount) : null,
        priority: activity.priority || 'normal',
        status: activity.status,
        date: activity.date,
        formattedDate: this.formatDate(activity.date),
        icon: this.getActivityIcon(activity.type),
        severity: this.getActivitySeverity(activity.type, activity.status)
      }))
    };
  }

  /**
   * Format provider statistics
   * @param {Object} stats - Raw statistics data
   * @returns {Object} Formatted statistics
   */
  static formatProviderStats(stats) {
    const {
      equipmentBreakdown = {},
      revenueAnalytics = {},
      clientAnalytics = {},
      alertsBreakdown = {}
    } = stats;

    return {
      equipment: {
        byType: equipmentBreakdown.byType || [],
        byStatus: equipmentBreakdown.byStatus || [],
        byLocation: equipmentBreakdown.byLocation || [],
        performanceMetrics: equipmentBreakdown.performance || {}
      },
      revenue: {
        monthly: revenueAnalytics.monthly || [],
        byEquipmentType: revenueAnalytics.byEquipmentType || [],
        trends: revenueAnalytics.trends || {},
        projections: revenueAnalytics.projections || {}
      },
      clients: {
        distribution: clientAnalytics.distribution || [],
        retention: clientAnalytics.retention || {},
        satisfaction: clientAnalytics.satisfaction || {},
        growth: clientAnalytics.growth || {}
      },
      alerts: {
        breakdown: alertsBreakdown.breakdown || [],
        trends: alertsBreakdown.trends || {},
        mostAffectedEquipments: alertsBreakdown.mostAffected || []
      }
    };
  }

  /**
   * Format alerts status
   * @param {Object} alertsData - Raw alerts data
   * @returns {Object} Formatted alerts status
   */
  static formatAlertsStatus(alertsData) {
    const {
      criticalAlerts = 0,
      warningAlerts = 0,
      infoAlerts = 0,
      resolvedToday = 0,
      averageResolutionTime = 0
    } = alertsData;

    return {
      summary: {
        critical: parseInt(criticalAlerts),
        warning: parseInt(warningAlerts),
        info: parseInt(infoAlerts),
        total: parseInt(criticalAlerts) + parseInt(warningAlerts) + parseInt(infoAlerts)
      },
      performance: {
        resolvedToday: parseInt(resolvedToday),
        averageResolutionHours: parseFloat(averageResolutionTime),
        responseEfficiency: this.calculateResponseEfficiency(alertsData)
      },
      recommendations: this.generateAlertRecommendations(alertsData)
    };
  }

  // Private helper methods

  /**
   * Calculate business health score
   * @param {Object} data - Dashboard data
   * @returns {Object} Business health metrics
   */
  static calculateBusinessHealth(data) {
    let score = 100;
    const factors = [];

    // Equipment utilization
    const utilizationRate = data.totalEquipments > 0 ? 
      (data.rentedEquipments / data.totalEquipments) * 100 : 0;
    
    if (utilizationRate < 50) {
      score -= 20;
      factors.push('Low equipment utilization');
    }

    // Maintenance equipment ratio
    const maintenanceRate = data.totalEquipments > 0 ? 
      (data.maintenanceEquipments / data.totalEquipments) * 100 : 0;
    
    if (maintenanceRate > 20) {
      score -= 15;
      factors.push('High maintenance rate');
    }

    // Critical alerts
    if (data.criticalAlerts > 5) {
      score -= 25;
      factors.push('Multiple critical alerts');
    }

    // Pending services
    if (data.pendingServices > 10) {
      score -= 10;
      factors.push('Service backlog');
    }

    return {
      score: Math.max(score, 0),
      status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
      factors: factors
    };
  }

  /**
   * Get top performing category
   * @param {Object} data - Dashboard data
   * @returns {string} Top performing category
   */
  static getTopPerformingCategory(data) {
    const utilizationRate = data.totalEquipments > 0 ? 
      (data.rentedEquipments / data.totalEquipments) * 100 : 0;
    
    if (utilizationRate >= 80) return 'Equipment Utilization';
    if (data.completedServices > data.pendingServices) return 'Service Delivery';
    if (data.monthlyRevenue > 0) return 'Revenue Generation';
    
    return 'Client Relations';
  }

  /**
   * Get main concern
   * @param {Object} data - Dashboard data
   * @returns {string} Main concern
   */
  static getMainConcern(data) {
    if (data.criticalAlerts > 3) return 'Critical Equipment Alerts';
    if (data.pendingServices > 10) return 'Service Request Backlog';
    if (data.maintenanceEquipments > data.availableEquipments) return 'Equipment Maintenance';
    if (data.expiringRentals > 5) return 'Contract Renewals';
    
    return 'None - Operations Normal';
  }

  /**
   * Get activity icon
   * @param {string} type - Activity type
   * @returns {string} Icon name
   */
  static getActivityIcon(type) {
    const icons = {
      rental: 'handshake',
      service: 'tools',
      payment: 'credit-card',
      alert: 'alert-triangle',
      maintenance: 'wrench'
    };
    
    return icons[type] || 'activity';
  }

  /**
   * Get activity severity
   * @param {string} type - Activity type
   * @param {string} status - Activity status
   * @returns {string} Severity level
   */
  static getActivitySeverity(type, status) {
    if (type === 'alert' && status === 'critical') return 'high';
    if (type === 'service' && status === 'urgent') return 'high';
    if (type === 'payment' && status === 'overdue') return 'medium';
    
    return 'low';
  }

  /**
   * Calculate response efficiency
   * @param {Object} alertsData - Alerts data
   * @returns {number} Efficiency percentage
   */
  static calculateResponseEfficiency(alertsData) {
    const totalAlerts = (alertsData.criticalAlerts || 0) + (alertsData.warningAlerts || 0);
    const resolvedToday = alertsData.resolvedToday || 0;
    
    if (totalAlerts === 0) return 100;
    
    return Math.min(100, Math.round((resolvedToday / totalAlerts) * 100));
  }

  /**
   * Generate alert recommendations
   * @param {Object} alertsData - Alerts data
   * @returns {Array} Recommendations
   */
  static generateAlertRecommendations(alertsData) {
    const recommendations = [];
    
    if (alertsData.criticalAlerts > 3) {
      recommendations.push('Review equipment maintenance schedules');
    }
    
    if (alertsData.averageResolutionTime > 24) {
      recommendations.push('Optimize alert response procedures');
    }
    
    if (alertsData.warningAlerts > 10) {
      recommendations.push('Implement preventive maintenance program');
    }
    
    return recommendations;
  }

  /**
   * Format date for display
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date
   */
  static formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString();
  }
}

module.exports = ProviderDashboardResponseDTO;
