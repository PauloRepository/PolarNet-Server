/**
 * DTO: Provider Equipment Response
 * Structures equipment data for PROVIDER responses
 */
class ProviderEquipmentResponseDTO {
  
  /**
   * Format equipment list response
   * @param {Object} result - Raw equipment list with pagination
   * @returns {Object} Formatted equipment list response
   */
  static formatEquipmentList(result) {
    const { data = [], pagination = {} } = result;

    return {
      equipments: data.map(equipment => this.formatEquipmentSummary(equipment)),
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        pages: pagination.pages || 0,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1
      },
      summary: {
        totalEquipments: pagination.total || 0,
        availableCount: data.filter(eq => eq.status === 'AVAILABLE').length,
        rentedCount: data.filter(eq => eq.status === 'RENTED').length,
        maintenanceCount: data.filter(eq => eq.status === 'MAINTENANCE').length
      }
    };
  }

  /**
   * Format equipment summary (for lists)
   * @param {Object} equipment - Raw equipment data
   * @returns {Object} Formatted equipment summary
   */
  static formatEquipmentSummary(equipment) {
    return {
      id: equipment.equipmentId || equipment.id,
      name: equipment.name,
      type: equipment.type,
      category: equipment.category,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      manufacturer: equipment.manufacturer,
      status: equipment.status,
      condition: equipment.condition,
      availabilityStatus: equipment.availabilityStatus,
      location: {
        id: equipment.currentLocationId,
        name: equipment.locationName || 'Not assigned'
      },
      pricing: {
        dailyRate: parseFloat(equipment.rentalPriceDaily || 0),
        monthlyRate: parseFloat(equipment.rentalPriceMonthly || 0),
        purchasePrice: parseFloat(equipment.purchasePrice || 0)
      },
      technical: {
        optimalTemperature: equipment.optimalTemperature,
        powerWatts: equipment.powerWatts,
        energyConsumption: equipment.energyConsumptionKwh
      },
      rental: {
        isCurrentlyRented: equipment.status === 'RENTED',
        currentClientName: equipment.currentClientName || null,
        rentalStartDate: equipment.rentalStartDate || null,
        rentalEndDate: equipment.rentalEndDate || null
      },
      meta: {
        viewCount: equipment.viewCount || 0,
        isFeatured: equipment.isFeatured || false,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt
      }
    };
  }

  /**
   * Format equipment details response
   * @param {Object} equipment - Raw equipment details
   * @returns {Object} Formatted equipment details
   */
  static formatEquipmentDetails(equipment) {
    const {
      currentRental = null,
      rentalHistory = [],
      temperatureHistory = {},
      serviceHistory = []
    } = equipment;

    return {
      equipment: {
        id: equipment.equipmentId || equipment.id,
        name: equipment.name,
        description: equipment.description,
        type: equipment.type,
        category: equipment.category,
        model: equipment.model,
        serialNumber: equipment.serialNumber,
        manufacturer: equipment.manufacturer,
        code: equipment.code,
        status: equipment.status,
        condition: equipment.condition,
        availabilityStatus: equipment.availabilityStatus,
        yearManufactured: equipment.yearManufactured,
        warrantyExpiry: equipment.warrantyExpiry
      },
      technical: {
        specifications: equipment.technicalSpecs || {},
        optimalTemperature: equipment.optimalTemperature,
        minTemperature: equipment.minTemperature,
        maxTemperature: equipment.maxTemperature,
        powerWatts: equipment.powerWatts,
        energyConsumption: equipment.energyConsumptionKwh,
        driveType: equipment.driveType,
        coolingType: equipment.coolingType,
        dimensions: equipment.dimensions || {}
      },
      location: {
        current: {
          id: equipment.currentLocationId,
          name: equipment.locationName || 'Not assigned',
          address: equipment.locationAddress,
          contactPerson: equipment.locationContact
        }
      },
      pricing: {
        dailyRate: parseFloat(equipment.rentalPriceDaily || 0),
        monthlyRate: parseFloat(equipment.rentalPriceMonthly || 0),
        purchasePrice: parseFloat(equipment.purchasePrice || 0),
        currency: 'CLP'
      },
      currentRental: currentRental ? this.formatCurrentRental(currentRental) : null,
      rentalHistory: {
        total: rentalHistory.length,
        contracts: rentalHistory.slice(0, 10).map(rental => this.formatRentalSummary(rental))
      },
      performance: {
        temperature: this.formatTemperatureHistory(temperatureHistory),
        maintenance: this.formatMaintenanceHistory(serviceHistory),
        utilization: this.calculateUtilizationMetrics(rentalHistory)
      },
      media: {
        images: equipment.images || [],
        documents: equipment.documents || []
      },
      meta: {
        tags: equipment.tags ? equipment.tags.split(',') : [],
        notes: equipment.notes,
        viewCount: equipment.viewCount || 0,
        isFeatured: equipment.isFeatured || false,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt
      }
    };
  }

  /**
   * Format equipment summary for dashboard
   * @param {Object} summary - Raw summary data
   * @returns {Object} Formatted summary
   */
  static formatEquipmentSummary(summary) {
    return {
      totals: {
        totalEquipments: parseInt(summary.totalEquipments || 0),
        availableEquipments: parseInt(summary.availableEquipments || 0),
        rentedEquipments: parseInt(summary.rentedEquipments || 0),
        maintenanceEquipments: parseInt(summary.maintenanceEquipments || 0),
        inactiveEquipments: parseInt(summary.inactiveEquipments || 0)
      },
      breakdown: {
        byType: summary.byType || [],
        byStatus: summary.byStatus || [],
        byCondition: summary.byCondition || []
      },
      metrics: {
        utilizationRate: this.calculateUtilizationRate(summary),
        averageAge: summary.averageAge || 0,
        totalValue: parseFloat(summary.totalValue || 0),
        monthlyRevenue: parseFloat(summary.monthlyRevenue || 0)
      }
    };
  }

  /**
   * Format equipment performance data
   * @param {Object} performance - Raw performance data
   * @returns {Object} Formatted performance data
   */
  static formatEquipmentPerformance(performance) {
    const {
      equipmentId,
      temperatureAnalytics = {},
      rentalAnalytics = {},
      maintenanceHistory = []
    } = performance;

    return {
      equipmentId,
      analytics: {
        temperature: {
          averageTemp: temperatureAnalytics.averageTemp || 0,
          minTemp: temperatureAnalytics.minTemp || 0,
          maxTemp: temperatureAnalytics.maxTemp || 0,
          alertsCount: temperatureAnalytics.alertsCount || 0,
          efficiency: temperatureAnalytics.efficiency || 0,
          trends: temperatureAnalytics.trends || []
        },
        rental: {
          totalDaysRented: rentalAnalytics.totalDaysRented || 0,
          totalRevenue: parseFloat(rentalAnalytics.totalRevenue || 0),
          averageRentalDuration: rentalAnalytics.averageRentalDuration || 0,
          clientSatisfaction: rentalAnalytics.clientSatisfaction || 0,
          renewalRate: rentalAnalytics.renewalRate || 0
        },
        maintenance: {
          totalServices: maintenanceHistory.length,
          preventiveCount: maintenanceHistory.filter(m => m.type === 'PREVENTIVE').length,
          correctiveCount: maintenanceHistory.filter(m => m.type === 'CORRECTIVE').length,
          averageCost: this.calculateAverageMaintenanceCost(maintenanceHistory),
          lastServiceDate: this.getLastServiceDate(maintenanceHistory)
        }
      },
      recommendations: this.generateEquipmentRecommendations(performance)
    };
  }

  // Private helper methods

  /**
   * Format current rental information
   * @param {Object} rental - Current rental data
   * @returns {Object} Formatted rental info
   */
  static formatCurrentRental(rental) {
    return {
      rentalId: rental.rentalId,
      client: {
        companyId: rental.clientCompanyId,
        companyName: rental.clientCompanyName,
        contactPerson: rental.contactPerson
      },
      contract: {
        startDate: rental.startDate,
        endDate: rental.endDate,
        monthlyRate: parseFloat(rental.monthlyRate || 0),
        status: rental.status,
        paymentStatus: rental.paymentStatus
      },
      location: {
        id: rental.currentLocationId,
        name: rental.locationName,
        address: rental.locationAddress
      }
    };
  }

  /**
   * Format rental summary for history
   * @param {Object} rental - Rental data
   * @returns {Object} Formatted rental summary
   */
  static formatRentalSummary(rental) {
    return {
      rentalId: rental.rentalId,
      clientName: rental.clientCompanyName,
      startDate: rental.startDate,
      endDate: rental.endDate,
      duration: this.calculateDuration(rental.startDate, rental.endDate),
      monthlyRate: parseFloat(rental.monthlyRate || 0),
      totalAmount: parseFloat(rental.totalAmount || 0),
      status: rental.status
    };
  }

  /**
   * Format temperature history
   * @param {Object} temperatureHistory - Temperature data
   * @returns {Object} Formatted temperature history
   */
  static formatTemperatureHistory(temperatureHistory) {
    return {
      currentTemp: temperatureHistory.currentTemp || null,
      averageTemp: temperatureHistory.averageTemp || 0,
      minTemp: temperatureHistory.minTemp || 0,
      maxTemp: temperatureHistory.maxTemp || 0,
      alertsLast24h: temperatureHistory.alertsLast24h || 0,
      lastReading: temperatureHistory.lastReading || null,
      efficiency: temperatureHistory.efficiency || 0
    };
  }

  /**
   * Format maintenance history
   * @param {Array} serviceHistory - Service history data
   * @returns {Object} Formatted maintenance history
   */
  static formatMaintenanceHistory(serviceHistory) {
    return {
      totalServices: serviceHistory.length,
      recentServices: serviceHistory.slice(0, 5).map(service => ({
        serviceId: service.serviceRequestId,
        type: service.type,
        category: service.category,
        description: service.description,
        completionDate: service.completionDate,
        cost: parseFloat(service.finalCost || 0),
        technician: service.technicianName
      })),
      nextScheduled: null, // TODO: Implement scheduled maintenance
      maintenanceScore: this.calculateMaintenanceScore(serviceHistory)
    };
  }

  /**
   * Calculate utilization metrics
   * @param {Array} rentalHistory - Rental history
   * @returns {Object} Utilization metrics
   */
  static calculateUtilizationMetrics(rentalHistory) {
    if (!rentalHistory.length) {
      return {
        utilizationRate: 0,
        averageRentalDuration: 0,
        totalRevenue: 0
      };
    }

    const totalDays = rentalHistory.reduce((sum, rental) => {
      return sum + this.calculateDuration(rental.startDate, rental.endDate);
    }, 0);

    const totalRevenue = rentalHistory.reduce((sum, rental) => {
      return sum + parseFloat(rental.totalAmount || 0);
    }, 0);

    return {
      utilizationRate: this.calculateUtilizationRate({ rentedEquipments: totalDays, totalEquipments: 365 }),
      averageRentalDuration: Math.round(totalDays / rentalHistory.length),
      totalRevenue: totalRevenue
    };
  }

  /**
   * Calculate utilization rate
   * @param {Object} data - Data containing rental metrics
   * @returns {number} Utilization rate percentage
   */
  static calculateUtilizationRate(data) {
    if (!data.totalEquipments || data.totalEquipments === 0) return 0;
    return parseFloat(((data.rentedEquipments / data.totalEquipments) * 100).toFixed(2));
  }

  /**
   * Calculate duration between dates
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {number} Duration in days
   */
  static calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate average maintenance cost
   * @param {Array} maintenanceHistory - Maintenance history
   * @returns {number} Average cost
   */
  static calculateAverageMaintenanceCost(maintenanceHistory) {
    if (!maintenanceHistory.length) return 0;
    
    const totalCost = maintenanceHistory.reduce((sum, service) => {
      return sum + parseFloat(service.finalCost || 0);
    }, 0);
    
    return parseFloat((totalCost / maintenanceHistory.length).toFixed(2));
  }

  /**
   * Get last service date
   * @param {Array} maintenanceHistory - Maintenance history
   * @returns {Date|null} Last service date
   */
  static getLastServiceDate(maintenanceHistory) {
    if (!maintenanceHistory.length) return null;
    
    const sortedServices = maintenanceHistory
      .filter(service => service.completionDate)
      .sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
    
    return sortedServices.length > 0 ? sortedServices[0].completionDate : null;
  }

  /**
   * Calculate maintenance score
   * @param {Array} serviceHistory - Service history
   * @returns {number} Maintenance score (0-100)
   */
  static calculateMaintenanceScore(serviceHistory) {
    if (!serviceHistory.length) return 100;
    
    const preventiveCount = serviceHistory.filter(s => s.type === 'PREVENTIVE').length;
    const correctiveCount = serviceHistory.filter(s => s.type === 'CORRECTIVE').length;
    
    if (preventiveCount + correctiveCount === 0) return 100;
    
    const preventiveRatio = preventiveCount / (preventiveCount + correctiveCount);
    return Math.round(preventiveRatio * 100);
  }

  /**
   * Generate equipment recommendations
   * @param {Object} performance - Performance data
   * @returns {Array} Recommendations
   */
  static generateEquipmentRecommendations(performance) {
    const recommendations = [];
    
    if (performance.temperatureAnalytics.alertsCount > 10) {
      recommendations.push('Consider temperature monitoring system upgrade');
    }
    
    if (performance.rentalAnalytics.renewalRate < 70) {
      recommendations.push('Review pricing strategy or equipment condition');
    }
    
    const maintenanceCount = performance.maintenanceHistory.length;
    if (maintenanceCount > 5) {
      recommendations.push('Equipment may need major service or replacement');
    }
    
    return recommendations;
  }
}

module.exports = ProviderEquipmentResponseDTO;
