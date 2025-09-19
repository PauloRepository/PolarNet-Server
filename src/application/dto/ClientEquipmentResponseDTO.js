/**
 * DTO: Client Equipment Response
 * Structures equipment data for CLIENT responses
 */
class ClientEquipmentResponseDTO {
  
  /**
   * Format equipment list response
   * @param {Array} equipments - Raw equipment data
   * @returns {Array} Formatted equipment list
   */
  static formatEquipmentList(equipments) {
    return equipments.map(equipment => ({
      equipmentId: equipment.equipmentId,
      name: equipment.name,
      type: equipment.type,
      model: equipment.model,
      manufacturer: equipment.manufacturer,
      serialNumber: equipment.serialNumber,
      status: equipment.status,
      condition: equipment.condition,
      location: {
        id: equipment.currentLocationId,
        name: equipment.locationName
      },
      rental: {
        id: equipment.rentalId,
        startDate: equipment.rentalStart,
        endDate: equipment.rentalEnd,
        monthlyRate: parseFloat(equipment.monthlyRate || 0),
        currency: equipment.currency || 'CLP'
      },
      lastReading: equipment.lastTemperature ? {
        temperature: parseFloat(equipment.lastTemperature),
        timestamp: equipment.lastReadingTime,
        status: equipment.temperatureStatus
      } : null,
      maintenance: {
        lastDate: equipment.lastMaintenanceDate,
        nextDate: equipment.nextMaintenanceDate,
        needsMaintenance: this.needsMaintenance(equipment.nextMaintenanceDate)
      },
      isUnderWarranty: this.isUnderWarranty(equipment.warrantyUntil)
    }));
  }

  /**
   * Format single equipment details
   * @param {Object} equipment - Raw equipment data
   * @returns {Object} Formatted equipment details
   */
  static formatEquipmentDetails(equipment) {
    return {
      equipmentId: equipment.equipmentId,
      basicInfo: {
        name: equipment.name,
        type: equipment.type,
        model: equipment.model,
        manufacturer: equipment.manufacturer,
        serialNumber: equipment.serialNumber,
        description: equipment.description
      },
      status: {
        current: equipment.status,
        condition: equipment.condition,
        isActive: equipment.isActive
      },
      specifications: equipment.specifications ? JSON.parse(equipment.specifications) : {},
      location: {
        id: equipment.currentLocationId,
        name: equipment.locationName,
        address: equipment.locationAddress,
        contactPerson: equipment.locationContact
      },
      rental: {
        id: equipment.rentalId,
        startDate: equipment.rentalStart,
        endDate: equipment.rentalEnd,
        monthlyRate: parseFloat(equipment.monthlyRate || 0),
        currency: equipment.currency || 'CLP',
        totalCost: this.calculateTotalCost(equipment),
        daysRemaining: this.calculateDaysRemaining(equipment.rentalEnd)
      },
      maintenance: {
        lastDate: equipment.lastMaintenanceDate,
        nextDate: equipment.nextMaintenanceDate,
        needsMaintenance: this.needsMaintenance(equipment.nextMaintenanceDate),
        maintenanceHistory: equipment.maintenanceHistory || []
      },
      warranty: {
        until: equipment.warrantyUntil,
        isUnderWarranty: this.isUnderWarranty(equipment.warrantyUntil),
        daysRemaining: this.calculateWarrantyDaysRemaining(equipment.warrantyUntil)
      },
      readings: {
        latest: equipment.latestReading,
        averageToday: equipment.averageToday,
        alerts: equipment.recentAlerts || []
      }
    };
  }

  /**
   * Format equipment temperature readings
   * @param {Array} readings - Raw temperature readings
   * @returns {Array} Formatted readings
   */
  static formatTemperatureReadings(readings) {
    return readings.map(reading => ({
      readingId: reading.temperatureReadingId,
      value: parseFloat(reading.value),
      unit: reading.unit,
      timestamp: reading.timestamp,
      status: reading.status,
      location: reading.location,
      sensorId: reading.sensorId,
      isOutOfRange: ['ALERT', 'CRITICAL'].includes(reading.status)
    }));
  }

  /**
   * Format equipment statistics
   * @param {Object} stats - Raw statistics data
   * @returns {Object} Formatted statistics
   */
  static formatEquipmentStatistics(stats) {
    return {
      totalEquipments: parseInt(stats.totalEquipments || 0),
      byType: stats.byType || {},
      byStatus: stats.byStatus || {},
      byCondition: stats.byCondition || {},
      byLocation: stats.byLocation || {},
      maintenance: {
        upcoming: parseInt(stats.upcomingMaintenance || 0),
        overdue: parseInt(stats.overdueMaintenance || 0),
        completed: parseInt(stats.completedMaintenance || 0)
      },
      alerts: {
        critical: parseInt(stats.criticalAlerts || 0),
        warnings: parseInt(stats.warnings || 0),
        normal: parseInt(stats.normal || 0)
      },
      financial: {
        totalMonthlyCost: parseFloat(stats.totalMonthlyCost || 0),
        averageCostPerEquipment: parseFloat(stats.averageCostPerEquipment || 0)
      }
    };
  }

  // Helper methods
  static needsMaintenance(nextMaintenanceDate) {
    if (!nextMaintenanceDate) return false;
    return new Date(nextMaintenanceDate) <= new Date();
  }

  static isUnderWarranty(warrantyUntil) {
    if (!warrantyUntil) return false;
    return new Date(warrantyUntil) > new Date();
  }

  static calculateTotalCost(equipment) {
    if (!equipment.rentalStart || !equipment.rentalEnd || !equipment.monthlyRate) return 0;
    const months = this.calculateRentalMonths(equipment.rentalStart, equipment.rentalEnd);
    return months * parseFloat(equipment.monthlyRate);
  }

  static calculateRentalMonths(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 30);
  }

  static calculateDaysRemaining(endDate) {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static calculateWarrantyDaysRemaining(warrantyUntil) {
    if (!this.isUnderWarranty(warrantyUntil)) return 0;
    return this.calculateDaysRemaining(warrantyUntil);
  }
}

module.exports = ClientEquipmentResponseDTO;
