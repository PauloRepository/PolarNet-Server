const IEquipmentLocationRepository = require('../../domain/repositories/IEquipmentLocationRepository');
const EquipmentLocation = require('../../domain/entities/EquipmentLocation');

/**
 * PostgreSQL Implementation: EquipmentLocation Repository
 * Implements equipment location tracking data persistence using PostgreSQL
 */
class PostgreSQLEquipmentLocationRepository extends IEquipmentLocationRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find equipment location by ID
   * @param {number} locationId - Equipment location ID
   * @returns {Promise<EquipmentLocation|null>}
   */
  async findById(locationId) {
    try {
      const query = `
        SELECT el.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM equipment_locations el
        LEFT JOIN active_rentals ar ON ar.current_location_id = el.equipment_location_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE el.equipment_location_id = $1
      `;
      
      const result = await this.db.query(query, [locationId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.findById:', error);
      throw new Error(`Failed to find equipment location by ID: ${error.message}`);
    }
  }

  /**
   * Find equipment locations by equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<EquipmentLocation[]>}
   */
  async findByEquipment(equipmentId, filters = {}) {
    try {
      let query = `
        SELECT el.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE el.equipment_id = $1
      `;
      
      const params = [equipmentId];
      let paramCount = 1;

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND el.timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND el.timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND el.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

    query += ` ORDER BY el.timestamp DESC`;

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
      console.error('Error in PostgreSQLEquipmentLocationRepository.findByEquipment:', error);
      throw new Error(`Failed to find equipment locations by equipment: ${error.message}`);
    }
  }

  /**
   * Get current location for equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<EquipmentLocation|null>}
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
        WHERE el.equipment_id = $1 
          AND el.is_active = true
         
    ORDER BY el.timestamp DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.getCurrentByEquipment:', error);
      throw new Error(`Failed to get current equipment location: ${error.message}`);
    }
  }

  /**
   * Find equipment locations by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<EquipmentLocation[]>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT DISTINCT el.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ar.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND el.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      if (filters.equipmentId) {
        paramCount++;
        query += ` AND el.equipment_id = $${paramCount}`;
        params.push(filters.equipmentId);
      }

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND el.timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND el.timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

    query += ` ORDER BY el.timestamp DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.findByClientCompany:', error);
      throw new Error(`Failed to find equipment locations by client company: ${error.message}`);
    }
  }

  /**
   * Find equipment by location radius
   * @param {number} latitude - Center latitude
   * @param {number} longitude - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @param {Object} filters - Additional filters
   * @returns {Promise<EquipmentLocation[]>}
   */
  async findByLocationRadius(latitude, longitude, radiusKm, filters = {}) {
    try {
      let query = `
        SELECT el.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name,
               ST_Distance(
                 ST_Point(el.longitude, el.latitude)::geography,
                 ST_Point($2, $1)::geography
               ) / 1000 as distance_km
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ST_DWithin(
          ST_Point(el.longitude, el.latitude)::geography,
          ST_Point($2, $1)::geography,
          $3 * 1000
        )
      `;
      
      const params = [latitude, longitude, radiusKm];
      let paramCount = 3;

      if (filters.clientCompanyId) {
        paramCount++;
        query += ` AND ar.client_company_id = $${paramCount}`;
        params.push(filters.clientCompanyId);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND el.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      if (filters.equipmentType) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.equipmentType);
      }

      query += ` ORDER BY distance_km ASC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.findByLocationRadius:', error);
      throw new Error(`Failed to find equipment by location radius: ${error.message}`);
    }
  }

  /**
   * Get client equipment locations map
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object[]>}
   */
  async getClientEquipmentMap(clientCompanyId) {
    try {
      const query = `
        SELECT 
          el.equipment_id,
          e.serial_number,
          e.type as equipment_type,
          e.manufacturer,
          e.model,
          el.latitude,
          el.longitude,
          el.address,
          el.timestamp,
          el.accuracy,
               tr.value as temperature,
               tr.status as alert_status
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN LATERAL (
          SELECT value as temperature, status as alert_status, timestamp
          FROM temperature_readings
          WHERE equipment_id = e.equipment_id
          ORDER BY timestamp DESC
          LIMIT 1
        ) tr ON true
        WHERE ar.client_company_id = $1 
          AND el.is_active = true
         
        ORDER BY e.serial_number
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.getClientEquipmentMap:', error);
      throw new Error(`Failed to get client equipment map: ${error.message}`);
    }
  }

  /**
   * Get location history for equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object[]>}
   */
  async getLocationHistory(equipmentId, filters = {}) {
    try {
      let query = `
        SELECT 
          el.latitude,
          el.longitude,
          el.address,
            el.timestamp,
          el.accuracy,
          ST_Distance(
            LAG(ST_Point(el.longitude, el.latitude)::geography, 1) OVER (ORDER BY el.timestamp),
            ST_Point(el.longitude, el.latitude)::geography
          ) / 1000 as distance_from_previous_km
        FROM equipment_locations el
        WHERE el.equipment_id = $1
      `;
      
      const params = [equipmentId];
      let paramCount = 1;

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND el.timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND el.timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      query += ` ORDER BY el.timestamp DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.getLocationHistory:', error);
      throw new Error(`Failed to get location history: ${error.message}`);
    }
  }

  /**
   * Create new equipment location
   * @param {Object} locationData - Equipment location data
   * @returns {Promise<EquipmentLocation>}
   */
  async create(locationData) {
    try {
      const query = `
        INSERT INTO equipment_locations (
          equipment_id, latitude, longitude, address, timestamp,
          accuracy, is_active, gps_source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING equipment_location_id
      `;
      
      const now = new Date();
      const params = [
        locationData.equipmentId,
        locationData.latitude,
        locationData.longitude,
        locationData.address,
          locationData.recordedAt || now,
        locationData.accuracy,
        locationData.isActive !== undefined ? locationData.isActive : true,
        locationData.gpsSource || 'GPS',
        locationData.createdAt || now,
        now
      ];

      const result = await this.db.query(query, params);
        return await this.findById(result.rows[0].equipment_location_id);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.create:', error);
      throw new Error(`Failed to create equipment location: ${error.message}`);
    }
  }

  /**
   * Update equipment location
   * @param {number} locationId - Equipment location ID
   * @param {Object} updateData - Update data
   * @returns {Promise<EquipmentLocation>}
   */
  async update(locationId, updateData) {
    try {
      const allowedFields = [
        'latitude', 'longitude', 'address', 'accuracy', 'is_active', 'gps_source'
      ];
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

      // Add location ID parameter
      paramCount++;
      params.push(locationId);

      const query = `
        UPDATE equipment_locations 
        SET ${updateFields.join(', ')}
        WHERE equipment_location_id = $${paramCount}
        RETURNING equipment_location_id
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Equipment location not found');
      }

      return await this.findById(result.rows[0].equipment_location_id);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.update:', error);
      throw new Error(`Failed to update equipment location: ${error.message}`);
    }
  }

  /**
   * Set current location for equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} locationData - Location data
   * @returns {Promise<EquipmentLocation>}
   */
  async setCurrentLocation(equipmentId, locationData) {
    try {
      // First, deactivate all previous locations for this equipment
      await this.db.query(
        'UPDATE equipment_locations SET is_active = false, updated_at = $1 WHERE equipment_id = $2 AND is_active = true',
        [new Date(), equipmentId]
      );

      // Create new active location
      const newLocationData = {
        ...locationData,
        equipmentId,
        isActive: true
      };

      return await this.create(newLocationData);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.setCurrentLocation:', error);
      throw new Error(`Failed to set current equipment location: ${error.message}`);
    }
  }

  /**
   * Delete equipment location (soft delete)
   * @param {number} locationId - Equipment location ID
   * @returns {Promise<boolean>}
   */
  async delete(locationId) {
    try {
      const query = `
        UPDATE equipment_locations 
        SET deleted_at = $1, is_active = false
         WHERE equipment_location_id = $2
         RETURNING equipment_location_id
      `;

      const result = await this.db.query(query, [new Date(), locationId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.delete:', error);
      throw new Error(`Failed to delete equipment location: ${error.message}`);
    }
  }

  /**
   * Get location analytics for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientLocationAnalytics(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT el.equipment_location_id) as tracked_locations,
          COUNT(e.equipment_id) as equipment_at_locations,
          COUNT(CASE WHEN ar.status = 'ACTIVE' THEN 1 END) as active_equipments,
          0 as avg_accuracy,
          0 as locations_last_24h,
          0 as locations_last_week,
          MIN(el.created_at) as first_location_date,
          MAX(el.created_at) as last_location_date
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_location_id = e.current_location_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        WHERE el.company_id = $1 OR ar.client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentLocationRepository.getClientLocationAnalytics:', error);
      throw new Error(`Failed to get client location analytics: ${error.message}`);
    }
  }

  /**
   * Get equipment locations with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Locations with pagination info
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        equipmentId,
        clientCompanyId,
        isActive,
         sortBy = 'timestamp',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      const params = [];
      let paramCount = 0;

      if (equipmentId) {
        paramCount++;
        whereConditions.push(`el.equipment_id = $${paramCount}`);
        params.push(equipmentId);
      }

      if (clientCompanyId) {
        paramCount++;
        whereConditions.push(`ar.client_company_id = $${paramCount}`);
        params.push(clientCompanyId);
      }

      if (isActive !== undefined) {
        paramCount++;
        whereConditions.push(`el.is_active = $${paramCount}`);
        params.push(isActive);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get equipment locations
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      
      const dataQuery = `
        SELECT el.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ${whereClause}
        ORDER BY el.${sortBy} ${sortOrder}
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
      console.error('Error in PostgreSQLEquipmentLocationRepository.findWithPagination:', error);
      throw new Error(`Failed to get equipment locations with pagination: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Convert snake_case to camelCase
   * @param {string} str - String in snake_case
   * @returns {string} String in camelCase
   */
  snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Map database row to EquipmentLocation entity
   * @param {Object} row - Database row
   * @returns {EquipmentLocation} EquipmentLocation entity
   */
  mapRowToEntity(row) {
    return new EquipmentLocation({
      id: row.equipment_location_id,
      equipmentId: row.equipment_id,
      latitude: row.lat,
      longitude: row.lng,
      address: row.address,
    recordedAt: row.timestamp,
      accuracy: row.accuracy,
      isActive: row.is_active,
      gpsSource: row.gps_source,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLEquipmentLocationRepository;

