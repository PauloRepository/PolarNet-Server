const IServiceRequestRepository = require('../../domain/repositories/IServiceRequestRepository');
const ServiceRequest = require('../../domain/entities/ServiceRequest');

/**
 * PostgreSQL Implementation: ServiceRequest Repository (Simplified)
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
               c.name as client_company_name,
               e.name as equipment_name, e.serial_number,
               u.name as technician_name
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
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
   * Find service requests by provider
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByProvider(providerId, filters = {}) {
    try {
      const { page = 1, limit = 20, status = '', priority = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE sr.provider_company_id = $1';
      let queryParams = [providerId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND sr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (priority) {
        whereClause += ` AND sr.priority = $${++paramCount}`;
        queryParams.push(priority);
      }

      const query = `
        SELECT sr.*, 
               c.name as client_company_name,
               e.name as equipment_name,
               u.name as technician_name,
               COUNT(*) OVER() as total_count
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        ${whereClause}
        ORDER BY sr.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        serviceRequests: result.rows.map(row => this.mapRowToEntity(row)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findByProvider:', error);
      throw new Error(`Failed to find service requests by provider: ${error.message}`);
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
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE service_requests 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE service_request_id = $1
        RETURNING *
      `;
      
      const values = [requestId, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Service request not found');
      }
      
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.update:', error);
      throw new Error(`Failed to update service request: ${error.message}`);
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
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority_requests
        FROM service_requests 
        WHERE provider_company_id = $1
      `;
      
      const result = await this.db.query(query, [providerId]);
      
      return {
        totalRequests: parseInt(result.rows[0].total_requests) || 0,
        pendingRequests: parseInt(result.rows[0].pending_requests) || 0,
        inProgressRequests: parseInt(result.rows[0].in_progress_requests) || 0,
        completedRequests: parseInt(result.rows[0].completed_requests) || 0,
        highPriorityRequests: parseInt(result.rows[0].high_priority_requests) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get service request statistics: ${error.message}`);
    }
  }

  /**
   * Get client statistics (for dashboard)
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
          COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority_requests
        FROM service_requests 
        WHERE client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      
      return {
        totalRequests: parseInt(result.rows[0].total_requests) || 0,
        pendingRequests: parseInt(result.rows[0].pending_requests) || 0,
        inProgressRequests: parseInt(result.rows[0].in_progress_requests) || 0,
        completedRequests: parseInt(result.rows[0].completed_requests) || 0,
        highPriorityRequests: parseInt(result.rows[0].high_priority_requests) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getClientStatistics:', error);
      throw new Error(`Failed to get client service request statistics: ${error.message}`);
    }
  }

  /**
   * Find service requests by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      const { page = 1, limit = 20, status = '', priority = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE sr.client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND sr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (priority) {
        whereClause += ` AND sr.priority = $${++paramCount}`;
        queryParams.push(priority);
      }

      const query = `
        SELECT sr.*, 
               p.name as provider_company_name,
               e.name as equipment_name, e.serial_number,
               u.name as technician_name,
               COUNT(*) OVER() as total_count
        FROM service_requests sr
        LEFT JOIN companies p ON sr.provider_company_id = p.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        ${whereClause}
        ORDER BY sr.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        serviceRequests: result.rows.map(row => ({
          ...this.mapRowToEntity(row),
          providerCompanyName: row.provider_company_name
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findByClientCompany:', error);
      throw new Error(`Failed to find service requests by client company: ${error.message}`);
    }
  }

  /**
   * Create new service request
   * @param {Object} serviceRequestData - Service request data
   * @returns {Promise<ServiceRequest>}
   */
  async create(serviceRequestData) {
    try {
      const query = `
        INSERT INTO service_requests (
          client_company_id, provider_company_id, equipment_id, technician_id,
          title, description, priority, status, scheduled_date, estimated_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        serviceRequestData.clientCompanyId,
        serviceRequestData.providerCompanyId,
        serviceRequestData.equipmentId,
        serviceRequestData.technicianId,
        serviceRequestData.title,
        serviceRequestData.description,
        serviceRequestData.priority || 'MEDIUM',
        serviceRequestData.status || 'PENDING',
        serviceRequestData.scheduledDate,
        serviceRequestData.estimatedCost || 0
      ];
      
      const result = await this.db.query(query, values);
      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.create:', error);
      throw new Error(`Failed to create service request: ${error.message}`);
    }
  }

  /**
   * Count service requests by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>}
   */
  async getClientRequestCount(clientCompanyId, filters = {}) {
    try {
      const { status = '', priority = '' } = filters;
      let whereClause = 'WHERE sr.client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND sr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (priority) {
        whereClause += ` AND sr.priority = $${++paramCount}`;
        queryParams.push(priority);
      }

      const query = `
        SELECT COUNT(*) as count
        FROM service_requests sr
        ${whereClause}
      `;
      
      const result = await this.db.query(query, queryParams);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getClientRequestCount:', error);
      throw new Error(`Failed to count client service requests: ${error.message}`);
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
   * Find service requests by equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>}
   */
  async findByEquipment(equipmentId, filters = {}) {
    try {
      const { limit = 50, offset = 0, status = '' } = filters;
      let whereClause = 'WHERE sr.equipment_id = $1';
      let queryParams = [equipmentId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND sr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      const query = `
        SELECT sr.*, 
               c.name as client_company_name,
               e.name as equipment_name,
               e.serial_number,
               u.name as technician_name
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        ${whereClause}
        ORDER BY sr.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await this.db.query(query, queryParams);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.findByEquipment:', error);
      throw new Error(`Failed to find service requests by equipment: ${error.message}`);
    }
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
      technicianId: row.technician_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      scheduledDate: row.scheduled_date,
      completedDate: row.completed_date,
      estimatedCost: parseFloat(row.estimated_cost) || 0,
      actualCost: parseFloat(row.actual_cost) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Additional fields from joins
      clientCompanyName: row.client_company_name,
      equipmentName: row.equipment_name,
      equipmentSerialNumber: row.serial_number,
      technicianName: row.technician_name
    });
  }

  /**
   * Get recent service requests for provider (for dashboard activities)
   * @param {number} providerCompanyId - Provider company ID
   * @param {number} limit - Maximum number of activities to return
   * @returns {Promise<Array>}
   */
  async getRecentByProvider(providerCompanyId, limit = 10) {
    try {
      const query = `
        SELECT 
          sr.*,
          c.name as client_company_name,
          e.name as equipment_name,
          u.name as technician_name
        FROM service_requests sr
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.technician_id = u.user_id
        WHERE sr.provider_company_id = $1
        ORDER BY sr.created_at DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [providerCompanyId, limit]);
      
      return result.rows.map(row => ({
        id: row.service_request_id,
        type: 'service_request',
        title: row.title || 'Service Request',
        description: row.description || 'Service request details',
        status: row.status,
        priority: row.priority,
        date: row.created_at,
        clientName: row.client_company_name,
        equipmentName: row.equipment_name,
        technicianName: row.technician_name,
        estimatedCost: parseFloat(row.estimated_cost || 0)
      }));
    } catch (error) {
      console.error('Error in PostgreSQLServiceRequestRepository.getRecentByProvider:', error);
      // Return empty array on error
      return [];
    }
  }
}

module.exports = PostgreSQLServiceRequestRepository;
