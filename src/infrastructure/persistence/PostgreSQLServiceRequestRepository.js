const IServiceRequestRepository = require('../../domain/repositories/IServiceRequestRepository');
const ServiceRequest = require('../../domain/entities/ServiceRequest');

/**
 * PostgreSQL Implementation: ServiceRequest Repository
 * Implements service request data persistence using PostgreSQL
 */
class PostgreSQLServiceRequestRepository extends IServiceRequestRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find service request by ID
   * @param {number} requestId - Service request ID
   * @returns {Promise<ServiceRequest|null>}
   */
  async findById(requestId) {
    try {
      const query = `
        SELECT sr.*,
               c.name as client_company_name, c.type as client_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               ut.name as technician_name, ut.email as technician_email,
               uc.name as created_by_name, uc.email as created_by_email
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users ut ON sr.technician_id = ut.user_id
        LEFT JOIN users uc ON sr.client_user_id = uc.user_id
        WHERE sr.service_request_id = $1
      `;
      
      const result = await this.db.query(query, [requestId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findById:', error);
      throw new Error(`Failed to find service request by ID: ${error.message}`);
    }
  }

  /**
   * Find service requests by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT sr.*,
               c.name as client_company_name, c.type as client_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
     ut.name as technician_name, ut.email as technician_email,
     uc.name as created_by_name, uc.email as created_by_email
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
   LEFT JOIN users ut ON sr.technician_id = ut.user_id
   LEFT JOIN users uc ON sr.client_user_id = uc.user_id
        WHERE sr.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND sr.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.priority) {
        paramCount++;
        query += ` AND sr.priority = $${paramCount}`;
        params.push(filters.priority);
      }

      if (filters.type) {
        paramCount++;
  query += ` AND sr.issue_type = $${paramCount}`;
        params.push(filters.type);
      }

      query += ` ORDER BY sr.created_at DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findByClientCompany:', error);
      throw new Error(`Failed to find service requests by client company: ${error.message}`);
    }
  }

  /**
   * Find service requests by technician
   * @param {number} technicianId - Technician user ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByTechnician(technicianId, filters = {}) {
    try {
      let query = `
        SELECT sr.*,
               c.name as client_company_name, c.type as client_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               ut.name as technician_name, ut.email as technician_email,
               uc.name as created_by_name, uc.email as created_by_email
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users ut ON sr.technician_id = ut.user_id
        LEFT JOIN users uc ON sr.client_user_id = uc.user_id
        WHERE sr.technician_id = $1
      `;
      
      const params = [technicianId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND sr.status = $${paramCount}`;
        params.push(filters.status);
      }

      query += ` ORDER BY sr.priority DESC, sr.created_at ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findByTechnician:', error);
      throw new Error(`Failed to find service requests by technician: ${error.message}`);
    }
  }

  /**
   * Find pending service requests
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async findPending(filters = {}) {
    try {
      let query = `
        SELECT sr.*,
               c.name as client_company_name, c.type as client_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               ut.name as technician_name, ut.email as technician_email,
               uc.name as created_by_name, uc.email as created_by_email
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users ut ON sr.technician_id = ut.user_id
        LEFT JOIN users uc ON sr.client_user_id = uc.user_id
        WHERE sr.status = 'PENDING'
      `;
      
      const params = [];
      let paramCount = 0;

      if (filters.priority) {
        paramCount++;
        query += ` AND sr.priority = $${paramCount}`;
        params.push(filters.priority);
      }

      if (filters.type) {
        paramCount++;
        query += ` AND sr.issue_type = $${paramCount}`;
        params.push(filters.type);
      }

      query += ` ORDER BY sr.priority DESC, sr.created_at ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findPending:', error);
      throw new Error(`Failed to find pending service requests: ${error.message}`);
    }
  }

  /**
   * Get high priority requests for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<ServiceRequest[]>}
   */
  async getHighPriorityByClient(clientCompanyId) {
    try {
      const query = `
        SELECT sr.*,
               c.name as client_company_name, c.type as client_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model,
               ut.name as technician_name, ut.email as technician_email,
               uc.name as created_by_name, uc.email as created_by_email
  FROM service_requests sr
  LEFT JOIN companies c ON sr.client_company_id = c.company_id
  LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
  LEFT JOIN users ut ON sr.technician_id = ut.user_id
  LEFT JOIN users uc ON sr.client_user_id = uc.user_id
  WHERE sr.client_company_id = $1
          AND sr.priority = 'HIGH'
          AND sr.status NOT IN ('COMPLETED', 'CANCELLED')
         
        ORDER BY sr.created_at ASC
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getHighPriorityByClient:', error);
      throw new Error(`Failed to get high priority requests: ${error.message}`);
    }
  }

  /**
   * Create new service request
   * @param {Object} requestData - Service request data
   * @returns {Promise<ServiceRequest>}
   */
  async create(requestData) {
    try {
      const query = `
        INSERT INTO service_requests (
          equipment_id, 
          client_company_id, 
          provider_company_id,
          title, 
          description, 
          priority, 
          status,
          scheduled_date,
          request_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING service_request_id
      `;

      const params = [
        requestData.equipmentId,
        requestData.clientCompanyId,
        requestData.providerCompanyId || null, // We'll need to resolve this from equipment
        requestData.title || requestData.description, // Use description as title if title not provided
        requestData.description,
        requestData.priority || 'MEDIUM',
        requestData.status || 'PENDING',
        requestData.scheduledDate
      ];

      const result = await this.db.query(query, params);
      return await this.findById(result.rows[0].service_request_id);
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.create:', error);
      throw new Error(`Failed to create service request: ${error.message}`);
    }
  }

  /**
   * Update service request
   * @param {number} requestId - Service request ID
   * @param {Object} updateData - Update data
   * @returns {Promise<ServiceRequest>}
   */
  async update(requestId, updateData) {
    try {
      const allowedFields = [
        'title', 'description', 'priority', 'status',
        'technician_id', 'scheduled_date', 'completion_date',
        'estimated_cost', 'final_cost'
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

      // Add request ID parameter
      paramCount++;
      params.push(requestId);

      const query = `
        UPDATE service_requests 
        SET ${updateFields.join(', ')}
        WHERE service_request_id = $${paramCount}
        RETURNING service_request_id
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Service request not found');
      }

      return await this.findById(result.rows[0].service_request_id);
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.update:', error);
      throw new Error(`Failed to update service request: ${error.message}`);
    }
  }

  /**
   * Delete service request (soft delete)
   * @param {number} requestId - Service request ID
   * @returns {Promise<boolean>}
   */
  async delete(requestId) {
    try {
      const query = `
        UPDATE service_requests 
        SET deleted_at = $1, status = 'CANCELLED'
        WHERE service_request_id = $2
        RETURNING service_request_id
      `;

      const result = await this.db.query(query, [new Date(), requestId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.delete:', error);
      throw new Error(`Failed to delete service request: ${error.message}`);
    }
  }

  /**
   * Assign technician to service request
   * @param {number} requestId - Service request ID
   * @param {number} technicianId - Technician user ID
   * @returns {Promise<ServiceRequest>}
   */
  async assignTechnician(requestId, technicianId) {
    try {
      const query = `
        UPDATE service_requests 
        SET technician_id = $1, 
            status = CASE WHEN status = 'PENDING' THEN 'ASSIGNED' ELSE status END,
            updated_at = $2
        WHERE service_request_id = $3
        RETURNING service_request_id
      `;

      const result = await this.db.query(query, [technicianId, new Date(), requestId]);
      
      if (result.rows.length === 0) {
        throw new Error('Service request not found');
      }

      return await this.findById(result.rows[0].service_request_id);
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.assignTechnician:', error);
      throw new Error(`Failed to assign technician: ${error.message}`);
    }
  }

  /**
   * Get client request statistics
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientStatistics(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN priority = 'HIGH' AND status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as high_priority_open,
          AVG(CASE WHEN status = 'COMPLETED' THEN EXTRACT(EPOCH FROM (updated_at - created_at))/3600 END) as avg_resolution_hours
        FROM service_requests
        WHERE client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getClientStatistics:', error);
      throw new Error(`Failed to get client statistics: ${error.message}`);
    }
  }

  /**
   * Count service requests by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async countByClientCompany(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM service_requests sr
        WHERE sr.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND sr.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.priority) {
        paramCount++;
        query += ` AND sr.priority = $${paramCount}`;
        params.push(filters.priority);
      }

      if (filters.type) {
        paramCount++;
        query += ` AND sr.issue_type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.equipmentId) {
        paramCount++;
        query += ` AND sr.equipment_id = $${paramCount}`;
        params.push(filters.equipmentId);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.countByClientCompany:', error);
      throw new Error(`Failed to count service requests: ${error.message}`);
    }
  }

  /**
   * Get client request count (alias for countByClientCompany)
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async getClientRequestCount(clientCompanyId, filters = {}) {
    return this.countByClientCompany(clientCompanyId, filters);
  }

  /**
   * Find service requests by provider
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
        priority = '',
        technicianId = '',
        equipmentId = '',
        clientId = '',
        dateFrom = '',
        dateTo = '',
        sortBy = 'request_date',
        sortOrder = 'desc'
      } = filters;

      const offset = (page - 1) * limit;
      let whereClause = `WHERE sr.provider_company_id = $1`;
      let queryParams = [providerId];
      let paramCount = 1;

      // Add search filter
      if (search) {
        paramCount++;
        whereClause += ` AND (sr.title ILIKE $${paramCount} OR sr.description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      // Add status filter
      if (status) {
        const statuses = status.split(',').map(s => s.trim());
        const statusPlaceholders = statuses.map(() => `$${++paramCount}`).join(',');
        whereClause += ` AND sr.status IN (${statusPlaceholders})`;
        queryParams.push(...statuses);
      }

      // Add priority filter
      if (priority) {
        paramCount++;
        whereClause += ` AND sr.priority = $${paramCount}`;
        queryParams.push(priority);
      }

      // Add technician filter
      if (technicianId) {
        paramCount++;
        whereClause += ` AND sr.assigned_technician_id = $${paramCount}`;
        queryParams.push(parseInt(technicianId));
      }

      // Add equipment filter
      if (equipmentId) {
        paramCount++;
        whereClause += ` AND sr.equipment_id = $${paramCount}`;
        queryParams.push(parseInt(equipmentId));
      }

      // Add client filter
      if (clientId) {
        paramCount++;
        whereClause += ` AND sr.client_company_id = $${paramCount}`;
        queryParams.push(parseInt(clientId));
      }

      // Add date range filters
      if (dateFrom) {
        paramCount++;
        whereClause += ` AND sr.request_date >= $${paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        whereClause += ` AND sr.request_date <= $${paramCount}`;
        queryParams.push(dateTo);
      }

      // Main query
      const query = `
        SELECT 
          sr.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.serial_number as equipment_serial,
          t.first_name as technician_first_name,
          t.last_name as technician_last_name,
          c.name as client_company_name,
          COUNT(*) OVER() as total_count
        FROM service_requests sr
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users t ON sr.assigned_technician_id = t.user_id
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        ${whereClause}
        ORDER BY sr.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await this.db.query(query, queryParams);
      
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      return {
        serviceRequests: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findByProvider:', error);
      throw new Error(`Failed to find service requests: ${error.message}`);
    }
  }

  /**
   * Count pending service requests by provider
   * @param {number} providerId - Provider company ID
   * @returns {Promise<number>}
   */
  async countPendingByProvider(providerId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM service_requests 
        WHERE provider_company_id = $1 AND status = 'PENDING'
      `;
      
      const result = await this.db.query(query, [providerId]);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.countPendingByProvider:', error);
      return 0;
    }
  }

  /**
   * Get service request statistics
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Statistics filters
   * @returns {Promise<Object>}
   */
  async getStatistics(providerId, filters = {}) {
    try {
      const { period = '30days' } = filters;
      
      let dateFilter = '';
      if (period === '30days') {
        dateFilter = `AND sr.request_date >= CURRENT_DATE - INTERVAL '30 days'`;
      } else if (period === '6months') {
        dateFilter = `AND sr.request_date >= CURRENT_DATE - INTERVAL '6 months'`;
      }

      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN sr.status = 'PENDING' THEN 1 END) as pending,
          COUNT(CASE WHEN sr.status = 'IN_PROGRESS' THEN 1 END) as "inProgress",
          COUNT(CASE WHEN sr.status = 'RESOLVED' THEN 1 END) as resolved
        FROM service_requests sr
        WHERE sr.provider_company_id = $1 ${dateFilter}
      `;

      const result = await this.db.query(query, [providerId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getStatistics:', error);
      return { total: 0, pending: 0, inProgress: 0, resolved: 0 };
    }
  }

  /**
   * Get service trends
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Trend filters
   * @returns {Promise<Object>}
   */
  async getTrends(providerId, filters = {}) {
    try {
      const { period = '6months' } = filters;
      
      const query = `
        SELECT 
          DATE_TRUNC('month', sr.request_date) as month,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'RESOLVED' THEN 1 END) as resolved_requests,
          AVG(EXTRACT(EPOCH FROM (sr.assigned_at - sr.request_date))/3600) as avg_response_time,
          AVG(EXTRACT(EPOCH FROM (sr.resolved_at - sr.request_date))/3600) as avg_resolution_time
        FROM service_requests sr
        WHERE sr.provider_company_id = $1 
          AND sr.request_date >= CURRENT_DATE - INTERVAL '${period === '6months' ? '6 months' : '12 months'}'
        GROUP BY DATE_TRUNC('month', sr.request_date)
        ORDER BY month
      `;

      const result = await this.db.query(query, [providerId]);
      
      const totalRequests = result.rows.reduce((sum, row) => sum + parseInt(row.total_requests), 0);
      const resolvedRequests = result.rows.reduce((sum, row) => sum + parseInt(row.resolved_requests), 0);
      const avgResponseTime = result.rows.reduce((sum, row) => sum + (parseFloat(row.avg_response_time) || 0), 0) / Math.max(result.rows.length, 1);
      const avgResolutionTime = result.rows.reduce((sum, row) => sum + (parseFloat(row.avg_resolution_time) || 0), 0) / Math.max(result.rows.length, 1);

      return {
        trends: result.rows,
        totalRequests,
        resolvedRequests,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        avgResolutionTime: Math.round(avgResolutionTime * 100) / 100
      };
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getTrends:', error);
      return {
        trends: [],
        totalRequests: 0,
        resolvedRequests: 0,
        avgResponseTime: 0,
        avgResolutionTime: 0
      };
    }
  }

  /**
   * Get quality KPI
   * @param {number} providerId - Provider company ID
   * @param {string} period - Time period
   * @returns {Promise<Object>}
   */
  async getQualityKPI(providerId, period) {
    try {
      const query = `
        SELECT 
          AVG(EXTRACT(EPOCH FROM (assigned_at - request_date))/3600) as avg_response_time,
          AVG(EXTRACT(EPOCH FROM (resolved_at - request_date))/3600) as avg_resolution_time,
          COALESCE(AVG(customer_rating), 0) as satisfaction
        FROM service_requests
        WHERE provider_company_id = $1 
          AND request_date >= CURRENT_DATE - INTERVAL '30 days'
          AND status = 'RESOLVED'
      `;

      const result = await this.db.query(query, [providerId]);
      const row = result.rows[0];

      return {
        responseTime: Math.round((parseFloat(row.avg_response_time) || 0) * 100) / 100,
        resolutionTime: Math.round((parseFloat(row.avg_resolution_time) || 0) * 100) / 100,
        satisfaction: Math.round((parseFloat(row.satisfaction) || 0) * 100) / 100
      };
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getQualityKPI:', error);
      return { responseTime: 0, resolutionTime: 0, satisfaction: 0 };
    }
  }

  /**
   * Update service request
   * @param {number} serviceRequestId - Service request ID
   * @param {Object} updateData - Update data
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object>}
   */
  async update(serviceRequestId, updateData, providerId) {
    try {
      const setClause = [];
      const values = [];
      let paramCount = 0;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          paramCount++;
          setClause.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
        }
      });

      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `
        UPDATE service_requests 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE service_request_id = $${++paramCount} AND provider_company_id = $${++paramCount}
        RETURNING *
      `;

      values.push(serviceRequestId, providerId);

      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Service request not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.update:', error);
      throw new Error(`Failed to update service request: ${error.message}`);
    }
  }

  /**
   * Add update to service request
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async addUpdate(updateData) {
    try {
      const query = `
        INSERT INTO service_request_updates (
          service_request_id, update_type, message, photos, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        updateData.service_request_id,
        updateData.update_type,
        updateData.message,
        updateData.photos,
        updateData.created_by
      ];

      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.addUpdate:', error);
      throw new Error(`Failed to add update: ${error.message}`);
    }
  }

  /**
   * Get service request updates
   * @param {number} serviceRequestId - Service request ID
   * @returns {Promise<Array>}
   */
  async getUpdates(serviceRequestId) {
    try {
      const query = `
        SELECT sru.*, u.first_name, u.last_name
        FROM service_request_updates sru
        LEFT JOIN users u ON sru.created_by = u.user_id
        WHERE sru.service_request_id = $1
        ORDER BY sru.created_at DESC
      `;

      const result = await this.db.query(query, [serviceRequestId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getUpdates:', error);
      return [];
    }
  }

  /**
   * Get technician workload
   * @param {number} providerId - Provider company ID
   * @param {number} technicianId - Technician ID (optional)
   * @returns {Promise<Object>}
   */
  async getTechnicianWorkload(providerId, technicianId = null) {
    try {
      let query = `
        SELECT 
          u.user_id,
          u.first_name,
          u.last_name,
          COUNT(sr.service_request_id) as total_requests,
          COUNT(CASE WHEN sr.status = 'ASSIGNED' THEN 1 END) as assigned_requests,
          COUNT(CASE WHEN sr.status = 'IN_PROGRESS' THEN 1 END) as in_progress_requests
        FROM users u
        LEFT JOIN service_requests sr ON u.user_id = sr.assigned_technician_id
        WHERE u.company_id = $1 AND u.role = 'TECHNICIAN'
      `;

      const params = [providerId];

      if (technicianId) {
        query += ` AND u.user_id = $2`;
        params.push(technicianId);
      }

      query += ` GROUP BY u.user_id, u.first_name, u.last_name ORDER BY total_requests DESC`;

      const result = await this.db.query(query, params);
      return technicianId ? result.rows[0] || null : result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getTechnicianWorkload:', error);
      return technicianId ? null : [];
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
   * Map database row to ServiceRequest entity
   * @param {Object} row - Database row
   * @returns {ServiceRequest} ServiceRequest entity
   */
  mapRowToEntity(row) {
    return new ServiceRequest({
      id: row.service_request_id,
      clientCompanyId: row.client_company_id,
      providerCompanyId: row.provider_company_id,
      equipmentId: row.equipment_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      technicianId: row.technician_id,
      scheduledDate: row.scheduled_date,
      requestDate: row.request_date,
      completionDate: row.completion_date,
      estimatedCost: row.estimated_cost,
      finalCost: row.final_cost,
      notes: row.notes,
      createdAt: row.request_date, // Use request_date as createdAt
      updatedAt: row.updated_at || row.request_date // Use updated_at if exists, otherwise request_date
    });
  }
}

module.exports = PostgreSQLServiceRequestRepository;

