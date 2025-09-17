// validations/auth.validation.js
const { body } = require('express-validator');

const authValidations = {
  // Validaciones para login
  login: [
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
      .withMessage('La contraseña debe tener al menos 6 caracteres')
  ],

  // Validaciones para registro de usuario
  register: [
    body('name')
      .notEmpty()
      .withMessage('El nombre es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .trim(),
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
    body('phone')
      .optional()
      .isMobilePhone('es-PE')
      .withMessage('Debe ser un teléfono válido'),
    body('role')
      .notEmpty()
      .withMessage('El rol es requerido')
      .isIn(['CLIENT', 'PROVIDER'])
      .withMessage('El rol debe ser CLIENT o PROVIDER'),
    body('company_name')
      .notEmpty()
      .withMessage('El nombre de la empresa es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre de empresa debe tener entre 2 y 100 caracteres'),
    body('company_tax_id')
      .notEmpty()
      .withMessage('El RUC/Tax ID es requerido')
      .isLength({ min: 8, max: 15 })
      .withMessage('El RUC debe tener entre 8 y 15 caracteres')
  ],

  // Validaciones para cambio de contraseña
  changePassword: [
    body('current_password')
      .notEmpty()
      .withMessage('La contraseña actual es requerida'),
    body('new_password')
      .notEmpty()
      .withMessage('La nueva contraseña es requerida')
      .isLength({ min: 6 })
      .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
    body('confirm_password')
      .notEmpty()
      .withMessage('La confirmación de contraseña es requerida')
      .custom((value, { req }) => {
        if (value !== req.body.new_password) {
          throw new Error('Las contraseñas no coinciden');
        }
        return true;
      })
  ],

  // Validaciones para actualizar perfil
  updateProfile: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .trim(),
    body('phone')
      .optional()
      .isMobilePhone('es-PE')
      .withMessage('Debe ser un teléfono válido'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Debe ser un email válido')
      .normalizeEmail()
  ]
};

module.exports = authValidations;
