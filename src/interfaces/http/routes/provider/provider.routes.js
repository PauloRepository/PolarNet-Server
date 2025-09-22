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

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboard.bind(dashboardController));
router.get('/dashboard/stats', dashboardController.getStats.bind(dashboardController));
router.get('/dashboard/equipment-performance', dashboardController.getEquipmentPerformance.bind(dashboardController));
router.get('/dashboard/revenue', dashboardController.getRevenue.bind(dashboardController));
router.get('/dashboard/maintenance-insights', dashboardController.getMaintenanceInsights.bind(dashboardController));
router.get('/dashboard/service-trends', dashboardController.getServiceTrends.bind(dashboardController));
router.get('/dashboard/client-analytics', dashboardController.getClientAnalytics.bind(dashboardController));
router.get('/dashboard/alerts', dashboardController.getAlerts.bind(dashboardController));
router.get('/dashboard/kpis', dashboardController.getKpis.bind(dashboardController));

// Clients management routes
router.get('/clients', clientsController.getClients || clientsController.index);
router.get('/clients/statistics', clientsController.getClientStatistics);
router.get('/clients/:id', clientsController.getClientDetails || clientsController.show);
router.get('/clients/:id/timeline', clientsController.getClientTimeline);
router.get('/clients/:id/contracts', clientsController.getClientContracts);
router.get('/clients/:id/performance', clientsController.getClientPerformance);
router.get('/clients/:id/insights', clientsController.getClientInsights);
router.get('/clients/:id/export', clientsController.exportClientData);
router.put('/clients/:id/notes', clientsController.updateClientNotes);
router.put('/clients/:id/priority', clientsController.updateClientPriority);
router.post('/clients', clientsController.createClient || clientsController.create);
router.put('/clients/:id', clientsController.updateClient || clientsController.update);
router.delete('/clients/:id', clientsController.deleteClient || clientsController.destroy);

// Equipment management routes
router.get('/equipments', equipmentsController.getEquipments || equipmentsController.index);
router.get('/equipments/summary', equipmentsController.getEquipmentsSummary);
router.get('/equipments/:id', equipmentsController.getEquipmentById || equipmentsController.show);
router.get('/equipments/:id/performance', equipmentsController.getEquipmentPerformance);
router.post('/equipments', equipmentsController.createEquipment || equipmentsController.create);
router.put('/equipments/:id', equipmentsController.updateEquipment || equipmentsController.update);
router.delete('/equipments/:id', equipmentsController.deleteEquipment || equipmentsController.destroy);

// Maintenance management routes
router.get('/maintenances', maintenancesController.getMaintenances || maintenancesController.index);
router.get('/maintenances/statistics', maintenancesController.getStatistics);
router.post('/maintenances/schedule-automatic', maintenancesController.scheduleAutomaticMaintenances);
router.get('/maintenances/:id', maintenancesController.getMaintenanceById || maintenancesController.show);
router.post('/maintenances', maintenancesController.createMaintenance || maintenancesController.create);
router.put('/maintenances/:id', maintenancesController.updateMaintenance || maintenancesController.update);
router.put('/maintenances/:id/start', maintenancesController.startMaintenance);
router.put('/maintenances/:id/complete', maintenancesController.completeMaintenance);
router.delete('/maintenances/:id', maintenancesController.deleteMaintenance || maintenancesController.destroy);

// Rental management routes
router.get('/rentals', rentalsController.getRentals || rentalsController.index);
router.get('/rental-requests', rentalsController.getRentalRequests);
router.get('/rentals/revenue-stats', rentalsController.getRevenueStats);
router.get('/rentals/renewals', rentalsController.getRenewals);
router.get('/rentals/profitability', rentalsController.getProfitability);
router.get('/rentals/:id', rentalsController.getRentalDetails || rentalsController.show);
router.get('/rentals/:id/payments', rentalsController.getRentalPayments);
router.post('/rentals', rentalsController.createRental || rentalsController.create);
router.put('/rentals/:id', rentalsController.updateRental || rentalsController.update);
router.put('/rentals/:id/terminate', rentalsController.terminateRental);
router.delete('/rentals/:id', rentalsController.deleteRental || rentalsController.destroy);

// Service Request management routes
router.get('/service-requests', serviceRequestsController.getServiceRequests || serviceRequestsController.index);
router.get('/service-requests/statistics', serviceRequestsController.getStatistics);
router.get('/service-requests/analytics', serviceRequestsController.getAnalytics);
router.get('/service-requests/calendar', serviceRequestsController.getCalendar);
router.put('/service-requests/bulk-update', serviceRequestsController.bulkUpdate);
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestById || serviceRequestsController.show);
router.put('/service-requests/:id/assign', serviceRequestsController.assignServiceRequest || serviceRequestsController.assign);
router.put('/service-requests/:id/status', serviceRequestsController.updateServiceRequestStatus || serviceRequestsController.updateStatus);
router.put('/service-requests/:id/start', serviceRequestsController.startServiceRequest);
router.put('/service-requests/:id/complete', serviceRequestsController.completeServiceRequest);
router.post('/service-requests/:id/updates', serviceRequestsController.addUpdate);

// Profile management routes
router.get('/profile', profileController.getProfile || profileController.index);
router.get('/profile/settings', profileController.getSettings);
router.get('/profile/insights', profileController.getInsights);
router.get('/profile/team', profileController.getTeamMembers);
router.put('/profile', profileController.updateProfile || profileController.update);
router.put('/profile/settings', profileController.updateSettings);
router.put('/profile/password', profileController.changePassword || profileController.updatePassword);
router.post('/profile/certifications', profileController.addCertification);
router.delete('/profile/certifications/:id', profileController.removeCertification);
router.post('/profile/team', profileController.addTeamMember);

module.exports = router;
