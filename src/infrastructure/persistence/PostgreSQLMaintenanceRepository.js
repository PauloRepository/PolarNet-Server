/**
 * PostgreSQL Implementation: Maintenance Repository
 * Handles maintenance data persistence using PostgreSQL
 */
const IMaintenanceRepository = require('../../domain/repositories/IMaintenanceRepository');

class PostgreSQLMaintenanceRepository extends IMaintenanceRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find maintenances with filters
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByProvider(providerId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '',
        type = '',
        category = '',
        priority = '',
        technicianId = '',
        equipmentId = '',
        clientId = '',
        dateFrom = '',
        dateTo = '',
        sortBy = 'scheduled_date',
        sortOrder = 'desc'
      } = filters;

      const offset = (page - 1) * limit;
      let whereClause = `WHERE m.provider_company_id = $1`;
      let queryParams = [providerId];
      let paramCount = 1;

      // Add search filter
      if (search) {
        paramCount++;
        whereClause += ` AND (m.title ILIKE $${paramCount} OR m.description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      // Add status filter
      if (status) {
        paramCount++;
        whereClause += ` AND m.status = $${paramCount}`;
        queryParams.push(status);
      }

      // Add type filter
      if (type) {
        paramCount++;
        whereClause += ` AND m.type = $${paramCount}`;
        queryParams.push(type);
      }

      // Add category filter
      if (category) {
        paramCount++;
        whereClause += ` AND m.category = $${paramCount}`;
        queryParams.push(category);
      }

      // Add priority filter
      if (priority) {
        paramCount++;
        whereClause += ` AND m.priority = $${paramCount}`;
        queryParams.push(priority);
      }

      // Add technician filter
      if (technicianId) {
        paramCount++;
        whereClause += ` AND m.technician_id = $${paramCount}`;
        queryParams.push(parseInt(technicianId));
      }

      // Add equipment filter
      if (equipmentId) {
        paramCount++;
        whereClause += ` AND m.equipment_id = $${paramCount}`;
        queryParams.push(parseInt(equipmentId));
      }

      // Add client filter
      if (clientId) {
        paramCount++;
        whereClause += ` AND m.client_company_id = $${paramCount}`;
        queryParams.push(parseInt(clientId));
      }

      // Add date range filters
      if (dateFrom) {
        paramCount++;
        whereClause += ` AND m.scheduled_date >= $${paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        whereClause += ` AND m.scheduled_date <= $${paramCount}`;
        queryParams.push(dateTo);
      }

      // Main query
      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.serial_number as equipment_serial,
          e.model as equipment_model,
          t.first_name as technician_first_name,
          t.last_name as technician_last_name,
          c.name as client_company_name,
          COUNT(*) OVER() as total_count
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN users t ON m.technician_id = t.user_id
        LEFT JOIN companies c ON m.client_company_id = c.company_id
        ${whereClause}
        ORDER BY m.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await this.db.query(query, queryParams);
      
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      return {
        maintenances: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
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
          e.type as equipment_type,
          e.serial_number as equipment_serial,
          e.model as equipment_model,
          e.manufacturer as equipment_brand,
          t.first_name as technician_first_name,
          t.last_name as technician_last_name,
          t.phone as technician_phone,
          c.name as client_company_name,
          c.phone as client_phone,
          c.email as client_email
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN users t ON m.technician_id = t.user_id
        LEFT JOIN companies c ON m.client_company_id = c.company_id
        WHERE m.maintenance_id = $1 AND m.provider_company_id = $2
      `;

      const result = await this.db.query(query, [maintenanceId, providerId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.findById:', error);
      throw new Error(`Failed to find maintenance: ${error.message}`);
    }
  }

  /**
   * Create new maintenance
   * @param {Object} maintenanceData - Maintenance data
   * @returns {Promise<Object>}
   */
  async create(maintenanceData) {
    try {
      const {
        title,
        description,
        type,
        category,
        equipmentId,
        technicianId,
        clientCompanyId,
        providerCompanyId,
        scheduledDate,
        estimatedDurationHours,
        priority,
        estimatedCost,
        laborCost,
        partsCost,
        serviceRequestId,
        preMaintenanceChecklist,
        maintenanceSteps,
        postMaintenanceChecklist,
        safetyRequirements,
        requiredParts,
        requiredTools
      } = maintenanceData;

      const query = `
        INSERT INTO maintenances (
          title, description, type, category, equipment_id, technician_id,
          client_company_id, provider_company_id, scheduled_date,
          estimated_duration_hours, priority, estimated_cost, labor_cost,
          parts_cost, service_request_id, pre_maintenance_checklist,
          maintenance_steps, post_maintenance_checklist, safety_requirements,
          required_parts, required_tools, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'SCHEDULED')
        RETURNING *
      `;

      const values = [
        title, description, type, category, equipmentId, technicianId,
        clientCompanyId, providerCompanyId, scheduledDate, estimatedDurationHours,
        priority, estimatedCost, laborCost, partsCost, serviceRequestId,
        preMaintenanceChecklist, maintenanceSteps, postMaintenanceChecklist,
        safetyRequirements, requiredParts, requiredTools
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
      const setClause = [];
      const values = [];
      let paramCount = 0;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'updatedBy') {
          paramCount++;
          setClause.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
        }
      });

      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `
        UPDATE maintenances 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE maintenance_id = $${++paramCount} AND provider_company_id = $${++paramCount}
        RETURNING *
      `;

      values.push(maintenanceId, providerId);

      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Maintenance not found or access denied');
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
      `;

      const result = await this.db.query(query, [maintenanceId, providerId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.delete:', error);
      throw new Error(`Failed to delete maintenance: ${error.message}`);
    }
  }

  /**
   * Get maintenance statistics
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Filters
   * @returns {Promise<Object>}
   */
  async getStatistics(providerId, filters = {}) {
    try {
      const { period = '12months', type = '', technicianId = '', equipmentType = '' } = filters;

      let dateFilter = '';
      if (period === '30days') {
        dateFilter = `AND m.scheduled_date >= CURRENT_DATE - INTERVAL '30 days'`;
      } else if (period === '6months') {
        dateFilter = `AND m.scheduled_date >= CURRENT_DATE - INTERVAL '6 months'`;
      } else {
        dateFilter = `AND m.scheduled_date >= CURRENT_DATE - INTERVAL '12 months'`;
      }

      let additionalFilters = '';
      const params = [providerId];
      let paramCount = 1;

      if (type) {
        paramCount++;
        additionalFilters += ` AND m.type = $${paramCount}`;
        params.push(type);
      }

      if (technicianId) {
        paramCount++;
        additionalFilters += ` AND m.technician_id = $${paramCount}`;
        params.push(parseInt(technicianId));
      }

      if (equipmentType) {
        paramCount++;
        additionalFilters += ` AND e.type = $${paramCount}`;
        params.push(equipmentType);
      }

      const query = `
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN m.status = 'SCHEDULED' THEN 1 END) as scheduled_count,
          COUNT(CASE WHEN m.status = 'IN_PROGRESS' THEN 1 END) as in_progress_count,
          COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as completed_count,
          COUNT(CASE WHEN m.status = 'CANCELLED' THEN 1 END) as cancelled_count,
          AVG(m.estimated_cost) as avg_estimated_cost,
          AVG(m.actual_cost) as avg_actual_cost,
          AVG(EXTRACT(EPOCH FROM (m.actual_end_time - m.actual_start_time))/3600) as avg_duration_hours
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        WHERE m.provider_company_id = $1 ${dateFilter} ${additionalFilters}
      `;

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.getStatistics:', error);
      throw new Error(`Failed to get maintenance statistics: ${error.message}`);
    }
  }

  /**
   * Get maintenance KPI
   * @param {number} providerId - Provider company ID
   * @param {string} period - Time period
   * @returns {Promise<Object>}
   */
  async getKPI(providerId, period) {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN m.actual_end_time <= m.scheduled_date THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as on_time_percentage,
          COALESCE(AVG(m.actual_cost), 0) as avg_cost,
          COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as efficiency
        FROM maintenances m
        WHERE m.provider_company_id = $1 
          AND m.scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
          AND m.status IN ('COMPLETED', 'CANCELLED')
      `;

      const result = await this.db.query(query, [providerId]);
      const row = result.rows[0];

      return {
        onTime: Math.round((parseFloat(row.on_time_percentage) || 0) * 100) / 100,
        avgCost: Math.round((parseFloat(row.avg_cost) || 0) * 100) / 100,
        efficiency: Math.round((parseFloat(row.efficiency) || 0) * 100) / 100
      };
    } catch (error) {
      console.error('Error in PostgreSQLMaintenanceRepository.getKPI:', error);
      return { onTime: 0, avgCost: 0, efficiency: 0 };
    }
  }
}

module.exports = PostgreSQLMaintenanceRepository;
