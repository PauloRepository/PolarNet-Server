const express = require('express');
const router = express.Router();

// Import DI Container singleton (UBICACIÓN CORREGIDA)
const { getContainer } = require('../../../../infrastructure/config/index');
const container = getContainer();

// Get modernized controllers from correct path
const dashboardController = require('../../controllers/client/dashboard.controller');
const equipmentsController = require('../../controllers/client/equipments.controller');
const serviceRequestsController = require('../../controllers/client/serviceRequests.controller');
const contractsController = require('../../controllers/client/contracts.controller');
const invoicesController = require('../../controllers/client/invoices.controller');
const profileController = require('../../controllers/client/profile.controller');

// Inject DI container into modernized controllers
dashboardController.setContainer(container);
equipmentsController.setContainer(container);
serviceRequestsController.setContainer(container);
contractsController.setContainer(container);
invoicesController.setContainer(container);
profileController.setContainer(container);

// Validation middleware
const { authenticate, validateClient } = require('../../middlewares/auth.middleware');

// Apply authentication and client validation to all routes
router.use(authenticate);
router.use(validateClient);

// =====================================
// 📊 DASHBOARD MODULE - Cliente Dashboard
// =====================================
router.get('/dashboard', dashboardController.getDashboardMetrics.bind(dashboardController));
router.get('/dashboard/activities', dashboardController.getRecentActivities.bind(dashboardController));
router.get('/dashboard/alerts', dashboardController.getAlerts.bind(dashboardController));
router.get('/dashboard/energy-summary', dashboardController.getEnergySummary.bind(dashboardController));

// =====================================
// 🔧 EQUIPMENTS MODULE - Mis Equipos Rentados
// =====================================
// Listado y gestión de equipos (con conteos por categoría)

// Monitoreo en tiempo real
router.get('/equipments', equipmentsController.getEquipments.bind(equipmentsController));
router.get('/equipments/summary', equipmentsController.getEquipmentsSummary.bind(equipmentsController));
router.get('/equipments/:id', equipmentsController.getEquipmentDetails.bind(equipmentsController));

// Monitoreo en tiempo real
router.get('/equipments/:id/readings', equipmentsController.getEquipmentReadings.bind(equipmentsController));
router.get('/equipments/:id/history', equipmentsController.getEquipmentHistory.bind(equipmentsController));

// =====================================
// 🛠️ SERVICE REQUESTS MODULE - Solicitudes de Servicio
// =====================================
// CRUD de solicitudes
router.get('/service-requests', serviceRequestsController.getServiceRequests.bind(serviceRequestsController));
router.post('/service-requests', serviceRequestsController.createServiceRequest.bind(serviceRequestsController));

// Estadísticas y seguimiento (DEBE IR ANTES DE :id para evitar conflictos)
router.get('/service-requests/stats', serviceRequestsController.getServiceRequestsStats.bind(serviceRequestsController));

// Operaciones con ID específico
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestDetails.bind(serviceRequestsController));
router.put('/service-requests/:id', serviceRequestsController.updateServiceRequest.bind(serviceRequestsController));
router.delete('/service-requests/:id', serviceRequestsController.cancelServiceRequest.bind(serviceRequestsController));

// =====================================
// 📄 CONTRACTS MODULE - Mis Contratos de Renta
// =====================================
// Gestión de contratos
router.get('/contracts', contractsController.getContracts.bind(contractsController));
router.get('/contracts/summary', contractsController.getContractsSummary.bind(contractsController));
router.get('/contracts/:id', contractsController.getContractDetails.bind(contractsController));

// Documentos y extensiones
router.get('/contracts/:id/documents', contractsController.getContractDocuments.bind(contractsController));
router.put('/contracts/:id/extend', contractsController.requestContractExtension.bind(contractsController));

// =====================================
// 💰 INVOICES MODULE - Facturación y Pagos
// =====================================
// Gestión de facturas
router.get('/invoices', invoicesController.getInvoices.bind(invoicesController));
router.get('/invoices/summary', invoicesController.getInvoicesSummary.bind(invoicesController));
router.get('/invoices/payment-history', invoicesController.getPaymentHistory.bind(invoicesController));
router.get('/invoices/:id', invoicesController.getInvoiceDetails.bind(invoicesController));

// Descargas y pagos
router.get('/invoices/:id/pdf', invoicesController.downloadInvoicePDF.bind(invoicesController));
router.post('/invoices/:id/mark-paid', invoicesController.markInvoiceAsPaid.bind(invoicesController));

// =====================================
// 🏢 PROFILE MODULE - Perfil Empresarial
// =====================================
// Información de empresa
router.get('/profile', profileController.getProfile.bind(profileController));
router.put('/profile', profileController.updateProfile.bind(profileController));

// Gestión de ubicaciones/sucursales
router.get('/profile/locations', profileController.getLocations.bind(profileController));
router.post('/profile/locations', profileController.createLocation.bind(profileController));
router.put('/profile/locations/:id', profileController.updateLocation.bind(profileController));
router.delete('/profile/locations/:id', profileController.deleteLocation.bind(profileController));

// Gestión de usuarios/equipo
router.get('/profile/users', profileController.getUsers.bind(profileController));
router.post('/profile/users', profileController.inviteUser.bind(profileController));
router.put('/profile/users/:id/status', profileController.updateUserStatus.bind(profileController));

// Actividad empresarial
router.get('/profile/activity', profileController.getCompanyActivity.bind(profileController));

module.exports = router;
