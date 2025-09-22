/**
 * DTO: Provider Profile Response
 * Estructura las respuestas de perfil para PROVIDER
 */
class ProviderProfileResponseDTO {
  
  /**
   * Formatear perfil completo de provider
   * @param {Object} profileData - Datos completos del perfil
   * @returns {Object} Perfil formateado
   */
  static formatProfileDetails(profileData) {
    const {
      user,
      company,
      settings = {},
      statistics = {},
      certifications = [],
      team = []
    } = profileData;

    return {
      user: {
        id: user.userId,
        personal: {
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          role: user.role,
          position: user.position
        },
        account: {
          username: user.username,
          status: user.status,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified
        },
        preferences: {
          language: user.language || 'es',
          timezone: user.timezone || 'America/Santiago',
          notifications: user.notificationPreferences,
          dateFormat: user.dateFormat || 'DD/MM/YYYY'
        }
      },
      company: {
        id: company.companyId,
        basic: {
          name: company.name,
          type: company.type,
          taxId: company.taxId,
          registrationNumber: company.registrationNumber,
          legalStatus: company.legalStatus
        },
        contact: {
          email: company.email,
          phone: company.phone,
          website: company.website,
          address: company.address,
          city: company.city,
          state: company.state,
          country: company.country || 'Chile',
          postalCode: company.postalCode
        },
        business: {
          description: company.description,
          businessType: company.businessType,
          industry: company.industry,
          founded: company.foundedDate,
          employeeCount: company.employeeCount,
          serviceArea: company.serviceArea
        },
        financial: {
          bankAccount: company.bankAccount,
          taxNumber: company.taxNumber,
          billingAddress: company.billingAddress,
          paymentTerms: company.paymentTerms
        },
        branding: {
          logo: company.logoUrl,
          primaryColor: company.primaryColor,
          secondaryColor: company.secondaryColor,
          slogan: company.slogan
        }
      },
      settings: {
        business: {
          operatingHours: settings.operatingHours || this.getDefaultOperatingHours(),
          serviceRadius: settings.serviceRadius || 50,
          emergencyService: settings.emergencyService || false,
          autoAcceptOrders: settings.autoAcceptOrders || false,
          minimumOrderValue: parseFloat(settings.minimumOrderValue || 0)
        },
        notifications: {
          emailNotifications: settings.emailNotifications !== false,
          smsNotifications: settings.smsNotifications || false,
          pushNotifications: settings.pushNotifications !== false,
          marketingEmails: settings.marketingEmails || false,
          reportFrequency: settings.reportFrequency || 'weekly'
        },
        pricing: {
          defaultHourlyRate: parseFloat(settings.defaultHourlyRate || 0),
          emergencyRateMultiplier: parseFloat(settings.emergencyRateMultiplier || 1.5),
          minimumCalloutFee: parseFloat(settings.minimumCalloutFee || 0),
          travelRatePerKm: parseFloat(settings.travelRatePerKm || 0)
        },
        quality: {
          requirePhotoEvidence: settings.requirePhotoEvidence !== false,
          customerApprovalRequired: settings.customerApprovalRequired || false,
          qualityChecklistRequired: settings.qualityChecklistRequired !== false,
          followUpPeriod: parseInt(settings.followUpPeriod || 7)
        }
      },
      performance: {
        overview: {
          totalClients: parseInt(statistics.totalClients || 0),
          activeContracts: parseInt(statistics.activeContracts || 0),
          completedServices: parseInt(statistics.completedServices || 0),
          totalRevenue: parseFloat(statistics.totalRevenue || 0)
        },
        ratings: {
          overallRating: parseFloat(statistics.averageRating || 0),
          totalReviews: parseInt(statistics.totalReviews || 0),
          recommendationRate: parseFloat(statistics.recommendationRate || 0),
          repeatCustomerRate: parseFloat(statistics.repeatCustomerRate || 0)
        },
        efficiency: {
          averageResponseTime: parseFloat(statistics.averageResponseTime || 0),
          onTimeCompletion: parseFloat(statistics.onTimeCompletion || 0),
          firstTimeFixRate: parseFloat(statistics.firstTimeFixRate || 0),
          costEfficiency: parseFloat(statistics.costEfficiency || 0)
        },
        growth: {
          monthlyGrowth: parseFloat(statistics.monthlyGrowth || 0),
          yearlyGrowth: parseFloat(statistics.yearlyGrowth || 0),
          clientRetention: parseFloat(statistics.clientRetention || 0),
          marketShare: parseFloat(statistics.marketShare || 0)
        }
      },
      certifications: certifications.map(cert => this.formatCertification(cert)),
      team: team.map(member => this.formatTeamMember(member)),
      compliance: {
        licenseStatus: company.licenseStatus || 'active',
        insuranceStatus: company.insuranceStatus || 'active',
        certificationStatus: this.assessCertificationStatus(certifications),
        lastAudit: company.lastAuditDate,
        nextRenewal: company.nextRenewalDate
      },
      insights: this.generateProfileInsights(profileData),
      recommendations: this.generateProfileRecommendations(profileData)
    };
  }

  /**
   * Formatear resumen de perfil de provider
   * @param {Object} profileData - Datos básicos del perfil
   * @returns {Object} Resumen formateado
   */
  static formatProfileSummary(profileData) {
    const { user, company, statistics = {} } = profileData;

    return {
      user: {
        id: user.userId,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        status: user.status
      },
      company: {
        id: company.companyId,
        name: company.name,
        type: company.type,
        email: company.email,
        phone: company.phone,
        city: company.city,
        serviceArea: company.serviceArea
      },
      performance: {
        rating: parseFloat(statistics.averageRating || 0),
        clients: parseInt(statistics.totalClients || 0),
        services: parseInt(statistics.completedServices || 0),
        revenue: parseFloat(statistics.totalRevenue || 0)
      },
      status: {
        verified: user.emailVerified && company.licenseStatus === 'active',
        active: user.status === 'ACTIVE',
        compliant: this.checkCompliance(profileData)
      }
    };
  }

  /**
   * Formatear configuración de perfil
   * @param {Object} settings - Configuraciones del perfil
   * @returns {Object} Configuración formateada
   */
  static formatProfileSettings(settings) {
    return {
      business: {
        operatingHours: settings.operatingHours || this.getDefaultOperatingHours(),
        serviceRadius: parseInt(settings.serviceRadius || 50),
        emergencyService: Boolean(settings.emergencyService),
        autoAcceptOrders: Boolean(settings.autoAcceptOrders),
        minimumOrderValue: parseFloat(settings.minimumOrderValue || 0)
      },
      notifications: {
        email: Boolean(settings.emailNotifications !== false),
        sms: Boolean(settings.smsNotifications),
        push: Boolean(settings.pushNotifications !== false),
        marketing: Boolean(settings.marketingEmails),
        frequency: settings.reportFrequency || 'weekly'
      },
      pricing: {
        hourlyRate: parseFloat(settings.defaultHourlyRate || 0),
        emergencyMultiplier: parseFloat(settings.emergencyRateMultiplier || 1.5),
        calloutFee: parseFloat(settings.minimumCalloutFee || 0),
        travelRate: parseFloat(settings.travelRatePerKm || 0)
      },
      quality: {
        photoEvidence: Boolean(settings.requirePhotoEvidence !== false),
        customerApproval: Boolean(settings.customerApprovalRequired),
        checklist: Boolean(settings.qualityChecklistRequired !== false),
        followUpDays: parseInt(settings.followUpPeriod || 7)
      }
    };
  }

  /**
   * Formatear estadísticas de perfil
   * @param {Object} statistics - Datos de estadísticas
   * @returns {Object} Estadísticas formateadas
   */
  static formatProfileStatistics(statistics) {
    return {
      business: {
        totalClients: parseInt(statistics.totalClients || 0),
        activeClients: parseInt(statistics.activeClients || 0),
        newClientsThisMonth: parseInt(statistics.newClientsThisMonth || 0),
        clientRetentionRate: parseFloat(statistics.clientRetentionRate || 0)
      },
      services: {
        totalServices: parseInt(statistics.totalServices || 0),
        completedServices: parseInt(statistics.completedServices || 0),
        averageServiceValue: parseFloat(statistics.averageServiceValue || 0),
        servicesThisMonth: parseInt(statistics.servicesThisMonth || 0)
      },
      financial: {
        totalRevenue: parseFloat(statistics.totalRevenue || 0),
        monthlyRevenue: parseFloat(statistics.monthlyRevenue || 0),
        averageInvoiceValue: parseFloat(statistics.averageInvoiceValue || 0),
        outstandingPayments: parseFloat(statistics.outstandingPayments || 0)
      },
      quality: {
        averageRating: parseFloat(statistics.averageRating || 0),
        totalReviews: parseInt(statistics.totalReviews || 0),
        recommendationRate: parseFloat(statistics.recommendationRate || 0),
        complaintRate: parseFloat(statistics.complaintRate || 0)
      },
      efficiency: {
        averageResponseTime: parseFloat(statistics.averageResponseTime || 0),
        onTimeCompletion: parseFloat(statistics.onTimeCompletion || 0),
        firstTimeFixRate: parseFloat(statistics.firstTimeFixRate || 0),
        utilizationRate: parseFloat(statistics.utilizationRate || 0)
      }
    };
  }

  // Métodos auxiliares privados

  /**
   * Formatear certificación
   * @param {Object} certification - Datos de certificación
   * @returns {Object} Certificación formateada
   */
  static formatCertification(certification) {
    return {
      id: certification.certificationId,
      name: certification.name,
      issuer: certification.issuer,
      number: certification.number,
      type: certification.type,
      level: certification.level,
      issueDate: certification.issueDate,
      expiryDate: certification.expiryDate,
      status: this.getCertificationStatus(certification.expiryDate),
      verificationUrl: certification.verificationUrl,
      attachments: certification.attachments || []
    };
  }

  /**
   * Formatear miembro del equipo
   * @param {Object} member - Datos del miembro
   * @returns {Object} Miembro formateado
   */
  static formatTeamMember(member) {
    return {
      id: member.userId,
      name: `${member.firstName} ${member.lastName}`,
      email: member.email,
      phone: member.phone,
      role: member.role,
      position: member.position,
      specializations: member.specializations || [],
      joinDate: member.joinDate,
      status: member.status,
      permissions: member.permissions || [],
      performance: {
        completedTasks: parseInt(member.completedTasks || 0),
        averageRating: parseFloat(member.averageRating || 0),
        responseTime: parseFloat(member.averageResponseTime || 0)
      }
    };
  }

  /**
   * Obtener horarios de operación por defecto
   * @returns {Object} Horarios por defecto
   */
  static getDefaultOperatingHours() {
    return {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '13:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true }
    };
  }

  /**
   * Obtener estado de certificación
   * @param {Date|string} expiryDate - Fecha de vencimiento
   * @returns {string} Estado de la certificación
   */
  static getCertificationStatus(expiryDate) {
    if (!expiryDate) return 'permanent';
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    if (daysUntilExpiry <= 90) return 'expires_in_quarter';
    return 'active';
  }

  /**
   * Evaluar estado general de certificaciones
   * @param {Array} certifications - Lista de certificaciones
   * @returns {string} Estado general
   */
  static assessCertificationStatus(certifications) {
    if (!certifications.length) return 'none';
    
    const statuses = certifications.map(cert => this.getCertificationStatus(cert.expiryDate));
    
    if (statuses.includes('expired')) return 'expired';
    if (statuses.includes('expiring_soon')) return 'expiring_soon';
    if (statuses.every(status => status === 'active' || status === 'permanent')) return 'current';
    return 'mixed';
  }

  /**
   * Verificar cumplimiento general
   * @param {Object} profileData - Datos del perfil
   * @returns {boolean} Está en cumplimiento
   */
  static checkCompliance(profileData) {
    const { user, company, certifications = [] } = profileData;
    
    const userVerified = user.emailVerified && user.status === 'ACTIVE';
    const companyActive = company.licenseStatus === 'active' && company.insuranceStatus === 'active';
    const certificationsValid = this.assessCertificationStatus(certifications) !== 'expired';
    
    return userVerified && companyActive && certificationsValid;
  }

  /**
   * Generar insights del perfil
   * @param {Object} profileData - Datos completos del perfil
   * @returns {Object} Insights generados
   */
  static generateProfileInsights(profileData) {
    const { statistics = {}, certifications = [], settings = {} } = profileData;
    
    return {
      strengths: this.identifyStrengths(statistics),
      opportunities: this.identifyOpportunities(statistics, settings),
      risks: this.identifyRisks(profileData),
      trends: this.analyzeTrends(statistics),
      benchmarks: this.generateBenchmarks(statistics)
    };
  }

  /**
   * Generar recomendaciones del perfil
   * @param {Object} profileData - Datos completos del perfil
   * @returns {Array} Recomendaciones
   */
  static generateProfileRecommendations(profileData) {
    const recommendations = [];
    const { statistics = {}, certifications = [], settings = {}, company } = profileData;
    
    // Recomendaciones de certificaciones
    const expiringCerts = certifications.filter(cert => 
      this.getCertificationStatus(cert.expiryDate) === 'expiring_soon');
    
    if (expiringCerts.length > 0) {
      recommendations.push({
        type: 'certification',
        priority: 'high',
        message: `${expiringCerts.length} certificación(es) próximas a vencer`,
        action: 'Renovar certificaciones'
      });
    }
    
    // Recomendaciones de performance
    const avgRating = parseFloat(statistics.averageRating || 0);
    if (avgRating < 4.0 && avgRating > 0) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: 'Calificación promedio podría mejorar',
        action: 'Enfocarse en la satisfacción del cliente'
      });
    }
    
    // Recomendaciones de crecimiento
    const monthlyGrowth = parseFloat(statistics.monthlyGrowth || 0);
    if (monthlyGrowth < 5) {
      recommendations.push({
        type: 'growth',
        priority: 'medium',
        message: 'Oportunidad de crecimiento identificada',
        action: 'Considerar estrategias de marketing digital'
      });
    }
    
    // Recomendaciones de configuración
    if (!settings.emergencyService) {
      recommendations.push({
        type: 'service',
        priority: 'low',
        message: 'Servicio de emergencia no activado',
        action: 'Considerar ofrecer servicios de emergencia'
      });
    }
    
    return recommendations;
  }

  /**
   * Identificar fortalezas
   * @param {Object} statistics - Estadísticas
   * @returns {Array} Lista de fortalezas
   */
  static identifyStrengths(statistics) {
    const strengths = [];
    
    if (parseFloat(statistics.averageRating || 0) >= 4.5) {
      strengths.push('Excelente calificación de clientes');
    }
    
    if (parseFloat(statistics.onTimeCompletion || 0) >= 90) {
      strengths.push('Alta puntualidad en completar servicios');
    }
    
    if (parseFloat(statistics.clientRetentionRate || 0) >= 80) {
      strengths.push('Excelente retención de clientes');
    }
    
    if (parseFloat(statistics.firstTimeFixRate || 0) >= 85) {
      strengths.push('Alta tasa de resolución en primer intento');
    }
    
    return strengths;
  }

  /**
   * Identificar oportunidades
   * @param {Object} statistics - Estadísticas
   * @param {Object} settings - Configuraciones
   * @returns {Array} Lista de oportunidades
   */
  static identifyOpportunities(statistics, settings) {
    const opportunities = [];
    
    if (parseFloat(statistics.averageServiceValue || 0) < 50000) {
      opportunities.push('Incrementar valor promedio de servicios');
    }
    
    if (!settings.emergencyService) {
      opportunities.push('Expandir a servicios de emergencia');
    }
    
    if (parseInt(statistics.servicesThisMonth || 0) < 20) {
      opportunities.push('Aumentar volumen de servicios mensuales');
    }
    
    if (parseFloat(statistics.utilizationRate || 0) < 70) {
      opportunities.push('Mejorar utilización de recursos');
    }
    
    return opportunities;
  }

  /**
   * Identificar riesgos
   * @param {Object} profileData - Datos del perfil
   * @returns {Array} Lista de riesgos
   */
  static identifyRisks(profileData) {
    const risks = [];
    const { statistics = {}, certifications = [], company } = profileData;
    
    if (parseFloat(statistics.clientRetentionRate || 0) < 60) {
      risks.push('Baja retención de clientes');
    }
    
    if (parseFloat(statistics.outstandingPayments || 0) > parseFloat(statistics.monthlyRevenue || 0)) {
      risks.push('Alto nivel de pagos pendientes');
    }
    
    const expiredCerts = certifications.filter(cert => 
      this.getCertificationStatus(cert.expiryDate) === 'expired');
    
    if (expiredCerts.length > 0) {
      risks.push('Certificaciones vencidas');
    }
    
    if (company.insuranceStatus !== 'active') {
      risks.push('Seguro no activo');
    }
    
    return risks;
  }

  /**
   * Analizar tendencias
   * @param {Object} statistics - Estadísticas
   * @returns {Object} Análisis de tendencias
   */
  static analyzeTrends(statistics) {
    return {
      revenue: {
        direction: parseFloat(statistics.monthlyGrowth || 0) > 0 ? 'up' : 'down',
        percentage: parseFloat(statistics.monthlyGrowth || 0)
      },
      clients: {
        direction: parseInt(statistics.newClientsThisMonth || 0) > 0 ? 'up' : 'stable',
        count: parseInt(statistics.newClientsThisMonth || 0)
      },
      quality: {
        direction: parseFloat(statistics.averageRating || 0) >= 4.0 ? 'stable' : 'down',
        rating: parseFloat(statistics.averageRating || 0)
      }
    };
  }

  /**
   * Generar benchmarks
   * @param {Object} statistics - Estadísticas
   * @returns {Object} Benchmarks de la industria
   */
  static generateBenchmarks(statistics) {
    return {
      responseTime: {
        yours: parseFloat(statistics.averageResponseTime || 0),
        industry: 4.5,
        percentile: this.calculatePercentile(statistics.averageResponseTime, 4.5)
      },
      satisfaction: {
        yours: parseFloat(statistics.averageRating || 0),
        industry: 4.2,
        percentile: this.calculatePercentile(statistics.averageRating, 4.2)
      },
      retention: {
        yours: parseFloat(statistics.clientRetentionRate || 0),
        industry: 75,
        percentile: this.calculatePercentile(statistics.clientRetentionRate, 75)
      }
    };
  }

  /**
   * Calcular percentil comparativo
   * @param {number} value - Valor actual
   * @param {number} benchmark - Benchmark de la industria
   * @returns {number} Percentil estimado
   */
  static calculatePercentile(value, benchmark) {
    const val = parseFloat(value || 0);
    const bench = parseFloat(benchmark || 0);
    
    if (bench === 0) return 50;
    
    const ratio = val / bench;
    
    if (ratio >= 1.2) return 90;
    if (ratio >= 1.1) return 80;
    if (ratio >= 1.0) return 70;
    if (ratio >= 0.9) return 60;
    if (ratio >= 0.8) return 50;
    if (ratio >= 0.7) return 40;
    if (ratio >= 0.6) return 30;
    if (ratio >= 0.5) return 20;
    return 10;
  }
}

module.exports = ProviderProfileResponseDTO;
