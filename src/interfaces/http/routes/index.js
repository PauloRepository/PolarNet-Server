/**
 * Main API Router - DDD Architecture  
 * Router principal restaurado con endpoints funcionales
 */
const express = require('express');
const router = express.Router();

// Importar rutas específicas
const authRoutes = require('./auth/auth.routes');
const clientRoutes = require('./client/client.routes');
const adminRoutes = require('./admin/admin.routes');
const providerRoutes = require('./provider/provider.routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'PolarNet API',
    version: '2.0.0',
    architecture: 'DDD - 100% Pure Structure',
    message: 'Servidor funcionando con arquitectura DDD y endpoints restaurados'
  });
});

// Rutas principales
router.use('/auth', authRoutes);
router.use('/client', clientRoutes);
router.use('/admin', adminRoutes);
router.use('/provider', providerRoutes);

// Endpoint de información general
router.get('/info', (req, res) => {
  res.json({
    service: 'PolarNet API',
    version: '2.0.0',
    architecture: 'Domain Driven Design',
    endpoints: {
      auth: '/api/auth',
      client: '/api/client',
      provider: '/api/provider',
      admin: '/api/admin'
    },
    features: [
      'Authentication & Authorization',
      'Client Dashboard & Equipment Management',
      'Provider Services & Rental Management',
      'Admin Panel & User Management'
    ]
  });
});

// 404 handler
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    availableEndpoints: {
      auth: '/api/auth (login, register, profile, verify)',
      client: '/api/client (dashboard, equipments, service-requests, contracts, invoices, profile)',
      provider: '/api/provider (dashboard, clients, equipments, rentals, service-requests, maintenances)',
      admin: '/api/admin (users, companies, system-stats)'
    },
    note: 'DDD Structure with Full Endpoints Restored'
  });
});

module.exports = router;
