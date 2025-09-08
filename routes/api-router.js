// routes/api-router.js - Organizador central de rutas de la API
const express = require('express');
const responseHandler = require('../helpers/responseHandler');

const router = express.Router();

console.log('=== POLARNET API ROUTER LOADED ===');

// Middleware para logging de todas las peticiones API
router.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - API ROUTER - ${req.method} ${req.originalUrl}`);
  next();
});

// Importar y organizar todas las rutas
const authRoutes = require('./auth/auth.routes');
const adminRoutes = require('./admin/admin.routes');
const clientRoutes = require('./client');
const providerRoutes = require('./provider');
const { authenticateToken, requireCliente, requireProveedor } = require('../helpers/auth');

// Montar las rutas con sus prefijos
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/client', authenticateToken, requireCliente, clientRoutes);
router.use('/provider', authenticateToken, requireProveedor, providerRoutes);

// Ruta de estado general de la API
router.get('/health', (req, res) => {
  const healthData = {
    apiStatus: 'OK',
    availableModules: [
      '/auth/* - Autenticación y registro de usuarios',
      '/admin/* - Funciones administrativas (requiere contraseña)',
      '/client/* - Funcionalidades para clientes (requiere rol CLIENTE)',
      '/provider/* - Funcionalidades para proveedores (requiere rol PROVEEDOR)'
    ],
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile (requiere Bearer token)',
        verify: 'GET /api/auth/verify (requiere Bearer token)'
      },
      admin: {
        users: 'POST /api/admin/users (requiere admin_password)',
        database: 'POST /api/admin/db-status (requiere admin_password)'
      },
      client: {
        dashboard: 'GET /api/client/dashboard',
        equipments: 'GET /api/client/equipments',
        serviceRequests: 'GET /api/client/service-requests',
        profile: 'GET /api/client/profile'
      },
      provider: {
        dashboard: 'GET /api/provider/dashboard',
        clients: 'GET /api/provider/clients',
        equipments: 'GET /api/provider/equipments (CRUD)',
        serviceRequests: 'GET /api/provider/service-requests (CRUD)',
        maintenances: 'GET /api/provider/maintenances (CRUD)',
        rentals: 'GET /api/provider/rentals (CRUD)'
      }
    }
  };
  
  return responseHandler.success(res, healthData, 'API funcionando correctamente');
});

// Ruta para documentación de la API
router.get('/docs', (req, res) => {
  const docsData = {
    title: 'PolarNet API Documentation',
    version: '1.0.0',
    description: 'API para gestión de equipos de refrigeración y servicios técnicos',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    authentication: {
      type: 'Bearer Token',
      description: 'Incluir en header: Authorization: Bearer <token>',
      obtainToken: 'POST /api/auth/login'
    },
    modules: {
      auth: {
        description: 'Gestión de usuarios y autenticación',
        routes: {
          'POST /auth/login': 'Iniciar sesión',
          'POST /auth/register': 'Registrar usuario (CLIENTE o PROVEEDOR)',
          'GET /auth/profile': 'Obtener perfil del usuario autenticado',
          'GET /auth/verify': 'Verificar validez del token'
        }
      },
      admin: {
        description: 'Funciones administrativas',
        routes: {
          'POST /admin/users': 'Listar todos los usuarios',
          'POST /admin/db-status': 'Estado de la base de datos'
        },
        note: 'Requiere admin_password en el body'
      },
      client: {
        description: 'Funcionalidades para usuarios con rol CLIENTE (solo lectura + solicitudes)',
        routes: {
          'GET /client/dashboard': 'Dashboard con métricas del cliente',
          'GET /client/equipments': 'Lista de equipos asignados al cliente',
          'GET /client/temperatures/current': 'Temperaturas actuales',
          'GET /client/energy/current': 'Consumo energético actual',
          'POST /client/service-requests': 'Crear solicitud de servicio',
          'GET /client/service-requests': 'Ver solicitudes del cliente',
          'GET /client/maintenances': 'Ver mantenimientos programados'
        }
      },
      provider: {
        description: 'Funcionalidades para usuarios con rol PROVEEDOR (gestión completa)',
        routes: {
          'GET /provider/dashboard': 'Dashboard empresarial del proveedor',
          'GET /provider/clients': 'Gestión de clientes asignados',
          'CRUD /provider/equipments': 'Gestión completa de equipos',
          'CRUD /provider/service-requests': 'Gestión de solicitudes de servicio',
          'CRUD /provider/maintenances': 'Programación y gestión de mantenimientos',
          'CRUD /provider/rentals': 'Sistema de rentas de equipos',
          'GET /provider/profile': 'Perfil unificado (usuario + empresa)'
        }
      }
    }
  };
  
  return responseHandler.success(res, docsData, 'Documentación de la API');
});

module.exports = router;
