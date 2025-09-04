const express = require('express');
const { body } = require('express-validator');
const serviceController = require('../controllers/serviceController');
const { authenticateToken, requireEmpresaOrTecnico, requireEmpresa, requireTecnico } = require('../helpers/auth');

const router = express.Router();

// Validaciones para crear solicitud de servicio
const createServiceRequestValidation = [
  body('description')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 10, max: 500 })
    .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
  body('priority')
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('La prioridad debe ser LOW, MEDIUM, HIGH o CRITICAL'),
  body('issue_type')
    .isIn(['COOLING', 'HEATING', 'ELECTRICAL', 'MECHANICAL', 'OTHER'])
    .withMessage('El tipo de problema debe ser COOLING, HEATING, ELECTRICAL, MECHANICAL u OTHER'),
  body('equipment_id')
    .isInt({ min: 1 })
    .withMessage('El ID del equipo debe ser un número válido')
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);
router.use(requireEmpresaOrTecnico);

// Obtener solicitudes de servicio
router.get('/', serviceController.getServiceRequests);

// Crear nueva solicitud (solo empresas)
router.post('/', requireEmpresa, createServiceRequestValidation, serviceController.createServiceRequest);

// Asignar técnico (solo técnicos)
router.put('/:id/assign', requireTecnico, serviceController.assignTechnician);

// Actualizar estado
router.put('/:id/status', serviceController.updateServiceRequestStatus);

module.exports = router;
