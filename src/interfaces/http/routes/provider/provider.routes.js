const express = require('express');
const router = express.Router();

// Import provider controllers (using existing DDD structure)
const dashboardController = require('../../controllers/provider/dashboard.controller');
const companyController = require('../../controllers/provider/company.controller');
const clientsController = require('../../controllers/provider/clients.controller');
const equipmentsController = require('../../controllers/provider/equipments.controller');
const serviceRequestsController = require('../../controllers/provider/serviceRequests.controller');
const rentalsController = require('../../controllers/provider/rentals.controller');
const maintenancesController = require('../../controllers/provider/maintenances.controller');
const invoicesController = require('../../controllers/provider/invoices.controller');
const profileController = require('../../controllers/provider/profile.controller');

// Validation middleware
const { authenticate, validateProvider } = require('../../middlewares/auth.middleware');

// Apply authentication and provider validation to all routes
router.use(authenticate);
router.use(validateProvider);

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboardMetrics);
router.get('/dashboard/activities', dashboardController.getRecentActivities);
router.get('/dashboard/alerts', dashboardController.getAlerts);
router.get('/dashboard/performance', dashboardController.getPerformanceMetrics);

// Company management routes
router.get('/company', companyController.getCompany);
router.put('/company', companyController.updateCompany);
router.get('/company/locations', companyController.getLocations);
router.post('/company/locations', companyController.createLocation);
router.put('/company/locations/:id', companyController.updateLocation);
router.delete('/company/locations/:id', companyController.deleteLocation);

// Client management routes
router.get('/clients', clientsController.getClients);
router.get('/clients/opportunities', clientsController.getClientOpportunities);
router.get('/clients/:id', clientsController.getClientDetails);
router.get('/clients/:id/service-history', clientsController.getClientServiceHistory);
router.get('/clients/:id/analytics', clientsController.getClientAnalytics);
router.get('/clients/:id/contracts', clientsController.getClientContracts);
router.post('/clients/:id/notes', clientsController.addClientNote);

// Equipment management routes
router.get('/equipments', equipmentsController.getEquipments);
router.post('/equipments', equipmentsController.createEquipment);
router.get('/equipments/:id', equipmentsController.getEquipmentDetails);
router.put('/equipments/:id', equipmentsController.updateEquipment);
router.delete('/equipments/:id', equipmentsController.deleteEquipment);
router.get('/equipments/:id/readings', equipmentsController.getEquipmentReadings);
router.post('/equipments/:id/move', equipmentsController.moveEquipment);

// Service requests routes
router.get('/service-requests', serviceRequestsController.getServiceRequests);
router.get('/service-requests/stats', serviceRequestsController.getServiceStats);
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestDetails);
router.put('/service-requests/:id/assign', serviceRequestsController.assignTechnician);
router.put('/service-requests/:id/status', serviceRequestsController.updateStatus);
router.put('/service-requests/:id/complete', serviceRequestsController.completeServiceRequest);

// Maintenance routes
router.get('/maintenances', maintenancesController.getMaintenances);
router.get('/maintenances/calendar', maintenancesController.getMaintenanceCalendar);
router.get('/maintenances/kpis', maintenancesController.getMaintenanceKPIs);
router.post('/maintenances', maintenancesController.createMaintenance);
router.get('/maintenances/:id', maintenancesController.getMaintenanceDetails);
router.put('/maintenances/:id', maintenancesController.updateMaintenance);
router.delete('/maintenances/:id', maintenancesController.deleteMaintenance);

// Rental management routes  
router.get('/rentals', rentalsController.getRentals);
router.get('/rentals/revenue-stats', rentalsController.getRevenueStats);
router.get('/rentals/renewals', rentalsController.getRenewals);
router.get('/rentals/profitability', rentalsController.getProfitability);
router.get('/rentals/requests', rentalsController.getRentalRequests);
router.get('/rentals/:id', rentalsController.getRentalDetails);
router.post('/rentals', rentalsController.createRental);
router.put('/rentals/:id', rentalsController.updateRental);
router.put('/rentals/:id/terminate', rentalsController.terminateRental);
router.get('/rentals/:id/payments', rentalsController.getRentalPayments);

// Invoice management routes
router.get('/invoices', invoicesController.getInvoices);
router.get('/invoices/stats', invoicesController.getInvoiceStats);
router.post('/invoices', invoicesController.createInvoice);
router.get('/invoices/:id', invoicesController.getInvoiceDetails);
router.put('/invoices/:id', invoicesController.updateInvoice);
router.put('/invoices/:id/send', invoicesController.sendInvoice);

// Profile management routes
router.get('/profile', profileController.getProfile);
router.put('/profile/user', profileController.updateUserProfile);
router.put('/profile/company', profileController.updateCompanyProfile);
router.put('/profile/password', profileController.changePassword);
router.get('/profile/team', profileController.getTeamMembers);
router.post('/profile/team', profileController.addTeamMember);
router.put('/profile/team/:userId', profileController.updateTeamMember);
router.delete('/profile/team/:userId', profileController.removeTeamMember);

module.exports = router;
