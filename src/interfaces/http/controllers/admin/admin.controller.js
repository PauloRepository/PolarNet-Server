const { validationResult } = require('express-validator');
const db = require('../../../../infrastructure/database/index');
const responseHandler = require('../../../../shared/helpers/responseHandler');

// Obtener todos los usuarios (solo para administradores con contraseña)
const getAllUsers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHandler.validationError(res, errors.array());
    }

    const { admin_password } = req.body;

    // Verificar contraseña de administrador
    if (admin_password !== 'polarnetadmin') {
      return responseHandler.unauthorized(res, 'Contraseña de administrador incorrecta', 'INVALID_ADMIN_PASSWORD');
    }

    const query = `
      SELECT 
        u.user_id as id, u.name, u.username, u.email, u.phone, u.role, u.company_id,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      ORDER BY u.user_id DESC
    `;
    
    const result = await db.query(query);
    
    if (result.rows.length === 0) {
      return responseHandler.success(res, { users: [], total: 0 }, 'No se encontraron usuarios registrados');
    }

    return responseHandler.success(res, { 
      users: result.rows, 
      total: result.rows.length 
    }, 'Usuarios obtenidos exitosamente');

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500, error.message);
  }
};

// Verificar conexión a base de datos (administrador)
const checkDatabaseConnection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHandler.validationError(res, errors.array());
    }

    const { admin_password } = req.body;

    // Verificar contraseña de administrador
    if (admin_password !== 'polarnetadmin') {
      return responseHandler.unauthorized(res, 'Contraseña de administrador incorrecta', 'INVALID_ADMIN_PASSWORD');
    }

    // Probar conexión simple
    const testQuery = 'SELECT NOW() as server_time, version() as postgres_version';
    const result = await db.query(testQuery);
    
    // Contar usuarios
    const userCountResult = await db.query('SELECT COUNT(*) as total_users FROM users');
    
    // Contar empresas
    const companyCountResult = await db.query('SELECT COUNT(*) as total_companies FROM companies');
    
    // Contar equipos (manejo de error si la tabla no existe)
    let equipmentCount = 0;
    try {
      const equipmentCountResult = await db.query('SELECT COUNT(*) as total_equipments FROM equipments');
      equipmentCount = parseInt(equipmentCountResult.rows[0].total_equipments);
    } catch (equipmentError) {
      // La tabla equipments no existe o hay error, continuar con 0
      console.log('Tabla equipments no encontrada, continuando...');
    }

    const databaseInfo = {
      server_time: result.rows[0].server_time,
      postgres_version: result.rows[0].postgres_version,
      total_users: parseInt(userCountResult.rows[0].total_users),
      total_companies: parseInt(companyCountResult.rows[0].total_companies),
      total_equipments: equipmentCount,
      environment: {
        db_host: process.env.DB_HOST,
        db_name: process.env.DB_NAME,
        db_user: process.env.DB_USER,
        node_env: process.env.NODE_ENV
      }
    };

    return responseHandler.success(res, databaseInfo, 'Conexión a base de datos exitosa');

  } catch (error) {
    console.error('Error en conexión a base de datos:', error);
    
    const possibleCauses = [
      'Credenciales incorrectas en .env',
      'Base de datos no está corriendo', 
      'Tablas no existen',
      'Permisos insuficientes'
    ];

    return responseHandler.error(res, 'Error de conexión a base de datos', 'DATABASE_CONNECTION_ERROR', 500, {
      message: error.message,
      possible_causes: possibleCauses
    });
  }
};

// Crear usuario (administrador)
const createUser = async (req, res) => {
  try {
    // Placeholder para crear usuario
    return responseHandler.error(res, 'Funcionalidad no implementada', 'NOT_IMPLEMENTED', 501);
  } catch (error) {
    console.error('Error creando usuario:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

// Actualizar usuario (administrador)
const updateUser = async (req, res) => {
  try {
    // Placeholder para actualizar usuario
    return responseHandler.error(res, 'Funcionalidad no implementada', 'NOT_IMPLEMENTED', 501);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

// Eliminar usuario (administrador)
const deleteUser = async (req, res) => {
  try {
    // Placeholder para eliminar usuario
    return responseHandler.error(res, 'Funcionalidad no implementada', 'NOT_IMPLEMENTED', 501);
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

// Obtener todas las empresas (administrador)
const getAllCompanies = async (req, res) => {
  try {
    // Placeholder para obtener empresas
    return responseHandler.error(res, 'Funcionalidad no implementada', 'NOT_IMPLEMENTED', 501);
  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

// Actualizar estado de empresa (administrador)
const updateCompanyStatus = async (req, res) => {
  try {
    // Placeholder para actualizar estado de empresa
    return responseHandler.error(res, 'Funcionalidad no implementada', 'NOT_IMPLEMENTED', 501);
  } catch (error) {
    console.error('Error actualizando estado de empresa:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

// Obtener estadísticas del sistema (administrador)
const getSystemStats = async (req, res) => {
  try {
    // Placeholder para estadísticas del sistema
    return responseHandler.error(res, 'Funcionalidad no implementada', 'NOT_IMPLEMENTED', 501);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

module.exports = {
  getAllUsers,
  checkDatabaseConnection,
  createUser,
  updateUser,
  deleteUser,
  getAllCompanies,
  updateCompanyStatus,
  getSystemStats
};
