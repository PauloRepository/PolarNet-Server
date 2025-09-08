const express = require('express');
const router = express.Router();

// Controllers
const dashboardController = require('../../controllers/provider/dashboard.controller');
const clientsController = require('../../controllers/provider/clients.controller');
const equipmentsController = require('../../controllers/provider/equipments.controller');
const serviceRequestsController = require('../../controllers/provider/serviceRequests.controller');
const maintenancesController = require('../../controllers/provider/maintenances.controller');
const rentalsController = require('../../controllers/provider/rentals.controller');
const profileController = require('../../controllers/provider/profile.controller');

// ===================================
// DASHBOARD ROUTES
// ===================================
router.get('/dashboard', dashboardController.getDashboardData);
router.get('/dashboard/metrics', dashboardController.getDashboardMetrics);
router.get('/dashboard/service-requests', dashboardController.getRecentServiceRequests);
router.get('/dashboard/maintenances', dashboardController.getUpcomingMaintenances);
router.get('/dashboard/alerts', dashboardController.getCriticalAlerts);

// ===================================
// CLIENTS ROUTES
// ===================================
router.get('/clients', clientsController.getAssignedClients);
router.get('/clients/:clientId', clientsController.getClientDetails);
router.get('/clients/:clientId/history', clientsController.getClientServiceHistory);

// ===================================
// EQUIPMENTS ROUTES
// ===================================
router.get('/equipments', equipmentsController.getEquipments);
router.post('/equipments', equipmentsController.createEquipment);
router.get('/equipments/:id', equipmentsController.getEquipmentDetails);
router.put('/equipments/:id', equipmentsController.updateEquipment);
router.delete('/equipments/:id', equipmentsController.deleteEquipment);
router.get('/equipments/:id/readings', equipmentsController.getEquipmentReadings);
router.post('/equipments/:id/readings', equipmentsController.addEquipmentReading);

// ===================================
// SERVICE REQUESTS ROUTES
// ===================================
router.get('/service-requests', serviceRequestsController.getServiceRequests);
router.put('/service-requests/:id', serviceRequestsController.updateServiceRequest);
router.get('/service-requests/stats', serviceRequestsController.getServiceRequestStats);
router.post('/service-requests/:id/assign', serviceRequestsController.assignTechnician);
router.post('/service-requests/:id/complete', serviceRequestsController.completeServiceRequest);

// ===================================
// MAINTENANCES ROUTES
// ===================================
router.get('/maintenances', maintenancesController.getMaintenances);
router.post('/maintenances', maintenancesController.createMaintenance);
router.get('/maintenances/:id', maintenancesController.getMaintenanceDetails);
router.put('/maintenances/:id', maintenancesController.updateMaintenance);
router.delete('/maintenances/:id', maintenancesController.deleteMaintenance);
router.post('/maintenances/:id/complete', maintenancesController.completeMaintenance);
router.get('/maintenances/calendar', maintenancesController.getMaintenancesCalendar);

// ===================================
// RENTALS ROUTES
// ===================================
router.get('/rentals', rentalsController.getRentals);
router.post('/rentals', rentalsController.createRental);
router.get('/rentals/:id', rentalsController.getRentalDetails);
router.put('/rentals/:id', rentalsController.updateRental);
router.delete('/rentals/:id', rentalsController.deleteRental);
router.post('/rentals/:id/extend', rentalsController.extendRental);

// ===================================
// PROFILE ROUTES
// ===================================
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.get('/profile/company', profileController.getCompanyProfile);
router.put('/profile/company', profileController.updateCompanyProfile);
router.get('/profile/stats', profileController.getProviderStats);

module.exports = router;
