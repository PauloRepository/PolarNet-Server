/**
 * DDD Use Cases Creation - Role-specific Business Logic
 * Casos de uso específicos para CLIENT y PROVIDER roles
 */

// CLIENT Use Cases
const CreateClientServiceRequestUseCase = require('../../application/usecases/client/CreateServiceRequestUseCase');
const GetClientDashboardUseCase = require('../../application/usecases/client/GetDashboardUseCase');
const GetClientEnergyDataUseCase = require('../../application/usecases/client/GetEnergyDataUseCase');
const GetClientEquipmentsUseCase = require('../../application/usecases/client/GetEquipmentsUseCase');
const GetClientMaintenancesUseCase = require('../../application/usecases/client/GetMaintenancesUseCase');
const UpdateClientProfileUseCase = require('../../application/usecases/client/UpdateProfileUseCase');
const GetClientTemperaturesUseCase = require('../../application/usecases/client/GetTemperaturesUseCase');

// PROVIDER Use Cases
const GetProviderClientsUseCase = require('../../application/usecases/provider/GetClientsUseCase');
const CreateProviderClientUseCase = require('../../application/usecases/provider/CreateClientUseCase');
const GetProviderDashboardUseCase = require('../../application/usecases/provider/GetDashboardUseCase');
const ManageProviderEquipmentUseCase = require('../../application/usecases/provider/ManageEquipmentUseCase');
const ManageProviderMaintenanceUseCase = require('../../application/usecases/provider/ManageMaintenanceUseCase');
const UpdateProviderProfileUseCase = require('../../application/usecases/provider/UpdateProfileUseCase');
const ManageProviderRentalUseCase = require('../../application/usecases/provider/ManageRentalUseCase');
const ManageProviderServiceRequestUseCase = require('../../application/usecases/provider/ManageServiceRequestUseCase');

// ADMIN Use Cases
const GetAllUsersUseCase = require('../../application/usecases/admin/GetAllUsersUseCase');
const CreateUserUseCase = require('../../application/usecases/admin/CreateUserUseCase');
const UpdateUserUseCase = require('../../application/usecases/admin/UpdateUserUseCase');
const DeleteUserUseCase = require('../../application/usecases/admin/DeleteUserUseCase');
const GetAllCompaniesUseCase = require('../../application/usecases/admin/GetAllCompaniesUseCase');
const UpdateCompanyStatusUseCase = require('../../application/usecases/admin/UpdateCompanyStatusUseCase');
const GetSystemStatsUseCase = require('../../application/usecases/admin/GetSystemStatsUseCase');

const createUseCases = (container) => {
  // Get repositories
  const userRepository = container.get('userRepository');
  const companyRepository = container.get('companyRepository');
  const equipmentRepository = container.get('equipmentRepository');
  const maintenanceRepository = container.get('maintenanceRepository');
  const serviceRequestRepository = container.get('serviceRequestRepository');
  
  // CLIENT Use Cases
  container.register('createClientServiceRequestUseCase', () => 
    new CreateClientServiceRequestUseCase(serviceRequestRepository, userRepository));
  
  container.register('getClientDashboardUseCase', () => 
    new GetClientDashboardUseCase(userRepository, companyRepository, equipmentRepository));
    
  container.register('getClientEnergyDataUseCase', () => 
    new GetClientEnergyDataUseCase(equipmentRepository));
    
  container.register('getClientEquipmentsUseCase', () => 
    new GetClientEquipmentsUseCase(equipmentRepository));
    
  container.register('getClientMaintenancesUseCase', () => 
    new GetClientMaintenancesUseCase(maintenanceRepository));
    
  container.register('updateClientProfileUseCase', () => 
    new UpdateClientProfileUseCase(userRepository, companyRepository));
    
  container.register('getClientTemperaturesUseCase', () => 
    new GetClientTemperaturesUseCase(equipmentRepository));
  
  // PROVIDER Use Cases
  container.register('getProviderClientsUseCase', () => 
    new GetProviderClientsUseCase(companyRepository, userRepository));
    
  container.register('createProviderClientUseCase', () => 
    new CreateProviderClientUseCase(companyRepository, userRepository));
    
  container.register('getProviderDashboardUseCase', () => 
    new GetProviderDashboardUseCase(userRepository, companyRepository, equipmentRepository));
    
  container.register('manageProviderEquipmentUseCase', () => 
    new ManageProviderEquipmentUseCase(equipmentRepository));
    
  container.register('manageProviderMaintenanceUseCase', () => 
    new ManageProviderMaintenanceUseCase(maintenanceRepository, equipmentRepository));
    
  container.register('updateProviderProfileUseCase', () => 
    new UpdateProviderProfileUseCase(userRepository, companyRepository));
    
  container.register('manageProviderRentalUseCase', () => 
    new ManageProviderRentalUseCase(equipmentRepository, companyRepository));
    
  container.register('manageProviderServiceRequestUseCase', () => 
    new ManageProviderServiceRequestUseCase(serviceRequestRepository, userRepository));
  
  // ADMIN Use Cases
  container.register('getAllUsersUseCase', () => 
    new GetAllUsersUseCase(userRepository));
    
  container.register('createUserUseCase', () => 
    new CreateUserUseCase(userRepository, companyRepository));
    
  container.register('updateUserUseCase', () => 
    new UpdateUserUseCase(userRepository));
    
  container.register('deleteUserUseCase', () => 
    new DeleteUserUseCase(userRepository));
    
  container.register('getAllCompaniesUseCase', () => 
    new GetAllCompaniesUseCase(companyRepository));
    
  container.register('updateCompanyStatusUseCase', () => 
    new UpdateCompanyStatusUseCase(companyRepository));
    
  container.register('getSystemStatsUseCase', () => 
    new GetSystemStatsUseCase(userRepository, companyRepository, equipmentRepository));
};

module.exports = createUseCases;
