const ICompanyRepository = require('../../domain/repositories/ICompanyRepository');
const Company = require('../../domain/entities/Company');

/**
 * PostgreSQL Implementation: Company Repository (Simplified)
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
        WHERE company_id = $1 AND deleted_at IS NULL
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
   * Find companies by type (for clients listing)
   * @param {string} type - Company type ('CLIENT' or 'PROVIDER')
   * @param {Object} filters - Additional filters
   * @returns {Promise<Company[]>}
   */
  async findByType(type, filters = {}) {
    try {
      const { page = 1, limit = 20, search = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE type = $1 AND deleted_at IS NULL';
      let queryParams = [type];
      let paramCount = 1;

      if (search) {
        whereClause += ` AND (name ILIKE $${++paramCount} OR email ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      const query = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM companies 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        companies: result.rows.map(row => this.mapRowToEntity(row)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.findByType:', error);
      throw new Error(`Failed to find companies by type: ${error.message}`);
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
          name, email, type, address, phone, contact_person, 
          industry, tax_id, website, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        companyData.name,
        companyData.email,
        companyData.type,
        companyData.address,
        companyData.phone,
        companyData.contactPerson,
        companyData.industry,
        companyData.taxId,
        companyData.website,
        companyData.status || 'ACTIVE'
      ];
      
      const result = await this.db.query(query, values);
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
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE companies 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $1 AND deleted_at IS NULL
        RETURNING *
      `;
      
      const values = [id, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
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
        SET deleted_at = CURRENT_TIMESTAMP, status = 'INACTIVE'
        WHERE company_id = $1 AND deleted_at IS NULL
        RETURNING company_id
      `;
      
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.delete:', error);
      throw new Error(`Failed to delete company: ${error.message}`);
    }
  }

  /**
   * Get provider statistics (for dashboard)
   * @param {number} companyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(companyId) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM companies WHERE type = 'CLIENT' AND deleted_at IS NULL) as total_clients,
          (SELECT COUNT(*) FROM active_rentals WHERE provider_company_id = $1) as active_rentals,
          (SELECT COUNT(*) FROM equipments WHERE provider_company_id = $1) as total_equipments,
          (SELECT COUNT(*) FROM service_requests WHERE provider_company_id = $1 AND status = 'PENDING') as pending_requests
      `;
      
      const result = await this.db.query(query, [companyId]);
      
      return {
        totalClients: parseInt(result.rows[0].total_clients) || 0,
        activeRentals: parseInt(result.rows[0].active_rentals) || 0,
        totalEquipments: parseInt(result.rows[0].total_equipments) || 0,
        pendingRequests: parseInt(result.rows[0].pending_requests) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLCompanyRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get provider statistics: ${error.message}`);
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
   * Map database row to Company entity
   * @param {Object} row - Database row
   * @returns {Company} Company entity
   */
  mapRowToEntity(row) {
    return new Company({
      id: row.company_id,
      name: row.name,
      email: row.email,
      type: row.type,
      address: row.address,
      phone: row.phone,
      contactPerson: row.contact_person,
      industry: row.industry,
      taxId: row.tax_id,
      website: row.website,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    });
  }
}

module.exports = PostgreSQLCompanyRepository;
