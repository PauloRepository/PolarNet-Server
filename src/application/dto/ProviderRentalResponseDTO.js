/**
 * DTO: Provider Rental Response
 * Structures rental data for PROVIDER responses
 */
class ProviderRentalResponseDTO {
  
  /**
   * Format rentals list response
   * @param {Object} result - Raw rentals data with pagination
   * @returns {Object} Formatted rentals list response
   */
  static formatRentalsList(result) {
    const { data = [], pagination = {} } = result;

    return {
      rentals: data.map(rental => this.formatRentalSummary(rental)),
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        pages: pagination.pages || 0,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1
      },
      summary: {
        totalRentals: pagination.total || 0,
        activeRentals: data.filter(rental => rental.status === 'ACTIVE').length,
        expiringRentals: data.filter(rental => this.isExpiringSoon(rental.endDate)).length,
        monthlyRevenue: data.reduce((sum, rental) => sum + parseFloat(rental.monthlyRate || 0), 0)
      }
    };
  }

  /**
   * Format rental summary (for lists)
   * @param {Object} rental - Raw rental data
   * @returns {Object} Formatted rental summary
   */
  static formatRentalSummary(rental) {
    return {
      id: rental.rentalId || rental.id,
      client: {
        companyId: rental.clientCompanyId,
        companyName: rental.clientCompanyName,
        contactPerson: rental.clientContactPerson
      },
      equipment: {
        equipmentId: rental.equipmentId,
        name: rental.equipmentName,
        type: rental.equipmentType,
        serialNumber: rental.serialNumber,
        model: rental.model
      },
      contract: {
        startDate: rental.startDate,
        endDate: rental.endDate,
        duration: this.calculateDuration(rental.startDate, rental.endDate),
        monthlyRate: parseFloat(rental.monthlyRate || 0),
        totalAmount: parseFloat(rental.totalAmount || 0),
        status: rental.status,
        paymentStatus: rental.paymentStatus
      },
      location: {
        locationId: rental.currentLocationId,
        name: rental.locationName || 'Not specified',
        address: rental.locationAddress
      },
      financial: {
        totalRevenue: parseFloat(rental.totalAmount || 0),
        pendingPayments: this.calculatePendingPayments(rental),
        nextPaymentDue: this.calculateNextPaymentDue(rental)
      },
      alerts: {
        isExpiring: this.isExpiringSoon(rental.endDate),
        hasPaymentIssues: rental.paymentStatus === 'OVERDUE',
        needsRenewal: this.needsRenewal(rental)
      },
      meta: {
        createdAt: rental.createdAt,
        updatedAt: rental.updatedAt
      }
    };
  }

  /**
   * Format rental details response
   * @param {Object} rentalData - Complete rental data
   * @returns {Object} Formatted rental details
   */
  static formatRentalDetails(rentalData) {
    const {
      rental,
      equipment = {},
      client = {},
      invoices = [],
      serviceRequests = [],
      paymentHistory = []
    } = rentalData;

    return {
      rental: {
        id: rental.rentalId,
        status: rental.status,
        paymentStatus: rental.paymentStatus,
        contract: {
          startDate: rental.startDate,
          endDate: rental.endDate,
          actualEndDate: rental.actualEndDate,
          duration: this.calculateDuration(rental.startDate, rental.endDate),
          autoRenew: rental.autoRenew || false
        },
        financial: {
          dailyRate: parseFloat(rental.dailyRate || 0),
          monthlyRate: parseFloat(rental.monthlyRate || 0),
          totalAmount: parseFloat(rental.totalAmount || 0),
          depositPaid: parseFloat(rental.depositPaid || 0),
          currency: rental.currency || 'CLP'
        },
        terms: {
          contractTerms: rental.contractTerms,
          deliveryNotes: rental.deliveryNotes,
          returnNotes: rental.returnNotes
        }
      },
      client: {
        company: {
          id: client.companyId,
          name: client.name,
          type: client.type,
          taxId: client.taxId,
          email: client.email,
          phone: client.phone,
          address: client.address
        },
        contact: {
          person: client.contactPerson,
          email: client.contactEmail,
          phone: client.contactPhone
        },
        business: {
          type: client.businessType,
          description: client.description
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
          optimalTemperature: equipment.optimalTemperature,
          powerWatts: equipment.powerWatts,
          energyConsumption: equipment.energyConsumptionKwh
        },
        condition: {
          status: equipment.status,
          condition: equipment.condition,
          lastMaintenance: equipment.lastMaintenanceDate
        }
      },
      location: {
        current: {
          locationId: rental.currentLocationId,
          name: rental.locationName,
          address: rental.locationAddress,
          contactPerson: rental.locationContactPerson,
          contactPhone: rental.locationContactPhone
        }
      },
      financial: {
        invoices: {
          total: invoices.length,
          pending: invoices.filter(inv => inv.status === 'PENDING').length,
          paid: invoices.filter(inv => inv.status === 'PAID').length,
          overdue: invoices.filter(inv => inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()).length,
          list: invoices.slice(0, 10).map(invoice => this.formatInvoiceSummary(invoice))
        },
        payments: {
          history: paymentHistory.slice(0, 10).map(payment => this.formatPaymentSummary(payment)),
          totalPaid: paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0),
          lastPayment: paymentHistory.length > 0 ? paymentHistory[0] : null
        },
        projections: this.calculateFinancialProjections(rental)
      },
      services: {
        requests: serviceRequests.slice(0, 10).map(service => this.formatServiceSummary(service)),
        statistics: this.calculateServiceStatistics(serviceRequests)
      },
      analytics: this.generateRentalAnalytics(rentalData),
      recommendations: this.generateRentalRecommendations(rentalData)
    };
  }

  /**
   * Format rental statistics
   * @param {Object} statistics - Raw statistics data
   * @returns {Object} Formatted statistics
   */
  static formatRentalStatistics(statistics) {
    return {
      overview: {
        totalRentals: parseInt(statistics.totalRentals || 0),
        activeRentals: parseInt(statistics.activeRentals || 0),
        completedRentals: parseInt(statistics.completedRentals || 0),
        cancelledRentals: parseInt(statistics.cancelledRentals || 0)
      },
      financial: {
        totalRevenue: parseFloat(statistics.totalRevenue || 0),
        monthlyRevenue: parseFloat(statistics.monthlyRevenue || 0),
        averageRentalValue: parseFloat(statistics.averageRentalValue || 0),
        pendingPayments: parseFloat(statistics.pendingPayments || 0)
      },
      performance: {
        averageRentalDuration: parseInt(statistics.averageRentalDuration || 0),
        renewalRate: parseFloat(statistics.renewalRate || 0),
        clientSatisfaction: parseFloat(statistics.clientSatisfaction || 0),
        onTimePaymentRate: parseFloat(statistics.onTimePaymentRate || 0)
      },
      trends: {
        monthlyGrowth: parseFloat(statistics.monthlyGrowth || 0),
        clientRetention: parseFloat(statistics.clientRetention || 0),
        equipmentUtilization: parseFloat(statistics.equipmentUtilization || 0)
      }
    };
  }

  // Private helper methods

  /**
   * Format invoice summary
   * @param {Object} invoice - Invoice data
   * @returns {Object} Formatted invoice summary
   */
  static formatInvoiceSummary(invoice) {
    return {
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      amount: parseFloat(invoice.totalAmount || 0),
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      isOverdue: invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date()
    };
  }

  /**
   * Format payment summary
   * @param {Object} payment - Payment data
   * @returns {Object} Formatted payment summary
   */
  static formatPaymentSummary(payment) {
    return {
      paymentId: payment.id,
      amount: parseFloat(payment.amount || 0),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      invoiceNumber: payment.invoice_number
    };
  }

  /**
   * Format service summary
   * @param {Object} service - Service data
   * @returns {Object} Formatted service summary
   */
  static formatServiceSummary(service) {
    return {
      serviceId: service.serviceRequestId,
      title: service.title,
      type: service.issueType,
      priority: service.priority,
      status: service.status,
      requestDate: service.requestDate,
      completionDate: service.completionDate,
      cost: parseFloat(service.finalCost || 0)
    };
  }

  /**
   * Calculate duration between dates
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Object} Duration breakdown
   */
  static calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return { days: 0, months: 0, description: 'Unknown' };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.round(days / 30);
    
    let description = '';
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      description = `${years} year${years > 1 ? 's' : ''}`;
      if (remainingMonths > 0) {
        description += ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
      }
    } else if (months > 0) {
      description = `${months} month${months > 1 ? 's' : ''}`;
    } else {
      description = `${days} day${days > 1 ? 's' : ''}`;
    }
    
    return { days, months, description };
  }

  /**
   * Check if rental is expiring soon
   * @param {Date|string} endDate - End date
   * @returns {boolean} Is expiring soon
   */
  static isExpiringSoon(endDate) {
    if (!endDate) return false;
    
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays <= 30 && diffDays > 0;
  }

  /**
   * Check if rental needs renewal
   * @param {Object} rental - Rental data
   * @returns {boolean} Needs renewal
   */
  static needsRenewal(rental) {
    return this.isExpiringSoon(rental.endDate) && rental.status === 'ACTIVE';
  }

  /**
   * Calculate pending payments
   * @param {Object} rental - Rental data
   * @returns {number} Pending payment amount
   */
  static calculatePendingPayments(rental) {
    // This would typically come from invoices, but we'll estimate based on rental data
    if (rental.paymentStatus === 'OVERDUE') {
      return parseFloat(rental.monthlyRate || 0);
    }
    return 0;
  }

  /**
   * Calculate next payment due date
   * @param {Object} rental - Rental data
   * @returns {Date|null} Next payment due date
   */
  static calculateNextPaymentDue(rental) {
    if (rental.status !== 'ACTIVE') return null;
    
    // Estimate next payment due (this would typically come from invoices)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }

  /**
   * Calculate service statistics
   * @param {Array} services - Services array
   * @returns {Object} Service statistics
   */
  static calculateServiceStatistics(services) {
    return {
      total: services.length,
      pending: services.filter(s => ['OPEN', 'IN_PROGRESS'].includes(s.status)).length,
      completed: services.filter(s => s.status === 'COMPLETED').length,
      totalCost: services.reduce((sum, s) => sum + parseFloat(s.finalCost || 0), 0),
      averageResponseTime: this.calculateAverageResponseTime(services)
    };
  }

  /**
   * Calculate average response time for services
   * @param {Array} services - Services array
   * @returns {number} Average response time in hours
   */
  static calculateAverageResponseTime(services) {
    const completedServices = services.filter(s => s.completionDate && s.requestDate);
    
    if (!completedServices.length) return 0;
    
    const responseTimes = completedServices.map(service => {
      const request = new Date(service.requestDate);
      const completion = new Date(service.completionDate);
      return Math.floor((completion - request) / (1000 * 60 * 60));
    });
    
    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  }

  /**
   * Calculate financial projections
   * @param {Object} rental - Rental data
   * @returns {Object} Financial projections
   */
  static calculateFinancialProjections(rental) {
    const monthlyRate = parseFloat(rental.monthlyRate || 0);
    const remainingMonths = this.calculateRemainingMonths(rental.endDate);
    
    return {
      remainingRevenue: monthlyRate * remainingMonths,
      projectedTotal: parseFloat(rental.totalAmount || 0),
      monthlyRate: monthlyRate,
      remainingMonths: remainingMonths
    };
  }

  /**
   * Calculate remaining months in rental
   * @param {Date|string} endDate - End date
   * @returns {number} Remaining months
   */
  static calculateRemainingMonths(endDate) {
    if (!endDate) return 0;
    
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end - now;
    
    if (diffMs <= 0) return 0;
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 30);
  }

  /**
   * Generate rental analytics
   * @param {Object} rentalData - Complete rental data
   * @returns {Object} Analytics insights
   */
  static generateRentalAnalytics(rentalData) {
    const { rental, invoices = [], serviceRequests = [] } = rentalData;
    
    return {
      profitability: {
        revenueToDate: invoices.filter(inv => inv.status === 'PAID')
          .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0),
        serviceCosts: serviceRequests.reduce((sum, srv) => sum + parseFloat(srv.finalCost || 0), 0),
        netProfit: this.calculateNetProfit(rentalData)
      },
      performance: {
        paymentReliability: this.calculatePaymentReliability(invoices),
        serviceFrequency: serviceRequests.length,
        clientSatisfaction: this.calculateClientSatisfaction(serviceRequests)
      },
      risks: {
        paymentRisk: this.assessPaymentRisk(invoices),
        equipmentRisk: this.assessEquipmentRisk(serviceRequests),
        renewalRisk: this.assessRenewalRisk(rental)
      }
    };
  }

  /**
   * Generate rental recommendations
   * @param {Object} rentalData - Complete rental data
   * @returns {Array} Recommendations
   */
  static generateRentalRecommendations(rentalData) {
    const recommendations = [];
    const { rental, invoices = [], serviceRequests = [] } = rentalData;
    
    // Renewal recommendations
    if (this.isExpiringSoon(rental.endDate)) {
      recommendations.push({
        type: 'renewal',
        priority: 'high',
        message: 'Contract expiring soon - initiate renewal discussion'
      });
    }
    
    // Payment recommendations
    const overdueInvoices = invoices.filter(inv => 
      inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()).length;
    
    if (overdueInvoices > 0) {
      recommendations.push({
        type: 'payment',
        priority: 'high',
        message: 'Follow up on overdue payments'
      });
    }
    
    // Service recommendations
    const pendingServices = serviceRequests.filter(s => 
      ['OPEN', 'IN_PROGRESS'].includes(s.status)).length;
    
    if (pendingServices > 2) {
      recommendations.push({
        type: 'service',
        priority: 'medium',
        message: 'Multiple pending service requests - review service delivery'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate net profit
   * @param {Object} rentalData - Complete rental data
   * @returns {number} Net profit
   */
  static calculateNetProfit(rentalData) {
    const { invoices = [], serviceRequests = [] } = rentalData;
    
    const revenue = invoices.filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0);
    
    const costs = serviceRequests.reduce((sum, srv) => sum + parseFloat(srv.finalCost || 0), 0);
    
    return revenue - costs;
  }

  /**
   * Calculate payment reliability score
   * @param {Array} invoices - Invoices array
   * @returns {number} Reliability score (0-100)
   */
  static calculatePaymentReliability(invoices) {
    if (!invoices.length) return 100;
    
    const totalInvoices = invoices.length;
    const onTimePayments = invoices.filter(inv => {
      if (inv.status !== 'PAID' || !inv.paidDate || !inv.dueDate) return false;
      return new Date(inv.paidDate) <= new Date(inv.dueDate);
    }).length;
    
    return Math.round((onTimePayments / totalInvoices) * 100);
  }

  /**
   * Calculate client satisfaction from service requests
   * @param {Array} serviceRequests - Service requests array
   * @returns {number} Satisfaction score (0-5)
   */
  static calculateClientSatisfaction(serviceRequests) {
    const completedWithRating = serviceRequests.filter(s => 
      s.status === 'COMPLETED' && s.clientRating);
    
    if (!completedWithRating.length) return 0;
    
    const totalRating = completedWithRating.reduce((sum, s) => 
      sum + parseInt(s.clientRating || 0), 0);
    
    return parseFloat((totalRating / completedWithRating.length).toFixed(1));
  }

  /**
   * Assess payment risk level
   * @param {Array} invoices - Invoices array
   * @returns {string} Risk level
   */
  static assessPaymentRisk(invoices) {
    const reliabilityScore = this.calculatePaymentReliability(invoices);
    
    if (reliabilityScore >= 90) return 'low';
    if (reliabilityScore >= 70) return 'medium';
    return 'high';
  }

  /**
   * Assess equipment risk level
   * @param {Array} serviceRequests - Service requests array
   * @returns {string} Risk level
   */
  static assessEquipmentRisk(serviceRequests) {
    const recentServices = serviceRequests.filter(s => {
      const requestDate = new Date(s.requestDate);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return requestDate >= threeMonthsAgo;
    }).length;
    
    if (recentServices >= 5) return 'high';
    if (recentServices >= 2) return 'medium';
    return 'low';
  }

  /**
   * Assess renewal risk level
   * @param {Object} rental - Rental data
   * @returns {string} Risk level
   */
  static assessRenewalRisk(rental) {
    const isExpiring = this.isExpiringSoon(rental.endDate);
    const hasPaymentIssues = rental.paymentStatus === 'OVERDUE';
    
    if (isExpiring && hasPaymentIssues) return 'high';
    if (isExpiring || hasPaymentIssues) return 'medium';
    return 'low';
  }
}

module.exports = ProviderRentalResponseDTO;
