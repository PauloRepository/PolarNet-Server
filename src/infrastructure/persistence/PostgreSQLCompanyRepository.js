const ICompanyRepository = require('../../domain/repositories/ICompanyRepository');
const Company = require('../../domain/entities/Company');

/**
 * PostgreSQL Implementation: Company Repository
 * Implements company data persistence using PostgreSQL
 */
class PostgreSQLCompanyRepository extends ICompanyRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find company by ID
   * @param {number} id - Company ID
   * @returns {Promise<Company|null>}
   */
  async findById(id) {
    try {
      const query = `
        SELECT * FROM companies 
        WHERE company_id = $1
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.findById:', error);
      throw new Error(`Failed to find company by ID: ${error.message}`);
    }
  }

  /**
   * Find company by email
   * @param {string} email - Company email
   * @returns {Promise<Company|null>}
   */
  async findByEmail(email) {
    try {
      const query = `
        SELECT * FROM companies 
        WHERE email = $1
      `;
      
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.findByEmail:', error);
      throw new Error(`Failed to find company by email: ${error.message}`);
    }
  }

  /**
   * Find companies by type
   * @param {string} type - Company type ('CLIENT' or 'PROVIDER')
   * @param {Object} filters - Additional filters
   * @returns {Promise<Company[]>}
   */
  async findByType(type, filters = {}) {
    try {
      let query = `
        SELECT * FROM companies 
        WHERE type = $1
      `;
      
      const params = [type];
      let paramCount = 1;

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      if (filters.search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR contact_person ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      query += ` ORDER BY name ASC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.findByType:', error);
      throw new Error(`Failed to find companies by type: ${error.message}`);
    }
  }

  /**
   * Get all active companies
   * @param {Object} filters - Filtering options
   * @returns {Promise<Company[]>}
   */
  async findActive(filters = {}) {
    try {
      let query = `
        SELECT * FROM companies 
        WHERE is_active = true
      `;
      
      const params = [];
      let paramCount = 0;

      if (filters.type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR contact_person ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      query += ` ORDER BY registration_date DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.findActive:', error);
      throw new Error(`Failed to find active companies: ${error.message}`);
    }
  }

  /**
   * Create new company
   * @param {Object} companyData - Company data
   * @returns {Promise<Company>}
   */
  async create(companyData) {
    try {
      const query = `
        INSERT INTO companies (
          name, type, address, phone, email, contact_person, 
          tax_id, is_active, registration_date, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING company_id
      `;
      
      const now = new Date();
      const params = [
        companyData.name,
        companyData.type,
        companyData.address,
        companyData.phone,
        companyData.email,
        companyData.contactPerson,
        companyData.taxId,
        companyData.isActive !== undefined ? companyData.isActive : true,
        companyData.registrationDate || now,
        now
      ];

  const result = await this.db.query(query, params);
  return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.create:', error);
      throw new Error(`Failed to create company: ${error.message}`);
    }
  }

  /**
   * Update company
   * @param {number} id - Company ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Company>}
   */
  async update(id, updateData) {
    try {
      const allowedFields = ['name', 'address', 'phone', 'email', 'contact_person', 'tax_id', 'is_active'];
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      // Build dynamic update query
      allowedFields.forEach(field => {
        const dbField = this.camelToSnake(field);
        if (updateData[field] !== undefined) {
          paramCount++;
          updateFields.push(`${dbField} = $${paramCount}`);
          params.push(updateData[field]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      // Add ID parameter
      paramCount++;
      params.push(id);

      const query = `
        UPDATE companies 
        SET ${updateFields.join(', ')}
        WHERE company_id = $${paramCount}
        RETURNING company_id
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Company not found');
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.update:', error);
      throw new Error(`Failed to update company: ${error.message}`);
    }
  }

  /**
   * Delete company (soft delete)
   * @param {number} id - Company ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const query = `
        UPDATE companies 
        SET deleted_at = $1, is_active = false
        WHERE company_id = $2
        RETURNING company_id
      `;

      const result = await this.db.query(query, [new Date(), id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.delete:', error);
      throw new Error(`Failed to delete company: ${error.message}`);
    }
  }

  /**
   * Get company statistics
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getStatistics(companyId) {
    try {
      const company = await this.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      if (company.isClient()) {
        return await this.getClientStatistics(companyId);
      } else {
        return await this.getProviderStatistics(companyId);
      }
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getStatistics:', error);
      throw new Error(`Failed to get company statistics: ${error.message}`);
    }
  }

  /**
   * Search companies
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Company[]>}
   */
  async search(query, filters = {}) {
    try {
      let sqlQuery = `
        SELECT * FROM companies 
        
        AND (
          name ILIKE $1 OR 
          contact_person ILIKE $1 OR 
          email ILIKE $1
        )
      `;
      
      const params = [`%${query}%`];
      let paramCount = 1;

      if (filters.type) {
        paramCount++;
        sqlQuery += ` AND type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        sqlQuery += ` AND is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      sqlQuery += ` ORDER BY name ASC`;

      if (filters.limit) {
        paramCount++;
        sqlQuery += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(sqlQuery, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.search:', error);
      throw new Error(`Failed to search companies: ${error.message}`);
    }
  }

  /**
   * Get companies count by type
   * @param {string} type - Company type
   * @returns {Promise<number>}
   */
  async getCountByType(type) {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM companies 
        WHERE type = $1
      `;
      
      const result = await this.db.query(query, [type]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getCountByType:', error);
      throw new Error(`Failed to get count by type: ${error.message}`);
    }
  }

  /**
   * Get recently registered companies
   * @param {number} limit - Number of companies to return
   * @returns {Promise<Company[]>}
   */
  async getRecentlyRegistered(limit = 10) {
    try {
      const query = `
        SELECT * FROM companies 
        
        ORDER BY registration_date DESC
        LIMIT $1
      `;
      
      const result = await this.db.query(query, [limit]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getRecentlyRegistered:', error);
      throw new Error(`Failed to get recently registered companies: ${error.message}`);
    }
  }

  /**
   * Check if company email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - Company ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async emailExists(email, excludeId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM companies 
        WHERE email = $1
      `;
      
      const params = [email];

      if (excludeId) {
        query += ` AND id != $2`;
        params.push(excludeId);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.emailExists:', error);
      throw new Error(`Failed to check email existence: ${error.message}`);
    }
  }

  /**
   * Get companies with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Companies with pagination info
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        isActive,
        search,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      const params = [];
      let paramCount = 0;

      if (type) {
        paramCount++;
        whereConditions.push(`type = $${paramCount}`);
        params.push(type);
      }

      if (isActive !== undefined) {
        paramCount++;
        whereConditions.push(`is_active = $${paramCount}`);
        params.push(isActive);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(name ILIKE $${paramCount} OR contact_person ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM companies WHERE ${whereClause}`;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get companies
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      
      const dataQuery = `
        SELECT * FROM companies 
        WHERE ${whereClause}
        ORDER BY ${this.camelToSnake(sortBy)} ${sortOrder}
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
      console.error('Error in PostgreSQLCompanyRepository.findWithPagination:', error);
      throw new Error(`Failed to get companies with pagination: ${error.message}`);
    }
  }

  /**
   * Get company revenue summary (for providers)
   * @param {number} companyId - Provider company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>}
   */
  async getRevenueSummary(companyId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let query = `
        SELECT 
          COUNT(ar.rental_id) as total_contracts,
          SUM(ar.monthly_rate) as monthly_revenue,
          COUNT(DISTINCT ar.client_company_id) as unique_clients,
          AVG(ar.monthly_rate) as avg_contract_value
        FROM active_rentals ar
        WHERE ar.provider_company_id = $1
      `;
      
      const params = [companyId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND ar.start_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND ar.start_date <= $${paramCount}`;
        params.push(endDate);
      }

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getRevenueSummary:', error);
      throw new Error(`Failed to get revenue summary: ${error.message}`);
    }
  }

  /**
   * Get company rental summary (for clients)
   * @param {number} companyId - Client company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>}
   */
  async getRentalSummary(companyId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let query = `
        SELECT 
          COUNT(ar.rental_id) as total_rentals,
          SUM(ar.monthly_rate) as total_monthly_cost,
          COUNT(DISTINCT ar.provider_company_id) as unique_providers,
          AVG(ar.monthly_rate) as avg_rental_cost
        FROM active_rentals ar
        WHERE ar.client_company_id = $1
      `;
      
      const params = [companyId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND ar.start_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND ar.start_date <= $${paramCount}`;
        params.push(endDate);
      }

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getRentalSummary:', error);
      throw new Error(`Failed to get rental summary: ${error.message}`);
    }
  }

  /**
   * Get company activity summary
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getActivitySummary(companyId) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE company_id = $1) as user_count,
          (SELECT COUNT(*) FROM service_requests WHERE client_company_id = $1 OR provider_company_id = $1) as service_requests,
          (SELECT MAX(updated_at) FROM companies WHERE company_id = $1) as last_activity
      `;
      
      const result = await this.db.query(query, [companyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getActivitySummary:', error);
      throw new Error(`Failed to get activity summary: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Get client-specific statistics
   * @param {number} companyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientStatistics(companyId) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM active_rentals WHERE client_company_id = $1) as active_rentals,
        (SELECT COUNT(*) FROM service_requests WHERE client_company_id = $1) as service_requests,
        (SELECT COUNT(*) FROM invoices WHERE client_company_id = $1 AND status = 'PENDING') as pending_invoices,
        (SELECT SUM(monthly_rate) FROM active_rentals WHERE client_company_id = $1) as monthly_costs
    `;
    
    const result = await this.db.query(query, [companyId]);
    return result.rows[0];
  }

  /**
   * Get provider-specific statistics
   * @param {number} companyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(companyId) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM equipments WHERE owner_company_id = $1) as total_equipment,
        (SELECT COUNT(*) FROM equipments WHERE owner_company_id = $1 AND status = 'RENTED') as rented_equipment,
        (SELECT COUNT(*) FROM active_rentals WHERE provider_company_id = $1) as active_contracts,
        (SELECT SUM(monthly_rate) FROM active_rentals WHERE provider_company_id = $1) as monthly_revenue
    `;
    
    const result = await this.db.query(query, [companyId]);
    return result.rows[0];
  }

  /**
   * Count active clients by provider
   * @param {number} providerId - Provider company ID
   * @returns {Promise<number>}
   */
  async countActiveByProvider(providerId) {
    try {
      const query = `
        SELECT COUNT(DISTINCT ar.client_company_id) as count
        FROM active_rentals ar
        WHERE ar.provider_company_id = $1 AND ar.status = 'ACTIVE'
      `;
      
      const result = await this.db.query(query, [providerId]);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.countActiveByProvider:', error);
      return 0;
    }
  }

  /**
   * Get client analytics
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Analytics filters
   * @returns {Promise<Object>}
   */
  async getAnalytics(providerId, filters = {}) {
    try {
      const { period = '12months', sortBy = 'revenue' } = filters;
      
      let intervalClause = '12 months';
      if (period === '30days') {
        intervalClause = '30 days';
      } else if (period === '6months') {
        intervalClause = '6 months';
      }

      const query = `
        SELECT 
          c.company_id,
          c.name,
          c.type,
          COUNT(DISTINCT ar.rental_id) as rental_count,
          COALESCE(SUM(ar.monthly_rate), 0) as total_revenue,
          COALESCE(AVG(ar.monthly_rate), 0) as avg_revenue,
          COUNT(DISTINCT sr.service_request_id) as service_requests,
          MIN(ar.start_date) as first_rental_date,
          MAX(ar.start_date) as last_rental_date
        FROM companies c
        LEFT JOIN active_rentals ar ON c.company_id = ar.client_company_id 
          AND ar.provider_company_id = $1
          AND ar.start_date >= CURRENT_DATE - INTERVAL '${intervalClause}'
        LEFT JOIN service_requests sr ON c.company_id = sr.client_company_id 
          AND sr.provider_company_id = $1
        WHERE c.type = 'CLIENT' AND c.is_active = true
        GROUP BY c.company_id, c.name, c.type
        HAVING COUNT(DISTINCT ar.rental_id) > 0
        ORDER BY ${sortBy === 'revenue' ? 'total_revenue' : 'rental_count'} DESC
        LIMIT 50
      `;

      const result = await this.db.query(query, [providerId]);
      
      // Calculate summary metrics
      const totalClients = result.rows.length;
      const activeClients = result.rows.filter(row => row.rental_count > 0).length;
      const newClients = result.rows.filter(row => {
        const firstRental = new Date(row.first_rental_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return firstRental >= thirtyDaysAgo;
      }).length;
      const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0);
      const avgRevenuePerClient = totalRevenue / Math.max(activeClients, 1);

      return {
        clients: result.rows,
        totalClients,
        activeClients,
        newClients,
        avgRevenuePerClient: Math.round(avgRevenuePerClient * 100) / 100
      };
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getAnalytics:', error);
      return {
        clients: [],
        totalClients: 0,
        activeClients: 0,
        newClients: 0,
        avgRevenuePerClient: 0
      };
    }
  }

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
   * Map database row to Company entity
   * @param {Object} row - Database row
   * @returns {Company} Company entity
   */
  mapRowToEntity(row) {
    return new Company({
      id: row.company_id,
      name: row.name,
      type: row.type,
      address: row.address,
      phone: row.phone,
      email: row.email,
      contactPerson: row.contact_person,
      taxId: row.tax_id,
      isActive: row.is_active,
      registrationDate: row.registration_date,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLCompanyRepository;

