const express = require('express');
const router = express.Router();

// Importar controladores del módulo cliente
const dashboardController = require('../../controllers/client/dashboard.controller');
const equipmentsController = require('../../controllers/client/equipments.controller');
const temperaturesController = require('../../controllers/client/temperatures.controller');
const energyController = require('../../controllers/client/energy.controller');
const serviceRequestsController = require('../../controllers/client/serviceRequests.controller');
const maintenancesController = require('../../controllers/client/maintenances.controller');
const profileController = require('../../controllers/client/profile.controller');

// =================================
// RUTAS DEL DASHBOARD
// =================================
router.get('/dashboard', dashboardController.getDashboardData);
router.get('/dashboard/metrics', dashboardController.getDashboardMetrics);
router.get('/dashboard/temperature', dashboardController.getTemperatureData);
router.get('/dashboard/energy', dashboardController.getEnergyData);
router.get('/dashboard/service-requests', dashboardController.getRecentServiceRequests);
router.get('/dashboard/maintenances', dashboardController.getUpcomingMaintenances);

// =================================
// RUTAS DE EQUIPOS (Solo lectura + solicitar servicio)
// =================================
router.get('/equipments', equipmentsController.getEquipments);
router.get('/equipments/available', equipmentsController.getAvailableEquipments);
router.post('/equipments/request', equipmentsController.requestEquipment);
router.get('/equipments/:id', equipmentsController.getEquipmentDetails);

// =================================
// RUTAS DE TEMPERATURAS (Solo lectura)
// =================================
router.get('/temperatures/current', temperaturesController.getCurrentTemperatures);
router.get('/temperatures/alerts', temperaturesController.getTemperatureAlerts);
router.get('/temperatures/history', temperaturesController.getTemperatureHistory);
router.get('/temperatures/chart', temperaturesController.getTemperatureChartData);

// =================================
// RUTAS DE CONSUMO ENERGÉTICO (Solo lectura)
// =================================
router.get('/energy/current', energyController.getCurrentConsumption);
router.get('/energy/daily', energyController.getDailyConsumption);
router.get('/energy/monthly', energyController.getMonthlyConsumption);
router.get('/energy/efficiency', energyController.getEnergyEfficiency);
router.get('/energy/chart', energyController.getEnergyChartData);

// =================================
// RUTAS DE SOLICITUDES DE SERVICIO (CRUD limitado)
// =================================
router.get('/service-requests', serviceRequestsController.getServiceRequests);
router.post('/service-requests', serviceRequestsController.createServiceRequest);
router.get('/service-requests/statistics', serviceRequestsController.getServiceRequestStatistics);
router.get('/service-requests/:id', serviceRequestsController.getServiceRequestDetails);
router.put('/service-requests/:id', serviceRequestsController.updateServiceRequest);
router.delete('/service-requests/:id', serviceRequestsController.cancelServiceRequest);

// =================================
// RUTAS DE MANTENIMIENTOS (Solo lectura)
// =================================
router.get('/maintenances', maintenancesController.getMaintenances);
router.get('/maintenances/upcoming', maintenancesController.getUpcomingMaintenances);
router.get('/maintenances/calendar', maintenancesController.getMaintenanceCalendar);
router.get('/maintenances/statistics', maintenancesController.getMaintenanceStatistics);
router.get('/maintenances/:id', maintenancesController.getMaintenanceDetails);
router.get('/maintenances/history/:equipmentId', maintenancesController.getEquipmentMaintenanceHistory);

// =================================
// RUTAS DE PERFIL Y CONFIGURACIÓN
// =================================
router.get('/profile', profileController.getProfile);
router.put('/profile/user', profileController.updateUserProfile);
router.put('/profile/company', profileController.updateCompanyProfile);
router.put('/profile/password', profileController.changePassword);
router.get('/profile/subscription', profileController.getSubscriptionDetails);
router.get('/profile/activity', profileController.getActivityLog);
router.get('/profile/notifications', profileController.getNotificationSettings);
router.put('/profile/notifications', profileController.updateNotificationSettings);

module.exports = router;
