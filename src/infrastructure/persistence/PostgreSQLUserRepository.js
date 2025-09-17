/**
 * PostgreSQL User Repository Implementation
 */
const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');

class PostgreSQLUserRepository extends IUserRepository {
  constructor(database) {
    super();
    this.db = database;
  }

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

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  async findByEmail(email) {
    try {
      const query = `
        SELECT 
          u.*,
          c.name as company_name,
          c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE LOWER(u.email) = LOWER($1)
      `;
      
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  async findByCompany(companyId, filters = {}) {
    try {
      let query = `
        SELECT 
          u.*,
          c.name as company_name,
          c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.company_id = $1
      `;
      
      const params = [companyId];
      let paramIndex = 2;

      // Aplicar filtros
      if (filters.role) {
        if (Array.isArray(filters.role)) {
          query += ` AND u.role = ANY($${paramIndex})`;
          params.push(filters.role);
        } else {
          query += ` AND u.role = $${paramIndex}`;
          params.push(filters.role);
        }
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND u.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.department) {
        query += ` AND u.department = $${paramIndex}`;
        params.push(filters.department);
        paramIndex++;
      }

      if (filters.position) {
        query += ` AND u.position ILIKE $${paramIndex}`;
        params.push(`%${filters.position}%`);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY u.name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding users by company: ${error.message}`);
    }
  }

  async findTechnicians(providerCompanyId, filters = {}) {
    try {
      let query = `
        SELECT 
          u.*,
          c.name as company_name,
          (
            SELECT COUNT(*) 
            FROM maintenances m 
            WHERE m.technician_id = u.user_id 
              AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
          ) as active_maintenances,
          (
            SELECT AVG(quality_rating) 
            FROM maintenances m 
            WHERE m.technician_id = u.user_id 
              AND quality_rating IS NOT NULL
          ) as avg_rating
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.company_id = $1 
          AND u.role = 'technician'
          AND u.status = 'active'
      `;
      
      const params = [providerCompanyId];
      let paramIndex = 2;

      if (filters.specialties) {
        query += ` AND u.specialties && $${paramIndex}`;
        params.push(filters.specialties);
        paramIndex++;
      }

      if (filters.availability) {
        if (filters.availability === 'available') {
          query += ` AND (
            SELECT COUNT(*) 
            FROM maintenances m 
            WHERE m.technician_id = u.user_id 
              AND m.status = 'IN_PROGRESS'
          ) = 0`;
        }
      }

      query += ` ORDER BY u.name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => {
        const user = this.mapToEntity(row);
        user.activeMaintenances = parseInt(row.active_maintenances) || 0;
        user.avgRating = parseFloat(row.avg_rating) || 0;
        return user;
      });
    } catch (error) {
      throw new Error(`Error finding technicians: ${error.message}`);
    }
  }

  async findActiveAdmins() {
    try {
      const query = `
        SELECT 
          u.*,
          c.name as company_name,
          c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.role = 'admin' AND u.status = 'active'
        ORDER BY u.name ASC
      `;
      
      const result = await this.db.query(query);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding active admins: ${error.message}`);
    }
  }

  async findUsersByRole(role, filters = {}) {
    try {
      let query = `
        SELECT 
          u.*,
          c.name as company_name,
          c.type as company_type
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.role = $1
      `;
      
      const params = [role];
      let paramIndex = 2;

      if (filters.status) {
        query += ` AND u.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.companyType) {
        query += ` AND c.type = $${paramIndex}`;
        params.push(filters.companyType);
        paramIndex++;
      }

      query += ` ORDER BY u.name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding users by role: ${error.message}`);
    }
  }

  async getActivityStats(userId, period) {
    try {
      const { startDate, endDate } = period;
      
      // Stats para técnicos
      if (await this.isRole(userId, 'technician')) {
        const maintenanceStatsQuery = `
          SELECT 
            COUNT(*) as total_maintenances,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_maintenances,
            COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_maintenances,
            AVG(quality_rating) as avg_rating,
            SUM(actual_cost) as total_revenue,
            AVG(
              CASE 
                WHEN actual_end_time IS NOT NULL AND actual_start_time IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 3600 
                ELSE NULL 
              END
            ) as avg_duration_hours
          FROM maintenances
          WHERE technician_id = $1 
            AND scheduled_date >= $2 
            AND scheduled_date <= $3
        `;

        const result = await this.db.query(maintenanceStatsQuery, [userId, startDate, endDate]);
        const stats = result.rows[0];

        return {
          totalMaintenances: parseInt(stats.total_maintenances) || 0,
          completedMaintenances: parseInt(stats.completed_maintenances) || 0,
          inProgressMaintenances: parseInt(stats.in_progress_maintenances) || 0,
          completionRate: stats.total_maintenances > 0 ? 
            (stats.completed_maintenances / stats.total_maintenances) * 100 : 0,
          avgRating: parseFloat(stats.avg_rating) || 0,
          totalRevenue: parseFloat(stats.total_revenue) || 0,
          avgDurationHours: parseFloat(stats.avg_duration_hours) || 0
        };
      }

      // Stats para clientes
      if (await this.isRole(userId, 'client')) {
        const user = await this.findById(userId);
        const serviceRequestStatsQuery = `
          SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_requests,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_requests,
            AVG(satisfaction_rating) as avg_satisfaction,
            SUM(estimated_cost) as total_cost
          FROM service_requests
          WHERE client_company_id = $1 
            AND created_at >= $2 
            AND created_at <= $3
        `;

        const result = await this.db.query(serviceRequestStatsQuery, [user.companyId, startDate, endDate]);
        const stats = result.rows[0];

        return {
          totalRequests: parseInt(stats.total_requests) || 0,
          completedRequests: parseInt(stats.completed_requests) || 0,
          pendingRequests: parseInt(stats.pending_requests) || 0,
          avgSatisfaction: parseFloat(stats.avg_satisfaction) || 0,
          totalCost: parseFloat(stats.total_cost) || 0
        };
      }

      return {};
    } catch (error) {
      throw new Error(`Error getting user activity stats: ${error.message}`);
    }
  }

  async isRole(userId, role) {
    try {
      const query = 'SELECT role FROM users WHERE user_id = $1';
      const result = await this.db.query(query, [userId]);
      return result.rows.length > 0 && result.rows[0].role === role;
    } catch (error) {
      throw new Error(`Error checking user role: ${error.message}`);
    }
  }

  async existsByEmail(email, excludeUserId = null) {
    try {
      let query = 'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)';
      const params = [email];
      
      if (excludeUserId) {
        query += ' AND user_id != $2';
        params.push(excludeUserId);
      }
      
      const result = await this.db.query(query, params);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error checking if email exists: ${error.message}`);
    }
  }

  async save(user) {
    try {
      if (user.userId) {
        return await this.update(user);
      } else {
        return await this.create(user);
      }
    } catch (error) {
      throw new Error(`Error saving user: ${error.message}`);
    }
  }

  async create(user) {
    const query = `
      INSERT INTO users (
        name, email, password_hash, role, phone, position, 
        department, company_id, profile_image, specialties, 
        certifications, skills, experience_years, status, 
        notification_preferences, timezone, language, 
        two_factor_enabled, last_activity_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const params = [
      user.name,
      user.email,
      user.passwordHash,
      user.role,
      user.phone,
      user.position,
      user.department,
      user.companyId,
      user.profileImage,
      user.specialties,
      user.certifications ? JSON.stringify(user.certifications) : null,
      user.skills,
      user.experienceYears,
      user.status || 'active',
      user.notificationPreferences ? JSON.stringify(user.notificationPreferences) : null,
      user.timezone,
      user.language,
      user.twoFactorEnabled || false,
      user.lastActivityAt
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async update(user) {
    const query = `
      UPDATE users SET
        name = $2, email = $3, phone = $4, position = $5,
        department = $6, profile_image = $7, specialties = $8,
        certifications = $9, skills = $10, experience_years = $11,
        status = $12, notification_preferences = $13, timezone = $14,
        language = $15, two_factor_enabled = $16, last_activity_at = $17,
        updated_at = $18
      WHERE user_id = $1
      RETURNING *
    `;

    const params = [
      user.userId,
      user.name,
      user.email,
      user.phone,
      user.position,
      user.department,
      user.profileImage,
      user.specialties,
      user.certifications ? JSON.stringify(user.certifications) : null,
      user.skills,
      user.experienceYears,
      user.status,
      user.notificationPreferences ? JSON.stringify(user.notificationPreferences) : null,
      user.timezone,
      user.language,
      user.twoFactorEnabled,
      user.lastActivityAt,
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async updatePassword(userId, newPasswordHash) {
    try {
      const query = `
        UPDATE users SET 
          password_hash = $2, 
          updated_at = $3
        WHERE user_id = $1
        RETURNING user_id
      `;

      const result = await this.db.query(query, [userId, newPasswordHash, new Date()]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error updating password: ${error.message}`);
    }
  }

  async updateLastActivity(userId) {
    try {
      const query = `
        UPDATE users SET 
          last_activity_at = $2
        WHERE user_id = $1
      `;

      await this.db.query(query, [userId, new Date()]);
    } catch (error) {
      throw new Error(`Error updating last activity: ${error.message}`);
    }
  }

  async deactivate(userId) {
    try {
      const query = `
        UPDATE users SET 
          status = 'inactive',
          updated_at = $2
        WHERE user_id = $1
        RETURNING *
      `;

      const result = await this.db.query(query, [userId, new Date()]);
      return result.rows.length > 0 ? this.mapToEntity(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deactivating user: ${error.message}`);
    }
  }

  async count(criteria = {}) {
    try {
      let query = 'SELECT COUNT(*) FROM users u';
      const params = [];
      const conditions = [];
      let paramIndex = 1;

      if (criteria.companyId) {
        conditions.push(`u.company_id = $${paramIndex}`);
        params.push(criteria.companyId);
        paramIndex++;
      }

      if (criteria.role) {
        if (Array.isArray(criteria.role)) {
          conditions.push(`u.role = ANY($${paramIndex})`);
          params.push(criteria.role);
        } else {
          conditions.push(`u.role = $${paramIndex}`);
          params.push(criteria.role);
        }
        paramIndex++;
      }

      if (criteria.status) {
        conditions.push(`u.status = $${paramIndex}`);
        params.push(criteria.status);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting users: ${error.message}`);
    }
  }

  mapToEntity(row) {
    return new User({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      phone: row.phone,
      position: row.position,
      department: row.department,
      companyId: row.company_id,
      profileImage: row.profile_image,
      specialties: row.specialties,
      certifications: row.certifications ? JSON.parse(row.certifications) : null,
      skills: row.skills,
      experienceYears: row.experience_years,
      status: row.status,
      notificationPreferences: row.notification_preferences ? 
        JSON.parse(row.notification_preferences) : null,
      timezone: row.timezone,
      language: row.language,
      twoFactorEnabled: row.two_factor_enabled,
      lastActivityAt: row.last_activity_at,
      emailVerifiedAt: row.email_verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLUserRepository;
