// validations/provider.validation.js
const { body, query, param } = require('express-validator');

const providerValidations = {
  // Validaciones para equipos
  createEquipment: [
    body('name')
      .notEmpty()
      .withMessage('El nombre del equipo es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('type')
      .notEmpty()
      .withMessage('El tipo de equipo es requerido')
      .isIn(['REFRIGERATOR', 'FREEZER', 'COOLER', 'ICE_MACHINE', 'DISPLAY_CASE'])
      .withMessage('Tipo de equipo no válido'),
    body('brand')
      .notEmpty()
      .withMessage('La marca es requerida')
      .isLength({ min: 2, max: 50 })
      .withMessage('La marca debe tener entre 2 y 50 caracteres'),
    body('model')
      .notEmpty()
      .withMessage('El modelo es requerido')
      .isLength({ min: 1, max: 50 })
      .withMessage('El modelo debe tener entre 1 y 50 caracteres'),
    body('capacity')
      .notEmpty()
      .withMessage('La capacidad es requerida')
      .isFloat({ min: 0 })
      .withMessage('La capacidad debe ser un número positivo'),
    body('daily_rate')
      .notEmpty()
      .withMessage('La tarifa diaria es requerida')
      .isFloat({ min: 0 })
      .withMessage('La tarifa debe ser un número positivo'),
    body('location_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID de ubicación debe ser válido')
  ],

  // Validaciones para contratos de renta
  createRental: [
    body('client_company_id')
      .notEmpty()
      .withMessage('El ID de la empresa cliente es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID debe ser un número válido'),
    body('equipment_id')
      .notEmpty()
      .withMessage('El ID del equipo es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID debe ser un número válido'),
    body('start_date')
      .notEmpty()
      .withMessage('La fecha de inicio es requerida')
      .isISO8601()
      .withMessage('La fecha debe ser válida'),
    body('end_date')
      .notEmpty()
      .withMessage('La fecha de fin es requerida')
      .isISO8601()
      .withMessage('La fecha debe ser válida'),
    body('daily_rate')
      .notEmpty()
      .withMessage('La tarifa diaria es requerida')
      .isFloat({ min: 0 })
      .withMessage('La tarifa debe ser un número positivo'),
    body('delivery_address')
      .notEmpty()
      .withMessage('La dirección de entrega es requerida')
      .isLength({ min: 5, max: 200 })
      .withMessage('La dirección debe tener entre 5 y 200 caracteres')
  ],

  // Validaciones para mantenimientos
  createMaintenance: [
    body('equipment_id')
      .notEmpty()
      .withMessage('El ID del equipo es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID debe ser un número válido'),
    body('maintenance_type')
      .notEmpty()
      .withMessage('El tipo de mantenimiento es requerido')
      .isIn(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'])
      .withMessage('Tipo de mantenimiento no válido'),
    body('scheduled_date')
      .notEmpty()
      .withMessage('La fecha programada es requerida')
      .isISO8601()
      .withMessage('La fecha debe ser válida'),
    body('description')
      .notEmpty()
      .withMessage('La descripción es requerida')
      .isLength({ min: 10, max: 500 })
      .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('estimated_duration')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La duración estimada debe ser un número positivo'),
    body('assigned_technician_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID del técnico debe ser válido')
  ],

  // Validaciones para facturas
  createInvoice: [
    body('rental_id')
      .notEmpty()
      .withMessage('El ID del contrato es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID debe ser un número válido'),
    body('invoice_date')
      .notEmpty()
      .withMessage('La fecha de factura es requerida')
      .isISO8601()
      .withMessage('La fecha debe ser válida'),
    body('due_date')
      .notEmpty()
      .withMessage('La fecha de vencimiento es requerida')
      .isISO8601()
      .withMessage('La fecha debe ser válida'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('Los items son requeridos'),
    body('items.*.description')
      .notEmpty()
      .withMessage('La descripción del item es requerida'),
    body('items.*.quantity')
      .isFloat({ min: 0 })
      .withMessage('La cantidad debe ser un número positivo'),
    body('items.*.unit_price')
      .isFloat({ min: 0 })
      .withMessage('El precio unitario debe ser un número positivo')
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
    body('service_areas')
      .optional()
      .isArray()
      .withMessage('Las áreas de servicio deben ser un array'),
    body('certifications')
      .optional()
      .isArray()
      .withMessage('Las certificaciones deben ser un array'),
    body('contact_email')
      .optional()
      .isEmail()
      .withMessage('Debe ser un email válido'),
    body('contact_phone')
      .optional()
      .isMobilePhone('es-PE')
      .withMessage('Debe ser un teléfono válido')
  ],

  // Validaciones para gestión de equipo de trabajo
  createTeamMember: [
    body('user_name')
      .notEmpty()
      .withMessage('El nombre del usuario es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('user_email')
      .notEmpty()
      .withMessage('El email es requerido')
      .isEmail()
      .withMessage('Debe ser un email válido'),
    body('role')
      .notEmpty()
      .withMessage('El rol es requerido')
      .isIn(['MANAGER', 'TECHNICIAN', 'OPERATOR'])
      .withMessage('El rol debe ser MANAGER, TECHNICIAN o OPERATOR'),
    body('specialties')
      .optional()
      .isArray()
      .withMessage('Las especialidades deben ser un array'),
    body('phone')
      .optional()
      .isMobilePhone('es-PE')
      .withMessage('Debe ser un teléfono válido')
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
      .isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'AVAILABLE', 'RENTED'])
      .withMessage('Estado no válido'),
    query('type')
      .optional()
      .isIn(['REFRIGERATOR', 'FREEZER', 'COOLER', 'ICE_MACHINE', 'DISPLAY_CASE'])
      .withMessage('Tipo no válido'),
    query('location_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID de ubicación debe ser válido'),
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

module.exports = providerValidations;
