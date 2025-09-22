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
const PostgreSQLMaintenanceRepository = require('../persistence/PostgreSQLMaintenanceRepository');

// Application - Use Cases CLIENT
const GetClientDashboard = require('../../application/use-cases/ClientDashboardUseCase');
const GetClientEquipments = require('../../application/use-cases/ClientEquipmentUseCase');
const ClientServiceRequestUseCase = require('../../application/use-cases/ClientServiceRequestUseCase');
const ClientProfileUseCase = require('../../application/use-cases/ClientProfileUseCase');
const ClientInvoiceUseCase = require('../../application/use-cases/ClientInvoiceUseCase');
const ClientContractUseCase = require('../../application/use-cases/ClientContractUseCase');

// Application - Use Cases PROVIDER
const GetProviderDashboard = require('../../application/use-cases/ProviderDashboardUseCase');
const ProviderEquipmentUseCase = require('../../application/use-cases/ProviderEquipmentUseCase');
const ProviderClientsUseCase = require('../../application/use-cases/ProviderClientsUseCase');
const ProviderRentalsUseCase = require('../../application/use-cases/ProviderRentalsUseCase');
const ProviderMaintenanceUseCase = require('../../application/use-cases/ProviderMaintenanceUseCase');
const ProviderServiceRequestUseCase = require('../../application/use-cases/ProviderServiceRequestUseCase');
const ProviderProfileUseCase = require('../../application/use-cases/ProviderProfileUseCase');

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
  // APPLICATION LAYER - USE CASES
  // =====================================================

  // ===== CLIENT USE CASES =====

  // Client Dashboard Use Case
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

  // Client Equipments Use Case
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

  // Client Service Request Use Case (legacy name)
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

  // Client Service Request Use Case (modern name)
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

  // Client Profile Use Case (legacy name)
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

  // Client Profile Use Case (modern name)
  container.register('clientProfileUseCase', (
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

  // Client Invoice Use Case
  container.register('clientInvoiceUseCase', (
    invoiceRepository,
    activeRentalRepository,
    companyRepository
  ) => {
    return new ClientInvoiceUseCase(
      invoiceRepository,
      activeRentalRepository,
      companyRepository
    );
  }, [
    'invoiceRepository',
    'activeRentalRepository',
    'companyRepository'
  ]);

  // Client Contract Use Case
  container.register('clientContractUseCase', (
    activeRentalRepository,
    equipmentRepository,
    companyRepository,
    userRepository
  ) => {
    return new ClientContractUseCase(
      activeRentalRepository,
      equipmentRepository,
      companyRepository,
      userRepository
    );
  }, [
    'activeRentalRepository',
    'equipmentRepository',
    'companyRepository',
    'userRepository'
  ]);

  // ===== PROVIDER USE CASES =====

  // Provider Dashboard Use Case (legacy version)
  container.register('getProviderDashboard', (
    activeRentalRepository,
    equipmentRepository,
    serviceRequestRepository,
    invoiceRepository,
    temperatureReadingRepository,
    equipmentLocationRepository
  ) => {
    return new GetProviderDashboard(
      activeRentalRepository,
      equipmentRepository,
      serviceRequestRepository,
      invoiceRepository,
      temperatureReadingRepository,
      equipmentLocationRepository
    );
  }, [
    'activeRentalRepository',
    'equipmentRepository',
    'serviceRequestRepository',
    'invoiceRepository',
    'temperatureReadingRepository',
    'equipmentLocationRepository'
  ]);

  // Provider Dashboard Use Case (modern version for controllers)
  container.register('providerDashboardUseCase', (
    activeRentalRepository,
    equipmentRepository,
    serviceRequestRepository,
    invoiceRepository,
    temperatureReadingRepository,
    equipmentLocationRepository
  ) => {
    return new GetProviderDashboard(
      activeRentalRepository,
      equipmentRepository,
      serviceRequestRepository,
      invoiceRepository,
      temperatureReadingRepository,
      equipmentLocationRepository
    );
  }, [
    'activeRentalRepository',
    'equipmentRepository',
    'serviceRequestRepository',
    'invoiceRepository',
    'temperatureReadingRepository',
    'equipmentLocationRepository'
  ]);

  // Provider Equipment Use Case
  container.register('providerEquipmentUseCase', (
    equipmentRepository,
    activeRentalRepository,
    temperatureReadingRepository,
    equipmentLocationRepository,
    serviceRequestRepository
  ) => {
    return new ProviderEquipmentUseCase(
      equipmentRepository,
      activeRentalRepository,
      temperatureReadingRepository,
      equipmentLocationRepository,
      serviceRequestRepository
    );
  }, [
    'equipmentRepository',
    'activeRentalRepository',
    'temperatureReadingRepository',
    'equipmentLocationRepository',
    'serviceRequestRepository'
  ]);

  // Provider Clients Use Case
  container.register('providerClientsUseCase', (
    companyRepository,
    activeRentalRepository,
    serviceRequestRepository,
    invoiceRepository,
    userRepository
  ) => {
    return new ProviderClientsUseCase(
      companyRepository,
      activeRentalRepository,
      serviceRequestRepository,
      invoiceRepository,
      userRepository
    );
  }, [
    'companyRepository',
    'activeRentalRepository',
    'serviceRequestRepository',
    'invoiceRepository',
    'userRepository'
  ]);

  // Provider Rentals Use Case
  container.register('providerRentalsUseCase', (
    activeRentalRepository,
    equipmentRepository,
    companyRepository,
    invoiceRepository,
    serviceRequestRepository
  ) => {
    return new ProviderRentalsUseCase(
      activeRentalRepository,
      equipmentRepository,
      companyRepository,
      invoiceRepository,
      serviceRequestRepository
    );
  }, [
    'activeRentalRepository',
    'equipmentRepository',
    'companyRepository',
    'invoiceRepository',
    'serviceRequestRepository'
  ]);

  // Provider Maintenance Use Case
  container.register('providerMaintenanceUseCase', (
    maintenanceRepository,
    equipmentRepository,
    companyRepository,
    userRepository
  ) => {
    return new ProviderMaintenanceUseCase(
      maintenanceRepository,
      equipmentRepository,
      companyRepository,
      userRepository
    );
  }, [
    'maintenanceRepository',
    'equipmentRepository',
    'companyRepository',
    'userRepository'
  ]);

  // Provider Service Request Use Case
  container.register('providerServiceRequestUseCase', (
    serviceRequestRepository,
    equipmentRepository,
    companyRepository,
    userRepository
  ) => {
    return new ProviderServiceRequestUseCase(
      serviceRequestRepository,
      equipmentRepository,
      companyRepository,
      userRepository,
      null // notificationService - can be injected later
    );
  }, [
    'serviceRequestRepository',
    'equipmentRepository',
    'companyRepository',
    'userRepository'
  ]);

  // Provider Profile Use Case
  container.register('providerProfileUseCase', (
    userRepository,
    companyRepository
  ) => {
    return new ProviderProfileUseCase(
      userRepository,
      companyRepository,
      null, // settingsRepository - can be injected later
      null, // statisticsRepository - can be injected later
      null  // fileUploadService - can be injected later
    );
  }, [
    'userRepository',
    'companyRepository'
  ]);

  // =====================================================
  // APPLICATION LAYER - DTOs (Response Data Transfer Objects)
  // =====================================================

  // ===== CLIENT RESPONSE DTOs =====
  container.registerSingleton('ClientDashboardResponseDTO', () => {
    return require('../../application/dto/ClientDashboardResponseDTO');
  });

  container.registerSingleton('ClientEquipmentResponseDTO', () => {
    return require('../../application/dto/ClientEquipmentResponseDTO');
  });

  container.registerSingleton('ClientServiceRequestResponseDTO', () => {
    return require('../../application/dto/ClientServiceRequestResponseDTO');
  });

  container.registerSingleton('ClientProfileResponseDTO', () => {
    return require('../../application/dto/ClientProfileResponseDTO');
  });

  container.registerSingleton('ClientInvoiceResponseDTO', () => {
    return require('../../application/dto/ClientInvoiceResponseDTO');
  });

  container.registerSingleton('ClientContractResponseDTO', () => {
    return require('../../application/dto/ClientContractResponseDTO');
  });

  // ===== PROVIDER RESPONSE DTOs =====
  container.registerSingleton('ProviderDashboardResponseDTO', () => {
    return require('../../application/dto/ProviderDashboardResponseDTO');
  });

  container.registerSingleton('ProviderEquipmentResponseDTO', () => {
    return require('../../application/dto/ProviderEquipmentResponseDTO');
  });

  container.registerSingleton('ProviderClientResponseDTO', () => {
    return require('../../application/dto/ProviderClientResponseDTO');
  });

  container.registerSingleton('ProviderRentalResponseDTO', () => {
    return require('../../application/dto/ProviderRentalResponseDTO');
  });

  container.registerSingleton('ProviderMaintenanceResponseDTO', () => {
    return require('../../application/dto/ProviderMaintenanceResponseDTO');
  });

  container.registerSingleton('ProviderServiceRequestResponseDTO', () => {
    return require('../../application/dto/ProviderServiceRequestResponseDTO');
  });

  container.registerSingleton('ProviderProfileResponseDTO', () => {
    return require('../../application/dto/ProviderProfileResponseDTO');
  });

  // =====================================================
  // INTERFACE LAYER - Controllers  
  // =====================================================

  // ===== AUTH & ADMIN CONTROLLERS (Legacy Pattern) =====
  container.registerSingleton('authController', () => {
    return require('../../interfaces/http/controllers/auth/auth.controller');
  });

  container.registerSingleton('adminController', () => {
    return require('../../interfaces/http/controllers/admin/admin.controller');
  });

  // ===== CLIENT CONTROLLERS (DDD Architecture with Dependency Injection) =====
  container.registerSingleton('clientDashboardController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/client/dashboard.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('clientEquipmentsController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/client/equipments.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('clientServiceRequestsController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/client/serviceRequests.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('clientProfileController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/client/profile.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('clientInvoicesController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/client/invoices.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('clientContractsController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/client/contracts.controller');
    return new ControllerClass(container);
  });

  // ===== PROVIDER CONTROLLERS (DDD Architecture with Dependency Injection) =====
  container.registerSingleton('providerDashboardController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/provider/dashboard.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('providerEquipmentsController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/provider/equipments.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('providerClientsController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/provider/clients.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('providerRentalsController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/provider/rentals.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('providerMaintenancesController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/provider/maintenances.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('providerServiceRequestsController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/provider/serviceRequests.controller');
    return new ControllerClass(container);
  });

  container.registerSingleton('providerProfileController', () => {
    const ControllerClass = require('../../interfaces/http/controllers/provider/profile.controller');
    return new ControllerClass(container);
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
