const DIContainer = require('./DIContainer');

// Infrastructure - Database
const Database = require('../database/Database');

// Infrastructure - Repositories
const PostgreSQLCompanyRepository = require('../persistence/PostgreSQLCompanyRepository');
const PostgreSQLUserRepository = require('../persistence/PostgreSQLUserRepository');
const PostgreSQLEquipmentRepository = require('../persistence/PostgreSQLEquipmentRepository');
const PostgreSQLActiveRentalRepository = require('../persistence/PostgreSQLActiveRentalRepository');
const PostgreSQLServiceRequestRepository = require('../persistence/PostgreSQLServiceRequestRepository');
const PostgreSQLInvoiceRepository = require('../persistence/PostgreSQLInvoiceRepository');
const PostgreSQLTemperatureReadingRepository = require('../persistence/PostgreSQLTemperatureReadingRepository');
const PostgreSQLEquipmentLocationRepository = require('../persistence/PostgreSQLEquipmentLocationRepository');

// Maintenance repository is optional depending on migration state — require guard
let PostgreSQLMaintenanceRepository = null;
try {
  PostgreSQLMaintenanceRepository = require('../persistence/PostgreSQLMaintenanceRepository');
} catch (err) {
  // Module may not exist in some branches; we'll register conditionally below.
}

// Application - Use Cases CLIENT
const GetClientDashboard = require('../../application/use-cases/ClientDashboardUseCase');
const GetClientEquipments = require('../../application/use-cases/ClientEquipmentUseCase');
const ClientServiceRequestUseCase = require('../../application/use-cases/ClientServiceRequestUseCase');
const ClientProfileUseCase = require('../../application/use-cases/ClientProfileUseCase');
const ClientInvoiceUseCase = require('../../application/use-cases/ClientInvoiceUseCase');
const ClientContractUseCase = require('../../application/use-cases/ClientContractUseCase');

/**
 * Configure and setup the Dependency Injection Container
 * @returns {DIContainer} Configured DI container
 */
function configureDI() {
  const container = new DIContainer();

  // =====================================================
  // INFRASTRUCTURE LAYER - Database & Core Services
  // =====================================================

  // Database connection (singleton)
  container.registerSingleton('database', () => {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'polarnet_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000
    };
    
    return new Database(dbConfig);
  });

  // =====================================================
  // INFRASTRUCTURE LAYER - Repositories
  // =====================================================

  // Company Repository
  container.registerSingleton('companyRepository', (database) => {
    return new PostgreSQLCompanyRepository(database);
  }, ['database']);

  // User Repository
  container.registerSingleton('userRepository', (database) => {
    return new PostgreSQLUserRepository(database);
  }, ['database']);

  // Equipment Repository
  container.registerSingleton('equipmentRepository', (database) => {
    return new PostgreSQLEquipmentRepository(database);
  }, ['database']);

  // ActiveRental Repository
  container.registerSingleton('activeRentalRepository', (database) => {
    return new PostgreSQLActiveRentalRepository(database);
  }, ['database']);

  // ServiceRequest Repository
  container.registerSingleton('serviceRequestRepository', (database) => {
    return new PostgreSQLServiceRequestRepository(database);
  }, ['database']);

  // Invoice Repository
  container.registerSingleton('invoiceRepository', (database) => {
    return new PostgreSQLInvoiceRepository(database);
  }, ['database']);

  // TemperatureReading Repository
  container.registerSingleton('temperatureReadingRepository', (database) => {
    return new PostgreSQLTemperatureReadingRepository(database);
  }, ['database']);

  // EquipmentLocation Repository
  container.registerSingleton('equipmentLocationRepository', (database) => {
    return new PostgreSQLEquipmentLocationRepository(database);
  }, ['database']);

  // Maintenance Repository (register only if implementation exists)
  if (PostgreSQLMaintenanceRepository) {
    container.registerSingleton('maintenanceRepository', (database) => {
      return new PostgreSQLMaintenanceRepository(database);
    }, ['database']);
  }

  // =====================================================
  // APPLICATION LAYER - CLIENT Use Cases
  // =====================================================

  // Get Client Dashboard Use Case
  container.register('getClientDashboard', (
    activeRentalRepository,
    serviceRequestRepository,
    invoiceRepository,
    temperatureReadingRepository,
    equipmentLocationRepository
  ) => {
    return new GetClientDashboard(
      activeRentalRepository,
      serviceRequestRepository,
      invoiceRepository,
      temperatureReadingRepository,
      equipmentLocationRepository
    );
  }, [
    'activeRentalRepository',
    'serviceRequestRepository',
    'invoiceRepository',
    'temperatureReadingRepository',
    'equipmentLocationRepository'
  ]);

  // Get Client Equipments Use Case
  container.register('getClientEquipments', (
    equipmentRepository,
    activeRentalRepository,
    temperatureReadingRepository
  ) => {
    return new GetClientEquipments(
      equipmentRepository,
      activeRentalRepository,
      temperatureReadingRepository
    );
  }, [
    'equipmentRepository',
    'activeRentalRepository',
    'temperatureReadingRepository'
  ]);

  // Client Service Request Use Case
  container.register('createServiceRequest', (
    serviceRequestRepository,
    equipmentRepository,
    activeRentalRepository,
    userRepository
  ) => {
    return new ClientServiceRequestUseCase(
      serviceRequestRepository,
      equipmentRepository,
      activeRentalRepository,
      userRepository
    );
  }, [
    'serviceRequestRepository',
    'equipmentRepository',
    'activeRentalRepository',
    'userRepository'
  ]);

  // Also register as clientServiceRequestUseCase for controllers
  container.register('clientServiceRequestUseCase', (
    serviceRequestRepository,
    equipmentRepository,
    activeRentalRepository,
    userRepository
  ) => {
    return new ClientServiceRequestUseCase(
      serviceRequestRepository,
      equipmentRepository,
      activeRentalRepository,
      userRepository
    );
  }, [
    'serviceRequestRepository',
    'equipmentRepository',
    'activeRentalRepository',
    'userRepository'
  ]);

  // Client Profile Use Case
  container.register('updateClientProfile', (
    userRepository,
    companyRepository
  ) => {
    return new ClientProfileUseCase(
      userRepository,
      companyRepository
    );
  }, [
    'userRepository',
    'companyRepository'
  ]);

  // =====================================================
  // INTERFACE LAYER - Controllers  
  // =====================================================

  // Auth Controller (legacy - not yet modernized with DDD)
  container.registerSingleton('authController', () => {
    return require('../../interfaces/http/controllers/auth/auth.controller');
  });

  // Admin Controller (legacy - not yet modernized with DDD)
  container.registerSingleton('adminController', () => {
    return require('../../interfaces/http/controllers/admin/admin.controller');
  });

  // Provider Controllers (legacy - not yet modernized with DDD)
  container.registerSingleton('providerClientsController', () => {
    return require('../../interfaces/http/controllers/provider/clients.controller');
  });

  container.registerSingleton('providerDashboardController', () => {
    return require('../../interfaces/http/controllers/provider/dashboard.controller');
  });

  container.registerSingleton('providerEquipmentsController', () => {
    return require('../../interfaces/http/controllers/provider/equipments.controller');
  });

  container.registerSingleton('providerMaintenancesController', () => {
    return require('../../interfaces/http/controllers/provider/maintenances.controller');
  });

  container.registerSingleton('providerProfileController', () => {
    return require('../../interfaces/http/controllers/provider/profile.controller');
  });

  container.registerSingleton('providerRentalsController', () => {
    return require('../../interfaces/http/controllers/provider/rentals.controller');
  });

  container.registerSingleton('providerServiceRequestsController', () => {
    return require('../../interfaces/http/controllers/provider/serviceRequests.controller');
  });

  // =====================================================
  // UTILITY SERVICES
  // =====================================================

  // Logger service
  container.registerSingleton('logger', () => {
    return {
      info: (message, meta = {}) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
      },
      error: (message, error = null, meta = {}) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, { error: error?.message || error, ...meta });
      },
      warn: (message, meta = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
      },
      debug: (message, meta = {}) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
        }
      }
    };
  });

  // Configuration service
  container.registerSingleton('config', () => {
    return {
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'polarnet_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'polarnet-jwt-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      },
      server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
      },
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
      }
    };
  });

  return container;
}

/**
 * Create and configure a new DI container instance
 * @returns {DIContainer} Configured DI container
 */
function createContainer() {
  return configureDI();
}

/**
 * Global container instance (singleton pattern)
 */
let globalContainer = null;

/**
 * Get the global DI container instance
 * @returns {DIContainer} Global DI container
 */
function getContainer() {
  if (!globalContainer) {
    globalContainer = createContainer();
  }
  return globalContainer;
}

/**
 * Reset the global container (useful for testing)
 */
function resetContainer() {
  globalContainer = null;
}

module.exports = {
  DIContainer,
  configureDI,
  createContainer,
  getContainer,
  resetContainer
};
