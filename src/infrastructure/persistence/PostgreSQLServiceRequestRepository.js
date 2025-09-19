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

