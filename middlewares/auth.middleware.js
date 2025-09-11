const jwt = require('jsonwebtoken');
const db = require('../lib/database');
const ResponseHandler = require('../helpers/responseHandler');

// Middleware principal de autenticación
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHandler.error(res, 'Token de acceso requerido', 'NO_TOKEN', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Obtener datos del usuario y empresa
      const userQuery = `
        SELECT 
          u.*,
          c.company_id,
          c.name as company_name
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.user_id = $1 AND u.is_active = true
      `;

      const result = await db.query(userQuery, [decoded.userId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Usuario no encontrado o inactivo', 'USER_NOT_FOUND', 401);
      }

      const user = result.rows[0];

      // Agregar datos del usuario al request
      req.user = {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        companyId: user.company_id,
        companyName: user.company_name,
        // Para backward compatibility con los controladores CLIENT
        clientCompanyId: user.role === 'CLIENT' ? user.company_id : null,
        providerCompanyId: user.role === 'PROVIDER' ? user.company_id : null
      };

      next();
    } catch (jwtError) {
      return ResponseHandler.error(res, 'Token inválido', 'INVALID_TOKEN', 401);
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
