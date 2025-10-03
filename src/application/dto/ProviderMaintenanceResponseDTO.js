/**
 * DTO: Provider Maintenance Response
 * Estructura las respuestas de mantenimiento para PROVIDER
 */
class ProviderMaintenanceResponseDTO {
  
  /**
   * Formatear lista de mantenimientos
   * @param {Object} result - Datos de mantenimientos con paginación
   * @returns {Object} Respuesta formateada de lista de mantenimientos
   */
  static formatMaintenancesList(result) {
    const { data = [], pagination = {} } = result;

    return {
      maintenances: data.map(maintenance => this.formatMaintenanceSummary(maintenance)),
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        pages: pagination.pages || 0,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1
      },
      summary: {
        totalMaintenances: pagination.total || 0,
        pendingMaintenances: data.filter(m => m.status === 'SCHEDULED').length,
        inProgressMaintenances: data.filter(m => m.status === 'IN_PROGRESS').length,
        completedMaintenances: data.filter(m => m.status === 'COMPLETED').length,
        overdueMaintenances: data.filter(m => this.isOverdue(m.scheduledDate, m.status)).length
      }
    };
  }

  /**
   * Formatear resumen de mantenimiento (para listas)
   * @param {Object} maintenance - Datos de mantenimiento
   * @returns {Object} Resumen formateado
   */
  static formatMaintenanceSummary(maintenance) {
    return {
      id: maintenance.maintenanceId || maintenance.id,
      type: maintenance.type,
      title: maintenance.title || `${maintenance.type} - ${maintenance.equipmentName}`,
      equipment: {
        equipmentId: maintenance.equipmentId,
        name: maintenance.equipmentName,
        type: maintenance.equipmentType,
        serialNumber: maintenance.serialNumber,
        model: maintenance.model
      },
      schedule: {
        scheduledDate: maintenance.scheduledDate,
        estimatedDuration: maintenance.estimatedDuration,
        completedDate: maintenance.completedDate,
        isOverdue: this.isOverdue(maintenance.scheduledDate, maintenance.status)
      },
      status: maintenance.status,
      priority: maintenance.priority,
      technician: {
        technicianId: maintenance.technicianId,
        name: maintenance.technicianName,
        email: maintenance.technicianEmail,
        phone: maintenance.technicianPhone
      },
      client: {
        companyId: maintenance.clientCompanyId,
        companyName: maintenance.clientCompanyName,
        contactPerson: maintenance.clientContactPerson
      },
      costs: {
        estimatedCost: parseFloat(maintenance.estimatedCost || 0),
        actualCost: parseFloat(maintenance.actualCost || 0),
        laborCost: parseFloat(maintenance.laborCost || 0),
        partsCost: parseFloat(maintenance.partsCost || 0)
      },
      location: {
        locationId: maintenance.locationId,
        name: maintenance.locationName,
        address: maintenance.locationAddress
      },
      alerts: {
        isOverdue: this.isOverdue(maintenance.scheduledDate, maintenance.status),
        needsApproval: maintenance.status === 'PENDING_APPROVAL',
        highPriority: maintenance.priority === 'HIGH' || maintenance.priority === 'CRITICAL'
      },
      meta: {
        createdAt: maintenance.createdAt,
        updatedAt: maintenance.updatedAt
      }
    };
  }

  /**
   * Formatear detalles completos de mantenimiento
   * @param {Object} maintenanceData - Datos completos de mantenimiento
   * @returns {Object} Detalles formateados
   */
  static formatMaintenanceDetails(maintenanceData) {
    const {
      maintenance,
      equipment = {},
      technician = {},
      client = {},
      parts = [],
      workLogs = [],
      photos = []
    } = maintenanceData;

    return {
      maintenance: {
        id: maintenance.maintenanceId,
        type: maintenance.type,
        title: maintenance.title,
        description: maintenance.description,
        status: maintenance.status,
        priority: maintenance.priority,
        schedule: {
          scheduledDate: maintenance.scheduledDate,
          estimatedDuration: maintenance.estimatedDuration,
          actualStartTime: maintenance.actualStartTime,
          actualEndTime: maintenance.actualEndTime,
          completedDate: maintenance.completedDate
        },
        instructions: {
          preMaintenanceChecks: maintenance.preMaintenanceChecks,
          maintenanceSteps: maintenance.maintenanceSteps,
          postMaintenanceChecks: maintenance.postMaintenanceChecks,
          safetyPrecautions: maintenance.safetyPrecautions
        },
        results: {
          workPerformed: maintenance.workPerformed,
          issuesFound: maintenance.issuesFound,
          recommendations: maintenance.recommendations,
          nextMaintenanceDate: maintenance.nextMaintenanceDate
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
        technical: {
          specifications: equipment.specifications,
          warrantyExpiry: equipment.warrantyExpiry,
          installationDate: equipment.installationDate,
          lastMaintenanceDate: equipment.lastMaintenanceDate
        },
        condition: {
          status: equipment.status,
          condition: equipment.condition,
          operationalHours: equipment.operationalHours
        }
      },
      technician: technician ? {
        id: technician.userId,
        personal: {
          name: `${technician.firstName} ${technician.lastName}`,
          email: technician.email,
          phone: technician.phone
        },
        professional: {
          specializations: technician.specializations,
          certifications: technician.certifications,
          experienceYears: technician.experienceYears
        },
        performance: {
          completedMaintenances: technician.completedMaintenances || 0,
          averageRating: parseFloat(technician.averageRating || 0),
          onTimeCompletion: parseFloat(technician.onTimeCompletion || 0)
        }
      } : null,
      client: client ? {
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
          phone: client.contactPhone
        }
      } : null,
      costs: {
        breakdown: {
          laborCost: parseFloat(maintenance.laborCost || 0),
          partsCost: parseFloat(maintenance.partsCost || 0),
          transportCost: parseFloat(maintenance.transportCost || 0),
          additionalCosts: parseFloat(maintenance.additionalCosts || 0)
        },
        totals: {
          estimatedCost: parseFloat(maintenance.estimatedCost || 0),
          actualCost: parseFloat(maintenance.actualCost || 0),
          variance: this.calculateCostVariance(maintenance.estimatedCost, maintenance.actualCost)
        }
      },
      parts: parts.map(part => this.formatPartUsage(part)),
      workLogs: workLogs.map(log => this.formatWorkLog(log)),
      documentation: {
        photos: photos.map(photo => this.formatPhoto(photo)),
        reports: maintenance.reports || [],
        certificates: maintenance.certificates || []
      },
      analytics: this.generateMaintenanceAnalytics(maintenanceData),
      recommendations: this.generateMaintenanceRecommendations(maintenanceData)
    };
  }

  /**
   * Formatear estadísticas de mantenimiento
   * @param {Object} statistics - Datos de estadísticas
   * @returns {Object} Estadísticas formateadas
   */
  static formatMaintenanceStatistics(statistics) {
    return {
      overview: {
        totalMaintenances: parseInt(statistics.totalMaintenances || 0),
        scheduledMaintenances: parseInt(statistics.scheduledMaintenances || 0),
        inProgressMaintenances: parseInt(statistics.inProgressMaintenances || 0),
        completedMaintenances: parseInt(statistics.completedMaintenances || 0),
        overdueMaintenances: parseInt(statistics.overdueMaintenances || 0)
      },
      performance: {
        onTimeCompletion: parseFloat(statistics.onTimeCompletion || 0),
        averageCompletionTime: parseFloat(statistics.averageCompletionTime || 0),
        costEfficiency: parseFloat(statistics.costEfficiency || 0),
        clientSatisfaction: parseFloat(statistics.clientSatisfaction || 0)
      },
      costs: {
        totalCosts: parseFloat(statistics.totalCosts || 0),
        averageCostPerMaintenance: parseFloat(statistics.averageCostPerMaintenance || 0),
        laborCostPercentage: parseFloat(statistics.laborCostPercentage || 0),
        partsCostPercentage: parseFloat(statistics.partsCostPercentage || 0)
      },
      trends: {
        monthlyGrowth: parseFloat(statistics.monthlyGrowth || 0),
        repeatCustomers: parseFloat(statistics.repeatCustomers || 0),
        preventiveRatio: parseFloat(statistics.preventiveRatio || 0),
        emergencyRatio: parseFloat(statistics.emergencyRatio || 0)
      }
    };
  }

  // Métodos auxiliares privados

  /**
   * Verificar si el mantenimiento está vencido
   * @param {Date|string} scheduledDate - Fecha programada
   * @param {string} status - Estado del mantenimiento
   * @returns {boolean} Está vencido
   */
  static isOverdue(scheduledDate, status) {
    if (!scheduledDate || status === 'COMPLETED' || status === 'CANCELLED') {
      return false;
    }
    
    const scheduled = new Date(scheduledDate);
    const now = new Date();
    
    return scheduled < now;
  }

  /**
   * Calcular variación de costos
   * @param {number} estimated - Costo estimado
   * @param {number} actual - Costo real
   * @returns {Object} Variación de costos
   */
  static calculateCostVariance(estimated, actual) {
    const estimatedCost = parseFloat(estimated || 0);
    const actualCost = parseFloat(actual || 0);
    
    if (estimatedCost === 0) {
      return { amount: 0, percentage: 0, status: 'no_estimate' };
    }
    
    const variance = actualCost - estimatedCost;
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
      warrantyPeriod: part.warrantyPeriod
    };
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
      status: log.status
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
      type: photo.type, // before, during, after
      uploadedAt: photo.uploadedAt,
      uploadedBy: photo.uploadedBy
    };
  }

  /**
   * Generar análisis de mantenimiento
   * @param {Object} maintenanceData - Datos completos de mantenimiento
   * @returns {Object} Análisis generado
   */
  static generateMaintenanceAnalytics(maintenanceData) {
    const { maintenance, workLogs = [] } = maintenanceData;
    
    return {
      efficiency: {
        plannedVsActual: this.calculateTimeVariance(
          maintenance.estimatedDuration,
          this.calculateActualDuration(maintenance.actualStartTime, maintenance.actualEndTime)
        ),
        costEfficiency: this.calculateCostVariance(maintenance.estimatedCost, maintenance.actualCost),
        resourceUtilization: this.calculateResourceUtilization(workLogs)
      },
      quality: {
        completionQuality: this.assessCompletionQuality(maintenance),
        clientSatisfaction: parseFloat(maintenance.clientRating || 0),
        issuesFound: (maintenance.issuesFound || '').split(',').filter(i => i.trim()).length
      },
      compliance: {
        safetyCompliance: this.assessSafetyCompliance(maintenance),
        procedureCompliance: this.assessProcedureCompliance(workLogs),
        documentationComplete: this.assessDocumentationCompleteness(maintenanceData)
      }
    };
  }

  /**
   * Generar recomendaciones de mantenimiento
   * @param {Object} maintenanceData - Datos completos de mantenimiento
   * @returns {Array} Recomendaciones
   */
  static generateMaintenanceRecommendations(maintenanceData) {
    const recommendations = [];
    const { maintenance, equipment = {} } = maintenanceData;
    
    // Recomendación de próximo mantenimiento
    if (maintenance.status === 'COMPLETED' && maintenance.nextMaintenanceDate) {
      const nextDate = new Date(maintenance.nextMaintenanceDate);
      const daysUntilNext = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilNext <= 30) {
        recommendations.push({
          type: 'schedule',
          priority: daysUntilNext <= 7 ? 'high' : 'medium',
          message: `Próximo mantenimiento programado en ${daysUntilNext} días`
        });
      }
    }
    
    // Recomendaciones de costo
    const costVariance = this.calculateCostVariance(maintenance.estimatedCost, maintenance.actualCost);
    if (costVariance.percentage > 20) {
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        message: 'Revisar estimaciones de costo para futuros mantenimientos'
      });
    }
    
    // Recomendaciones de equipo
    if (equipment.condition === 'POOR') {
      recommendations.push({
        type: 'equipment',
        priority: 'high',
        message: 'Equipo en mal estado - considerar reemplazo o mantenimiento mayor'
      });
    }
    
    return recommendations;
  }

  /**
   * Calcular variación de tiempo
   * @param {number} planned - Tiempo planificado
   * @param {number} actual - Tiempo real
   * @returns {Object} Variación de tiempo
   */
  static calculateTimeVariance(planned, actual) {
    const plannedTime = parseFloat(planned || 0);
    const actualTime = parseFloat(actual || 0);
    
    if (plannedTime === 0) {
      return { variance: 0, percentage: 0, status: 'no_estimate' };
    }
    
    const variance = actualTime - plannedTime;
    const percentage = (variance / plannedTime) * 100;
    
    let status = 'on_time';
    if (percentage > 20) status = 'delayed';
    else if (percentage < -20) status = 'early';
    
    return {
      variance,
      percentage: parseFloat(percentage.toFixed(2)),
      status
    };
  }

  /**
   * Calcular duración real
   * @param {Date|string} startTime - Tiempo de inicio
   * @param {Date|string} endTime - Tiempo de fin
   * @returns {number} Duración en horas
   */
  static calculateActualDuration(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return Math.round((end - start) / (1000 * 60 * 60) * 100) / 100;
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

  /**
   * Evaluar calidad de finalización
   * @param {Object} maintenance - Datos de mantenimiento
   * @returns {number} Puntuación de calidad (0-100)
   */
  static assessCompletionQuality(maintenance) {
    let score = 0;
    
    if (maintenance.workPerformed) score += 25;
    if (maintenance.issuesFound !== null) score += 25;
    if (maintenance.recommendations) score += 25;
    if (maintenance.nextMaintenanceDate) score += 25;
    
    return score;
  }

  /**
   * Evaluar cumplimiento de seguridad
   * @param {Object} maintenance - Datos de mantenimiento
   * @returns {boolean} Cumple con seguridad
   */
  static assessSafetyCompliance(maintenance) {
    return Boolean(maintenance.safetyPrecautions && maintenance.preMaintenanceChecks);
  }

  /**
   * Evaluar cumplimiento de procedimientos
   * @param {Array} workLogs - Registros de trabajo
   * @returns {boolean} Cumple con procedimientos
   */
  static assessProcedureCompliance(workLogs) {
    return workLogs.every(log => log.status && log.description);
  }

  /**
   * Evaluar completitud de documentación
   * @param {Object} maintenanceData - Datos completos
   * @returns {number} Porcentaje de completitud
   */
  static assessDocumentationCompleteness(maintenanceData) {
    const { maintenance, photos = [], workLogs = [] } = maintenanceData;
    let completeness = 0;
    
    if (maintenance.workPerformed) completeness += 20;
    if (maintenance.issuesFound !== null) completeness += 20;
    if (maintenance.recommendations) completeness += 20;
    if (photos.length > 0) completeness += 20;
    if (workLogs.length > 0) completeness += 20;
    
    return completeness;
  }
}

module.exports = ProviderMaintenanceResponseDTO;
