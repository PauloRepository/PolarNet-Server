/**
 * DTO: Client Contract Response
 * Structures contract/rental data for CLIENT responses
 */
class ClientContractResponseDTO {
  
  /**
   * Format contract list response
   * @param {Array} contracts - Raw contract/rental data
   * @returns {Array} Formatted contract list
   */
  static formatContractList(contracts) {
    return contracts.map(contract => ({
      contractId: contract.rentalId,
      equipment: {
        id: contract.equipmentId,
        name: contract.equipmentName,
        type: contract.equipmentType,
        model: contract.equipmentModel,
        manufacturer: contract.equipmentManufacturer
      },
      provider: {
        companyId: contract.providerCompanyId,
        companyName: contract.providerCompanyName,
        contactEmail: contract.providerEmail,
        contactPhone: contract.providerPhone
      },
      contractTerms: {
        startDate: contract.startDate,
        endDate: contract.endDate,
        duration: this.calculateDuration(contract.startDate, contract.endDate),
        status: contract.status,
        monthlyRate: parseFloat(contract.monthlyRate),
        currency: contract.currency || 'CLP'
      },
      location: {
        id: contract.currentLocationId,
        name: contract.locationName,
        address: contract.locationAddress
      },
      financial: {
        totalCost: this.calculateTotalCost(contract.startDate, contract.endDate, contract.monthlyRate),
        securityDeposit: parseFloat(contract.securityDeposit || 0),
        pendingAmount: this.calculatePendingAmount(contract)
      },
      status: {
        isActive: contract.status === 'ACTIVE',
        isExpired: this.isExpired(contract.endDate),
        isNearExpiration: this.isNearExpiration(contract.endDate),
        daysRemaining: this.calculateDaysRemaining(contract.endDate)
      },
      metadata: {
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      }
    }));
  }

  /**
   * Format single contract details
   * @param {Object} contract - Raw contract data
   * @returns {Object} Formatted contract details
   */
  static formatContractDetails(contract) {
    return {
      contractId: contract.rentalId,
      equipment: {
        id: contract.equipmentId,
        basicInfo: {
          name: contract.equipmentName,
          type: contract.equipmentType,
          model: contract.equipmentModel,
          manufacturer: contract.equipmentManufacturer,
          serialNumber: contract.equipmentSerialNumber
        },
        specifications: contract.equipmentSpecifications ? JSON.parse(contract.equipmentSpecifications) : {},
        condition: contract.equipmentCondition,
        warranty: {
          until: contract.warrantyUntil,
          isUnderWarranty: this.isUnderWarranty(contract.warrantyUntil)
        }
      },
      provider: {
        companyId: contract.providerCompanyId,
        companyInfo: {
          name: contract.providerCompanyName,
          email: contract.providerEmail,
          phone: contract.providerPhone,
          address: contract.providerAddress
        },
        specialization: contract.providerSpecialization
      },
      contractTerms: {
        startDate: contract.startDate,
        endDate: contract.endDate,
        duration: this.calculateDuration(contract.startDate, contract.endDate),
        status: contract.status,
        renewalTerms: contract.renewalTerms,
        specialConditions: contract.specialConditions
      },
      financial: {
        monthlyRate: parseFloat(contract.monthlyRate),
        currency: contract.currency || 'CLP',
        totalCost: this.calculateTotalCost(contract.startDate, contract.endDate, contract.monthlyRate),
        securityDeposit: parseFloat(contract.securityDeposit || 0),
        paymentHistory: contract.paymentHistory || [],
        nextPaymentDue: this.calculateNextPaymentDue(contract.startDate)
      },
      location: {
        id: contract.currentLocationId,
        details: {
          name: contract.locationName,
          address: contract.locationAddress,
          city: contract.locationCity,
          contactPerson: contract.locationContact,
          contactPhone: contract.locationContactPhone
        }
      },
      status: {
        isActive: contract.status === 'ACTIVE',
        isExpired: this.isExpired(contract.endDate),
        isNearExpiration: this.isNearExpiration(contract.endDate),
        daysRemaining: this.calculateDaysRemaining(contract.endDate),
        canExtend: this.canExtend(contract.status, contract.endDate),
        canTerminate: this.canTerminate(contract.status)
      },
      serviceHistory: {
        maintenances: contract.maintenanceHistory || [],
        serviceRequests: contract.serviceRequestHistory || [],
        lastMaintenance: contract.lastMaintenanceDate,
        nextMaintenance: contract.nextMaintenanceDate
      },
      metadata: {
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      }
    };
  }

  /**
   * Format contract extension validation
   * @param {Object} data - Extension data to validate
   * @returns {Object} Validation result
   */
  static validateContractExtension(data) {
    const errors = [];
    const validatedData = {};

    if (!data.newEndDate) {
      errors.push('New end date is required');
    } else {
      const newEndDate = new Date(data.newEndDate);
      if (isNaN(newEndDate.getTime())) {
        errors.push('Invalid date format');
      } else if (newEndDate <= new Date()) {
        errors.push('New end date must be in the future');
      } else {
        validatedData.newEndDate = newEndDate;
      }
    }

    if (data.newRate !== undefined) {
      const rate = parseFloat(data.newRate);
      if (isNaN(rate) || rate <= 0) {
        errors.push('New rate must be a positive number');
      } else {
        validatedData.newRate = rate;
      }
    }

    if (data.specialConditions !== undefined) {
      validatedData.specialConditions = data.specialConditions.trim();
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData
    };
  }

  /**
   * Format contract statistics
   * @param {Object} stats - Raw statistics data
   * @returns {Object} Formatted statistics
   */
  static formatContractStatistics(stats) {
    return {
      total: parseInt(stats.total || 0),
      active: parseInt(stats.active || 0),
      expired: parseInt(stats.expired || 0),
      terminated: parseInt(stats.terminated || 0),
      nearExpiration: parseInt(stats.nearExpiration || 0),
      financial: {
        totalMonthlyCommitment: parseFloat(stats.totalMonthlyCommitment || 0),
        averageContractValue: parseFloat(stats.averageContractValue || 0),
        totalSpentThisYear: parseFloat(stats.totalSpentThisYear || 0)
      },
      equipment: {
        byType: stats.equipmentByType || {},
        totalEquipments: parseInt(stats.totalEquipments || 0)
      },
      duration: {
        averageMonths: parseFloat(stats.averageDurationMonths || 0),
        shortTerm: parseInt(stats.shortTermContracts || 0), // < 6 months
        longTerm: parseInt(stats.longTermContracts || 0)    // >= 12 months
      }
    };
  }

  // Helper methods
  static calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.ceil(diffDays / 30);
    
    return {
      days: diffDays,
      months: months,
      years: Math.floor(months / 12)
    };
  }

  static calculateTotalCost(startDate, endDate, monthlyRate) {
    const duration = this.calculateDuration(startDate, endDate);
    return duration.months * parseFloat(monthlyRate);
  }

  static calculatePendingAmount(contract) {
    // This would need to be calculated based on payment history
    // For now, return a placeholder
    return 0;
  }

  static isExpired(endDate) {
    return new Date(endDate) < new Date();
  }

  static isNearExpiration(endDate, daysThreshold = 30) {
    const daysRemaining = this.calculateDaysRemaining(endDate);
    return daysRemaining <= daysThreshold && daysRemaining > 0;
  }

  static calculateDaysRemaining(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static isUnderWarranty(warrantyUntil) {
    if (!warrantyUntil) return false;
    return new Date(warrantyUntil) > new Date();
  }

  static canExtend(status, endDate) {
    return status === 'ACTIVE' && !this.isExpired(endDate);
  }

  static canTerminate(status) {
    return status === 'ACTIVE';
  }

  static calculateNextPaymentDue(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    const nextPayment = new Date(start);
    
    // Calculate next monthly payment
    while (nextPayment < now) {
      nextPayment.setMonth(nextPayment.getMonth() + 1);
    }
    
    return nextPayment;
  }
}

module.exports = ClientContractResponseDTO;
