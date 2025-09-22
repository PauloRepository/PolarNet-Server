/**
 * DTO: Provider Client Response
 * Structures client data for PROVIDER responses
 */
class ProviderClientResponseDTO {
  
  /**
   * Format clients list response
   * @param {Object} result - Raw clients data with pagination
   * @returns {Object} Formatted clients list response
   */
  static formatClientsList(result) {
    const { data = [], pagination = {} } = result;

    return {
      clients: data.map(client => this.formatClientSummary(client)),
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        pages: pagination.pages || 0,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1
      },
      summary: {
        totalClients: pagination.total || 0,
        activeClients: data.filter(client => client.rentals?.activeRentals > 0).length,
        newThisMonth: data.filter(client => this.isNewThisMonth(client.createdAt)).length
      }
    };
  }

  /**
   * Format client summary (for lists)
   * @param {Object} client - Raw client data
   * @returns {Object} Formatted client summary
   */
  static formatClientSummary(client) {
    return {
      id: client.companyId || client.id,
      name: client.name,
      type: client.type,
      taxId: client.taxId,
      email: client.email,
      phone: client.phone,
      address: {
        full: client.address,
        city: client.city,
        state: client.state,
        country: client.country
      },
      business: {
        type: client.businessType,
        description: client.description
      },
      rentals: {
        active: parseInt(client.rentals?.activeRentals || 0),
        total: parseInt(client.rentals?.totalRentals || 0),
        currentValue: parseFloat(client.rentals?.currentMonthlyValue || 0)
      },
      services: {
        pending: parseInt(client.services?.pendingServices || 0),
        completed: parseInt(client.services?.completedServices || 0),
        total: parseInt(client.services?.totalServices || 0)
      },
      payments: {
        status: client.payments?.status || 'current',
        overdue: parseFloat(client.payments?.overdueAmount || 0),
        pending: parseFloat(client.payments?.pendingAmount || 0),
        total: parseFloat(client.payments?.totalPaid || 0)
      },
      relationship: {
        startDate: client.relationshipStartDate,
        duration: this.calculateRelationshipDuration(client.relationshipStartDate),
        status: this.determineRelationshipStatus(client),
        satisfaction: client.satisfaction || null
      },
      meta: {
        isActive: client.isActive || false,
        lastActivity: client.lastActivity,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      }
    };
  }

  /**
   * Format client details response
   * @param {Object} clientData - Complete client data
   * @returns {Object} Formatted client details
   */
  static formatClientDetails(clientData) {
    const {
      company,
      rentals = { active: [], history: [] },
      services = [],
      invoices = [],
      users = [],
      locations = []
    } = clientData;

    return {
      company: {
        id: company.companyId,
        name: company.name,
        type: company.type,
        taxId: company.taxId,
        contact: {
          email: company.email,
          phone: company.phone,
          website: company.website
        },
        address: {
          full: company.address,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
          country: company.country
        },
        business: {
          type: company.businessType,
          description: company.description,
          logoUrl: company.logoUrl
        }
      },
      rentals: {
        active: rentals.active.map(rental => this.formatRentalSummary(rental)),
        history: rentals.history.slice(0, 10).map(rental => this.formatRentalSummary(rental)),
        statistics: this.calculateRentalStatistics(rentals)
      },
      services: {
        recent: services.slice(0, 10).map(service => this.formatServiceSummary(service)),
        statistics: this.calculateServiceStatistics(services)
      },
      financial: {
        invoices: invoices.slice(0, 10).map(invoice => this.formatInvoiceSummary(invoice)),
        summary: this.calculateFinancialSummary(invoices)
      },
      team: {
        users: users.map(user => this.formatUserSummary(user)),
        totalUsers: users.length
      },
      locations: locations.map(location => this.formatLocationSummary(location)),
      insights: this.generateClientInsights(clientData)
    };
  }

  /**
   * Format client analytics
   * @param {Object} analytics - Raw analytics data
   * @returns {Object} Formatted analytics
   */
  static formatClientAnalytics(analytics) {
    const {
      revenue = {},
      rentals = {},
      services = {},
      payments = {}
    } = analytics;

    return {
      revenue: {
        monthly: revenue.monthly || [],
        trends: revenue.trends || {},
        projections: revenue.projections || {},
        averageMonthly: revenue.averageMonthly || 0
      },
      rentals: {
        utilization: rentals.utilization || {},
        preferences: rentals.preferences || {},
        satisfaction: rentals.satisfaction || {},
        retention: rentals.retention || {}
      },
      services: {
        frequency: services.frequency || {},
        types: services.types || [],
        satisfaction: services.satisfaction || {},
        responseTime: services.responseTime || {}
      },
      payments: {
        history: payments.history || [],
        patterns: payments.patterns || {},
        reliability: payments.reliability || {},
        methods: payments.methods || []
      }
    };
  }

  // Private helper methods

  /**
   * Format rental summary
   * @param {Object} rental - Rental data
   * @returns {Object} Formatted rental summary
   */
  static formatRentalSummary(rental) {
    return {
      rentalId: rental.rentalId,
      equipment: {
        id: rental.equipmentId,
        name: rental.equipmentName,
        type: rental.equipmentType,
        serialNumber: rental.serialNumber
      },
      contract: {
        startDate: rental.startDate,
        endDate: rental.endDate,
        monthlyRate: parseFloat(rental.monthlyRate || 0),
        status: rental.status
      },
      location: rental.locationName || 'Not specified'
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
      paidDate: invoice.paidDate
    };
  }

  /**
   * Format user summary
   * @param {Object} user - User data
   * @returns {Object} Formatted user summary
   */
  static formatUserSummary(user) {
    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin
    };
  }

  /**
   * Format location summary
   * @param {Object} location - Location data
   * @returns {Object} Formatted location summary
   */
  static formatLocationSummary(location) {
    return {
      locationId: location.equipmentLocationId,
      name: location.name,
      address: location.address,
      city: location.city,
      equipmentCount: location.equipmentCount || 0,
      contactPerson: location.contactPerson
    };
  }

  /**
   * Calculate rental statistics
   * @param {Object} rentals - Rentals data
   * @returns {Object} Rental statistics
   */
  static calculateRentalStatistics(rentals) {
    const active = rentals.active || [];
    const history = rentals.history || [];
    const all = [...active, ...history];

    return {
      totalRentals: all.length,
      activeRentals: active.length,
      averageDuration: this.calculateAverageDuration(all),
      totalRevenue: all.reduce((sum, rental) => sum + parseFloat(rental.totalAmount || 0), 0),
      equipmentTypes: this.getEquipmentTypeDistribution(all)
    };
  }

  /**
   * Calculate service statistics
   * @param {Array} services - Services data
   * @returns {Object} Service statistics
   */
  static calculateServiceStatistics(services) {
    return {
      totalServices: services.length,
      pendingServices: services.filter(s => ['OPEN', 'IN_PROGRESS'].includes(s.status)).length,
      completedServices: services.filter(s => s.status === 'COMPLETED').length,
      averageResponseTime: this.calculateAverageResponseTime(services),
      serviceTypes: this.getServiceTypeDistribution(services)
    };
  }

  /**
   * Calculate financial summary
   * @param {Array} invoices - Invoices data
   * @returns {Object} Financial summary
   */
  static calculateFinancialSummary(invoices) {
    return {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0),
      paidAmount: invoices.filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0),
      pendingAmount: invoices.filter(inv => inv.status === 'PENDING')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0),
      overdueAmount: invoices.filter(inv => inv.status === 'PENDING' && new Date(inv.dueDate) < new Date())
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0)
    };
  }

  /**
   * Generate client insights
   * @param {Object} clientData - Complete client data
   * @returns {Array} Insights and recommendations
   */
  static generateClientInsights(clientData) {
    const insights = [];
    
    // Revenue insights
    if (clientData.rentals?.active?.length > 0) {
      const monthlyRevenue = clientData.rentals.active.reduce((sum, rental) => 
        sum + parseFloat(rental.monthlyRate || 0), 0);
      
      if (monthlyRevenue > 5000) {
        insights.push({
          type: 'revenue',
          level: 'positive',
          message: 'High-value client - prioritize retention'
        });
      }
    }

    // Service insights
    const pendingServices = clientData.services?.filter(s => ['OPEN', 'IN_PROGRESS'].includes(s.status)).length || 0;
    if (pendingServices > 3) {
      insights.push({
        type: 'service',
        level: 'warning',
        message: 'Multiple pending service requests - review service delivery'
      });
    }

    // Payment insights
    const overdueInvoices = clientData.invoices?.filter(inv => 
      inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()).length || 0;
    
    if (overdueInvoices > 0) {
      insights.push({
        type: 'payment',
        level: 'warning',
        message: `${overdueInvoices} overdue invoice(s) - follow up on payments`
      });
    }

    return insights;
  }

  /**
   * Check if client is new this month
   * @param {Date|string} createdAt - Creation date
   * @returns {boolean} Is new this month
   */
  static isNewThisMonth(createdAt) {
    if (!createdAt) return false;
    const now = new Date();
    const created = new Date(createdAt);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }

  /**
   * Calculate relationship duration
   * @param {Date|string} startDate - Relationship start date
   * @returns {string} Duration description
   */
  static calculateRelationshipDuration(startDate) {
    if (!startDate) return 'Unknown';
    
    const now = new Date();
    const start = new Date(startDate);
    const diffMs = now - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMonths < 1) return `${diffDays} days`;
    if (diffMonths < 12) return `${diffMonths} months`;
    
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears > 1 ? 's' : ''}`;
  }

  /**
   * Determine relationship status
   * @param {Object} client - Client data
   * @returns {string} Relationship status
   */
  static determineRelationshipStatus(client) {
    const activeRentals = parseInt(client.rentals?.activeRentals || 0);
    const overdueAmount = parseFloat(client.payments?.overdueAmount || 0);
    
    if (overdueAmount > 0) return 'at-risk';
    if (activeRentals === 0) return 'inactive';
    if (activeRentals > 3) return 'strong';
    
    return 'stable';
  }

  /**
   * Calculate average duration
   * @param {Array} rentals - Rentals array
   * @returns {number} Average duration in days
   */
  static calculateAverageDuration(rentals) {
    if (!rentals.length) return 0;
    
    const durations = rentals.map(rental => {
      const start = new Date(rental.startDate);
      const end = rental.endDate ? new Date(rental.endDate) : new Date();
      return Math.floor((end - start) / (1000 * 60 * 60 * 24));
    });
    
    return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
  }

  /**
   * Get equipment type distribution
   * @param {Array} rentals - Rentals array
   * @returns {Array} Equipment type distribution
   */
  static getEquipmentTypeDistribution(rentals) {
    const types = {};
    rentals.forEach(rental => {
      const type = rental.equipmentType || 'Unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return Object.entries(types).map(([type, count]) => ({ type, count }));
  }

  /**
   * Get service type distribution
   * @param {Array} services - Services array
   * @returns {Array} Service type distribution
   */
  static getServiceTypeDistribution(services) {
    const types = {};
    services.forEach(service => {
      const type = service.issueType || 'Unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return Object.entries(types).map(([type, count]) => ({ type, count }));
  }

  /**
   * Calculate average response time
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
}

module.exports = ProviderClientResponseDTO;
