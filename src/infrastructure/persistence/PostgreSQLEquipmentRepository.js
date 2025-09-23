const IEquipmentRepository = require('../../domain/repositories/IEquipmentRepository');
const Equipment = require('../../domain/entities/Equipment');

/**
 * PostgreSQL Implementation: Equipment Repository (Simplified)
 * Implements equipment data persistence using PostgreSQL
 */
class PostgreSQLEquipmentRepository extends IEquipmentRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find equipment by ID
   * @param {number} id - Equipment ID
   * @returns {Promise<Equipment|null>}
   */
  async findById(id) {
    try {
      const query = `
        SELECT e.*, 
               p.name as provider_company_name,
               ar.rental_id,
               c.name as client_company_name
        FROM equipments e
        LEFT JOIN companies p ON e.provider_company_id = p.company_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE e.equipment_id = $1 AND e.deleted_at IS NULL
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findById:', error);
      throw new Error(`Failed to find equipment by ID: ${error.message}`);
    }
  }

  /**
   * Find equipment by provider company
   * @param {number} companyId - Provider company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findByProvider(companyId, filters = {}) {
    try {
      const { page = 1, limit = 20, search = '', status = '', type = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE e.provider_company_id = $1 AND e.deleted_at IS NULL';
      let queryParams = [companyId];
      let paramCount = 1;

      if (search) {
        whereClause += ` AND (e.name ILIKE $${++paramCount} OR e.serial_number ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      if (status) {
        whereClause += ` AND e.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (type) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(type);
      }

      const query = `
        SELECT e.*, 
               ar.rental_id,
               c.name as client_company_name,
               COUNT(*) OVER() as total_count
        FROM equipments e
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        equipments: result.rows.map(row => this.mapRowToEntity(row)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findByProvider:', error);
      throw new Error(`Failed to find equipment by provider: ${error.message}`);
    }
  }

  /**
   * Create new equipment
   * @param {Object} equipmentData - Equipment data
   * @returns {Promise<Equipment>}
   */
  async create(equipmentData) {
    try {
      const query = `
        INSERT INTO equipments (
          provider_company_id, name, type, manufacturer, model, 
          serial_number, year, status, purchase_price, rental_rate,
          specifications, location_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const values = [
        equipmentData.providerCompanyId,
        equipmentData.name,
        equipmentData.type,
        equipmentData.manufacturer,
        equipmentData.model,
        equipmentData.serialNumber,
        equipmentData.year,
        equipmentData.status || 'AVAILABLE',
        equipmentData.purchasePrice,
        equipmentData.rentalRate,
        JSON.stringify(equipmentData.specifications || {}),
        equipmentData.locationAddress
      ];
      
      const result = await this.db.query(query, values);
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.create:', error);
      throw new Error(`Failed to create equipment: ${error.message}`);
    }
  }

  /**
   * Update equipment
   * @param {number} id - Equipment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Equipment>}
   */
  async update(id, updateData) {
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE equipments 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE equipment_id = $1 AND deleted_at IS NULL
        RETURNING *
      `;
      
      const values = [id, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Equipment not found');
      }
      
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.update:', error);
      throw new Error(`Failed to update equipment: ${error.message}`);
    }
  }

  /**
   * Delete equipment (soft delete)
   * @param {number} id - Equipment ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const query = `
        UPDATE equipments 
        SET deleted_at = CURRENT_TIMESTAMP, status = 'RETIRED'
        WHERE equipment_id = $1 AND deleted_at IS NULL
        RETURNING equipment_id
      `;
      
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.delete:', error);
      throw new Error(`Failed to delete equipment: ${error.message}`);
    }
  }

  /**
   * Get provider statistics for equipment (for dashboard)
   * @param {number} companyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(companyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_equipments,
          COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available_count,
          COUNT(CASE WHEN status = 'RENTED' THEN 1 END) as rented_count,
          COUNT(CASE WHEN status = 'MAINTENANCE' THEN 1 END) as maintenance_count,
          AVG(rental_rate) as avg_rental_rate,
          (COUNT(CASE WHEN status = 'RENTED' THEN 1 END) * 100.0 / COUNT(*)) as utilization_rate
        FROM equipments 
        WHERE provider_company_id = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.db.query(query, [companyId]);
      
      return {
        totalEquipments: parseInt(result.rows[0].total_equipments) || 0,
        availableCount: parseInt(result.rows[0].available_count) || 0,
        rentedCount: parseInt(result.rows[0].rented_count) || 0,
        maintenanceCount: parseInt(result.rows[0].maintenance_count) || 0,
        avgRentalRate: parseFloat(result.rows[0].avg_rental_rate) || 0,
        utilizationRate: parseFloat(result.rows[0].utilization_rate) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get equipment statistics: ${error.message}`);
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
   * Map database row to Equipment entity
   * @param {Object} row - Database row
   * @returns {Equipment} Equipment entity
   */
  mapRowToEntity(row) {
    return new Equipment({
      id: row.equipment_id,
      providerCompanyId: row.provider_company_id,
      name: row.name,
      type: row.type,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serial_number,
      year: row.year,
      status: row.status,
      purchasePrice: parseFloat(row.purchase_price) || 0,
      rentalRate: parseFloat(row.rental_rate) || 0,
      specifications: typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications,
      locationAddress: row.location_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      // Additional fields from joins
      providerCompanyName: row.provider_company_name,
      rentalId: row.rental_id,
      clientCompanyName: row.client_company_name
    });
  }
}

module.exports = PostgreSQLEquipmentRepository;
