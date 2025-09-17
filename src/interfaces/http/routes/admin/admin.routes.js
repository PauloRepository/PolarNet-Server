/**
 * Admin Routes - DDD Architecture
 * Rutas de administración usando DIContainer
 */
const express = require('express');
const router = express.Router();

// Import DI Container singleton
const container = require('../../../../infrastructure/config/DIContainer');

// Validation middleware
const { authenticate, validateAdmin } = require('../../middlewares/auth.middleware');

// Get admin controller from DI Container
const adminController = container.get('adminController');

// Apply authentication and admin validation to all routes
router.use(authenticate);
router.use(validateAdmin);

// Admin routes
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/companies', adminController.getAllCompanies);
router.put('/companies/:id/status', adminController.updateCompanyStatus);

router.get('/stats', adminController.getSystemStats);
router.get('/database-health', adminController.checkDatabaseConnection);

module.exports = router;
