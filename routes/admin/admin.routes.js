// routes/admin/admin.routes.js
const express = require('express');
const router = express.Router();

// Importar controlador y validaciones
const adminController = require('../../controllers/admin.controller');
const adminValidations = require('../../validations/admin.validation');
const { handleValidationErrors } = require('../../validations/common.validation');

/**
 * @route   POST /api/admin/users
 * @desc    Obtener lista de todos los usuarios (requiere contraseña de administrador)
 * @access  Privado (Admin)
 */
router.post(
  '/users',
  adminValidations.adminPassword,
  handleValidationErrors,
  adminController.getAllUsers
);

/**
 * @route   POST /api/admin/database-health
 * @desc    Verificar estado de la base de datos (requiere contraseña de administrador)
 * @access  Privado (Admin)
 */
router.post(
  '/database-health',
  adminValidations.adminPassword,
  handleValidationErrors,
  adminController.checkDatabaseConnection
);

module.exports = router;
