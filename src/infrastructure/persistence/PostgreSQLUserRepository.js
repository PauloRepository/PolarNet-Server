const IUserRepository = require('../../domain/repositories/IUserRepository');

/**
 * PostgreSQL Implementation: User Repository (Simplified)
 * Handles user data persistence using PostgreSQL
 */
class PostgreSQLUserRepository extends IUserRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    try {
      const query = `
        SELECT 
          u.*,
          c.name as company_name,
          c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.email = $1
      `;
      
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findByEmail:', error);
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async findById(userId) {
    try {
      const query = `
        SELECT 
          u.*,
          c.name as company_name,
          c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.user_id = $1
      `;
      
      const result = await this.db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findById:', error);
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Find users by company ID
   * @param {number} companyId - Company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByCompany(companyId, filters = {}) {
    try {
      const { page = 1, limit = 20, role = '', active = null } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE u.company_id = $1';
      let queryParams = [companyId];
      let paramCount = 1;

      if (role) {
        whereClause += ` AND u.role = $${++paramCount}`;
        queryParams.push(role);
      }

      if (active !== null) {
        whereClause += ` AND u.active = $${++paramCount}`;
        queryParams.push(active);
      }

      const query = `
        SELECT 
          u.*,
          c.name as company_name,
          COUNT(*) OVER() as total_count
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.findByCompany:', error);
      throw new Error(`Failed to find users by company: ${error.message}`);
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>}
   */
  async create(userData) {
    try {
      const query = `
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, company_id,
          phone, active, email_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING user_id, email, first_name, last_name, role, company_id, 
                  phone, active, email_verified, created_at, updated_at
      `;
      
      const values = [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.role,
        userData.companyId,
        userData.phone || null,
        userData.active !== undefined ? userData.active : true,
        userData.emailVerified !== undefined ? userData.emailVerified : false
      ];
      
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.create:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async update(userId, updateData) {
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE users 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id, email, first_name, last_name, role, company_id, 
                  phone, active, email_verified, created_at, updated_at
      `;
      
      const values = [userId, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.update:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async delete(userId) {
    try {
      const query = `
        DELETE FROM users 
        WHERE user_id = $1
        RETURNING user_id
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.delete:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Update password
   * @param {number} userId - User ID
   * @param {string} passwordHash - New password hash
   * @returns {Promise<boolean>}
   */
  async updatePassword(userId, passwordHash) {
    try {
      const query = `
        UPDATE users 
        SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id
      `;
      
      const result = await this.db.query(query, [userId, passwordHash]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.updatePassword:', error);
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Verify email
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async verifyEmail(userId) {
    try {
      const query = `
        UPDATE users 
        SET email_verified = true, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.verifyEmail:', error);
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }

  /**
   * Get company statistics (for dashboard)
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getCompanyStatistics(companyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'TECHNICIAN' THEN 1 END) as technician_users,
          COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users
        FROM users 
        WHERE company_id = $1
      `;
      
      const result = await this.db.query(query, [companyId]);
      
      return {
        totalUsers: parseInt(result.rows[0].total_users) || 0,
        activeUsers: parseInt(result.rows[0].active_users) || 0,
        adminUsers: parseInt(result.rows[0].admin_users) || 0,
        technicianUsers: parseInt(result.rows[0].technician_users) || 0,
        verifiedUsers: parseInt(result.rows[0].verified_users) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLUserRepository.getCompanyStatistics:', error);
      throw new Error(`Failed to get user statistics: ${error.message}`);
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
}

module.exports = PostgreSQLUserRepository;
