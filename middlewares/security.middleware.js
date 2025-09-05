// middlewares/security.middleware.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Configuración básica de seguridad con Helmet
const basicSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting para prevenir ataques de fuerza bruta
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP en 15 minutos
  message: {
    success: false,
    mensajeError: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
    mensajeAviso: null,
    code: 'TOO_MANY_AUTH_ATTEMPTS',
    data: null,
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting general para la API
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 peticiones por IP en 15 minutos
  message: {
    success: false,
    mensajeError: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
    mensajeAviso: null,
    code: 'TOO_MANY_REQUESTS',
    data: null,
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para limpiar headers sensibles
const sanitizeHeaders = (req, res, next) => {
  // Remover headers que podrían revelar información del servidor
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
};

// Middleware para validar Content-Type en peticiones POST/PUT
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      return res.status(400).json({
        success: false,
        mensajeError: 'Content-Type debe ser application/json o multipart/form-data',
        mensajeAviso: null,
        code: 'INVALID_CONTENT_TYPE',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
};

module.exports = {
  basicSecurity,
  authRateLimit,
  generalRateLimit,
  sanitizeHeaders,
  validateContentType
};
