/**
 * Controller Factory - Creates controllers with injected dependencies
 * Bridges the DI container with Express controllers
 */
class ControllerFactory {
  constructor(container) {
    this.container = container;
  }

  /**
   * Create Client Dashboard Controller
   * @returns {Function} Express controller function
   */
  createClientDashboardController() {
    return async (req, res, next) => {
      try {
        const useCase = this.container.resolve('getClientDashboard');
        const logger = this.container.resolve('logger');
        
        const clientCompanyId = req.user?.companyId;
        if (!clientCompanyId) {
          return res.status(400).json({
            success: false,
            message: 'Client company ID is required'
          });
        }

        logger.info('Getting client dashboard', { clientCompanyId, userId: req.user?.id });
        
        const dashboard = await useCase.execute(clientCompanyId);
        
        res.json({
          success: true,
          data: dashboard,
          message: 'Dashboard data retrieved successfully'
        });

      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Error in client dashboard controller', error, { 
          userId: req.user?.id,
          companyId: req.user?.companyId 
        });
        
        next(error);
      }
    };
  }

  /**
   * Create Client Equipments Controller
   * @returns {Function} Express controller function
   */
  createClientEquipmentsController() {
    return async (req, res, next) => {
      try {
        const useCase = this.container.resolve('getClientEquipments');
        const logger = this.container.resolve('logger');
        
        const clientCompanyId = req.user?.companyId;
        const filters = {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          status: req.query.status,
          type: req.query.type,
          sortBy: req.query.sortBy || 'serialNumber',
          sortOrder: req.query.sortOrder || 'ASC'
        };

        logger.info('Getting client equipments', { clientCompanyId, filters });
        
        const result = await useCase.execute(clientCompanyId, filters);
        
        res.json({
          success: true,
          data: result.equipments,
          pagination: result.pagination,
          message: 'Equipments retrieved successfully'
        });

      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Error in client equipments controller', error);
        next(error);
      }
    };
  }

  /**
   * Create Client Maintenances Controller
   * @returns {Function} Express controller function
   */
  createClientMaintenancesController() {
    return async (req, res, next) => {
      try {
        const useCase = this.container.resolve('getClientMaintenances');
        const logger = this.container.resolve('logger');
        
        const clientCompanyId = req.user?.companyId;
        const filters = {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          status: req.query.status,
          priority: req.query.priority,
          equipmentId: req.query.equipmentId ? parseInt(req.query.equipmentId) : undefined
        };

        logger.info('Getting client maintenances', { clientCompanyId, filters });
        
        const result = await useCase.execute(clientCompanyId, filters);
        
        res.json({
          success: true,
          data: result,
          message: 'Maintenances retrieved successfully'
        });

      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Error in client maintenances controller', error);
        next(error);
      }
    };
  }

  /**
   * Create Client Service Requests Controller
   * @returns {Function} Express controller function
   */
  createClientServiceRequestsController() {
    return async (req, res, next) => {
      try {
        const useCase = this.container.resolve('getClientServiceRequests');
        const logger = this.container.resolve('logger');
        
        const clientCompanyId = req.user?.companyId;
        const filters = {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          status: req.query.status,
          priority: req.query.priority,
          type: req.query.type,
          equipmentId: req.query.equipmentId ? parseInt(req.query.equipmentId) : undefined
        };

        logger.info('Getting client service requests', { clientCompanyId, filters });
        
        const result = await useCase.execute(clientCompanyId, filters);
        
        res.json({
          success: true,
          data: result.serviceRequests,
          pagination: result.pagination,
          summary: result.summary,
          message: 'Service requests retrieved successfully'
        });

      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Error in client service requests controller', error);
        next(error);
      }
    };
  }

  /**
   * Create Client Temperatures Controller
   * @returns {Function} Express controller function
   */
  createClientTemperaturesController() {
    return async (req, res, next) => {
      try {
        const useCase = this.container.resolve('getClientTemperatures');
        const logger = this.container.resolve('logger');
        
        const clientCompanyId = req.user?.companyId;
        const filters = {
          equipmentId: req.query.equipmentId ? parseInt(req.query.equipmentId) : undefined,
          dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
          dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
          alertStatus: req.query.alertStatus,
          limit: parseInt(req.query.limit) || 100
        };

        logger.info('Getting client temperatures', { clientCompanyId, filters });
        
        const result = await useCase.execute(clientCompanyId, filters);
        
        res.json({
          success: true,
          data: result,
          message: 'Temperature data retrieved successfully'
        });

      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Error in client temperatures controller', error);
        next(error);
      }
    };
  }

  /**
   * Create Update Client Profile Controller
   * @returns {Function} Express controller function
   */
  createUpdateClientProfileController() {
    return async (req, res, next) => {
      try {
        const useCase = this.container.resolve('updateClientProfile');
        const logger = this.container.resolve('logger');
        
        const userId = req.user?.id;
        const updateData = req.body;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'User ID is required'
          });
        }

        logger.info('Updating client profile', { userId });
        
        const result = await useCase.execute(userId, updateData);
        
        res.json({
          success: true,
          data: result,
          message: 'Profile updated successfully'
        });

      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Error in update client profile controller', error);
        next(error);
      }
    };
  }

  /**
   * Create Health Check Controller
   * @returns {Function} Express controller function
   */
  createHealthCheckController() {
    return async (req, res, next) => {
      try {
        const database = this.container.resolve('database');
        const config = this.container.resolve('config');
        
        const healthStatus = await database.healthCheck();
        
        res.json({
          success: true,
          status: healthStatus.status,
          data: {
            ...healthStatus,
            environment: config.server.environment,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
          },
          message: 'Health check completed'
        });

      } catch (error) {
        const logger = this.container.resolve('logger');
        logger.error('Error in health check controller', error);
        
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          message: 'Health check failed',
          error: error.message
        });
      }
    };
  }

  /**
   * Create Application Info Controller
   * @returns {Function} Express controller function
   */
  createAppInfoController() {
    return async (req, res) => {
      try {
        const config = this.container.resolve('config');
        const database = this.container.resolve('database');
        
        res.json({
          success: true,
          data: {
            name: 'PolarNet Server',
            version: '1.0.0',
            environment: config.server.environment,
            architecture: 'Domain-Driven Design (DDD)',
            layers: ['Domain', 'Application', 'Infrastructure', 'Interface'],
            database: {
              connected: database.isReady(),
              poolStats: database.getPoolStats()
            },
            features: [
              'CLIENT/PROVIDER Marketplace',
              'Equipment Rental Management', 
              'IoT Temperature Monitoring',
              'Service Request Tracking',
              'Invoice & Billing System',
              'Location Tracking'
            ],
            timestamp: new Date().toISOString()
          },
          message: 'Application information retrieved'
        });
        
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to get application info',
          error: error.message
        });
      }
    };
  }
}

module.exports = ControllerFactory;
