const jwt = require('jsonwebtoken');
const ResponseHandler = require('../../../shared/helpers/responseHandler');

// Ensure environment variables are loaded
require('dotenv').config();

// Middleware principal de autenticación usando JWT directo
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHandler.error(res, 'Token de acceso requerido', 'NO_TOKEN', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
      // Validate token directly with JWT using same secret as auth controller
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
      const decoded = jwt.verify(token, secret);
      
      // Agregar datos del usuario al request
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        companyId: decoded.companyId,
        // Para backward compatibility con los controladores CLIENT/PROVIDER
        clientCompanyId: decoded.role === 'CLIENT' ? decoded.companyId : null,
        providerCompanyId: decoded.role === 'PROVIDER' ? decoded.companyId : null
      };

      next();
    } catch (jwtError) {
      console.error('JWT Validation Error:', jwtError.message);
      return ResponseHandler.error(res, 'Token inválido o expirado', 'INVALID_TOKEN', 401);
    }

  } catch (error) {
    console.error('Error en authenticate:', error);
    return ResponseHandler.error(res, 'Error de autenticación', 'AUTH_ERROR', 500);
  }
};

// Middleware para validar que el usuario es ADMIN
const validateAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return ResponseHandler.error(res, 'Acceso denegado. Se requiere rol de administrador', 'ACCESS_DENIED', 403);
  }
  next();
};

// Middleware para validar que el usuario es PROVIDER
const validateProvider = (req, res, next) => {
  if (req.user.role !== 'PROVIDER') {
    return ResponseHandler.error(res, 'Acceso denegado. Se requiere rol de proveedor', 'ACCESS_DENIED', 403);
  }
  
  if (!req.user.providerCompanyId) {
    return ResponseHandler.error(res, 'Usuario no asociado a empresa proveedora', 'NO_PROVIDER_COMPANY', 403);
  }
  
  next();
};

// Middleware para validar que el usuario es CLIENT
const validateClient = (req, res, next) => {
  if (req.user.role !== 'CLIENT') {
    return ResponseHandler.error(res, 'Acceso denegado. Se requiere rol de cliente', 'ACCESS_DENIED', 403);
  }
  
  if (!req.user.clientCompanyId) {
    return ResponseHandler.error(res, 'Usuario no asociado a empresa cliente', 'NO_CLIENT_COMPANY', 403);
  }
  
  next();
};

// Middleware para validar que el usuario es PROVIDER o ADMIN
const validateProviderOrAdmin = (req, res, next) => {
  if (!['PROVIDER', 'ADMIN'].includes(req.user.role)) {
    return ResponseHandler.error(res, 'Acceso denegado. Se requiere rol de proveedor o administrador', 'ACCESS_DENIED', 403);
  }
  next();
};

// Middleware para validar que el usuario es CLIENT o ADMIN
const validateClientOrAdmin = (req, res, next) => {
  if (!['CLIENT', 'ADMIN'].includes(req.user.role)) {
    return ResponseHandler.error(res, 'Acceso denegado. Se requiere rol de cliente o administrador', 'ACCESS_DENIED', 403);
  }
  next();
};

module.exports = {
  authenticate,
  validateAdmin,
  validateProvider,
  validateClient,
  validateProviderOrAdmin,
  validateClientOrAdmin
};
