// validations/client.validation.js
const { body, query, param } = require('express-validator');

const clientValidations = {
  // Validaciones para solicitudes de servicio
  createServiceRequest: [
    body('equipment_id')
      .notEmpty()
      .withMessage('El ID del equipo es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del equipo debe ser un número válido'),
    body('description')
      .notEmpty()
      .withMessage('La descripción es requerida')
      .isLength({ min: 10, max: 500 })
      .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('La prioridad debe ser LOW, MEDIUM, HIGH o CRITICAL'),
    body('issue_type')
      .optional()
      .isIn(['COOLING', 'HEATING', 'ELECTRICAL', 'MECHANICAL', 'OTHER'])
      .withMessage('El tipo de problema debe ser válido')
  ],

  // Validaciones para actualizar perfil de empresa
  updateCompanyProfile: [
    body('company_name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre de empresa debe tener entre 2 y 100 caracteres'),
    body('industry')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('La industria debe tener entre 2 y 50 caracteres'),
    body('contact_email')
      .optional()
      .isEmail()
      .withMessage('Debe ser un email válido'),
    body('contact_phone')
      .optional()
      .isMobilePhone('es-PE')
      .withMessage('Debe ser un teléfono válido')
  ],

  // Validaciones para agregar ubicaciones
  createLocation: [
    body('name')
      .notEmpty()
      .withMessage('El nombre de la ubicación es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('address')
      .notEmpty()
      .withMessage('La dirección es requerida')
      .isLength({ min: 5, max: 200 })
      .withMessage('La dirección debe tener entre 5 y 200 caracteres'),
    body('contact_person')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('El contacto debe tener entre 2 y 100 caracteres'),
    body('contact_phone')
      .optional()
      .isMobilePhone('es-PE')
      .withMessage('Debe ser un teléfono válido')
  ],

  // Validaciones para marketplace
  equipmentRequest: [
    body('equipment_type')
      .notEmpty()
      .withMessage('El tipo de equipo es requerido'),
    body('required_capacity')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('La capacidad debe ser un número positivo'),
    body('budget_range')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('El presupuesto debe ser un número positivo'),
    body('preferred_location')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('La ubicación debe tener entre 2 y 100 caracteres'),
    body('start_date')
      .optional()
      .isISO8601()
      .withMessage('La fecha de inicio debe ser válida'),
    body('duration_months')
      .optional()
      .isInt({ min: 1, max: 60 })
      .withMessage('La duración debe ser entre 1 y 60 meses')
  ],

  // Validaciones para queries comunes
  listQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número mayor a 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser entre 1 y 100'),
    query('status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED'])
      .withMessage('Estado no válido'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Fecha de inicio no válida'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('Fecha de fin no válida')
  ]
};

module.exports = clientValidations;
