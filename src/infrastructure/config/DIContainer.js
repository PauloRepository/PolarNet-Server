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

// Application Use Cases
const GetEquipmentUseCase = require('../../application/use-cases/GetEquipmentUseCase');
const CreateRentalUseCase = require('../../application/use-cases/CreateRentalUseCase');
const GetProviderDashboardUseCase = require('../../application/use-cases/GetProviderDashboardUseCase');
const CreateServiceRequestUseCase = require('../../application/use-cases/CreateServiceRequestUseCase');
const GetServiceRequestsUseCase = require('../../application/use-cases/GetServiceRequestsUseCase');
const UpdateServiceRequestUseCase = require('../../application/use-cases/UpdateServiceRequestUseCase');
const ScheduleMaintenanceUseCase = require('../../application/use-cases/ScheduleMaintenanceUseCase');
const GetMaintenancesUseCase = require('../../application/use-cases/GetMaintenancesUseCase');
const ManageUsersUseCase = require('../../application/use-cases/ManageUsersUseCase');

// Interface Controllers
const EquipmentController = require('../../interfaces/http/controllers/EquipmentController');
const ProviderDashboardController = require('../../interfaces/http/controllers/ProviderDashboardController');
const ServiceRequestsController = require('../../interfaces/http/controllers/ServiceRequestsController');
const MaintenancesController = require('../../interfaces/http/controllers/MaintenancesController');
const ClientsController = require('../../interfaces/http/controllers/ClientsController');
const RentalsController = require('../../interfaces/http/controllers/RentalsController');
const ProfileController = require('../../interfaces/http/controllers/ProfileController');

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
    this.register('equipmentDomainService', () => 
      new EquipmentDomainService(
        this.get('equipmentRepository'),
        this.get('rentalRepository')
      )
    );

    // === APPLICATION LAYER ===
    
    // Use Cases
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
    
    // HTTP Controllers
    this.register('equipmentController', () => 
      new EquipmentController(
        this.get('getEquipmentUseCase'),
        null, // createEquipmentUseCase - TODO: implementar
        null  // updateEquipmentUseCase - TODO: implementar
      )
    );

    this.register('providerDashboardController', () => 
      new ProviderDashboardController(
        this.get('getProviderDashboardUseCase'),
        null, // getRecentActivitiesUseCase - TODO: implementar
        null, // getAlertsUseCase - TODO: implementar
        null  // getPerformanceMetricsUseCase - TODO: implementar
      )
    );

    this.register('serviceRequestsController', () => 
      new ServiceRequestsController(
        this.get('createServiceRequestUseCase'),
        this.get('getServiceRequestsUseCase'),
        this.get('updateServiceRequestUseCase')
      )
    );

    this.register('maintenancesController', () => 
      new MaintenancesController(
        this.get('scheduleMaintenanceUseCase'),
        this.get('getMaintenancesUseCase')
      )
    );

    this.register('clientsController', () => 
      new ClientsController(
        this.get('companyRepository'),
        this.get('serviceRequestRepository'),
        this.get('rentalRepository'),
        this.get('userRepository')
      )
    );

    this.register('rentalsController', () => 
      new RentalsController(
        this.get('createRentalUseCase'),
        this.get('rentalRepository'),
        this.get('equipmentRepository'),
        this.get('companyRepository')
      )
    );

    this.register('profileController', () => 
      new ProfileController(
        this.get('userRepository'),
        this.get('companyRepository')
      )
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
