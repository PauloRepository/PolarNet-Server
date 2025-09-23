const express = require('express');
const router = express.Router();

// Import DI Container singleton
const { getContainer } = require('../../../../infrastructure/config/index');
const container = getContainer();

// Get controllers from DI container (already instantiated with dependencies)
const dashboardController = container.resolve('clientDashboardController');
const equipmentsController = container.resolve('clientEquipmentsController');
const serviceRequestsController = container.resolve('clientServiceRequestsController');
const contractsController = container.resolve('clientContractsController');
const invoicesController = container.resolve('clientInvoicesController');
const profileController = container.resolve('clientProfileController');

// Validation middleware
const { authenticate, validateClient } = require('../../middlewares/auth.middleware');

// Apply authentication and client validation to all routes
router.use(authenticate);
router.use(validateClient);

// Dashboard routes - Unificado (contiene todas las métricas)
router.get('/dashboard', dashboardController.getDashboard.bind(dashboardController));

// Equipment management routes - Solo visualización y monitoreo
router.get('/equipments', equipmentsController.getEquipments.bind(equipmentsController));
router.get('/equipments/:id', equipmentsController.getEquipmentDetails.bind(equipmentsController));
router.get('/equipments/:id/readings', equipmentsController.getEquipmentReadings.bind(equipmentsController));

// Service Request management routes - Solo crear y consultar
router.get('/service-requests', serviceRequestsController.getServiceRequests.bind(serviceRequestsController));
router.post('/service-requests', serviceRequestsController.createServiceRequest.bind(serviceRequestsController));
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestDetails.bind(serviceRequestsController));

// Contract management routes - Solo visualización
router.get('/contracts', contractsController.getContracts.bind(contractsController));
router.get('/contracts/:id', contractsController.getContractDetails.bind(contractsController));

// Invoice management routes - Solo visualización
router.get('/invoices', invoicesController.getInvoices.bind(invoicesController));
router.get('/invoices/:id', invoicesController.getInvoiceDetails.bind(invoicesController));
router.get('/invoices/:id/pdf', invoicesController.downloadInvoicePDF.bind(invoicesController));

// Profile management routes - Solo lo básico
router.get('/profile', profileController.getProfile.bind(profileController));
router.put('/profile', profileController.updateProfile.bind(profileController));
router.get('/profile/locations', profileController.getLocations.bind(profileController));

module.exports = router;
