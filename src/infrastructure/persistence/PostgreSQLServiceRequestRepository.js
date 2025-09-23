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
               u.first_name, u.last_name
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
               u.first_name, u.last_name,
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
      technicianFirstName: row.first_name,
      technicianLastName: row.last_name
    });
  }
}

module.exports = PostgreSQLServiceRequestRepository;
