/**
 * Auth Domain Service - DDD
 * Contiene la lógica de negocio para autenticación
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthDomainService {
  constructor() {
    this.saltRounds = 12;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Genera un hash seguro para la contraseña
   */
  async hashPassword(password) {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verifica que la contraseña coincida con el hash
   */
  async verifyPassword(password, hashedPassword) {
    if (!password || !hashedPassword) {
      return false;
    }
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Genera un token JWT
   */
  generateToken(payload) {
    if (!payload.userId || !payload.role) {
      throw new Error('User ID and role are required for token generation');
    }

    const tokenPayload = {
      userId: payload.userId,
      role: payload.role,
      companyId: payload.companyId || null,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });
  }

  /**
   * Verifica y decodifica un token JWT
   */
  verifyToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Valida las credenciales de login
   */
  validateLoginCredentials(username, password) {
    const errors = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    }

    if (!password || password.length === 0) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return {
      username: username.trim().toLowerCase(),
      password: password
    };
  }

  /**
   * Valida los datos de registro
   */
  validateRegistrationData(userData) {
    const errors = [];
    const { name, username, email, password, role, companyId } = userData;

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    }

    if (!email || !this.isValidEmail(email)) {
      errors.push('Valid email is required');
    }

    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!role || !['ADMIN', 'PROVIDER', 'CLIENT'].includes(role)) {
      errors.push('Valid role is required (ADMIN, PROVIDER, CLIENT)');
    }

    if ((role === 'PROVIDER' || role === 'CLIENT') && !companyId) {
      errors.push('Company ID is required for PROVIDER and CLIENT roles');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: password,
      role: role,
      companyId: companyId || null
    };
  }

  /**
   * Valida formato de email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = AuthDomainService;
