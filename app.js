const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const responseHandler = require('./helpers/responseHandler');
// const equipmentRoutes = require('./routes/equipments');
// const serviceRoutes = require('./routes/services');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());

// Configuración de CORS más robusta
const allowedOrigins = [
  "capacitor://localhost",
  "ionic://localhost", 
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:3200",
  "http://localhost:4200",
  "http://localhost:8000",
  "http://localhost:8080",
  "http://localhost:8100",
  process.env.CORS_ORIGIN || "*"
];

// Headers CORS manuales para máxima compatibilidad
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  res.header(
    "Access-Control-Allow-Headers", 
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  
  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// CORS con librería cors como respaldo
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      console.log(`CORS: Origin ${origin} not allowed`);
      callback(null, true); // Permitir de todos modos en desarrollo
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Parser de JSON con límite aumentado
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para logs de requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/equipments', equipmentRoutes);
// app.use('/api/services', serviceRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    version: '1.0.0'
  };
  
  return responseHandler.success(res, healthData, 'Servidor funcionando correctamente');
});

// Ruta de bienvenida  
app.get('/', (req, res) => {
  const welcomeData = {
    message: 'PolarNet Server API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      // equipments: '/api/equipments',
      // services: '/api/services',
      health: '/health'
    },
    documentation: {
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
  
  return responseHandler.success(res, welcomeData, 'Bienvenido a PolarNet API');
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    mensajeError: 'Ruta no encontrada',
    mensajeAviso: null,
    code: 'ROUTE_NOT_FOUND',
    data: null,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  
  // Error de CORS
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      mensajeError: 'Error de CORS: Origen no permitido',
      mensajeAviso: null,
      code: 'CORS_ERROR',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Error de JSON parsing
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      mensajeError: 'JSON inválido en el cuerpo de la petición',
      mensajeAviso: null,
      code: 'INVALID_JSON',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Error de payload too large
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      mensajeError: 'El archivo o datos enviados son demasiado grandes',
      mensajeAviso: null,
      code: 'PAYLOAD_TOO_LARGE',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    mensajeError: error.message || 'Error interno del servidor',
    mensajeAviso: null,
    code: error.code || 'INTERNAL_SERVER_ERROR',
    data: null,
    details: process.env.NODE_ENV === 'development' ? error.stack : null,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor solo si no estamos siendo importados (para bin/www)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  });
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada en:', promise, 'razón:', reason);
  process.exit(1);
});

module.exports = app;
