/**
 * Main Application Entry Point - DDD Architecture
 * Punto de entrada principal siguiendo arquitectura DDD limpia
 */
const express = require('express');
const morgan = require('morgan');
require('dotenv').config();

// Importar middlewares DDD
const middlewares = require('./interfaces/http/middlewares');

// Importar router DDD centralizado
const apiRouter = require('./interfaces/http/routes');
const responseHandler = require('./shared/helpers/responseHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// === SECURITY MIDDLEWARES ===
app.use(middlewares.basicSecurity);
app.use(middlewares.security.sanitizeHeaders);

// === CORS CONFIGURATION ===
app.use(middlewares.corsHeaders);
app.use(middlewares.corsLibrary);

// === LOGGING ===
app.use(morgan('combined'));
app.use(middlewares.requestLogger);

// === RATE LIMITING ===
app.use(middlewares.generalRateLimit);

// === BODY PARSERS ===
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// === CONTENT TYPE VALIDATION ===
app.use(middlewares.security.validateContentType);

// === API ROUTES (DDD) ===
app.use('/api', apiRouter);

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    version: '2.0.0',
    architecture: 'DDD - Domain Driven Design',
    timestamp: new Date().toISOString()
  };
  
  return responseHandler.success(res, healthData, 'Servidor DDD funcionando correctamente');
});

// === ROOT ENDPOINT ===
app.get('/', (req, res) => {
  res.json({
    message: 'PolarNet API - DDD Architecture',
    version: '2.0.0',
    architecture: 'Domain Driven Design',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      provider: '/api/provider',
      client: '/api/client',
      admin: '/api/admin'
    },
    documentation: 'API following DDD principles with clean architecture'
  });
});

// === ERROR HANDLING ===
app.use(middlewares.notFoundHandler);
app.use(middlewares.errorLogger);
app.use(middlewares.globalErrorHandler);

// === SERVER STARTUP ===
const startServer = () => {
  try {
    app.listen(PORT, () => {
      console.log('\n🚀 ========================================');
      console.log('   PolarNet Server - DDD Architecture');
      console.log('🚀 ========================================');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Version: 2.0.0`);
      console.log(`🏗️  Architecture: Domain Driven Design`);
      console.log('🔐 Endpoints:');
      console.log(`   • Health: http://localhost:${PORT}/health`);
      console.log(`   • Auth: http://localhost:${PORT}/api/auth`);
      console.log(`   • Provider: http://localhost:${PORT}/api/provider`);
      console.log(`   • Client: http://localhost:${PORT}/api/client`);
      console.log(`   • Admin: http://localhost:${PORT}/api/admin`);
      console.log('🚀 ========================================\n');
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// === GRACEFUL SHUTDOWN ===
const gracefulShutdown = (signal) => {
  console.log(`\n📡 Received ${signal}. Graceful shutdown...`);
  process.exit(0);
};

// === ERROR HANDLERS ===
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Solo iniciar servidor si es el archivo principal
if (require.main === module) {
  startServer();
}

module.exports = app;
