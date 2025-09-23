/**
 * Provider Routes Index - DDD Architecture
 * Rutas principales par// Rental management routes
 */
const express = require('express');
const router = express.Router();

// Import auth middleware
const { authenticate, validateProvider, validateProviderOrAdmin } = require('../../middlewares/auth.middleware');

// Import DI Container singleton
const { getContainer } = require('../../../../infrastructure/config/index');
const container = getContainer();

// Get controllers from DI Container
const clientsController = container.resolve('providerClientsController');
const dashboardController = container.resolve('providerDashboardController');
const equipmentsController = container.resolve('providerEquipmentsController');
const maintenancesController = container.resolve('providerMaintenancesController');
const profileController = container.resolve('providerProfileController');
const rentalsController = container.resolve('providerRentalsController');
const serviceRequestsController = container.resolve('providerServiceRequestsController');

// Apply authentication to all provider routes
router.use(authenticate);
router.use(validateProvider);

// Dashboard routes - Solo la ruta principal (contiene todas las métricas unificadas)
router.get('/dashboard', dashboardController.getDashboard.bind(dashboardController));

// Clients management routes - Solo visualización (clientes se crean automáticamente)
router.get('/clients', clientsController.getClients.bind(clientsController));
router.get('/clients/:id', clientsController.getClientDetails.bind(clientsController));

// Equipment management routes - Solo visualización y edición
router.get('/equipments', equipmentsController.getEquipments.bind(equipmentsController));
router.get('/equipments/:id', equipmentsController.getEquipmentById.bind(equipmentsController));
router.put('/equipments/:id', equipmentsController.updateEquipment.bind(equipmentsController));

// Maintenance management routes - Solo gestión de estados
router.get('/maintenances', maintenancesController.getMaintenances.bind(maintenancesController));
router.get('/maintenances/:id', maintenancesController.getMaintenanceById.bind(maintenancesController));
router.post('/maintenances', maintenancesController.createMaintenance.bind(maintenancesController));
router.put('/maintenances/:id/start', maintenancesController.startMaintenance.bind(maintenancesController));
router.put('/maintenances/:id/complete', maintenancesController.completeMaintenance.bind(maintenancesController));

// Rental management routes - Solo gestión de estados
router.get('/rentals', rentalsController.getRentals.bind(rentalsController));
router.get('/rentals/:id', rentalsController.getRentalDetails.bind(rentalsController));
router.post('/rentals', rentalsController.createRental.bind(rentalsController));
router.put('/rentals/:id/terminate', rentalsController.terminateRental.bind(rentalsController));

// Service Request management routes - CRUD básico + estados
router.get('/service-requests', serviceRequestsController.getServiceRequests.bind(serviceRequestsController));
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestById.bind(serviceRequestsController));
router.put('/service-requests/:id/assign', serviceRequestsController.assignServiceRequest.bind(serviceRequestsController));
router.put('/service-requests/:id/status', serviceRequestsController.updateServiceRequestStatus.bind(serviceRequestsController));
router.put('/service-requests/:id/start', serviceRequestsController.startServiceRequest.bind(serviceRequestsController));
router.put('/service-requests/:id/complete', serviceRequestsController.completeServiceRequest.bind(serviceRequestsController));

// Profile management routes - Solo lo básico
router.get('/profile', profileController.getProfile.bind(profileController));
router.put('/profile', profileController.updateProfile.bind(profileController));
router.put('/profile/password', profileController.changePassword.bind(profileController));

module.exports = router;
