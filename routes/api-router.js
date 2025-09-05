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
// const equipmentRoutes = require('./equipments/equipment.routes');
// const serviceRoutes = require('./services/service.routes');

// Montar las rutas con sus prefijos
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
// router.use('/equipments', equipmentRoutes);
// router.use('/services', serviceRoutes);

// Ruta de estado general de la API
router.get('/health', (req, res) => {
  const healthData = {
    apiStatus: 'OK',
    availableModules: [
      '/auth/* - Autenticación y registro de usuarios',
      '/admin/* - Funciones administrativas (requiere contraseña)',
      // '/equipments/* - Gestión de equipos de refrigeración',
      // '/services/* - Gestión de servicios técnicos'
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
      }
    }
  };
  
  return responseHandler.success(res, docsData, 'Documentación de la API');
});

module.exports = router;
