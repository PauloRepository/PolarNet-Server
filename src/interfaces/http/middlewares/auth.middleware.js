const jwt = require('jsonwebtoken');
const ResponseHandler = require('../../../shared/helpers/responseHandler');

// Import DI Container singleton
const container = require('../../../infrastructure/config/DIContainer');

// Middleware principal de autenticación usando DDD
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHandler.error(res, 'Token de acceso requerido', 'NO_TOKEN', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
      // Get validate token use case from DI Container
      const validateTokenUseCase = container.get('validateTokenUseCase');
      
      // Validate token and get user info using DDD
      const tokenData = await validateTokenUseCase.execute(token);
      
      // Agregar datos del usuario al request
      req.user = {
        userId: tokenData.user.userId,
        email: tokenData.user.email,
        name: tokenData.user.name,
        username: tokenData.user.username,
        role: tokenData.user.role,
        companyId: tokenData.company?.companyId || null,
        companyName: tokenData.company?.name || null,
        // Para backward compatibility con los controladores CLIENT/PROVIDER
        clientCompanyId: tokenData.user.role === 'CLIENT' ? tokenData.company?.companyId : null,
        providerCompanyId: tokenData.user.role === 'PROVIDER' ? tokenData.company?.companyId : null
      };

      next();
    } catch (jwtError) {
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
