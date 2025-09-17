/**
 * Auth Routes - DDD Architecture
 * Rutas de autenticación usando los nuevos controllers DDD
 */
const express = require('express');
const router = express.Router();

// Import auth controller
const authController = require('../../controllers/auth/auth.controller');

// Validation middleware
const { authenticate } = require('../../middlewares/auth.middleware');

// Auth routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/profile', authenticate, authController.getProfile);
router.get('/verify', authenticate, authController.verifyToken);

module.exports = router;