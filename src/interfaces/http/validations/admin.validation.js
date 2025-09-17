// validations/admin.validation.js
const { body, query } = require('express-validator');

const adminValidations = {
  // Validaciones para operaciones administrativas
  adminPassword: [
    body('admin_password')
      .notEmpty()
      .withMessage('La contraseña de administrador es requerida')
      .isLength({ min: 4 })
      .withMessage('La contraseña debe tener al menos 4 caracteres')
  ],

  // Validaciones para consultas de usuarios
  userQuery: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser un número entre 1 y 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('El offset debe ser un número mayor o igual a 0'),
    query('role')
      .optional()
      .isIn(['CLIENTE', 'PROVEEDOR', 'ADMIN'])
      .withMessage('El rol debe ser CLIENTE, PROVEEDOR o ADMIN')
  ]
};

module.exports = adminValidations;
