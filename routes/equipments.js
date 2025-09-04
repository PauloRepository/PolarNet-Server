const express = require('express');
const equipmentController = require('../controllers/equipmentController');
const { authenticateToken, requireEmpresaOrTecnico } = require('../helpers/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);
router.use(requireEmpresaOrTecnico);

// Rutas de equipos
router.get('/', equipmentController.getEquipments);
router.get('/:id', equipmentController.getEquipmentById);
router.get('/:id/temperature', equipmentController.getTemperatureReadings);
router.get('/:id/energy', equipmentController.getEnergyReadings);

module.exports = router;
