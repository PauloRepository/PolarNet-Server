// middlewares/error.middleware.js
const responseHandler = require('../../../shared/helpers/responseHandler');

// Middleware para rutas no encontradas
const notFoundHandler = (req, res) => {
  return responseHandler.notFound(res, 'Ruta no encontrada', 'ROUTE_NOT_FOUND', {
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      health: '/health',
      docs: '/api'
    }
  });
};

// Middleware de manejo de errores global
const globalErrorHandler = (error, req, res, next) => {
  console.error('Error global:', error);
  
  // Error de CORS
  if (error.message && error.message.includes('CORS')) {
    return responseHandler.error(res, 'Error de CORS: Origen no permitido', 'CORS_ERROR', 403);
  }
  
  // Error de JSON parsing
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return responseHandler.error(res, 'JSON inválido en el cuerpo de la petición', 'INVALID_JSON', 400);
  }
  
  // Error de payload too large
  if (error.type === 'entity.too.large') {
    return responseHandler.error(res, 'El archivo o datos enviados son demasiado grandes', 'PAYLOAD_TOO_LARGE', 413);
  }
  
  // Error de validación de Express Validator
  if (error.type === 'validation') {
    return responseHandler.validationError(res, error.message, error.errors);
  }
  
  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return responseHandler.unauthorized(res, 'Token inválido', 'INVALID_TOKEN');
  }
  
  if (error.name === 'TokenExpiredError') {
    return responseHandler.unauthorized(res, 'Token expirado', 'TOKEN_EXPIRED');
  }
  
  // Error de base de datos
  if (error.code && error.code.startsWith('ECONNREFUSED')) {
    return responseHandler.error(res, 'Error de conexión a la base de datos', 'DATABASE_CONNECTION_ERROR', 503);
  }
  
  // Error genérico
  return responseHandler.error(
    res, 
    error.message || 'Error interno del servidor', 
    error.code || 'INTERNAL_SERVER_ERROR', 
    error.status || 500,
    process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
  );
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
