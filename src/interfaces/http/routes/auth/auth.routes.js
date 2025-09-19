/**
 * Auth Routes - DDD Architecture
 * Rutas de autenticación usando DIContainer para controllers
 */
const express = require('express');
const router = express.Router();

// Import DI Container singleton
const { getContainer } = require('../../../../infrastructure/config/index');
const container = getContainer();

// Validation middleware
const { authenticate } = require('../../middlewares/auth.middleware');

// Get auth controller from DI Container
const authController = container.get('authController');

// Auth routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/profile', authenticate, authController.getProfile);
router.get('/verify', authController.verifyToken);

module.exports = router;