const ITemperatureReadingRepository = require('../../domain/repositories/ITemperatureReadingRepository');
const TemperatureReading = require('../../domain/entities/TemperatureReading');

/**
 * PostgreSQL Implementation: TemperatureReading Repository
 * Implements IoT temperature sensor data persistence using PostgreSQL
 */
class PostgreSQLTemperatureReadingRepository extends ITemperatureReadingRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find temperature reading by ID
   * @param {number} readingId - Temperature reading ID
   * @returns {Promise<TemperatureReading|null>}
   */
  async findById(readingId) {
    try {
      const query = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
  WHERE tr.temperature_reading_id = $1
      `;
      
      const result = await this.db.query(query, [readingId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findById:', error);
      throw new Error(`Failed to find temperature reading by ID: ${error.message}`);
    }
  }

  /**
   * Find temperature readings by equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<TemperatureReading[]>}
   */
  async findByEquipment(equipmentId, filters = {}) {
    try {
      let query = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
  WHERE tr.equipment_id = $1
      `;
      
      const params = [equipmentId];
      let paramCount = 1;

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND tr.timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND tr.timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      if (filters.minTemperature) {
        paramCount++;
        query += ` AND tr.value >= $${paramCount}`;
        params.push(filters.minTemperature);
      }

      if (filters.maxTemperature) {
        paramCount++;
        query += ` AND tr.value <= $${paramCount}`;
        params.push(filters.maxTemperature);
      }

      if (filters.alertStatus) {
        // Map requested alertStatus to the status column in schema
        paramCount++;
        query += ` AND tr.status = $${paramCount}`;
        params.push(filters.alertStatus);
      }

      query += ` ORDER BY tr.timestamp DESC`;

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
      console.error('Error in PostgreSQLTemperatureReadingRepository.findByEquipment:', error);
      throw new Error(`Failed to find temperature readings by equipment: ${error.message}`);
    }
  }

  /**
   * Find temperature readings by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<TemperatureReading[]>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT DISTINCT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ar.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND tr.timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND tr.timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      if (filters.equipmentId) {
        paramCount++;
        query += ` AND tr.equipment_id = $${paramCount}`;
        params.push(filters.equipmentId);
      }

      if (filters.alertStatus) {
        paramCount++;
        query += ` AND tr.status = $${paramCount}`;
        params.push(filters.alertStatus);
      }

      query += ` ORDER BY tr.timestamp DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findByClientCompany:', error);
      throw new Error(`Failed to find temperature readings by client company: ${error.message}`);
    }
  }

  /**
   * Get latest reading for equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<TemperatureReading|null>}
   */
  async getLatestByEquipment(equipmentId) {
    try {
      const query = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE tr.equipment_id = $1
        ORDER BY tr.timestamp DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getLatestByEquipment:', error);
      throw new Error(`Failed to get latest temperature reading: ${error.message}`);
    }
  }

  /**
   * Find readings with alerts
   * @param {Object} filters - Additional filters
   * @returns {Promise<TemperatureReading[]>}
   */
  async findWithAlerts(filters = {}) {
    try {
      let query = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE tr.status IS NOT NULL 
          AND tr.status != 'NORMAL'
         
      `;
      
      const params = [];
      let paramCount = 0;

      if (filters.clientCompanyId) {
        paramCount++;
        query += ` AND ar.client_company_id = $${paramCount}`;
        params.push(filters.clientCompanyId);
      }

      if (filters.equipmentId) {
        paramCount++;
        query += ` AND tr.equipment_id = $${paramCount}`;
        params.push(filters.equipmentId);
      }

      if (filters.alertStatus) {
        paramCount++;
        query += ` AND tr.status = $${paramCount}`;
        params.push(filters.alertStatus);
      }

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND tr.timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND tr.timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      query += ` ORDER BY tr.timestamp DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findWithAlerts:', error);
      throw new Error(`Failed to find readings with alerts: ${error.message}`);
    }
  }

  /**
   * Get temperature analytics for equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async getEquipmentAnalytics(equipmentId, filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_readings,
          AVG(value) as avg_temperature,
          MIN(value) as min_temperature,
          MAX(value) as max_temperature,
          STDDEV(value) as temperature_stddev,
          COUNT(CASE WHEN status = 'HIGH' THEN 1 END) as high_alerts,
          COUNT(CASE WHEN status = 'LOW' THEN 1 END) as low_alerts,
          COUNT(CASE WHEN status = 'CRITICAL' THEN 1 END) as critical_alerts,
          MIN(timestamp) as first_reading,
          MAX(timestamp) as last_reading
        FROM temperature_readings
        WHERE equipment_id = $1
      `;
      
      const params = [equipmentId];
      let paramCount = 1;

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getEquipmentAnalytics:', error);
      throw new Error(`Failed to get equipment temperature analytics: ${error.message}`);
    }
  }

  /**
   * Get client temperature summary
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientSummary(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT tr.equipment_id) as monitored_equipment,
          COUNT(*) as total_readings,
          COUNT(CASE WHEN tr.alert_triggered = TRUE THEN 1 END) as total_alerts,
          COUNT(CASE WHEN tr.status = 'CRITICAL' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN tr.timestamp >= CURRENT_DATE - INTERVAL '24 hours' THEN 1 END) as readings_last_24h,
          AVG(tr.value) as avg_temperature_all,
          MIN(tr.value) as min_temperature_all,
          MAX(tr.value) as max_temperature_all
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        WHERE ar.client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getClientSummary:', error);
      throw new Error(`Failed to get client temperature summary: ${error.message}`);
    }
  }

  /**
   * Get hourly temperature averages
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object[]>}
   */
  async getHourlyAverages(equipmentId, filters = {}) {
    try {
      let query = `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour_bucket,
          AVG(value) as avg_temperature,
          MIN(value) as min_temperature,
          MAX(value) as max_temperature,
          COUNT(*) as reading_count,
          COUNT(CASE WHEN status != 'NORMAL' AND status IS NOT NULL THEN 1 END) as alert_count
        FROM temperature_readings
        WHERE equipment_id = $1
      `;
      
      const params = [equipmentId];
      let paramCount = 1;

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      query += ` GROUP BY hour_bucket ORDER BY hour_bucket DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getHourlyAverages:', error);
      throw new Error(`Failed to get hourly temperature averages: ${error.message}`);
    }
  }

  /**
   * Create new temperature reading
   * @param {Object} readingData - Temperature reading data
   * @returns {Promise<TemperatureReading>}
   */
  async create(readingData) {
    try {
      const query = `
        INSERT INTO temperature_readings (
          equipment_id, value, humidity, timestamp, sensor_id,
          location_data, status, battery_level, signal_strength,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING temperature_reading_id
      `;
      
      const now = new Date();
      const params = [
        readingData.equipmentId,
        // API field 'temperature' maps to DB column 'value'
        readingData.temperature,
        readingData.humidity,
        readingData.recordedAt || now,
        readingData.sensorId,
        readingData.locationData ? JSON.stringify(readingData.locationData) : null,
        readingData.alertStatus || 'NORMAL',
        readingData.batteryLevel,
        readingData.signalStrength,
        readingData.createdAt || now,
        now
      ];

  const result = await this.db.query(query, params);
  return await this.findById(result.rows[0].temperature_reading_id);
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.create:', error);
      throw new Error(`Failed to create temperature reading: ${error.message}`);
    }
  }

  /**
   * Batch create temperature readings
   * @param {Object[]} readingsData - Array of temperature reading data
   * @returns {Promise<TemperatureReading[]>}
   */
  async batchCreate(readingsData) {
    try {
      if (!readingsData || readingsData.length === 0) {
        return [];
      }

      const values = [];
      const params = [];
      let paramCount = 0;

      readingsData.forEach((reading, index) => {
        const now = new Date();
        const valueParams = [];
        
        // equipment_id
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.equipmentId);
        
        // temperature
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.temperature);
        
        // humidity
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.humidity);
        
        // recorded_at
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.recordedAt || now);
        
        // sensor_id
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.sensorId);
        
        // location_data
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.locationData ? JSON.stringify(reading.locationData) : null);
        
  // status
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.alertStatus || 'NORMAL');
        
        // battery_level
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.batteryLevel);
        
        // signal_strength
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.signalStrength);
        
        // created_at
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(reading.createdAt || now);
        
        // updated_at
        paramCount++;
        valueParams.push(`$${paramCount}`);
        params.push(now);

        values.push(`(${valueParams.join(', ')})`);
      });

      const query = `
        INSERT INTO temperature_readings (
          equipment_id, value, humidity, timestamp, sensor_id,
          location_data, status, battery_level, signal_strength,
          created_at, updated_at
        ) VALUES ${values.join(', ')}
        RETURNING temperature_reading_id
      `;

  const result = await this.db.query(query, params);
      
  // Fetch all created readings (use temperature_reading_id returned by RETURNING)
  const ids = result.rows.map(row => row.temperature_reading_id || row.id);
      const fetchQuery = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
  WHERE tr.temperature_reading_id = ANY($1)
  ORDER BY tr.timestamp DESC
      `;
      
      const fetchResult = await this.db.query(fetchQuery, [ids]);
      return fetchResult.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.batchCreate:', error);
      throw new Error(`Failed to batch create temperature readings: ${error.message}`);
    }
  }

  /**
   * Update temperature reading
   * @param {number} readingId - Temperature reading ID
   * @param {Object} updateData - Update data
   * @returns {Promise<TemperatureReading>}
   */
  async update(readingId, updateData) {
    try {
      const allowedFields = [
  'temperature', 'humidity', 'status', 'location_data',
        'battery_level', 'signal_strength'
      ];
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      // Build dynamic update query
      allowedFields.forEach(field => {
        const camelField = this.snakeToCamel(field);
        if (updateData[camelField] !== undefined) {
          paramCount++;
          if (field === 'location_data' && typeof updateData[camelField] === 'object') {
            updateFields.push(`${field} = $${paramCount}`);
            params.push(JSON.stringify(updateData[camelField]));
          } else {
            updateFields.push(`${field} = $${paramCount}`);
            params.push(updateData[camelField]);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      // Add reading ID parameter
      paramCount++;
      params.push(readingId);

      const query = `
        UPDATE temperature_readings 
        SET ${updateFields.join(', ')}
        WHERE temperature_reading_id = $${paramCount}
        RETURNING temperature_reading_id
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Temperature reading not found');
      }

      return await this.findById(result.rows[0].temperature_reading_id);
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.update:', error);
      throw new Error(`Failed to update temperature reading: ${error.message}`);
    }
  }

  /**
   * Delete temperature reading (soft delete)
   * @param {number} readingId - Temperature reading ID
   * @returns {Promise<boolean>}
   */
  async delete(readingId) {
    try {
      const query = `
        UPDATE temperature_readings 
        SET deleted_at = $1
        WHERE temperature_reading_id = $2
        RETURNING temperature_reading_id
      `;

      const result = await this.db.query(query, [new Date(), readingId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.delete:', error);
      throw new Error(`Failed to delete temperature reading: ${error.message}`);
    }
  }

  /**
   * Delete old readings (batch cleanup)
   * @param {Date} olderThan - Delete readings older than this date
   * @returns {Promise<number>} Number of deleted readings
   */
  async deleteOldReadings(olderThan) {
    try {
      const query = `
        UPDATE temperature_readings 
        SET deleted_at = $1
        WHERE timestamp < $2
        RETURNING temperature_reading_id
      `;

      const result = await this.db.query(query, [new Date(), olderThan]);
      return result.rows.length;
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.deleteOldReadings:', error);
      throw new Error(`Failed to delete old temperature readings: ${error.message}`);
    }
  }

  /**
   * Get temperature readings with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Readings with pagination info
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        equipmentId,
        clientCompanyId,
        alertStatus,
  sortBy = 'timestamp',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      const params = [];
      let paramCount = 0;

      if (equipmentId) {
        paramCount++;
        whereConditions.push(`tr.equipment_id = $${paramCount}`);
        params.push(equipmentId);
      }

      if (clientCompanyId) {
        paramCount++;
        whereConditions.push(`ar.client_company_id = $${paramCount}`);
        params.push(clientCompanyId);
      }

      if (alertStatus) {
        paramCount++;
  whereConditions.push(`tr.status = $${paramCount}`);
        params.push(alertStatus);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get temperature readings
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      
      const dataQuery = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ${whereClause}
        ORDER BY tr.${sortBy} ${sortOrder}
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
      console.error('Error in PostgreSQLTemperatureReadingRepository.findWithPagination:', error);
      throw new Error(`Failed to get temperature readings with pagination: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Get latest temperature reading for an equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object|null>} Latest reading or null
   */
  async getLatestByEquipment(equipmentId) {
    try {
      const query = `
        SELECT tr.*, e.serial_number as equipment_serial
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        WHERE tr.equipment_id = $1
        ORDER BY tr.timestamp DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getLatestByEquipment:', error);
      throw new Error(`Failed to get latest reading: ${error.message}`);
    }
  }

  /**
   * Find alerts for an equipment within a date range
   * @param {number} equipmentId - Equipment ID
   * @param {Object} options - Options with limit, dateFrom, dateTo filters
   * @returns {Promise<Array>} Alert readings
   */
  async findAlertsByEquipment(equipmentId, options = {}) {
    try {
      let query = `
        SELECT tr.*, e.serial_number as equipment_serial
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        WHERE tr.equipment_id = $1 
          AND tr.status IN ('ALERT', 'CRITICAL')
      `;
      
      const params = [equipmentId];
      let paramCount = 1;

      if (options.dateFrom) {
        paramCount++;
        query += ` AND tr.timestamp >= $${paramCount}`;
        params.push(options.dateFrom);
      }

      if (options.dateTo) {
        paramCount++;
        query += ` AND tr.timestamp <= $${paramCount}`;
        params.push(options.dateTo);
      }

      query += ` ORDER BY tr.timestamp DESC`;

      if (options.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findAlertsByEquipment:', error);
      throw new Error(`Failed to find alerts: ${error.message}`);
    }
  }

  /**
   * Count alerts for an equipment within a date range
   * @param {number} equipmentId - Equipment ID
   * @param {Object} options - Options with dateFrom, dateTo filters
   * @returns {Promise<number>} Count of alerts
   */
  async countAlertsByEquipment(equipmentId, options = {}) {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM temperature_readings tr
        WHERE tr.equipment_id = $1 
          AND tr.status IN ('ALERT', 'CRITICAL')
      `;
      
      const params = [equipmentId];
      let paramCount = 1;

      if (options.dateFrom) {
        paramCount++;
        query += ` AND tr.timestamp >= $${paramCount}`;
        params.push(options.dateFrom);
      }

      if (options.dateTo) {
        paramCount++;
        query += ` AND tr.timestamp <= $${paramCount}`;
        params.push(options.dateTo);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count || 0);
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.countAlertsByEquipment:', error);
      throw new Error(`Failed to count alerts: ${error.message}`);
    }
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
   * Map database row to TemperatureReading entity
   * @param {Object} row - Database row
   * @returns {TemperatureReading} TemperatureReading entity
   */
  mapRowToEntity(row) {
    return new TemperatureReading({
      id: row.temperature_reading_id,
      equipmentId: row.equipment_id,
      temperature: row.value,
      humidity: row.humidity,
      recordedAt: row.timestamp,
      sensorId: row.sensor_id,
      locationData: typeof row.location_data === 'string' ? JSON.parse(row.location_data) : row.location_data,
      alertStatus: row.status,
      batteryLevel: row.battery_level,
      signalStrength: row.signal_strength,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLTemperatureReadingRepository;

