/**
 * Admin Routes - DDD Architecture
 * Rutas de administración usando los nuevos controllers DDD
 */
const express = require('express');
const router = express.Router();

// Import admin controller
const adminController = require('../../controllers/admin/admin.controller');

// Validation middleware
const { authenticate, validateAdmin } = require('../../middlewares/auth.middleware');

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
