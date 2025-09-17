/**
 * Dependency Injection Container
 * Sistema de inyección de dependencias para conectar todas las capas DDD
 */

// Infrastructure
const database = require('../database');
const PostgreSQLEquipmentRepository = require('../persistence/PostgreSQLEquipmentRepository');
const PostgreSQLRentalRepository = require('../persistence/PostgreSQLRentalRepository');
const PostgreSQLServiceRequestRepository = require('../persistence/PostgreSQLServiceRequestRepository');
const PostgreSQLMaintenanceRepository = require('../persistence/PostgreSQLMaintenanceRepository');
const PostgreSQLUserRepository = require('../persistence/PostgreSQLUserRepository');
const PostgreSQLCompanyRepository = require('../persistence/PostgreSQLCompanyRepository');

// Domain Services
const EquipmentDomainService = require('../../domain/services/EquipmentDomainService');
const AuthDomainService = require('../../domain/services/AuthDomainService');

// Application Use Cases - Auth
const LoginUseCase = require('../../application/use-cases/LoginUseCase');
const RegisterUseCase = require('../../application/use-cases/RegisterUseCase');
const ValidateTokenUseCase = require('../../application/use-cases/ValidateTokenUseCase');

// Application Use Cases - Business Logic
const GetEquipmentUseCase = require('../../application/use-cases/GetEquipmentUseCase');
const CreateRentalUseCase = require('../../application/use-cases/CreateRentalUseCase');
const GetProviderDashboardUseCase = require('../../application/use-cases/GetProviderDashboardUseCase');
const CreateServiceRequestUseCase = require('../../application/use-cases/CreateServiceRequestUseCase');
const GetServiceRequestsUseCase = require('../../application/use-cases/GetServiceRequestsUseCase');
const UpdateServiceRequestUseCase = require('../../application/use-cases/UpdateServiceRequestUseCase');
const ScheduleMaintenanceUseCase = require('../../application/use-cases/ScheduleMaintenanceUseCase');
const GetMaintenancesUseCase = require('../../application/use-cases/GetMaintenancesUseCase');
const ManageUsersUseCase = require('../../application/use-cases/ManageUsersUseCase');

// Interface Controllers - Organized by Role
// Auth Controllers
const AuthController = require('../../interfaces/http/controllers/auth/auth.controller');

// DDD Controllers using existing interface controllers
const ClientDashboardController = require('../../interfaces/http/controllers/client/dashboard.controller');
const ClientEquipmentsController = require('../../interfaces/http/controllers/client/equipments.controller');
const ClientServiceRequestsController = require('../../interfaces/http/controllers/client/serviceRequests.controller');
const ClientProfileController = require('../../interfaces/http/controllers/client/profile.controller');

const ProviderDashboardController = require('../../interfaces/http/controllers/provider/dashboard.controller');
const ProviderClientsController = require('../../interfaces/http/controllers/provider/clients.controller');
const ProviderEquipmentsController = require('../../interfaces/http/controllers/provider/equipments.controller');
const ProviderServiceRequestsController = require('../../interfaces/http/controllers/provider/serviceRequests.controller');
const ProviderMaintenancesController = require('../../interfaces/http/controllers/provider/maintenances.controller');
const ProviderRentalsController = require('../../interfaces/http/controllers/provider/rentals.controller');
const ProviderProfileController = require('../../interfaces/http/controllers/provider/profile.controller');

const AdminController = require('../../interfaces/http/controllers/admin/admin.controller');

class DIContainer {
  constructor() {
    this.services = new Map();
    this.setupDependencies();
  }

  setupDependencies() {
    // === INFRASTRUCTURE LAYER ===
    
    // Database
    this.register('database', database);

    // Repositories
    this.register('equipmentRepository', () => 
      new PostgreSQLEquipmentRepository(this.get('database'))
    );

    this.register('rentalRepository', () => 
      new PostgreSQLRentalRepository(this.get('database'))
    );

    this.register('serviceRequestRepository', () => 
      new PostgreSQLServiceRequestRepository(this.get('database'))
    );

    this.register('maintenanceRepository', () => 
      new PostgreSQLMaintenanceRepository(this.get('database'))
    );

    this.register('userRepository', () => 
      new PostgreSQLUserRepository(this.get('database'))
    );

    this.register('companyRepository', () => 
      new PostgreSQLCompanyRepository(this.get('database'))
    );

    // === DOMAIN LAYER ===
    
    // Domain Services
    this.register('authDomainService', () => 
      new AuthDomainService()
    );

    this.register('equipmentDomainService', () => 
      new EquipmentDomainService(
        this.get('equipmentRepository'),
        this.get('rentalRepository')
      )
    );

    // === APPLICATION LAYER ===
    
    // Auth Use Cases
    this.register('loginUseCase', () => 
      new LoginUseCase(
        this.get('userRepository'),
        this.get('authDomainService')
      )
    );

    this.register('registerUseCase', () => 
      new RegisterUseCase(
        this.get('userRepository'),
        this.get('companyRepository'),
        this.get('authDomainService')
      )
    );

    this.register('validateTokenUseCase', () => 
      new ValidateTokenUseCase(
        this.get('userRepository'),
        this.get('authDomainService')
      )
    );

    // Business Use Cases
    this.register('getEquipmentUseCase', () => 
      new GetEquipmentUseCase(
        this.get('equipmentRepository'),
        this.get('equipmentDomainService')
      )
    );

    this.register('createRentalUseCase', () => 
      new CreateRentalUseCase(
        this.get('rentalRepository'),
        this.get('equipmentRepository'),
        this.get('equipmentDomainService')
      )
    );

    this.register('getProviderDashboardUseCase', () => 
      new GetProviderDashboardUseCase(
        this.get('rentalRepository'),
        this.get('equipmentRepository'),
        this.get('serviceRequestRepository'),
        this.get('maintenanceRepository'),
        this.get('companyRepository')
      )
    );

    // Service Request Use Cases
    this.register('createServiceRequestUseCase', () => 
      new CreateServiceRequestUseCase(
        this.get('serviceRequestRepository'),
        this.get('companyRepository'),
        this.get('userRepository')
      )
    );

    this.register('getServiceRequestsUseCase', () => 
      new GetServiceRequestsUseCase(
        this.get('serviceRequestRepository'),
        this.get('userRepository')
      )
    );

    this.register('updateServiceRequestUseCase', () => 
      new UpdateServiceRequestUseCase(
        this.get('serviceRequestRepository'),
        this.get('userRepository')
      )
    );

    // Maintenance Use Cases
    this.register('scheduleMaintenanceUseCase', () => 
      new ScheduleMaintenanceUseCase(
        this.get('maintenanceRepository'),
        this.get('equipmentRepository'),
        this.get('userRepository')
      )
    );

    this.register('getMaintenancesUseCase', () => 
      new GetMaintenancesUseCase(
        this.get('maintenanceRepository'),
        this.get('userRepository')
      )
    );

    // User Management Use Cases
    this.register('manageUsersUseCase', () => 
      new ManageUsersUseCase(
        this.get('userRepository'),
        this.get('companyRepository')
      )
    );

    // === INTERFACE LAYER ===
    
    // Auth Controllers
    this.register('authController', () => 
      AuthController  // Exported as object with methods
    );

    // Client Controllers
    this.register('clientDashboardController', () => 
      ClientDashboardController  // Exported as instance
    );

    this.register('clientEquipmentsController', () => 
      ClientEquipmentsController  // Exported as instance
    );

    this.register('clientServiceRequestsController', () => 
      ClientServiceRequestsController  // Exported as instance
    );

    this.register('clientProfileController', () => 
      ClientProfileController  // Exported as instance
    );

    // Provider Controllers
    this.register('providerClientsController', () => 
      ProviderClientsController  // Exported as instance
    );

    this.register('providerDashboardController', () => 
      ProviderDashboardController  // Exported as instance
    );

    this.register('providerEquipmentsController', () => 
      ProviderEquipmentsController  // Exported as instance
    );

    this.register('providerMaintenancesController', () => 
      ProviderMaintenancesController  // Exported as instance
    );

    this.register('providerProfileController', () => 
      ProviderProfileController  // Exported as instance
    );

    this.register('providerRentalsController', () => 
      ProviderRentalsController  // Exported as instance
    );

    this.register('providerServiceRequestsController', () => 
      ProviderServiceRequestsController  // Exported as instance
    );

    // Admin Controllers
    this.register('adminController', () => 
      AdminController  // Este controller se exporta como objeto, no constructor
    );
  }

  /**
   * Registra un servicio en el contenedor
   * @param {string} name 
   * @param {any|Function} service 
   */
  register(name, service) {
    this.services.set(name, service);
  }

  /**
   * Obtiene un servicio del contenedor
   * @param {string} name 
   * @returns {any}
   */
  get(name) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not found in DI container`);
    }

    // Si es una función factory, ejecutarla
    if (typeof service === 'function') {
      const instance = service();
      // Cachear la instancia para singleton behavior
      this.services.set(name, instance);
      return instance;
    }

    return service;
  }

  /**
   * Verifica si un servicio está registrado
   * @param {string} name 
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Obtiene todos los controladores configurados
   * @returns {Object}
   */
  getControllers() {
    return {
      equipmentController: this.get('equipmentController'),
      providerDashboardController: this.get('providerDashboardController'),
      serviceRequestsController: this.get('serviceRequestsController'),
      maintenancesController: this.get('maintenancesController')
    };
  }

  /**
   * Obtiene todos los use cases configurados
   * @returns {Object}
   */
  getUseCases() {
    return {
      getEquipmentUseCase: this.get('getEquipmentUseCase'),
      createRentalUseCase: this.get('createRentalUseCase'),
      getProviderDashboardUseCase: this.get('getProviderDashboardUseCase'),
      createServiceRequestUseCase: this.get('createServiceRequestUseCase'),
      getServiceRequestsUseCase: this.get('getServiceRequestsUseCase'),
      updateServiceRequestUseCase: this.get('updateServiceRequestUseCase'),
      scheduleMaintenanceUseCase: this.get('scheduleMaintenanceUseCase'),
      getMaintenancesUseCase: this.get('getMaintenancesUseCase'),
      manageUsersUseCase: this.get('manageUsersUseCase')
    };
  }

  /**
   * Obtiene todos los repositorios configurados
   * @returns {Object}
   */
  getRepositories() {
    return {
      equipmentRepository: this.get('equipmentRepository'),
      rentalRepository: this.get('rentalRepository'),
      serviceRequestRepository: this.get('serviceRequestRepository'),
      maintenanceRepository: this.get('maintenanceRepository'),
      userRepository: this.get('userRepository'),
      companyRepository: this.get('companyRepository')
    };
  }

  /**
   * Función de utilidad para crear controladores con binding correcto
   * @param {string} controllerName 
   * @returns {Object}
   */
  createBoundController(controllerName) {
    const controller = this.get(controllerName);
    const boundController = {};

    // Bind all methods to maintain 'this' context
    Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
      .filter(name => name !== 'constructor' && typeof controller[name] === 'function')
      .forEach(methodName => {
        boundController[methodName] = controller[methodName].bind(controller);
      });

    return boundController;
  }
}

// Crear instancia singleton
const container = new DIContainer();

module.exports = container;
