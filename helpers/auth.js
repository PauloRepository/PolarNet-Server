const jwt = require('jsonwebtoken');
const db = require('../lib/database');
const responseHandler = require('./responseHandler');

// Middleware para verificar JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return responseHandler.unauthorized(res, 'Token de acceso requerido', 'TOKEN_REQUIRED');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario aún existe en la base de datos
    const userQuery = 'SELECT user_id as id, username, role, company_id FROM users WHERE user_id = $1';
    const result = await db.query(userQuery, [decoded.userId]);
    
    if (result.rows.length === 0) {
      return responseHandler.unauthorized(res, 'Usuario no encontrado', 'USER_NOT_FOUND');
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return responseHandler.unauthorized(res, 'Token inválido', 'INVALID_TOKEN');
  }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return responseHandler.unauthorized(res, 'Usuario no autenticado', 'NOT_AUTHENTICATED');
    }

    // Convertir a array si se pasa un solo rol
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      return responseHandler.error(res, 
        `Acceso denegado. Roles permitidos: ${roles.join(', ')}`, 
        'INSUFFICIENT_PERMISSIONS', 
        403, 
        {
          userRole: req.user.role,
          requiredRoles: roles
        }
      );
    }
    
    next();
  };
};

// Middleware específico para empresas clientes (segmento #1)
const requireCliente = requireRole('CLIENTE');

// Middleware específico para empresas proveedoras (segmento #2)
const requireProveedor = requireRole('PROVEEDOR');

// Middleware que permite ambos roles de empresa
const requireClienteOrProveedor = requireRole(['CLIENTE', 'PROVEEDOR']);

// Middleware para verificar que una empresa solo acceda a sus propios recursos
const requireOwnCompany = async (req, res, next) => {
  // Ambos tipos de empresa deben acceder solo a sus propios recursos
  if (!['CLIENTE', 'PROVEEDOR'].includes(req.user.role)) {
    return next(); // En caso de roles futuros
  }

  // Extraer company_id del parámetro de la URL o del body
  const targetCompanyId = req.params.companyId || req.body.company_id || req.query.company_id;
  
  if (targetCompanyId && parseInt(targetCompanyId) !== req.user.company_id) {
    return responseHandler.error(res, 
      'No puedes acceder a recursos de otra empresa', 
      'WRONG_COMPANY_ACCESS', 
      403
    );
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireCliente,
  requireProveedor,
  requireClienteOrProveedor,
  requireOwnCompany
};
