const express = require('express');
const router = express.Router();

// Import client controllers (using existing schema)
const dashboardController = require('../../controllers/client/dashboard.controller');
const equipmentsController = require('../../controllers/client/equipments.controller');
const serviceRequestsController = require('../../controllers/client/serviceRequests.controller');
const contractsController = require('../../controllers/client/contracts.controller');
const invoicesController = require('../../controllers/client/invoices.controller');
const profileController = require('../../controllers/client/profile.controller');

// Validation middleware
const { authenticate, validateClient } = require('../../middlewares/auth.middleware');

// Apply authentication and client validation to all routes
router.use(authenticate);
router.use(validateClient);

// =====================================
// 📊 DASHBOARD MODULE - Cliente Dashboard
// =====================================
router.get('/dashboard', dashboardController.getDashboardMetrics);
router.get('/dashboard/activities', dashboardController.getRecentActivities);
router.get('/dashboard/alerts', dashboardController.getAlerts);
router.get('/dashboard/energy-summary', dashboardController.getEnergySummary);

// =====================================
// 🔧 EQUIPMENTS MODULE - Mis Equipos Rentados
// =====================================
// Listado y gestión de equipos (con conteos por categoría)
router.get('/equipments', equipmentsController.getEquipments);
router.get('/equipments/summary', equipmentsController.getEquipmentsSummary);
router.get('/equipments/:id', equipmentsController.getEquipmentDetails);

// Monitoreo en tiempo real
router.get('/equipments/:id/readings', equipmentsController.getEquipmentReadings);
router.get('/equipments/:id/history', equipmentsController.getEquipmentHistory);

// Solicitar nuevos equipos (vía service request)
router.post('/equipments/request-new', serviceRequestsController.createServiceRequest);

// =====================================
// 🛠️ SERVICE REQUESTS MODULE - Solicitudes de Servicio
// =====================================
// CRUD de solicitudes
router.get('/service-requests', serviceRequestsController.getServiceRequests);
router.post('/service-requests', serviceRequestsController.createServiceRequest);
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestDetails);
router.put('/service-requests/:id', serviceRequestsController.updateServiceRequest);
router.delete('/service-requests/:id', serviceRequestsController.cancelServiceRequest);

// Estadísticas y seguimiento
router.get('/service-requests/stats', serviceRequestsController.getServiceRequestsStats);

// =====================================
// 📄 CONTRACTS MODULE - Mis Contratos de Renta
// =====================================
// Gestión de contratos
router.get('/contracts', contractsController.getContracts);
router.get('/contracts/summary', contractsController.getContractsSummary);
router.get('/contracts/:id', contractsController.getContractDetails);

// Documentos y extensiones
router.get('/contracts/:id/documents', contractsController.getContractDocuments);
router.put('/contracts/:id/extend', contractsController.requestContractExtension);

// =====================================
// 💰 INVOICES MODULE - Facturación y Pagos
// =====================================
// Gestión de facturas
router.get('/invoices', invoicesController.getInvoices);
router.get('/invoices/summary', invoicesController.getInvoicesSummary);
router.get('/invoices/payment-history', invoicesController.getPaymentHistory);
router.get('/invoices/:id', invoicesController.getInvoiceDetails);

// Descargas y pagos
router.get('/invoices/:id/pdf', invoicesController.downloadInvoicePDF);
router.post('/invoices/:id/mark-paid', invoicesController.markInvoiceAsPaid);

// =====================================
// 🏢 PROFILE MODULE - Perfil Empresarial
// =====================================
// Información de empresa
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);

// Gestión de ubicaciones/sucursales
router.get('/profile/locations', profileController.getLocations);
router.post('/profile/locations', profileController.createLocation);
router.put('/profile/locations/:id', profileController.updateLocation);
router.delete('/profile/locations/:id', profileController.deleteLocation);

// Gestión de usuarios/equipo
router.get('/profile/users', profileController.getUsers);
router.post('/profile/users', profileController.inviteUser);
router.put('/profile/users/:id/status', profileController.updateUserStatus);

// Actividad empresarial
router.get('/profile/activity', profileController.getCompanyActivity);

module.exports = router;
