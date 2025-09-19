const { getContainer } = require('./config');

/**
 * Bootstrap the PolarNet application
 * Initializes all dependencies and starts the system
 */
class ApplicationBootstrap {
  constructor() {
    this.container = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log('🚀 Initializing PolarNet Application...');
      
      // Get DI container
      this.container = getContainer();
      console.log('✅ Dependency Injection container configured');

      // Initialize database
      const database = this.container.resolve('database');
      await database.connect();
      console.log('✅ Database connection established');

      // Initialize logger
      const logger = this.container.resolve('logger');
      logger.info('Application bootstrap completed successfully');

      // Get configuration
      const config = this.container.resolve('config');
      logger.info('Configuration loaded', { 
        environment: config.server.environment,
        port: config.server.port
      });

      this.isInitialized = true;
      console.log('🎉 PolarNet Application initialized successfully!');

      return {
        success: true,
        container: this.container,
        message: 'Application initialized successfully'
      };

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Application initialization failed'
      };
    }
  }

  /**
   * Get the DI container
   * @returns {DIContainer} DI container
   */
  getContainer() {
    if (!this.isInitialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    return this.container;
  }

  /**
   * Shutdown the application gracefully
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down PolarNet Application...');
      
      if (this.container && this.container.isRegistered('database')) {
        const database = this.container.resolve('database');
        await database.close();
        console.log('✅ Database connections closed');
      }

      if (this.container && this.container.isRegistered('logger')) {
        const logger = this.container.resolve('logger');
        logger.info('Application shutdown completed');
      }

      this.isInitialized = false;
      console.log('👋 PolarNet Application shut down successfully');

    } catch (error) {
      console.error('❌ Error during application shutdown:', error);
    }
  }

  /**
   * Get application health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    if (!this.isInitialized) {
      return {
        status: 'unhealthy',
        message: 'Application not initialized',
        services: {}
      };
    }

    try {
      const database = this.container.resolve('database');
      const dbHealth = await database.healthCheck();

      return {
        status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
        message: 'Health check completed',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth,
          container: {
            status: 'healthy',
            registeredServices: this.container.getRegisteredServices().length
          }
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get application metrics
   * @returns {Object} Application metrics
   */
  getMetrics() {
    if (!this.isInitialized) {
      return {
        initialized: false,
        services: 0
      };
    }

    const database = this.container.resolve('database');
    
    return {
      initialized: this.isInitialized,
      services: this.container.getRegisteredServices().length,
      database: {
        connected: database.isReady(),
        poolStats: database.getPoolStats()
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

// Create global bootstrap instance
const bootstrap = new ApplicationBootstrap();

module.exports = bootstrap;
