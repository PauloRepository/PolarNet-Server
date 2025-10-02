const ITemperatureReadingRepository = require('../../domain/repositories/ITemperatureReadingRepository');

/**
 * PostgreSQL Implementation: TemperatureReading Repository (Simplified)
 * Handles IoT temperature sensor data persistence using PostgreSQL
 */
class PostgreSQLTemperatureReadingRepository extends ITemperatureReadingRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find temperature reading by ID
   * @param {number} readingId - Temperature reading ID
   * @returns {Promise<Object|null>}
   */
  async findById(readingId) {
    try {
      const query = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE tr.temperature_reading_id = $1
      `;
      
      const result = await this.db.query(query, [readingId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findById:', error);
      throw new Error(`Failed to find temperature reading by ID: ${error.message}`);
    }
  }

  /**
   * Find temperature readings by equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async findByEquipment(equipmentId, filters = {}) {
    try {
      const { page = 1, limit = 20, dateFrom = '', dateTo = '', alertStatus = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE tr.equipment_id = $1';
      let queryParams = [equipmentId];
      let paramCount = 1;

      if (dateFrom) {
        whereClause += ` AND tr.timestamp >= $${++paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND tr.timestamp <= $${++paramCount}`;
        queryParams.push(dateTo);
      }

      if (alertStatus) {
        whereClause += ` AND tr.alert_triggered = $${++paramCount}`;
        queryParams.push(alertStatus === 'true');
      }

      const query = `
        SELECT 
          tr.*,
          e.serial_number, e.type as equipment_type,
          COUNT(*) OVER() as total_count
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        ${whereClause}
        ORDER BY tr.timestamp DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        readings: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findByEquipment:', error);
      throw new Error(`Failed to find temperature readings by equipment: ${error.message}`);
    }
  }

  /**
   * Find temperature readings by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      const { page = 1, limit = 20, equipmentId = '', alertStatus = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE ar.client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (equipmentId) {
        whereClause += ` AND tr.equipment_id = $${++paramCount}`;
        queryParams.push(equipmentId);
      }

      if (alertStatus) {
        whereClause += ` AND tr.alert_triggered = $${++paramCount}`;
        queryParams.push(alertStatus === 'true');
      }

      const query = `
        SELECT DISTINCT 
          tr.*,
          e.serial_number, e.type as equipment_type,
          c.name as client_company_name,
          COUNT(*) OVER() as total_count
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        ${whereClause}
        ORDER BY tr.timestamp DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        readings: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findByClientCompany:', error);
      throw new Error(`Failed to find temperature readings by client company: ${error.message}`);
    }
  }

  /**
   * Get latest reading for equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object|null>}
   */
  async getLatestByEquipment(equipmentId) {
    try {
      const query = `
        SELECT tr.*,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               c.name as client_company_name
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE tr.equipment_id = $1
        ORDER BY tr.timestamp DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getLatestByEquipment:', error);
      throw new Error(`Failed to get latest temperature reading: ${error.message}`);
    }
  }

  /**
   * Create new temperature reading
   * @param {Object} readingData - Temperature reading data
   * @returns {Promise<Object>}
   */
  async create(readingData) {
    try {
      const query = `
        INSERT INTO temperature_readings (
          equipment_id, value, status, alert_triggered, timestamp
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [
        readingData.equipmentId,
        readingData.value,
        readingData.status || 'NORMAL',
        readingData.alertTriggered || false,
        readingData.timestamp || new Date()
      ];
      
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.create:', error);
      throw new Error(`Failed to create temperature reading: ${error.message}`);
    }
  }

  /**
   * Batch create temperature readings
   * @param {Object[]} readingsData - Array of temperature reading data
   * @returns {Promise<Object[]>}
   */
  async batchCreate(readingsData) {
    try {
      if (!readingsData || readingsData.length === 0) {
        return [];
      }

      const values = readingsData.map(reading => [
        reading.equipmentId,
        reading.value,
        reading.status || 'NORMAL',
        reading.alertTriggered || false,
        reading.timestamp || new Date()
      ]);

      const placeholders = values.map((_, index) => {
        const base = index * 5;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
      }).join(', ');

      const query = `
        INSERT INTO temperature_readings (
          equipment_id, value, status, alert_triggered, timestamp
        ) VALUES ${placeholders}
        RETURNING *
      `;
      
      const flatValues = values.flat();
      const result = await this.db.query(query, flatValues);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.batchCreate:', error);
      throw new Error(`Failed to batch create temperature readings: ${error.message}`);
    }
  }

  /**
   * Update temperature reading
   * @param {number} readingId - Temperature reading ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async update(readingId, updateData) {
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE temperature_readings 
        SET ${setClause}
        WHERE temperature_reading_id = $1
        RETURNING *
      `;
      
      const values = [readingId, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Temperature reading not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.update:', error);
      throw new Error(`Failed to update temperature reading: ${error.message}`);
    }
  }

  /**
   * Delete temperature reading
   * @param {number} readingId - Temperature reading ID
   * @returns {Promise<boolean>}
   */
  async delete(readingId) {
    try {
      const query = `
        DELETE FROM temperature_readings 
        WHERE temperature_reading_id = $1
        RETURNING temperature_reading_id
      `;
      
      const result = await this.db.query(query, [readingId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.delete:', error);
      throw new Error(`Failed to delete temperature reading: ${error.message}`);
    }
  }

  /**
   * Get equipment temperature statistics (for dashboard)
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object>}
   */
  async getEquipmentStatistics(equipmentId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_readings,
          AVG(value) as avg_temperature,
          MIN(value) as min_temperature,
          MAX(value) as max_temperature,
          COUNT(CASE WHEN alert_triggered = true THEN 1 END) as alert_count,
          MAX(timestamp) as last_reading_time
        FROM temperature_readings 
        WHERE equipment_id = $1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      return {
        totalReadings: parseInt(result.rows[0].total_readings) || 0,
        avgTemperature: parseFloat(result.rows[0].avg_temperature) || 0,
        minTemperature: parseFloat(result.rows[0].min_temperature) || 0,
        maxTemperature: parseFloat(result.rows[0].max_temperature) || 0,
        alertCount: parseInt(result.rows[0].alert_count) || 0,
        lastReadingTime: result.rows[0].last_reading_time
      };
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getEquipmentStatistics:', error);
      throw new Error(`Failed to get temperature statistics: ${error.message}`);
    }
  }

  /**
   * Get client temperature summary (for dashboard)
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientSummary(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT tr.equipment_id) as monitored_equipments,
          COUNT(tr.temperature_reading_id) as total_readings,
          AVG(tr.value) as avg_temperature,
          COUNT(CASE WHEN tr.alert_triggered = true THEN 1 END) as total_alerts
        FROM temperature_readings tr
        LEFT JOIN equipments e ON tr.equipment_id = e.equipment_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        WHERE ar.client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      
      return {
        monitoredEquipments: parseInt(result.rows[0].monitored_equipments) || 0,
        totalReadings: parseInt(result.rows[0].total_readings) || 0,
        avgTemperature: parseFloat(result.rows[0].avg_temperature) || 0,
        totalAlerts: parseInt(result.rows[0].total_alerts) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getClientSummary:', error);
      throw new Error(`Failed to get client temperature summary: ${error.message}`);
    }
  }

  /**
   * Get equipment analytics for temperature readings
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>}
   */
  async getEquipmentAnalytics(equipmentId, filters = {}) {
    try {
      const { dateFrom } = filters;
      let whereClause = 'WHERE equipment_id = $1';
      let queryParams = [equipmentId];
      let paramCount = 1;

      if (dateFrom) {
        whereClause += ` AND timestamp >= $${++paramCount}`;
        queryParams.push(dateFrom);
      }

      const query = `
        SELECT 
          COUNT(*) as total_readings,
          AVG(value) as avg_temperature,
          MIN(value) as min_temperature,
          MAX(value) as max_temperature,
          COUNT(CASE WHEN alert_triggered = true THEN 1 END) as alert_count,
          COUNT(CASE WHEN status = 'CRITICAL' THEN 1 END) as critical_count,
          MAX(timestamp) as last_reading_time,
          MIN(timestamp) as first_reading_time
        FROM temperature_readings 
        ${whereClause}
      `;
      
      const result = await this.db.query(query, queryParams);
      
      return {
        totalReadings: parseInt(result.rows[0].total_readings) || 0,
        avgTemperature: parseFloat(result.rows[0].avg_temperature) || 0,
        minTemperature: parseFloat(result.rows[0].min_temperature) || 0,
        maxTemperature: parseFloat(result.rows[0].max_temperature) || 0,
        alertCount: parseInt(result.rows[0].alert_count) || 0,
        criticalCount: parseInt(result.rows[0].critical_count) || 0,
        lastReadingTime: result.rows[0].last_reading_time,
        firstReadingTime: result.rows[0].first_reading_time
      };
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getEquipmentAnalytics:', error);
      throw new Error(`Failed to get equipment analytics: ${error.message}`);
    }
  }

  /**
   * Count alerts by equipment within a date range
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Date filters
   * @returns {Promise<number>}
   */
  async countAlertsByEquipment(equipmentId, filters = {}) {
    try {
      const { dateFrom, dateTo } = filters;
      let whereClause = 'WHERE equipment_id = $1 AND alert_triggered = true';
      let queryParams = [equipmentId];
      let paramCount = 1;

      if (dateFrom) {
        whereClause += ` AND timestamp >= $${++paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND timestamp <= $${++paramCount}`;
        queryParams.push(dateTo);
      }

      const query = `
        SELECT COUNT(*) as alert_count
        FROM temperature_readings 
        ${whereClause}
      `;
      
      const result = await this.db.query(query, queryParams);
      return parseInt(result.rows[0].alert_count) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.countAlertsByEquipment:', error);
      throw new Error(`Failed to count alerts by equipment: ${error.message}`);
    }
  }

  /**
   * Find alerts by equipment within a date range
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Date and pagination filters
   * @returns {Promise<Object>}
   */
  async findAlertsByEquipment(equipmentId, filters = {}) {
    try {
      const { page = 1, limit = 20, dateFrom, dateTo } = filters;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE equipment_id = $1 AND alert_triggered = true';
      let queryParams = [equipmentId];
      let paramCount = 1;

      if (dateFrom) {
        whereClause += ` AND timestamp >= $${++paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND timestamp <= $${++paramCount}`;
        queryParams.push(dateTo);
      }

      const query = `
        SELECT *,
               COUNT(*) OVER() as total_count
        FROM temperature_readings 
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        alerts: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.findAlertsByEquipment:', error);
      throw new Error(`Failed to find alerts by equipment: ${error.message}`);
    }
  }

  /**
   * Get hourly averages for equipment temperature readings
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Date filters
   * @returns {Promise<Array>}
   */
  async getHourlyAverages(equipmentId, filters = {}) {
    try {
      const { dateFrom, dateTo } = filters;
      let whereClause = 'WHERE equipment_id = $1';
      let queryParams = [equipmentId];
      let paramCount = 1;

      if (dateFrom) {
        whereClause += ` AND timestamp >= $${++paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND timestamp <= $${++paramCount}`;
        queryParams.push(dateTo);
      }

      const query = `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          AVG(value) as avg_temperature,
          MIN(value) as min_temperature,
          MAX(value) as max_temperature,
          COUNT(*) as readings_count,
          COUNT(CASE WHEN alert_triggered = true THEN 1 END) as alerts_count
        FROM temperature_readings 
        ${whereClause}
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour
      `;
      
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map(row => ({
        hour: row.hour,
        avgTemperature: parseFloat(row.avg_temperature),
        minTemperature: parseFloat(row.min_temperature),
        maxTemperature: parseFloat(row.max_temperature),
        readingsCount: parseInt(row.readings_count),
        alertsCount: parseInt(row.alerts_count)
      }));
    } catch (error) {
      console.error('Error in PostgreSQLTemperatureReadingRepository.getHourlyAverages:', error);
      throw new Error(`Failed to get hourly averages: ${error.message}`);
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

module.exports = PostgreSQLTemperatureReadingRepository;
