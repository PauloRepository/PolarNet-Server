/**
 * DTO: Client Service Request Response
 * Structures service request data for CLIENT responses
 */
class ClientServiceRequestResponseDTO {
  
  /**
   * Format service request list response
   * @param {Array} serviceRequests - Raw service request data
   * @returns {Array} Formatted service request list
   */
  static formatServiceRequestList(serviceRequests) {
    return serviceRequests.map(sr => ({
      serviceRequestId: sr.serviceRequestId,
      basicInfo: {
        title: sr.title,
        type: sr.type,
        priority: sr.priority,
        status: sr.status,
        description: sr.description?.substring(0, 100) + (sr.description?.length > 100 ? '...' : '')
      },
      equipment: {
        id: sr.equipmentId,
        name: sr.equipmentName,
        model: sr.equipmentModel,
        location: sr.equipmentLocation
      },
      provider: {
        companyId: sr.providerCompanyId,
        companyName: sr.providerCompanyName,
        assignedTo: sr.assignedToName
      },
      timeline: {
        requestedDate: sr.requestedDate,
        preferredDate: sr.preferredDate,
        completedAt: sr.completedAt,
        isOverdue: this.isOverdue(sr.preferredDate, sr.status)
      },
      financial: {
        estimatedCost: parseFloat(sr.estimatedCost || 0),
        finalCost: parseFloat(sr.finalCost || 0),
        currency: sr.currency || 'CLP'
      },
      metadata: {
        createdAt: sr.createdAt,
        updatedAt: sr.updatedAt
      }
    }));
  }

  /**
   * Format single service request details
   * @param {Object} serviceRequest - Raw service request data
   * @returns {Object} Formatted service request details
   */
  static formatServiceRequestDetails(serviceRequest) {
    return {
      serviceRequestId: serviceRequest.serviceRequestId,
      basicInfo: {
        title: serviceRequest.title,
        type: serviceRequest.type,
        priority: serviceRequest.priority,
        status: serviceRequest.status,
        description: serviceRequest.description
      },
      equipment: {
        id: serviceRequest.equipmentId,
        name: serviceRequest.equipmentName,
        model: serviceRequest.equipmentModel,
        manufacturer: serviceRequest.equipmentManufacturer,
        serialNumber: serviceRequest.equipmentSerialNumber,
        location: {
          id: serviceRequest.equipmentLocationId,
          name: serviceRequest.equipmentLocation,
          address: serviceRequest.locationAddress
        }
      },
      provider: {
        companyId: serviceRequest.providerCompanyId,
        companyName: serviceRequest.providerCompanyName,
        assignedTo: {
          userId: serviceRequest.assignedTo,
          name: serviceRequest.assignedToName,
          email: serviceRequest.assignedToEmail,
          phone: serviceRequest.assignedToPhone
        }
      },
      timeline: {
        requestedDate: serviceRequest.requestedDate,
        preferredDate: serviceRequest.preferredDate,
        startedAt: serviceRequest.startedAt,
        completedAt: serviceRequest.completedAt,
        isOverdue: this.isOverdue(serviceRequest.preferredDate, serviceRequest.status),
        daysOverdue: this.calculateDaysOverdue(serviceRequest.preferredDate, serviceRequest.status)
      },
      financial: {
        estimatedCost: parseFloat(serviceRequest.estimatedCost || 0),
        finalCost: parseFloat(serviceRequest.finalCost || 0),
        currency: serviceRequest.currency || 'CLP',
        hasEstimate: !!serviceRequest.estimatedCost,
        isCostConfirmed: !!serviceRequest.finalCost
      },
      communication: {
        notes: serviceRequest.notes,
        clientNotes: serviceRequest.clientNotes,
        technicianNotes: serviceRequest.technicianNotes,
        attachments: serviceRequest.attachments ? JSON.parse(serviceRequest.attachments) : [],
        completionPhotos: serviceRequest.completionPhotos ? JSON.parse(serviceRequest.completionPhotos) : []
      },
      metadata: {
        createdAt: serviceRequest.createdAt,
        updatedAt: serviceRequest.updatedAt
      }
    };
  }

  /**
   * Format service request creation/update validation
   * @param {Object} data - Service request data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  static validateServiceRequestData(data, isUpdate = false) {
    const errors = [];
    const validatedData = {};

    // Required fields for creation
    if (!isUpdate) {
      if (!data.equipmentId) {
        errors.push('Equipment ID is required');
      } else {
        validatedData.equipmentId = parseInt(data.equipmentId);
      }

      if (!data.type) {
        errors.push('Service type is required');
      } else if (!this.isValidServiceType(data.type)) {
        errors.push('Invalid service type');
      } else {
        validatedData.type = data.type;
      }

      if (!data.title || data.title.trim().length < 5) {
        errors.push('Title must be at least 5 characters');
      } else {
        validatedData.title = data.title.trim();
      }

      if (!data.description || data.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters');
      } else {
        validatedData.description = data.description.trim();
      }
    }

    // Optional fields
    if (data.priority !== undefined) {
      if (!this.isValidPriority(data.priority)) {
        errors.push('Invalid priority level');
      } else {
        validatedData.priority = data.priority;
      }
    }

    if (data.preferredDate !== undefined) {
      const preferredDate = new Date(data.preferredDate);
      if (isNaN(preferredDate.getTime()) || preferredDate < new Date()) {
        errors.push('Preferred date must be in the future');
      } else {
        validatedData.preferredDate = preferredDate;
      }
    }

    if (data.estimatedCost !== undefined) {
      const cost = parseFloat(data.estimatedCost);
      if (isNaN(cost) || cost < 0) {
        errors.push('Estimated cost must be a positive number');
      } else {
        validatedData.estimatedCost = cost;
      }
    }

    if (data.notes !== undefined) {
      validatedData.notes = data.notes.trim();
    }

    if (data.clientNotes !== undefined) {
      validatedData.clientNotes = data.clientNotes.trim();
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData
    };
  }

  /**
   * Format service request statistics
   * @param {Object} stats - Raw statistics data
   * @returns {Object} Formatted statistics
   */
  static formatServiceRequestStatistics(stats) {
    return {
      total: parseInt(stats.total || 0),
      byStatus: {
        open: parseInt(stats.open || 0),
        assigned: parseInt(stats.assigned || 0),
        inProgress: parseInt(stats.inProgress || 0),
        completed: parseInt(stats.completed || 0),
        cancelled: parseInt(stats.cancelled || 0)
      },
      byPriority: {
        low: parseInt(stats.lowPriority || 0),
        medium: parseInt(stats.mediumPriority || 0),
        high: parseInt(stats.highPriority || 0),
        urgent: parseInt(stats.urgentPriority || 0)
      },
      byType: stats.byType || {},
      performance: {
        averageCompletionDays: parseFloat(stats.averageCompletionDays || 0),
        overdueCount: parseInt(stats.overdueCount || 0),
        completionRate: parseFloat(stats.completionRate || 0)
      },
      financial: {
        totalEstimated: parseFloat(stats.totalEstimated || 0),
        totalSpent: parseFloat(stats.totalSpent || 0),
        averageCost: parseFloat(stats.averageCost || 0)
      }
    };
  }

  // Helper methods
  static isOverdue(preferredDate, status) {
    if (!preferredDate || ['COMPLETED', 'CANCELLED'].includes(status)) {
      return false;
    }
    return new Date(preferredDate) < new Date();
  }

  static calculateDaysOverdue(preferredDate, status) {
    if (!this.isOverdue(preferredDate, status)) return 0;
    const diffTime = new Date() - new Date(preferredDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static isValidServiceType(type) {
    const validTypes = ['MAINTENANCE', 'REPAIR', 'INSTALLATION', 'INSPECTION', 'CLEANING', 'UPGRADE'];
    return validTypes.includes(type);
  }

  static isValidPriority(priority) {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    return validPriorities.includes(priority);
  }
}

module.exports = ClientServiceRequestResponseDTO;
