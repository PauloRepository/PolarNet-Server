// middlewares/index.js - Exportador central de middlewares
const corsMiddleware = require('./cors.middleware');
const loggingMiddleware = require('./logging.middleware');
const errorMiddleware = require('./error.middleware');
const securityMiddleware = require('./security.middleware');

// Exportar todos los middlewares organizados
module.exports = {
  // CORS
  cors: corsMiddleware,
  
  // Logging
  logging: loggingMiddleware,
  
  // Manejo de errores
  errors: errorMiddleware,
  
  // Seguridad
  security: securityMiddleware,
  
  // Acceso directo a middlewares más usados
  corsHeaders: corsMiddleware.corsHeaders,
  corsLibrary: corsMiddleware.corsLibrary,
  requestLogger: loggingMiddleware.requestLogger,
  errorLogger: loggingMiddleware.errorLogger,
  notFoundHandler: errorMiddleware.notFoundHandler,
  globalErrorHandler: errorMiddleware.globalErrorHandler,
  basicSecurity: securityMiddleware.basicSecurity,
  authRateLimit: securityMiddleware.authRateLimit,
  generalRateLimit: securityMiddleware.generalRateLimit
};
