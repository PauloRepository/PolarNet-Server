// validations/admin.validation.js
const { body, query } = require('express-validator');

const adminValidations = {
  // Validaciones para crear usuario
  createUser: [
    body('name')
      .notEmpty()
      .withMessage('El nombre es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('email')
      .notEmpty()
      .withMessage('El email es requerido')
      .isEmail()
      .withMessage('Debe ser un email válido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es requerida')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('role')
      .notEmpty()
      .withMessage('El rol es requerido')
      .isIn(['CLIENT', 'PROVIDER', 'ADMIN'])
      .withMessage('El rol debe ser CLIENT, PROVIDER o ADMIN'),
    body('company_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID de empresa debe ser válido')
  ],

  // Validaciones para actualizar usuario
  updateUser: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Debe ser un email válido')
      .normalizeEmail(),
    body('role')
      .optional()
      .isIn(['CLIENT', 'PROVIDER', 'ADMIN'])
      .withMessage('El rol debe ser CLIENT, PROVIDER o ADMIN'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('El estado activo debe ser verdadero o falso')
  ],

  // Validaciones para crear empresa
  createCompany: [
    body('name')
      .notEmpty()
      .withMessage('El nombre de la empresa es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('tax_id')
      .notEmpty()
      .withMessage('El RUC/Tax ID es requerido')
      .isLength({ min: 8, max: 15 })
      .withMessage('El RUC debe tener entre 8 y 15 caracteres'),
    body('type')
      .notEmpty()
      .withMessage('El tipo de empresa es requerido')
      .isIn(['CLIENT', 'PROVIDER'])
      .withMessage('El tipo debe ser CLIENT o PROVIDER'),
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

  // Validaciones para consultas de usuarios
  userQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número mayor a 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser entre 1 y 100'),
    query('role')
      .optional()
      .isIn(['CLIENT', 'PROVIDER', 'ADMIN'])
      .withMessage('El rol debe ser CLIENT, PROVIDER o ADMIN'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('El filtro activo debe ser verdadero o falso'),
    query('search')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('La búsqueda debe tener entre 2 y 50 caracteres')
  ],

  // Validaciones para consultas de empresas
  companyQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número mayor a 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser entre 1 y 100'),
    query('type')
      .optional()
      .isIn(['CLIENT', 'PROVIDER'])
      .withMessage('El tipo debe ser CLIENT o PROVIDER'),
    query('status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
      .withMessage('El estado debe ser ACTIVE, INACTIVE o SUSPENDED'),
    query('search')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('La búsqueda debe tener entre 2 y 50 caracteres')
  ]
};

module.exports = adminValidations;

module.exports = adminValidations;
