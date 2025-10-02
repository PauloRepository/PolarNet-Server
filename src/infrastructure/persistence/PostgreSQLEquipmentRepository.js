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
        LEFT JOIN companies p ON e.owner_company_id = p.company_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE e.equipment_id = $1
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

      let whereClause = 'WHERE e.owner_company_id = $1';
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
          owner_company_id, name, description, type, manufacturer, model, 
          serial_number, year_manufactured, status, purchase_price, rental_price_monthly,
          technical_specs, current_location_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        equipmentData.providerCompanyId,
        equipmentData.name,
        equipmentData.description,
        equipmentData.type,
        equipmentData.manufacturer,
        equipmentData.model,
        equipmentData.serialNumber,
        equipmentData.year,
        equipmentData.status || 'AVAILABLE',
        equipmentData.purchasePrice,
        equipmentData.rentalRate,
        JSON.stringify(equipmentData.specifications || {}),
        equipmentData.locationId
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
        WHERE equipment_id = $1
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
        SET status = 'INACTIVE'
        WHERE equipment_id = $1
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
          AVG(rental_price_monthly) as avg_rental_rate,
          (COUNT(CASE WHEN status = 'RENTED' THEN 1 END) * 100.0 / COUNT(*)) as utilization_rate
        FROM equipments 
        WHERE owner_company_id = $1
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

  /**
   * Get client equipment statistics (for dashboard)
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientStatistics(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT e.equipment_id) as total_equipment,
          COUNT(CASE WHEN ar.status = 'ACTIVE' THEN 1 END) as active_rentals,
          COUNT(CASE WHEN e.status = 'AVAILABLE' THEN 1 END) as available_equipment,
          COUNT(CASE WHEN e.status = 'MAINTENANCE' THEN 1 END) as in_maintenance,
          COALESCE(SUM(CASE WHEN ar.status = 'ACTIVE' THEN ar.monthly_rate END), 0) as total_monthly_cost
        FROM equipments e
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id 
          AND ar.client_company_id = $1
        WHERE ar.client_company_id = $1 OR e.equipment_id IN (
          SELECT DISTINCT equipment_id FROM active_rentals WHERE client_company_id = $1
        )
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      
      return {
        totalEquipments: parseInt(result.rows[0].total_equipment) || 0,
        activeEquipments: parseInt(result.rows[0].active_rentals) || 0,
        availableEquipment: parseInt(result.rows[0].available_equipment) || 0,
        inMaintenance: parseInt(result.rows[0].in_maintenance) || 0,
        totalMonthlyCost: parseFloat(result.rows[0].total_monthly_cost) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getClientStatistics:', error);
      throw new Error(`Failed to get client equipment statistics: ${error.message}`);
    }
  }

  /**
   * Find equipment rented by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async findRentedByClient(clientCompanyId, filters = {}) {
    try {
      const { page = 1, limit = 20, search = '', type = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE ar.client_company_id = $1 AND ar.status = \'ACTIVE\'';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (search) {
        whereClause += ` AND (e.name ILIKE $${++paramCount} OR e.serial_number ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      if (type) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(type);
      }

      const query = `
        SELECT e.*, 
               ar.rental_id,
               ar.start_date,
               ar.end_date,
               ar.monthly_rate,
               p.name as provider_company_name,
               COUNT(*) OVER() as total_count
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies p ON e.owner_company_id = p.company_id
        ${whereClause}
        ORDER BY ar.start_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        equipments: result.rows.map(row => ({
          ...this.mapRowToEntity(row),
          rentalDetails: {
            rentalId: row.rental_id,
            startDate: row.start_date,
            endDate: row.end_date,
            monthlyPrice: parseFloat(row.monthly_rate)
          }
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findRentedByClient:', error);
      throw new Error(`Failed to find rented equipment by client: ${error.message}`);
    }
  }

  /**
   * Count equipment rented by client company
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<number>}
   */
  async countRentedByClient(clientCompanyId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.countRentedByClient:', error);
      throw new Error(`Failed to count rented equipment by client: ${error.message}`);
    }
  }

  /**
   * Check if equipment is rented by client company
   * @param {number} equipmentId - Equipment ID
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<boolean>}
   */
  async isRentedByClient(equipmentId, clientCompanyId) {
    try {
      const query = `
        SELECT ar.rental_id
        FROM active_rentals ar
        WHERE ar.equipment_id = $1 AND ar.client_company_id = $2 AND ar.status = 'ACTIVE'
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId, clientCompanyId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.isRentedByClient:', error);
      throw new Error(`Failed to check if equipment is rented by client: ${error.message}`);
    }
  }

  /**
   * Get available equipment types for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<string[]>}
   */
  async getAvailableTypesByClient(clientCompanyId) {
    try {
      const query = `
        SELECT DISTINCT e.type
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
        ORDER BY e.type
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows.map(row => row.type);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getAvailableTypesByClient:', error);
      throw new Error(`Failed to get available types by client: ${error.message}`);
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
      providerCompanyId: row.owner_company_id,
      name: row.name,
      type: row.type,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serial_number,
      year: row.year,
      status: row.status,
      purchasePrice: parseFloat(row.purchase_price) || 0,
      rentalRate: parseFloat(row.rental_price_monthly) || 0,
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
