const express = require('express');
const morgan = require('morgan');
require('dotenv').config();

// Importar middlewares organizados
const middlewares = require('./middlewares');

// Importar router centralizado y helper
const apiRouter = require('./routes/api-router');
const responseHandler = require('./helpers/responseHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(middlewares.basicSecurity);
app.use(middlewares.security.sanitizeHeaders);

// Configuración de CORS
app.use(middlewares.corsHeaders);
app.use(middlewares.corsLibrary);

// Logging
app.use(morgan('combined'));
app.use(middlewares.requestLogger);

// Rate limiting general
app.use(middlewares.generalRateLimit);

// Parser de JSON con límite aumentado
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Validación de Content-Type
app.use(middlewares.security.validateContentType);

// Rutas de la API - usando router centralizado
app.use('/api', apiRouter);

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

// Middleware para rutas no encontradas
app.use(middlewares.notFoundHandler);

// Middleware de manejo de errores global
app.use(middlewares.errorLogger);
app.use(middlewares.globalErrorHandler);

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
