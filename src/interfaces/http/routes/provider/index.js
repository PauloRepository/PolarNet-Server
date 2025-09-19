/**
 * Provider Routes Index - DDD Architecture
 * Rutas principales para usuarios PROVIDER usando DIContainer
 */
const express = require('express');
const router = express.Router();

// Import auth middleware
const { authenticate, validateProvider, validateProviderOrAdmin } = require('../../middlewares/auth.middleware');

// Import DI Container singleton
const { getContainer } = require('../../../../infrastructure/config/index');
const container = getContainer();

// Get controllers from DI Container
const clientsController = container.get('providerClientsController');
const dashboardController = container.get('providerDashboardController');
const equipmentsController = container.get('providerEquipmentsController');
const maintenancesController = container.get('providerMaintenancesController');
const profileController = container.get('providerProfileController');
const rentalsController = container.get('providerRentalsController');
const serviceRequestsController = container.get('providerServiceRequestsController');

// Apply authentication to all provider routes
router.use(authenticate);
router.use(validateProvider);

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboard || dashboardController.index);
router.get('/dashboard/stats', dashboardController.getStats || dashboardController.stats);

// Clients management routes
router.get('/clients', clientsController.getClients || clientsController.index);
router.get('/clients/:id', clientsController.getClientById || clientsController.show);
router.post('/clients', clientsController.createClient || clientsController.create);
router.put('/clients/:id', clientsController.updateClient || clientsController.update);
router.delete('/clients/:id', clientsController.deleteClient || clientsController.destroy);

// Equipment management routes
router.get('/equipments', equipmentsController.getEquipments || equipmentsController.index);
router.get('/equipments/:id', equipmentsController.getEquipmentById || equipmentsController.show);
router.post('/equipments', equipmentsController.createEquipment || equipmentsController.create);
router.put('/equipments/:id', equipmentsController.updateEquipment || equipmentsController.update);
router.delete('/equipments/:id', equipmentsController.deleteEquipment || equipmentsController.destroy);

// Maintenance management routes
router.get('/maintenances', maintenancesController.getMaintenances || maintenancesController.index);
router.get('/maintenances/:id', maintenancesController.getMaintenanceById || maintenancesController.show);
router.post('/maintenances', maintenancesController.createMaintenance || maintenancesController.create);
router.put('/maintenances/:id', maintenancesController.updateMaintenance || maintenancesController.update);
router.delete('/maintenances/:id', maintenancesController.deleteMaintenance || maintenancesController.destroy);

// Profile management routes
router.get('/profile', profileController.getProfile || profileController.index);
router.put('/profile', profileController.updateProfile || profileController.update);
router.put('/profile/password', profileController.changePassword || profileController.updatePassword);

// Rental management routes
router.get('/rentals', rentalsController.getRentals || rentalsController.index);
router.get('/rentals/:id', rentalsController.getRentalById || rentalsController.show);
router.post('/rentals', rentalsController.createRental || rentalsController.create);
router.put('/rentals/:id', rentalsController.updateRental || rentalsController.update);
router.delete('/rentals/:id', rentalsController.deleteRental || rentalsController.destroy);

// Service Request management routes
router.get('/service-requests', serviceRequestsController.getServiceRequests || serviceRequestsController.index);
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestById || serviceRequestsController.show);
router.put('/service-requests/:id/assign', serviceRequestsController.assignServiceRequest || serviceRequestsController.assign);
router.put('/service-requests/:id/status', serviceRequestsController.updateServiceRequestStatus || serviceRequestsController.updateStatus);

module.exports = router;
