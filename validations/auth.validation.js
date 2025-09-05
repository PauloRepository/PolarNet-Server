// validations/auth.validation.js
const { body } = require('express-validator');

const authValidations = {
  // Validaciones para login
  login: [
    body('username')
      .notEmpty()
      .withMessage('El nombre de usuario es requerido')
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres'),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es requerida')
      .isLength({ min: 4 })
      .withMessage('La contraseña debe tener al menos 4 caracteres')
  ],

  // Validaciones para registro unificado (cliente o proveedor)
  register: [
    body('name')
      .notEmpty()
      .withMessage('El nombre es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('username')
      .notEmpty()
      .withMessage('El nombre de usuario es requerido')
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    body('password')
      .isLength({ min: 4 })
      .withMessage('La contraseña debe tener al menos 4 caracteres'),
    body('email')
      .isEmail()
      .withMessage('Debe ser un email válido')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Debe ser un número de teléfono válido'),
    body('role')
      .isIn(['CLIENTE', 'PROVEEDOR'])
      .withMessage('El rol debe ser CLIENTE o PROVEEDOR'),
    
    // Validaciones condicionales para empresa (solo si role es PROVEEDOR)
    body('company_name')
      .if(body('role').equals('PROVEEDOR'))
      .notEmpty()
      .withMessage('El nombre de la empresa es requerido para proveedores')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre de empresa debe tener entre 2 y 100 caracteres'),
    body('company_address')
      .if(body('role').equals('PROVEEDOR'))
      .optional()
      .isLength({ max: 200 })
      .withMessage('La dirección no debe exceder 200 caracteres'),
    body('company_phone')
      .if(body('role').equals('PROVEEDOR'))
      .optional()
      .isMobilePhone('any')
      .withMessage('Debe ser un número de teléfono válido'),
    body('company_email')
      .if(body('role').equals('PROVEEDOR'))
      .optional()
      .isEmail()
      .withMessage('Debe ser un email válido')
      .normalizeEmail(),
    body('business_type')
      .if(body('role').equals('PROVEEDOR'))
      .optional()
      .isLength({ max: 50 })
      .withMessage('El tipo de negocio no debe exceder 50 caracteres')
  ]
};

module.exports = authValidations;
