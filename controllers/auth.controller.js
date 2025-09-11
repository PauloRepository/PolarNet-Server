const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../lib/database');
const responseHandler = require('../helpers/responseHandler');

// Generar token JWT
const generateToken = (userId, role, companyId = null) => {
  const payload = {
    userId,
    role,
    companyId
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHandler.validationError(res, errors.array());
    }

    const { username, password } = req.body;

    // Buscar usuario por username
    const userQuery = `
      SELECT user_id as id, name, username, password, email, phone, role, company_id, is_active
      FROM users 
      WHERE username = $1 AND is_active = true
    `;
    
    const result = await db.query(userQuery, [username]);
    
    if (result.rows.length === 0) {
      return responseHandler.unauthorized(res, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
    }

    const user = result.rows[0];

    // Verificar password con bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return responseHandler.unauthorized(res, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
    }

    // Generar token
    const token = generateToken(user.id, user.role, user.company_id);

    // Respuesta exitosa (sin incluir el password)
    const userResponse = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      company_id: user.company_id
    };

    return responseHandler.success(res, { 
      token: token, 
      user: userResponse 
    }, 'Login exitoso');

  } catch (error) {
    console.error('Error en login:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

// Registro unificado (cliente o proveedor según role)
const register = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHandler.validationError(res, errors.array());
    }

    const { 
      // Datos del usuario (común para ambos roles)
      name, username, password, email, phone, role,
      // Datos de la empresa (solo para PROVEEDOR)
      company_name, company_address, company_phone, company_email, business_type 
    } = req.body;

    // Verificar que el username no existe
    const existingUser = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return responseHandler.conflict(res, 'El nombre de usuario ya existe', 'USERNAME_EXISTS');
    }

    // Verificar que el email no existe
    const existingEmail = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return responseHandler.conflict(res, 'El email ya está registrado', 'EMAIL_EXISTS');
    }

    let company_id = null;
    let newCompany = null;

    // Crear empresa para todos los usuarios (CLIENT y PROVIDER)
    if (role === 'PROVIDER') {
      // Para PROVIDER: usar datos completos de la empresa
      const companyInsertQuery = `
        INSERT INTO companies (name, address, phone, email, business_type, type)
        VALUES ($1, $2, $3, $4, $5, 'PROVIDER')
        RETURNING company_id, name
      `;
      
      const companyValues = [company_name, company_address, company_phone, company_email, business_type];
      const companyResult = await client.query(companyInsertQuery, companyValues);
      newCompany = companyResult.rows[0];
      company_id = newCompany.company_id;
    } else if (role === 'CLIENT') {
      // Para CLIENT: crear empresa personal con datos básicos
      const companyInsertQuery = `
        INSERT INTO companies (name, phone, email, type, description)
        VALUES ($1, $2, $3, 'CLIENT', 'Empresa personal de cliente')
        RETURNING company_id, name
      `;
      
      const companyValues = [`${name} - Cliente`, phone, email];
      const companyResult = await client.query(companyInsertQuery, companyValues);
      newCompany = companyResult.rows[0];
      company_id = newCompany.company_id;
    }

    // Crear el usuario
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userInsertQuery = `
      INSERT INTO users (name, username, password, email, phone, role, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id as id, name, username, email, phone, role, company_id
    `;

    const userValues = [name, username, hashedPassword, email, phone, role, company_id];
    const userResult = await client.query(userInsertQuery, userValues);
    const newUser = userResult.rows[0];

    await client.query('COMMIT');

    const token = generateToken(newUser.id, newUser.role, newUser.company_id);

    const responseData = {
      token: token,
      user: newUser
    };

    // Incluir datos de la empresa para ambos roles
    if (newCompany) {
      responseData.company = newCompany;
    }

    const mensajeAviso = role === 'CLIENT' ? 
      'Cliente registrado exitosamente' : 
      'Empresa proveedora registrada exitosamente';

    return responseHandler.success(res, responseData, mensajeAviso, 201);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en registro:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  } finally {
    client.release();
  }
};

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userQuery = `
      SELECT u.user_id, u.name, u.username, u.email, u.phone, u.role, u.company_id,
             c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.company_id
      WHERE u.user_id = $1
    `;

    const result = await db.query(userQuery, [userId]);
    
    if (result.rows.length === 0) {
      return responseHandler.notFound(res, 'Usuario no encontrado');
    }

    const user = result.rows[0];

    const userData = {
      id: user.user_id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      company: user.company_id ? {
        id: user.company_id,
        name: user.company_name
      } : null
    };

    return responseHandler.success(res, { user: userData }, 'Perfil obtenido exitosamente');

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

// Verificar token (útil para el frontend)
const verifyToken = async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (pasó por authenticateToken middleware)
    return responseHandler.success(res, { 
      valid: true, 
      user: req.user 
    }, 'Token válido');
  } catch (error) {
    console.error('Error verificando token:', error);
    return responseHandler.error(res, 'Error interno del servidor', 'INTERNAL_ERROR', 500);
  }
};

module.exports = {
  login,
  register,
  getProfile,
  verifyToken
};
