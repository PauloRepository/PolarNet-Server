const IActiveRentalRepository = require('../../domain/repositories/IActiveRentalRepository');
const ActiveRental = require('../../domain/entities/ActiveRental');

/**
 * PostgreSQL Implementation: ActiveRental Repository (Simplified)
 * Implements active rental contract data persistence using PostgreSQL
 */
class PostgreSQLActiveRentalRepository extends IActiveRentalRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find active rental by ID
   * @param {number} rentalId - Rental ID
   * @returns {Promise<ActiveRental|null>}
   */
  async findById(rentalId) {
    try {
      const query = `
        SELECT ar.*, 
               ce.name as client_company_name,
               pe.name as provider_company_name,
               e.serial_number, e.type as equipment_type, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.rental_id = $1
      `;
      
      const result = await this.db.query(query, [rentalId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.findById:', error);
      throw new Error(`Failed to find active rental by ID: ${error.message}`);
    }
  }

  /**
   * Find active rentals by provider company
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ActiveRental[]>}
   */
  async findByProviderCompany(providerCompanyId, filters = {}) {
    try {
      const { page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;

      const query = `
        SELECT ar.*, 
               ce.name as client_company_name,
               e.serial_number, e.type as equipment_type, e.model,
               COUNT(*) OVER() as total_count
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.provider_company_id = $1
        ORDER BY ar.start_date DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [providerCompanyId, limit, offset]);
      
      return {
        rentals: result.rows.map(row => this.mapRowToEntity(row)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.findByProviderCompany:', error);
      throw new Error(`Failed to find active rentals by provider: ${error.message}`);
    }
  }

  /**
   * Find active rentals by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ActiveRental[]>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      const { page = 1, limit = 20, status, equipmentType } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE ar.client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND ar.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (equipmentType) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(equipmentType);
      }

      const query = `
        SELECT ar.*, 
               pe.name as provider_company_name,
               e.name as equipment_name, e.serial_number, e.type as equipment_type, e.model,
               COUNT(*) OVER() as total_count
        FROM active_rentals ar
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        ${whereClause}
        ORDER BY ar.start_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.findByClientCompany:', error);
      throw new Error(`Failed to find active rentals by client: ${error.message}`);
    }
  }

  /**
   * Count active rentals by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async countByClientCompany(clientCompanyId, filters = {}) {
    try {
      const { status, equipmentType } = filters;
      
      let whereClause = 'WHERE ar.client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND ar.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (equipmentType) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(equipmentType);
      }

      const query = `
        SELECT COUNT(*) as total
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        ${whereClause}
      `;
      
      const result = await this.db.query(query, queryParams);
      return parseInt(result.rows[0].total) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.countByClientCompany:', error);
      throw new Error(`Failed to count active rentals by client: ${error.message}`);
    }
  }

  /**
   * Create new active rental
   * @param {Object} rentalData - Rental data
   * @returns {Promise<ActiveRental>}
   */
  async create(rentalData) {
    try {
      const query = `
        INSERT INTO active_rentals (
          client_company_id, provider_company_id, equipment_id,
          start_date, end_date, monthly_rate, total_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        rentalData.clientCompanyId,
        rentalData.providerCompanyId,
        rentalData.equipmentId,
        rentalData.startDate,
        rentalData.endDate,
        rentalData.monthlyRate,
        rentalData.totalAmount,
        rentalData.status || 'ACTIVE'
      ];
      
      const result = await this.db.query(query, values);
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.create:', error);
      throw new Error(`Failed to create active rental: ${error.message}`);
    }
  }

  /**
   * Update active rental
   * @param {number} rentalId - Rental ID
   * @param {Object} updateData - Update data
   * @returns {Promise<ActiveRental>}
   */
  async update(rentalId, updateData) {
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE active_rentals 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE rental_id = $1
        RETURNING *
      `;
      
      const values = [rentalId, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Active rental not found');
      }
      
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.update:', error);
      throw new Error(`Failed to update active rental: ${error.message}`);
    }
  }

  /**
   * Delete active rental (soft delete)
   * @param {number} rentalId - Rental ID
   * @returns {Promise<boolean>}
   */
  async delete(rentalId) {
    try {
      const query = `
        UPDATE active_rentals 
        SET status = 'TERMINATED', updated_at = CURRENT_TIMESTAMP
        WHERE rental_id = $1
        RETURNING rental_id
      `;
      
      const result = await this.db.query(query, [rentalId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.delete:', error);
      throw new Error(`Failed to delete active rental: ${error.message}`);
    }
  }

  /**
   * Get provider statistics (for dashboard)
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(providerCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_active_rentals,
          COUNT(CASE WHEN end_date < CURRENT_DATE THEN 1 END) as expiring_soon,
          SUM(monthly_rate) as monthly_revenue,
          AVG(monthly_rate) as avg_rental_rate
        FROM active_rentals 
        WHERE provider_company_id = $1 AND status = 'ACTIVE'
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      
      return {
        totalActiveRentals: parseInt(result.rows[0].total_active_rentals) || 0,
        expiringSoon: parseInt(result.rows[0].expiring_soon) || 0,
        monthlyRevenue: parseFloat(result.rows[0].monthly_revenue) || 0,
        avgRentalRate: parseFloat(result.rows[0].avg_rental_rate) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get provider statistics: ${error.message}`);
    }
  }

  /**
   * Get active rental by equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object|null>}
   */
  async getActiveRentalByEquipment(equipmentId) {
    try {
      const query = `
        SELECT ar.*, 
               c.name as client_company_name,
               pe.name as provider_company_name
        FROM active_rentals ar
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        WHERE ar.equipment_id = $1 AND ar.status = 'ACTIVE'
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getActiveRentalByEquipment:', error);
      throw new Error(`Failed to get active rental by equipment: ${error.message}`);
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
   * Map database row to ActiveRental entity
   * @param {Object} row - Database row
   * @returns {ActiveRental} ActiveRental entity
   */
  mapRowToEntity(row) {
    return new ActiveRental({
      id: row.rental_id,
      clientCompanyId: row.client_company_id,
      providerCompanyId: row.provider_company_id,
      equipmentId: row.equipment_id,
      startDate: row.start_date,
      endDate: row.end_date,
      monthlyRate: parseFloat(row.monthly_rate),
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Additional fields from joins
      clientCompanyName: row.client_company_name,
      providerCompanyName: row.provider_company_name,
      equipmentSerialNumber: row.serial_number,
      equipmentType: row.equipment_type,
      equipmentModel: row.model
    });
  }
}

module.exports = PostgreSQLActiveRentalRepository;
