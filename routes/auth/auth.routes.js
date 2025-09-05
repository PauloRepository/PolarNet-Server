// routes/auth/auth.routes.js
const express = require('express');
const router = express.Router();

// Importar controlador, validaciones y middlewares
const authController = require('../../controllers/auth.controller');
const authValidations = require('../../validations/auth.validation');
const { handleValidationErrors } = require('../../validations/common.validation');
const { authenticateToken } = require('../../helpers/auth');
const { authRateLimit } = require('../../middlewares/security.middleware');

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión de usuario
 * @access  Público
 */
router.post(
  '/login',
  authRateLimit,
  authValidations.login,
  handleValidationErrors,
  authController.login
);

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario (cliente o proveedor)
 * @access  Público
 */
router.post(
  '/register',
  authRateLimit,
  authValidations.register,
  handleValidationErrors,
  authController.register
);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Privado (requiere token)
 */
router.get(
  '/profile',
  authenticateToken,
  authController.getProfile
);

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verificar validez del token
 * @access  Privado (requiere token)
 */
router.post(
  '/verify-token',
  authenticateToken,
  authController.verifyToken
);

module.exports = router;
