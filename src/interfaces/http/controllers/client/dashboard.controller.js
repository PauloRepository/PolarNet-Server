const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class DashboardController {
  constructor() {
    this.container = null;
  }

  // Inject DI container
  setContainer(container) {
    this.container = container;
  }

  // GET /api/client/dashboard - Dashboard principal del cliente usando DDD
  async getDashboardMetrics(req, res) {
    try {
      const { clientCompanyId } = req.user;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get logger from container with fallback
      let logger;
      try {
        logger = this.container.resolve('logger');
      } catch (loggerError) {
        logger = console; // Fallback to console
        console.warn('Logger not available, using console fallback');
      }

      // Debug: Check database connection status
      try {
        const database = this.container.resolve('database');
        console.log('Database instance in controller:', {
          isConnected: database.isConnected,
          hasPool: !!database.pool
        });
      } catch (dbError) {
        console.error('Could not resolve database from container:', dbError.message);
      }
      
      logger.info('Getting dashboard metrics', { clientCompanyId, userId: req.user?.userId });

      // Use DDD Use Case
      const getDashboardUseCase = this.container.resolve('getClientDashboard');
      const dashboard = await getDashboardUseCase.getDashboardMetrics(clientCompanyId);

      return ResponseHandler.success(res, dashboard, 'Dashboard metrics retrieved successfully');

    } catch (error) {
      console.error('Error in getDashboardMetrics:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/dashboard/activities - Actividades recientes usando DDD
  async getRecentActivities(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { limit = 10 } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      // Get logger from container with fallback
      let logger;
      try {
        logger = this.container.resolve('logger');
      } catch (loggerError) {
        logger = console; // Fallback to console
        console.warn('Logger not available, using console fallback');
      }

      logger.info('Getting recent activities', { clientCompanyId, limit });

      // Get service requests repository
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');
      const equipmentRepository = this.container.resolve('equipmentRepository');
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Get recent service requests
      const recentServiceRequests = await serviceRequestRepository.findByClientCompany(clientCompanyId, {
        limit: Math.ceil(limit / 3),
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      });

      // Get recent equipment updates (maintenance alerts)
      const equipments = await equipmentRepository.findRentedByClient(clientCompanyId);
      const recentMaintenances = equipments.filter(eq => 
        eq.needsMaintenance() && 
        new Date(eq.updatedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      // Get recent invoices
      const recentInvoices = await invoiceRepository.findByClientCompany(clientCompanyId, {
        limit: Math.ceil(limit / 3),
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      });

      // Combine and format activities
      const activities = [];

      // Add service requests
      recentServiceRequests.forEach(sr => {
        activities.push({
          type: 'service_request',
          entityId: sr && sr.id != null ? sr.id.toString() : null,
          description: `Solicitud de servicio: ${sr && sr.title ? sr.title : ''}`,
          providerName: 'Proveedor asignado',
          activityDate: sr && sr.createdAt ? sr.createdAt : null,
          priority: sr && sr.priority ? sr.priority : null,
          status: sr && sr.status ? sr.status : null
        });
      });

      // Add maintenance activities
      recentMaintenances.forEach(eq => {
        activities.push({
          type: 'maintenance',
          entityId: eq && eq.id != null ? eq.id.toString() : null,
          description: `Mantenimiento requerido: ${eq && eq.serialNumber ? eq.serialNumber : ''}`,
          providerName: 'Mantenimiento programado',
          activityDate: eq && eq.updatedAt ? eq.updatedAt : null,
          priority: 'MEDIUM',
          status: 'PENDING'
        });
      });

      // Add invoices
      recentInvoices.forEach(invoice => {
        activities.push({
          type: 'invoice',
          entityId: invoice && invoice.id != null ? invoice.id.toString() : null,
          description: `Factura generada: ${invoice && invoice.invoiceNumber ? invoice.invoiceNumber : ''}`,
          providerName: 'Sistema de facturación',
          activityDate: invoice && invoice.createdAt ? invoice.createdAt : null,
          priority: invoice && invoice.status === 'PENDING' ? 'HIGH' : 'LOW',
          status: invoice && invoice.status ? invoice.status : null
        });
      });

      // Sort by date and limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate))
        .slice(0, limit);

      return ResponseHandler.success(res, sortedActivities, 'Recent activities retrieved successfully');

    } catch (error) {
      console.error('Error in getRecentActivities', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/dashboard/alerts - Alertas usando DDD
  async getAlerts(req, res) {
    try {
      const { clientCompanyId } = req.user;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      // Get logger from container with fallback
      let logger;
      try {
        logger = this.container.resolve('logger');
      } catch (loggerError) {
        logger = console; // Fallback to console
        console.warn('Logger not available, using console fallback');
      }

      logger.info('Getting alerts', { clientCompanyId });

      // Get repositories
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');
      const invoiceRepository = this.container.resolve('invoiceRepository');
      const activeRentalRepository = this.container.resolve('activeRentalRepository');

      // Get temperature alerts
      const temperatureAlerts = await temperatureRepository.findWithAlerts({
        clientCompanyId,
        limit: 10
      });

      // Get high priority service requests
      const highPriorityRequests = await serviceRequestRepository.getHighPriorityByClient(clientCompanyId);

      // Get overdue invoices
      const overdueInvoices = await invoiceRepository.findOverdueByClient(clientCompanyId);

      // Get expiring contracts
      const expiringContracts = await activeRentalRepository.findExpiringByClient(clientCompanyId, 30);

      const alerts = [];

      // Format temperature alerts
      temperatureAlerts.forEach(reading => {
        alerts.push({
          type: 'temperature',
          severity: reading.alertStatus === 'CRITICAL' ? 'high' : 'medium',
          title: 'Alerta de Temperatura',
          message: `Equipo ${reading.equipmentId} - Temperatura: ${reading.temperature}°C`,
          timestamp: reading.recordedAt,
          entityId: reading && reading.equipmentId != null ? reading.equipmentId.toString() : null
        });
      });

      // Format service request alerts
      highPriorityRequests.forEach(sr => {
        alerts.push({
          type: 'service_request',
          severity: 'high',
          title: 'Solicitud de Servicio Prioritaria',
          message: `${sr.title} - ${sr.description}`,
          timestamp: sr.createdAt,
          entityId: sr && sr.id != null ? sr.id.toString() : null
        });
      });

      // Format invoice alerts
      overdueInvoices.forEach(invoice => {
        alerts.push({
          type: 'invoice',
          severity: 'high',
          title: 'Factura Vencida',
          message: `Factura ${invoice.invoiceNumber} - Monto: $${invoice.totalAmount}`,
          timestamp: invoice.dueDate,
          entityId: invoice && invoice.id != null ? invoice.id.toString() : null
        });
      });

      // Format contract alerts
      expiringContracts.forEach(contract => {
        alerts.push({
          type: 'contract',
          severity: 'medium',
          title: 'Contrato por Vencer',
          message: `Contrato ${contract.rentalId} vence el ${contract.endDate}`,
          timestamp: contract.endDate,
          entityId: contract && contract.rentalId != null ? contract.rentalId.toString() : null
        });
      });

      // Sort by timestamp and severity
      const sortedAlerts = alerts
        .sort((a, b) => {
          if (a.severity !== b.severity) {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
          }
          return new Date(b.timestamp) - new Date(a.timestamp);
        })
        .slice(0, 20);

      return ResponseHandler.success(res, sortedAlerts, 'Alerts retrieved successfully');

    } catch (error) {
      console.error('Error in getAlerts', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/dashboard/energy-summary - Resumen de energía usando DDD
  async getEnergySummary(req, res) {
    try {
      const { clientCompanyId } = req.user;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      // Get logger from container with fallback
      let logger;
      try {
        logger = this.container.resolve('logger');
      } catch (loggerError) {
        logger = console; // Fallback to console
        console.warn('Logger not available, using console fallback');
      }

      logger.info('Getting energy summary', { clientCompanyId });

      // Get repositories
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');
      const equipmentRepository = this.container.resolve('equipmentRepository');

      // Get client equipment
      const equipments = await equipmentRepository.findRentedByClient(clientCompanyId);

      // Get temperature analytics for all equipment
      const energySummary = {
        totalEquipment: equipments.length,
        activeEquipment: equipments.filter(eq => eq.isAvailable()).length,
        averageTemperature: 0,
        energyEfficiency: 0,
        monthlyCost: 0,
        temperatureTrends: []
      };

      if (equipments.length > 0) {
        // Get temperature data for energy calculations
        const temperaturePromises = equipments.map(async (equipment) => {
          return await temperatureRepository.getEquipmentAnalytics(equipment.id, {
            dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          });
        });

        const temperatureAnalytics = await Promise.all(temperaturePromises);
        
        // Calculate averages
        const validAnalytics = temperatureAnalytics.filter(analytics => analytics && analytics.avg_temperature);
        
        if (validAnalytics.length > 0) {
          energySummary.averageTemperature = validAnalytics.reduce((sum, analytics) => 
            sum + parseFloat(analytics.avg_temperature), 0) / validAnalytics.length;
          
          // Simple energy efficiency calculation based on temperature variance
          const avgVariance = validAnalytics.reduce((sum, analytics) => 
            sum + (parseFloat(analytics.temperature_stddev) || 0), 0) / validAnalytics.length;
          
          energySummary.energyEfficiency = Math.max(0, 100 - (avgVariance * 10)); // Simplified calculation
        }

        // Get hourly trends for the last 24 hours
        if (equipments.length > 0) {
          const trendsData = await temperatureRepository.getHourlyAverages(equipments[0].id, {
            dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
            limit: 24
          });

          energySummary.temperatureTrends = trendsData.map(trend => ({
            hour: trend.hour_bucket,
            avgTemperature: parseFloat(trend.avg_temperature) || 0,
            minTemperature: parseFloat(trend.min_temperature) || 0,
            maxTemperature: parseFloat(trend.max_temperature) || 0
          }));
        }
      }

      return ResponseHandler.success(res, energySummary, 'Energy summary retrieved successfully');

    } catch (error) {
      console.error('Error in getEnergySummary', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = new DashboardController();
