const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');
const bcrypt = require('bcrypt');

/**
 * PostgreSQL Implementation: User Repository
 * Implements user data persistence using PostgreSQL
 */
class PostgreSQLUserRepository extends IUserRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @returns {Promise<User|null>}
   */
  async findById(userId) {
    try {
      const query = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.user_id = $1
      `;
      
      const result = await this.db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findById:', error);
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    try {
      const query = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.email = $1
      `;
      
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findByEmail:', error);
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find users by company ID
   * @param {number} companyId - Company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<User[]>}
   */
  async findByCompanyId(companyId, filters = {}) {
    try {
      let query = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.company_id = $1
      `;
      
      const params = [companyId];
      let paramCount = 1;

      if (filters.role) {
        paramCount++;
        query += ` AND u.role = $${paramCount}`;
        params.push(filters.role);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND u.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      if (filters.isAdmin !== undefined) {
        paramCount++;
        query += ` AND u.is_admin = $${paramCount}`;
        params.push(filters.isAdmin);
      }

      query += ` ORDER BY u.first_name ASC, u.last_name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findByCompanyId:', error);
      throw new Error(`Failed to find users by company ID: ${error.message}`);
    }
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @param {Object} filters - Additional filters
   * @returns {Promise<User[]>}
   */
  async findByRole(role, filters = {}) {
    try {
      let query = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.role = $1
      `;
      
      const params = [role];
      let paramCount = 1;

      if (filters.companyId) {
        paramCount++;
        query += ` AND u.company_id = $${paramCount}`;
        params.push(filters.companyId);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND u.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      query += ` ORDER BY u.first_name ASC, u.last_name ASC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findByRole:', error);
      throw new Error(`Failed to find users by role: ${error.message}`);
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<User>}
   */
  async create(userData) {
    try {
      // Hash password if provided
      let hashedPassword = null;
      if (userData.password) {
        hashedPassword = await bcrypt.hash(userData.password, 10);
      }

      const query = `
        INSERT INTO users (
          company_id, first_name, last_name, email, password, 
          phone, role, is_active, is_admin, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING user_id
      `;
      
      const now = new Date();
      const params = [
        userData.companyId,
        userData.firstName,
        userData.lastName,
        userData.email,
        hashedPassword,
        userData.phone,
        userData.role,
        userData.isActive !== undefined ? userData.isActive : true,
        userData.isAdmin !== undefined ? userData.isAdmin : false,
        userData.createdAt || now,
        now
      ];

      const result = await this.db.query(query, params);
      
  // Get the created user with company info
  return await this.findById(result.rows[0].user_id);
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.create:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<User>}
   */
  async update(userId, updateData) {
    try {
      const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'is_active', 'is_admin'];
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      // Build dynamic update query
      allowedFields.forEach(field => {
        const camelField = this.snakeToCamel(field);
        if (updateData[camelField] !== undefined) {
          paramCount++;
          updateFields.push(`${field} = $${paramCount}`);
          params.push(updateData[camelField]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      // Add user ID parameter
      paramCount++;
      params.push(userId);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING user_id
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

  return await this.findById(result.rows[0].user_id);
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.update:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Update user password
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>}
   */
  async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const query = `
        UPDATE users 
        SET password = $1, updated_at = $2
        WHERE user_id = $3
        RETURNING user_id
      `;

      const result = await this.db.query(query, [hashedPassword, new Date(), userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.updatePassword:', error);
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Verify user password
   * @param {number} userId - User ID
   * @param {string} password - Password to verify
   * @returns {Promise<boolean>}
   */
  async verifyPassword(userId, password) {
    try {
      const query = `
        SELECT password FROM users 
        WHERE user_id = $1
      `;
      
      const result = await this.db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return false;
      }

      const hashedPassword = result.rows[0].password;
      if (!hashedPassword) {
        return false;
      }

      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.verifyPassword:', error);
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  /**
   * Update last login timestamp
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async updateLastLogin(userId) {
    try {
      const query = `
        UPDATE users 
        SET last_login = $1, updated_at = $2
        WHERE user_id = $3
        RETURNING user_id
      `;

      const result = await this.db.query(query, [new Date(), new Date(), userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.updateLastLogin:', error);
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  /**
   * Delete user (soft delete)
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async delete(userId) {
    try {
      const query = `
        UPDATE users 
        SET deleted_at = $1, is_active = false
        WHERE user_id = $2
        RETURNING user_id
      `;

      const result = await this.db.query(query, [new Date(), userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.delete:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Find active users
   * @param {Object} filters - Additional filters
   * @returns {Promise<User[]>}
   */
  async findActive(filters = {}) {
    try {
      let query = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.is_active = true
      `;
      
      const params = [];
      let paramCount = 0;

      if (filters.role) {
        paramCount++;
        query += ` AND u.role = $${paramCount}`;
        params.push(filters.role);
      }

      if (filters.companyId) {
        paramCount++;
        query += ` AND u.company_id = $${paramCount}`;
        params.push(filters.companyId);
      }

      query += ` ORDER BY u.first_name ASC, u.last_name ASC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findActive:', error);
      throw new Error(`Failed to find active users: ${error.message}`);
    }
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<User[]>}
   */
  async search(query, filters = {}) {
    try {
      let sqlQuery = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        
        AND (
          u.first_name ILIKE $1 OR 
          u.last_name ILIKE $1 OR 
          u.email ILIKE $1 OR
          CONCAT(u.first_name, ' ', u.last_name) ILIKE $1
        )
      `;
      
      const params = [`%${query}%`];
      let paramCount = 1;

      if (filters.role) {
        paramCount++;
        sqlQuery += ` AND u.role = $${paramCount}`;
        params.push(filters.role);
      }

      if (filters.companyId) {
        paramCount++;
        sqlQuery += ` AND u.company_id = $${paramCount}`;
        params.push(filters.companyId);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        sqlQuery += ` AND u.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      sqlQuery += ` ORDER BY u.first_name ASC, u.last_name ASC`;

      if (filters.limit) {
        paramCount++;
        sqlQuery += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(sqlQuery, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.search:', error);
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {number} excludeUserId - User ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async emailExists(email, excludeUserId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE email = $1
      `;
      
      const params = [email];

      if (excludeUserId) {
        query += ` AND id != $2`;
        params.push(excludeUserId);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.emailExists:', error);
      throw new Error(`Failed to check email existence: ${error.message}`);
    }
  }

  /**
   * Get user activity summary
   * @param {number} userId - User ID
   * @returns {Promise<Object>}
   */
  async getActivitySummary(userId) {
    try {
      const query = `
        SELECT 
          u.last_login,
          u.created_at,
          (SELECT COUNT(*) FROM service_requests WHERE requested_by_id = $1) as service_requests_created,
          (SELECT COUNT(*) FROM service_requests WHERE assigned_to_id = $1) as service_requests_assigned
        FROM users u
        WHERE u.user_id = \$1
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.getActivitySummary:', error);
      throw new Error(`Failed to get activity summary: ${error.message}`);
    }
  }

  /**
   * Get users count by role
   * @param {string} role - User role
   * @param {number} companyId - Company ID (optional)
   * @returns {Promise<number>}
   */
  async getCountByRole(role, companyId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE role = $1
      `;
      
      const params = [role];

      if (companyId) {
        query += ` AND company_id = $2`;
        params.push(companyId);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.getCountByRole:', error);
      throw new Error(`Failed to get count by role: ${error.message}`);
    }
  }

  /**
   * Get recently created users
   * @param {number} limit - Number of users to return
   * @param {number} companyId - Company ID (optional)
   * @returns {Promise<User[]>}
   */
  async getRecentlyCreated(limit = 10, companyId = null) {
    try {
      let query = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        
      `;
      
      const params = [];
      let paramCount = 0;

      if (companyId) {
        paramCount++;
        query += ` AND u.company_id = $${paramCount}`;
        params.push(companyId);
      }

      paramCount++;
      query += ` ORDER BY u.created_at DESC LIMIT $${paramCount}`;
      params.push(limit);

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.getRecentlyCreated:', error);
      throw new Error(`Failed to get recently created users: ${error.message}`);
    }
  }

  /**
   * Get users with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Users with pagination info
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        companyId,
        isActive,
        search,
        sortBy = 'first_name',
        sortOrder = 'ASC'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      const params = [];
      let paramCount = 0;

      if (role) {
        paramCount++;
        whereConditions.push(`u.role = $${paramCount}`);
        params.push(role);
      }

      if (companyId) {
        paramCount++;
        whereConditions.push(`u.company_id = $${paramCount}`);
        params.push(companyId);
      }

      if (isActive !== undefined) {
        paramCount++;
        whereConditions.push(`u.is_active = $${paramCount}`);
        params.push(isActive);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM users u 
        WHERE ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get users
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      
      const dataQuery = `
        SELECT u.*, c.name as company_name, c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE ${whereClause}
        ORDER BY u.${this.camelToSnake(sortBy)} ${sortOrder}
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;
      
      params.push(limit, offset);
      const dataResult = await this.db.query(dataQuery, params);

      return {
        data: dataResult.rows.map(row => this.mapRowToEntity(row)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findWithPagination:', error);
      throw new Error(`Failed to get users with pagination: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Convert camelCase to snake_case
   * @param {string} str - String in camelCase
   * @returns {string} String in snake_case
   */
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert snake_case to camelCase
   * @param {string} str - String in snake_case
   * @returns {string} String in camelCase
   */
  snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Map database row to User entity
   * @param {Object} row - Database row
   * @returns {User} User entity
   */
  mapRowToEntity(row) {
    return new User({
      id: row.user_id,
      companyId: row.company_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      password: row.password, // This will be excluded in toJSON()
      phone: row.phone,
      role: row.role,
      isActive: row.is_active,
      isAdmin: row.is_admin,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLUserRepository;

