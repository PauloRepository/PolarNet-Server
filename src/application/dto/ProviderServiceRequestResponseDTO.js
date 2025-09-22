/**
 * DTO: Provider Service Request Response
 * Estructura las respuestas de solicitudes de servicio para PROVIDER
 */
class ProviderServiceRequestResponseDTO {
  
  /**
   * Formatear lista de solicitudes de servicio
   * @param {Object} result - Datos de solicitudes con paginación
   * @returns {Object} Respuesta formateada de lista de solicitudes
   */
  static formatServiceRequestsList(result) {
    const { data = [], pagination = {} } = result;

    return {
      serviceRequests: data.map(request => this.formatServiceRequestSummary(request)),
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        pages: pagination.pages || 0,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1
      },
      summary: {
        totalRequests: pagination.total || 0,
        openRequests: data.filter(r => r.status === 'OPEN').length,
        inProgressRequests: data.filter(r => r.status === 'IN_PROGRESS').length,
        completedRequests: data.filter(r => r.status === 'COMPLETED').length,
        urgentRequests: data.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL').length
      }
    };
  }

  /**
   * Formatear resumen de solicitud de servicio (para listas)
   * @param {Object} request - Datos de solicitud de servicio
   * @returns {Object} Resumen formateado
   */
  static formatServiceRequestSummary(request) {
    return {
      id: request.serviceRequestId || request.id,
      title: request.title,
      description: request.description,
      type: request.issueType,
      priority: request.priority,
      status: request.status,
      client: {
        companyId: request.clientCompanyId,
        companyName: request.clientCompanyName,
        contactPerson: request.contactPerson,
        contactEmail: request.contactEmail,
        contactPhone: request.contactPhone
      },
      equipment: {
        equipmentId: request.equipmentId,
        name: request.equipmentName,
        type: request.equipmentType,
        serialNumber: request.serialNumber,
        model: request.model
      },
      assignment: {
        technicianId: request.technicianId,
        technicianName: request.technicianName,
        assignedDate: request.assignedDate,
        assignedBy: request.assignedBy
      },
      timeline: {
        requestDate: request.requestDate,
        responseDate: request.responseDate,
        startDate: request.startDate,
        completionDate: request.completionDate,
        responseTime: this.calculateResponseTime(request.requestDate, request.responseDate),
        resolutionTime: this.calculateResolutionTime(request.requestDate, request.completionDate)
      },
      costs: {
        estimatedCost: parseFloat(request.estimatedCost || 0),
        finalCost: parseFloat(request.finalCost || 0),
        laborCost: parseFloat(request.laborCost || 0),
        partsCost: parseFloat(request.partsCost || 0)
      },
      location: {
        locationId: request.locationId,
        name: request.locationName,
        address: request.locationAddress
      },
      quality: {
        clientRating: request.clientRating ? parseFloat(request.clientRating) : null,
        clientFeedback: request.clientFeedback,
        technicianNotes: request.technicianNotes
      },
      alerts: {
        isUrgent: request.priority === 'HIGH' || request.priority === 'CRITICAL',
        isOverdue: this.isOverdue(request.requestDate, request.status),
        needsApproval: request.status === 'PENDING_APPROVAL',
        awaitingParts: request.status === 'WAITING_PARTS'
      },
      meta: {
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      }
    };
  }

  /**
   * Formatear detalles completos de solicitud de servicio
   * @param {Object} requestData - Datos completos de solicitud
   * @returns {Object} Detalles formateados
   */
  static formatServiceRequestDetails(requestData) {
    const {
      serviceRequest,
      client = {},
      equipment = {},
      technician = {},
      workLogs = [],
      parts = [],
      photos = [],
      communications = []
    } = requestData;

    return {
      serviceRequest: {
        id: serviceRequest.serviceRequestId,
        basic: {
          title: serviceRequest.title,
          description: serviceRequest.description,
          issueType: serviceRequest.issueType,
          priority: serviceRequest.priority,
          status: serviceRequest.status,
          urgencyLevel: serviceRequest.urgencyLevel
        },
        timeline: {
          requestDate: serviceRequest.requestDate,
          responseDate: serviceRequest.responseDate,
          assignedDate: serviceRequest.assignedDate,
          startDate: serviceRequest.startDate,
          completionDate: serviceRequest.completionDate,
          closedDate: serviceRequest.closedDate
        },
        assignment: {
          technicianId: serviceRequest.technicianId,
          assignedBy: serviceRequest.assignedBy,
          assignmentNotes: serviceRequest.assignmentNotes
        },
        resolution: {
          workPerformed: serviceRequest.workPerformed,
          rootCause: serviceRequest.rootCause,
          solution: serviceRequest.solution,
          preventiveActions: serviceRequest.preventiveActions,
          followUpRequired: serviceRequest.followUpRequired
        }
      },
      client: {
        company: {
          id: client.companyId,
          name: client.name,
          type: client.type,
          email: client.email,
          phone: client.phone,
          address: client.address
        },
        contact: {
          person: client.contactPerson,
          email: client.contactEmail,
          phone: client.contactPhone,
          role: client.contactRole
        },
        preferences: {
          preferredContactMethod: client.preferredContactMethod,
          availableHours: client.availableHours,
          specialInstructions: client.specialInstructions
        }
      },
      equipment: {
        id: equipment.equipmentId,
        details: {
          name: equipment.name,
          type: equipment.type,
          category: equipment.category,
          model: equipment.model,
          serialNumber: equipment.serialNumber,
          manufacturer: equipment.manufacturer
        },
        location: {
          locationId: equipment.locationId,
          name: equipment.locationName,
          address: equipment.locationAddress,
          coordinates: equipment.coordinates
        },
        condition: {
          status: equipment.status,
          condition: equipment.condition,
          lastMaintenanceDate: equipment.lastMaintenanceDate,
          warrantyStatus: equipment.warrantyStatus
        },
        history: {
          installationDate: equipment.installationDate,
          operationalHours: equipment.operationalHours,
          previousIssues: equipment.previousIssues
        }
      },
      technician: {
        id: technician.userId,
        personal: {
          name: `${technician.firstName} ${technician.lastName}`,
          email: technician.email,
          phone: technician.phone
        },
        professional: {
          specializations: technician.specializations,
          certifications: technician.certifications,
          experienceYears: technician.experienceYears,
          serviceArea: technician.serviceArea
        },
        performance: {
          completedServices: technician.completedServices || 0,
          averageRating: parseFloat(technician.averageRating || 0),
          averageResponseTime: technician.averageResponseTime || 0,
          onTimeCompletion: parseFloat(technician.onTimeCompletion || 0)
        }
      },
      costs: {
        breakdown: {
          laborCost: parseFloat(serviceRequest.laborCost || 0),
          partsCost: parseFloat(serviceRequest.partsCost || 0),
          transportCost: parseFloat(serviceRequest.transportCost || 0),
          additionalCosts: parseFloat(serviceRequest.additionalCosts || 0)
        },
        totals: {
          estimatedCost: parseFloat(serviceRequest.estimatedCost || 0),
          finalCost: parseFloat(serviceRequest.finalCost || 0),
          variance: this.calculateCostVariance(serviceRequest.estimatedCost, serviceRequest.finalCost)
        },
        billing: {
          invoiceId: serviceRequest.invoiceId,
          invoiceStatus: serviceRequest.invoiceStatus,
          paymentStatus: serviceRequest.paymentStatus
        }
      },
      workLogs: workLogs.map(log => this.formatWorkLog(log)),
      parts: parts.map(part => this.formatPartUsage(part)),
      documentation: {
        photos: photos.map(photo => this.formatPhoto(photo)),
        reports: serviceRequest.reports || [],
        warranties: serviceRequest.warranties || []
      },
      communications: communications.map(comm => this.formatCommunication(comm)),
      quality: {
        metrics: {
          responseTime: this.calculateResponseTime(serviceRequest.requestDate, serviceRequest.responseDate),
          resolutionTime: this.calculateResolutionTime(serviceRequest.requestDate, serviceRequest.completionDate),
          firstTimeFixRate: this.calculateFirstTimeFixRate(serviceRequest),
          clientSatisfaction: parseFloat(serviceRequest.clientRating || 0)
        },
        feedback: {
          clientRating: serviceRequest.clientRating ? parseFloat(serviceRequest.clientRating) : null,
          clientFeedback: serviceRequest.clientFeedback,
          technicianNotes: serviceRequest.technicianNotes,
          internalNotes: serviceRequest.internalNotes
        }
      },
      analytics: this.generateServiceAnalytics(requestData),
      recommendations: this.generateServiceRecommendations(requestData)
    };
  }

  /**
   * Formatear estadísticas de solicitudes de servicio
   * @param {Object} statistics - Datos de estadísticas
   * @returns {Object} Estadísticas formateadas
   */
  static formatServiceStatistics(statistics) {
    return {
      overview: {
        totalRequests: parseInt(statistics.totalRequests || 0),
        openRequests: parseInt(statistics.openRequests || 0),
        inProgressRequests: parseInt(statistics.inProgressRequests || 0),
        completedRequests: parseInt(statistics.completedRequests || 0),
        cancelledRequests: parseInt(statistics.cancelledRequests || 0)
      },
      performance: {
        averageResponseTime: parseFloat(statistics.averageResponseTime || 0),
        averageResolutionTime: parseFloat(statistics.averageResolutionTime || 0),
        firstTimeFixRate: parseFloat(statistics.firstTimeFixRate || 0),
        clientSatisfaction: parseFloat(statistics.clientSatisfaction || 0)
      },
      costs: {
        totalServiceCosts: parseFloat(statistics.totalServiceCosts || 0),
        averageCostPerService: parseFloat(statistics.averageCostPerService || 0),
        laborCostPercentage: parseFloat(statistics.laborCostPercentage || 0),
        partsCostPercentage: parseFloat(statistics.partsCostPercentage || 0)
      },
      trends: {
        monthlyGrowth: parseFloat(statistics.monthlyGrowth || 0),
        repeatRequests: parseFloat(statistics.repeatRequests || 0),
        urgentRequestsPercentage: parseFloat(statistics.urgentRequestsPercentage || 0),
        preventableIssuesPercentage: parseFloat(statistics.preventableIssuesPercentage || 0)
      }
    };
  }

  // Métodos auxiliares privados

  /**
   * Calcular tiempo de respuesta en horas
   * @param {Date|string} requestDate - Fecha de solicitud
   * @param {Date|string} responseDate - Fecha de respuesta
   * @returns {number} Tiempo de respuesta en horas
   */
  static calculateResponseTime(requestDate, responseDate) {
    if (!requestDate || !responseDate) return null;
    
    const request = new Date(requestDate);
    const response = new Date(responseDate);
    
    return Math.round((response - request) / (1000 * 60 * 60) * 100) / 100;
  }

  /**
   * Calcular tiempo de resolución en horas
   * @param {Date|string} requestDate - Fecha de solicitud
   * @param {Date|string} completionDate - Fecha de finalización
   * @returns {number} Tiempo de resolución en horas
   */
  static calculateResolutionTime(requestDate, completionDate) {
    if (!requestDate || !completionDate) return null;
    
    const request = new Date(requestDate);
    const completion = new Date(completionDate);
    
    return Math.round((completion - request) / (1000 * 60 * 60) * 100) / 100;
  }

  /**
   * Verificar si la solicitud está vencida
   * @param {Date|string} requestDate - Fecha de solicitud
   * @param {string} status - Estado actual
   * @returns {boolean} Está vencida
   */
  static isOverdue(requestDate, status) {
    if (!requestDate || status === 'COMPLETED' || status === 'CANCELLED') {
      return false;
    }
    
    const request = new Date(requestDate);
    const now = new Date();
    const hoursElapsed = (now - request) / (1000 * 60 * 60);
    
    // Considera vencido después de 24 horas para solicitudes abiertas
    return hoursElapsed > 24;
  }

  /**
   * Calcular variación de costos
   * @param {number} estimated - Costo estimado
   * @param {number} final - Costo final
   * @returns {Object} Variación de costos
   */
  static calculateCostVariance(estimated, final) {
    const estimatedCost = parseFloat(estimated || 0);
    const finalCost = parseFloat(final || 0);
    
    if (estimatedCost === 0) {
      return { amount: 0, percentage: 0, status: 'no_estimate' };
    }
    
    const variance = finalCost - estimatedCost;
    const percentage = (variance / estimatedCost) * 100;
    
    let status = 'on_budget';
    if (percentage > 10) status = 'over_budget';
    else if (percentage < -10) status = 'under_budget';
    
    return {
      amount: variance,
      percentage: parseFloat(percentage.toFixed(2)),
      status
    };
  }

  /**
   * Calcular tasa de resolución en primer intento
   * @param {Object} serviceRequest - Datos de solicitud
   * @returns {number} Tasa de primer intento (0-100)
   */
  static calculateFirstTimeFixRate(serviceRequest) {
    // Lógica simplificada - podría ser más compleja basada en datos históricos
    if (serviceRequest.followUpRequired === false && serviceRequest.status === 'COMPLETED') {
      return 100;
    }
    return 0;
  }

  /**
   * Formatear registro de trabajo
   * @param {Object} log - Registro de trabajo
   * @returns {Object} Registro formateado
   */
  static formatWorkLog(log) {
    return {
      logId: log.logId,
      timestamp: log.timestamp,
      activity: log.activity,
      description: log.description,
      duration: parseInt(log.duration || 0),
      technician: log.technicianName,
      status: log.status,
      location: log.location
    };
  }

  /**
   * Formatear uso de partes
   * @param {Object} part - Datos de la parte
   * @returns {Object} Parte formateada
   */
  static formatPartUsage(part) {
    return {
      partId: part.partId,
      name: part.partName,
      partNumber: part.partNumber,
      quantity: parseInt(part.quantityUsed || 0),
      unitCost: parseFloat(part.unitCost || 0),
      totalCost: parseFloat(part.totalCost || 0),
      supplier: part.supplier,
      warrantyPeriod: part.warrantyPeriod,
      installationDate: part.installationDate
    };
  }

  /**
   * Formatear foto
   * @param {Object} photo - Datos de la foto
   * @returns {Object} Foto formateada
   */
  static formatPhoto(photo) {
    return {
      photoId: photo.photoId,
      filename: photo.filename,
      url: photo.url,
      caption: photo.caption,
      type: photo.type, // problem, solution, completion
      uploadedAt: photo.uploadedAt,
      uploadedBy: photo.uploadedBy
    };
  }

  /**
   * Formatear comunicación
   * @param {Object} communication - Datos de comunicación
   * @returns {Object} Comunicación formateada
   */
  static formatCommunication(communication) {
    return {
      communicationId: communication.communicationId,
      type: communication.type, // email, sms, call, note
      direction: communication.direction, // inbound, outbound
      subject: communication.subject,
      message: communication.message,
      timestamp: communication.timestamp,
      from: communication.fromUser,
      to: communication.toUser,
      status: communication.status
    };
  }

  /**
   * Generar análisis de servicio
   * @param {Object} requestData - Datos completos de solicitud
   * @returns {Object} Análisis generado
   */
  static generateServiceAnalytics(requestData) {
    const { serviceRequest, workLogs = [] } = requestData;
    
    return {
      efficiency: {
        responseEfficiency: this.assessResponseEfficiency(serviceRequest),
        resolutionEfficiency: this.assessResolutionEfficiency(serviceRequest),
        costEfficiency: this.calculateCostVariance(serviceRequest.estimatedCost, serviceRequest.finalCost),
        resourceUtilization: this.calculateResourceUtilization(workLogs)
      },
      quality: {
        serviceQuality: this.assessServiceQuality(serviceRequest),
        clientSatisfaction: parseFloat(serviceRequest.clientRating || 0),
        firstTimeFixSuccess: this.calculateFirstTimeFixRate(serviceRequest) > 0
      },
      patterns: {
        issueType: serviceRequest.issueType,
        rootCause: serviceRequest.rootCause,
        preventable: this.assessPreventability(serviceRequest),
        recurrence: this.assessRecurrence(requestData)
      }
    };
  }

  /**
   * Generar recomendaciones de servicio
   * @param {Object} requestData - Datos completos de solicitud
   * @returns {Array} Recomendaciones
   */
  static generateServiceRecommendations(requestData) {
    const recommendations = [];
    const { serviceRequest, equipment = {} } = requestData;
    
    // Recomendación de mantenimiento preventivo
    if (serviceRequest.rootCause && serviceRequest.rootCause.includes('maintenance')) {
      recommendations.push({
        type: 'preventive',
        priority: 'medium',
        message: 'Considerar mantenimiento preventivo para evitar problemas similares'
      });
    }
    
    // Recomendación de capacitación
    if (serviceRequest.rootCause && serviceRequest.rootCause.includes('user error')) {
      recommendations.push({
        type: 'training',
        priority: 'low',
        message: 'Capacitación adicional para el cliente podría prevenir problemas similares'
      });
    }
    
    // Recomendación de reemplazo de equipo
    if (equipment.condition === 'POOR' && serviceRequest.finalCost > equipment.replacementCost * 0.3) {
      recommendations.push({
        type: 'replacement',
        priority: 'high',
        message: 'Costo de reparación alto - evaluar reemplazo de equipo'
      });
    }
    
    // Recomendación de seguimiento
    if (serviceRequest.followUpRequired) {
      recommendations.push({
        type: 'followup',
        priority: 'medium',
        message: 'Programar seguimiento para verificar resolución completa'
      });
    }
    
    return recommendations;
  }

  /**
   * Evaluar eficiencia de respuesta
   * @param {Object} serviceRequest - Datos de solicitud
   * @returns {string} Nivel de eficiencia
   */
  static assessResponseEfficiency(serviceRequest) {
    const responseTime = this.calculateResponseTime(serviceRequest.requestDate, serviceRequest.responseDate);
    
    if (!responseTime) return 'unknown';
    if (responseTime <= 2) return 'excellent';
    if (responseTime <= 8) return 'good';
    if (responseTime <= 24) return 'acceptable';
    return 'poor';
  }

  /**
   * Evaluar eficiencia de resolución
   * @param {Object} serviceRequest - Datos de solicitud
   * @returns {string} Nivel de eficiencia
   */
  static assessResolutionEfficiency(serviceRequest) {
    const resolutionTime = this.calculateResolutionTime(serviceRequest.requestDate, serviceRequest.completionDate);
    
    if (!resolutionTime) return 'unknown';
    if (resolutionTime <= 4) return 'excellent';
    if (resolutionTime <= 24) return 'good';
    if (resolutionTime <= 72) return 'acceptable';
    return 'poor';
  }

  /**
   * Evaluar calidad del servicio
   * @param {Object} serviceRequest - Datos de solicitud
   * @returns {number} Puntuación de calidad (0-100)
   */
  static assessServiceQuality(serviceRequest) {
    let score = 0;
    
    if (serviceRequest.workPerformed) score += 25;
    if (serviceRequest.rootCause) score += 25;
    if (serviceRequest.solution) score += 25;
    if (serviceRequest.clientRating >= 4) score += 25;
    
    return score;
  }

  /**
   * Evaluar si el problema era prevenible
   * @param {Object} serviceRequest - Datos de solicitud
   * @returns {boolean} Era prevenible
   */
  static assessPreventability(serviceRequest) {
    const preventableCauses = ['maintenance', 'wear', 'regular inspection'];
    const rootCause = serviceRequest.rootCause || '';
    
    return preventableCauses.some(cause => rootCause.toLowerCase().includes(cause));
  }

  /**
   * Evaluar recurrencia del problema
   * @param {Object} requestData - Datos completos
   * @returns {boolean} Es recurrente
   */
  static assessRecurrence(requestData) {
    // Lógica simplificada - en implementación real consultaría histórico
    const { equipment = {} } = requestData;
    return Boolean(equipment.previousIssues && equipment.previousIssues.length > 2);
  }

  /**
   * Calcular utilización de recursos
   * @param {Array} workLogs - Registros de trabajo
   * @returns {Object} Utilización de recursos
   */
  static calculateResourceUtilization(workLogs) {
    if (!workLogs.length) return { efficiency: 0, totalHours: 0 };
    
    const totalHours = workLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const productiveHours = workLogs
      .filter(log => log.status === 'PRODUCTIVE')
      .reduce((sum, log) => sum + (log.duration || 0), 0);
    
    return {
      efficiency: totalHours > 0 ? (productiveHours / totalHours) * 100 : 0,
      totalHours,
      productiveHours
    };
  }
}

module.exports = ProviderServiceRequestResponseDTO;
