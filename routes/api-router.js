const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate } = require('../middlewares/auth.middleware');

// Import route modules
const authRoutes = require('./auth/auth.routes');
const adminRoutes = require('./admin/admin.routes');
const providerRoutes = require('./provider/index');
const clientRoutes = require('./client/index');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'PolarNet API',
    version: '2.0.0'
  });
});

// Public routes (no authentication required)
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/admin', authenticate, adminRoutes);
router.use('/provider', authenticate, providerRoutes);
router.use('/client', authenticate, clientRoutes);

// 404 handler for undefined routes - debe ir al final
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    error: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;
