const IEquipmentLocationRepository = require('../../domain/repositories/IEquipmentLocationRepository');

/**
 * PostgreSQL Implementation: EquipmentLocation Repository (Simplified)
 * Handles equipment location tracking data persistence using PostgreSQL
 */
class PostgreSQLEquipmentLocationRepository extends IEquipmentLocationRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find equipment location by ID
   * @param {number} locationId - Equipment location ID
   * @returns {Promise<Object|null>}
   */
  async findById(locationId) {
    try {
      const query = `
        SELECT el.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE el.equipment_location_id = $1
      `;
      
      const result = await this.db.query(query, [locationId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.findById:', error);
      throw new Error(`Failed to find equipment location by ID: ${error.message}`);
    }
  }

  /**
   * Find equipment locations by equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async findByEquipment(equipmentId, filters = {}) {
    try {
      const { page = 1, limit = 20, dateFrom = '', dateTo = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE el.equipment_id = $1';
      let queryParams = [equipmentId];
      let paramCount = 1;

      if (dateFrom) {
        whereClause += ` AND el.timestamp >= $${++paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND el.timestamp <= $${++paramCount}`;
        queryParams.push(dateTo);
      }

      const query = `
        SELECT 
          el.*,
          e.serial_number, e.type as equipment_type,
          COUNT(*) OVER() as total_count
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        ${whereClause}
        ORDER BY el.timestamp DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        locations: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.findByEquipment:', error);
      throw new Error(`Failed to find equipment locations by equipment: ${error.message}`);
    }
  }

  /**
   * Get current location for equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object|null>}
   */
  async getCurrentByEquipment(equipmentId) {
    try {
      const query = `
        SELECT el.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE el.equipment_id = $1 AND el.is_active = true
        ORDER BY el.timestamp DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.getCurrentByEquipment:', error);
      throw new Error(`Failed to get current equipment location: ${error.message}`);
    }
  }

  /**
   * Find equipment locations by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      const { page = 1, limit = 20, equipmentId = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE ar.client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (equipmentId) {
        whereClause += ` AND el.equipment_id = $${++paramCount}`;
        queryParams.push(equipmentId);
      }

      const query = `
        SELECT DISTINCT 
          el.*,
          e.serial_number, e.type as equipment_type,
          c.name as client_company_name,
          COUNT(*) OVER() as total_count
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        ${whereClause}
        ORDER BY el.timestamp DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        locations: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.findByClientCompany:', error);
      throw new Error(`Failed to find equipment locations by client company: ${error.message}`);
    }
  }

  /**
   * Find equipment locations by company (alias for findByClientCompany)
   * @param {number} companyId - Company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async findByCompany(companyId, filters = {}) {
    return this.findByClientCompany(companyId, filters);
  }

  /**
   * Create new equipment location
   * @param {Object} locationData - Equipment location data
   * @returns {Promise<Object>}
   */
  async create(locationData) {
    try {
      const query = `
        INSERT INTO equipment_locations (
          equipment_id, latitude, longitude, address, accuracy, 
          is_active, gps_source, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        locationData.equipmentId,
        locationData.latitude,
        locationData.longitude,
        locationData.address || '',
        locationData.accuracy || null,
        locationData.isActive !== undefined ? locationData.isActive : true,
        locationData.gpsSource || 'MANUAL',
        locationData.timestamp || new Date()
      ];
      
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.create:', error);
      throw new Error(`Failed to create equipment location: ${error.message}`);
    }
  }

  /**
   * Update equipment location
   * @param {number} locationId - Equipment location ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async update(locationId, updateData) {
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE equipment_locations 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE equipment_location_id = $1
        RETURNING *
      `;
      
      const values = [locationId, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Equipment location not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.update:', error);
      throw new Error(`Failed to update equipment location: ${error.message}`);
    }
  }

  /**
   * Delete equipment location
   * @param {number} locationId - Equipment location ID
   * @returns {Promise<boolean>}
   */
  async delete(locationId) {
    try {
      const query = `
        DELETE FROM equipment_locations 
        WHERE equipment_location_id = $1
        RETURNING equipment_location_id
      `;
      
      const result = await this.db.query(query, [locationId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.delete:', error);
      throw new Error(`Failed to delete equipment location: ${error.message}`);
    }
  }

  /**
   * Get location statistics (for dashboard)
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getLocationStatistics(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT el.equipment_id) as tracked_equipments,
          COUNT(el.equipment_location_id) as total_locations,
          COUNT(CASE WHEN el.is_active = true THEN 1 END) as active_locations,
          AVG(el.accuracy) as avg_accuracy
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        WHERE ar.client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      
      return {
        trackedEquipments: parseInt(result.rows[0].tracked_equipments) || 0,
        totalLocations: parseInt(result.rows[0].total_locations) || 0,
        activeLocations: parseInt(result.rows[0].active_locations) || 0,
        avgAccuracy: parseFloat(result.rows[0].avg_accuracy) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.getLocationStatistics:', error);
      throw new Error(`Failed to get location statistics: ${error.message}`);
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

module.exports = PostgreSQLEquipmentLocationRepository;
