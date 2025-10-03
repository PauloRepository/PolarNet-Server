const IMaintenanceRepository = require('../../domain/repositories/IMaintenanceRepository');

/**
 * PostgreSQL Implementation: Maintenance Repository (Simplified)
 * Handles maintenance data persistence using PostgreSQL
 */
class PostgreSQLMaintenanceRepository extends IMaintenanceRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find maintenances by provider
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByProvider(providerId, filters = {}) {
    try {
      const { page = 1, limit = 20, status = '', type = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE e.owner_company_id = $1';
      let queryParams = [providerId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND m.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (type) {
        whereClause += ` AND m.type = $${++paramCount}`;
        queryParams.push(type);
      }

      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.serial_number as equipment_serial,
          c.name as client_company_name,
          u.name as technician_name,
          COUNT(*) OVER() as total_count
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies c ON m.client_company_id = c.company_id
        LEFT JOIN users u ON m.technician_id = u.user_id
        ${whereClause}
        ORDER BY m.scheduled_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        maintenances: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.findByProvider:', error);
      throw new Error(`Failed to find maintenances: ${error.message}`);
    }
  }

  /**
   * Find maintenance by ID
   * @param {number} maintenanceId - Maintenance ID
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object|null>}
   */
  async findById(maintenanceId, providerId) {
    try {
      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.serial_number as equipment_serial,
          c.name as client_company_name,
          u.name as technician_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies c ON m.client_company_id = c.company_id
        LEFT JOIN users u ON m.technician_id = u.user_id
        WHERE m.maintenance_id = $1 AND e.owner_company_id = $2
      `;
      
      const result = await this.db.query(query, [maintenanceId, providerId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.findById:', error);
      throw new Error(`Failed to find maintenance by ID: ${error.message}`);
    }
  }

  /**
   * Find maintenance by ID and Provider (alias for findById)
   * @param {number} maintenanceId - Maintenance ID
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object|null>}
   */
  async findByIdAndProvider(maintenanceId, providerId) {
    return this.findById(maintenanceId, providerId);
  }

  /**
   * Create new maintenance
   * @param {Object} maintenanceData - Maintenance data
   * @returns {Promise<Object>}
   */
  async create(maintenanceData) {
    try {
      const query = `
        INSERT INTO maintenances (
          provider_company_id, client_company_id, equipment_id, technician_id,
          type, description, scheduled_date, priority, status, estimated_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        maintenanceData.providerCompanyId,
        maintenanceData.clientCompanyId,
        maintenanceData.equipmentId,
        maintenanceData.technicianId,
        maintenanceData.type,
        maintenanceData.description,
        maintenanceData.scheduledDate,
        maintenanceData.priority || 'MEDIUM',
        maintenanceData.status || 'SCHEDULED',
        maintenanceData.estimatedCost || 0
      ];
      
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.create:', error);
      throw new Error(`Failed to create maintenance: ${error.message}`);
    }
  }

  /**
   * Update maintenance
   * @param {number} maintenanceId - Maintenance ID
   * @param {Object} updateData - Update data
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object>}
   */
  async update(maintenanceId, updateData, providerId) {
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 3}`)
        .join(', ');
      
      const query = `
        UPDATE maintenances 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE maintenance_id = $1 AND provider_company_id = $2
        RETURNING *
      `;
      
      const values = [maintenanceId, providerId, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Maintenance not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.update:', error);
      throw new Error(`Failed to update maintenance: ${error.message}`);
    }
  }

  /**
   * Delete maintenance
   * @param {number} maintenanceId - Maintenance ID
   * @param {number} providerId - Provider company ID
   * @returns {Promise<boolean>}
   */
  async delete(maintenanceId, providerId) {
    try {
      const query = `
        DELETE FROM maintenances 
        WHERE maintenance_id = $1 AND provider_company_id = $2
        RETURNING maintenance_id
      `;
      
      const result = await this.db.query(query, [maintenanceId, providerId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.delete:', error);
      throw new Error(`Failed to delete maintenance: ${error.message}`);
    }
  }

  /**
   * Get provider statistics (for dashboard)
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(providerId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as scheduled_count,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_count,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
          COUNT(CASE WHEN type = 'PREVENTIVE' THEN 1 END) as preventive_count,
          COUNT(CASE WHEN type = 'CORRECTIVE' THEN 1 END) as corrective_count
        FROM maintenances 
        WHERE provider_company_id = $1
      `;
      
      const result = await this.db.query(query, [providerId]);
      
      return {
        totalMaintenances: parseInt(result.rows[0].total_maintenances) || 0,
        scheduledCount: parseInt(result.rows[0].scheduled_count) || 0,
        inProgressCount: parseInt(result.rows[0].in_progress_count) || 0,
        completedCount: parseInt(result.rows[0].completed_count) || 0,
        preventiveCount: parseInt(result.rows[0].preventive_count) || 0,
        correctiveCount: parseInt(result.rows[0].corrective_count) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get maintenance statistics: ${error.message}`);
    }
  }

  /**
   * Get maintenance parts
   * @param {number} maintenanceId - Maintenance ID
   * @returns {Promise<Array>}
   */
  async getMaintenanceParts(maintenanceId) {
    try {
      // Check if table exists first
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'maintenance_parts'
        );
      `;
      
      const tableCheck = await this.db.query(tableCheckQuery);
      if (!tableCheck.rows[0].exists) {
        return []; // Return empty array if table doesn't exist
      }

      const query = `
        SELECT 
          mp.*,
          p.name as part_name,
          p.part_number,
          p.price as unit_price
        FROM maintenance_parts mp
        LEFT JOIN parts p ON mp.part_id = p.part_id
        WHERE mp.maintenance_id = $1
        ORDER BY mp.created_at
      `;
      
      const result = await this.db.query(query, [maintenanceId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.getMaintenanceParts:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get maintenance work logs
   * @param {number} maintenanceId - Maintenance ID
   * @returns {Promise<Array>}
   */
  async getMaintenanceWorkLogs(maintenanceId) {
    try {
      // Check if table exists first
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'maintenance_work_logs'
        );
      `;
      
      const tableCheck = await this.db.query(tableCheckQuery);
      if (!tableCheck.rows[0].exists) {
        return []; // Return empty array if table doesn't exist
      }

      const query = `
        SELECT 
          mwl.*,
          u.name as technician_name
        FROM maintenance_work_logs mwl
        LEFT JOIN users u ON mwl.technician_id = u.user_id
        WHERE mwl.maintenance_id = $1
        ORDER BY mwl.created_at
      `;
      
      const result = await this.db.query(query, [maintenanceId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.getMaintenanceWorkLogs:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get maintenance photos
   * @param {number} maintenanceId - Maintenance ID
   * @returns {Promise<Array>}
   */
  async getMaintenancePhotos(maintenanceId) {
    try {
      // Check if table exists first
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'maintenance_photos'
        );
      `;
      
      const tableCheck = await this.db.query(tableCheckQuery);
      if (!tableCheck.rows[0].exists) {
        return []; // Return empty array if table doesn't exist
      }

      const query = `
        SELECT 
          mp.*,
          u.name as uploaded_by_name
        FROM maintenance_photos mp
        LEFT JOIN users u ON mp.uploaded_by = u.user_id
        WHERE mp.maintenance_id = $1
        ORDER BY mp.created_at
      `;
      
      const result = await this.db.query(query, [maintenanceId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.getMaintenancePhotos:', error);
      return []; // Return empty array on error
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

module.exports = PostgreSQLMaintenanceRepository;
