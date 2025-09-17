/**
 * PostgreSQL Service Request Repository Implementation
 */
const IServiceRequestRepository = require('../../domain/repositories/IServiceRequestRepository');
const ServiceRequest = require('../../domain/entities/ServiceRequest');

class PostgreSQLServiceRequestRepository extends IServiceRequestRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  async findById(serviceRequestId) {
    try {
      const query = `
        SELECT 
          sr.*,
          cc.name as client_company_name,
          pc.name as provider_company_name,
          cu.name as client_user_name,
          tu.name as technician_name,
          e.name as equipment_name,
          e.type as equipment_type,
          el.name as location_name
        FROM service_requests sr
        LEFT JOIN companies cc ON sr.client_company_id = cc.company_id
        LEFT JOIN companies pc ON sr.provider_company_id = pc.company_id
        LEFT JOIN users cu ON sr.client_user_id = cu.user_id
        LEFT JOIN users tu ON sr.technician_id = tu.user_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON sr.location_id = el.equipment_location_id
        WHERE sr.service_request_id = $1
      `;
      
      const result = await this.db.query(query, [serviceRequestId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding service request by ID: ${error.message}`);
    }
  }

  async findByProvider(providerCompanyId, filters = {}) {
    try {
      let query = `
        SELECT 
          sr.*,
          cc.name as client_company_name,
          cu.name as client_user_name,
          tu.name as technician_name,
          e.name as equipment_name,
          e.type as equipment_type
        FROM service_requests sr
        LEFT JOIN companies cc ON sr.client_company_id = cc.company_id
        LEFT JOIN users cu ON sr.client_user_id = cu.user_id
        LEFT JOIN users tu ON sr.technician_id = tu.user_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_company_id = $1
      `;
      
      const params = [providerCompanyId];
      let paramIndex = 2;

      // Aplicar filtros
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query += ` AND sr.status = ANY($${paramIndex})`;
          params.push(filters.status);
        } else {
          query += ` AND sr.status = $${paramIndex}`;
          params.push(filters.status);
        }
        paramIndex++;
      }

      if (filters.priority) {
        query += ` AND sr.priority = $${paramIndex}`;
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters.category) {
        query += ` AND sr.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters.technicianId) {
        query += ` AND sr.technician_id = $${paramIndex}`;
        params.push(filters.technicianId);
        paramIndex++;
      }

      if (filters.equipmentId) {
        query += ` AND sr.equipment_id = $${paramIndex}`;
        params.push(filters.equipmentId);
        paramIndex++;
      }

      if (filters.startDate) {
        query += ` AND sr.request_date >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND sr.request_date <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      query += ` ORDER BY sr.request_date DESC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding service requests by provider: ${error.message}`);
    }
  }

  async findByClient(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT 
          sr.*,
          pc.name as provider_company_name,
          tu.name as technician_name,
          e.name as equipment_name,
          e.type as equipment_type
        FROM service_requests sr
        LEFT JOIN companies pc ON sr.provider_company_id = pc.company_id
        LEFT JOIN users tu ON sr.technician_id = tu.user_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramIndex = 2;

      // Aplicar filtros similares a findByProvider
      if (filters.status) {
        query += ` AND sr.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      query += ` ORDER BY sr.request_date DESC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding service requests by client: ${error.message}`);
    }
  }

  async findByDateRange(startDate, endDate, providerCompanyId) {
    try {
      const query = `
        SELECT 
          sr.*,
          cc.name as client_company_name,
          tu.name as technician_name
        FROM service_requests sr
        LEFT JOIN companies cc ON sr.client_company_id = cc.company_id
        LEFT JOIN users tu ON sr.technician_id = tu.user_id
        WHERE sr.provider_company_id = $1 
          AND sr.request_date >= $2 
          AND sr.request_date <= $3
        ORDER BY sr.request_date DESC
      `;
      
      const result = await this.db.query(query, [providerCompanyId, startDate, endDate]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding service requests by date range: ${error.message}`);
    }
  }

  async findUrgentRequests(providerCompanyId) {
    try {
      const query = `
        SELECT 
          sr.*,
          cc.name as client_company_name,
          e.name as equipment_name
        FROM service_requests sr
        LEFT JOIN companies cc ON sr.client_company_id = cc.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_company_id = $1 
          AND sr.priority IN ('HIGH', 'CRITICAL')
          AND sr.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')
        ORDER BY 
          CASE sr.priority 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            ELSE 3 
          END,
          sr.request_date ASC
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding urgent requests: ${error.message}`);
    }
  }

  async findOverdueRequests(providerCompanyId) {
    try {
      const query = `
        SELECT 
          sr.*,
          cc.name as client_company_name,
          e.name as equipment_name
        FROM service_requests sr
        LEFT JOIN companies cc ON sr.client_company_id = cc.company_id
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        WHERE sr.provider_company_id = $1 
          AND sr.deadline_date < CURRENT_TIMESTAMP
          AND sr.status NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED')
        ORDER BY sr.deadline_date ASC
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding overdue requests: ${error.message}`);
    }
  }

  async save(serviceRequest) {
    try {
      if (serviceRequest.serviceRequestId) {
        return await this.update(serviceRequest);
      } else {
        return await this.create(serviceRequest);
      }
    } catch (error) {
      throw new Error(`Error saving service request: ${error.message}`);
    }
  }

  async create(serviceRequest) {
    const query = `
      INSERT INTO service_requests (
        title, description, priority, issue_type, category,
        request_date, scheduled_date, completion_date, deadline_date,
        status, client_company_id, client_user_id, provider_company_id,
        technician_id, equipment_id, location_id, estimated_cost,
        final_cost, currency, client_rating, client_feedback,
        provider_rating, provider_feedback, attachments, completion_photos,
        internal_notes, client_notes, technician_notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      RETURNING *
    `;

    const params = [
      serviceRequest.title,
      serviceRequest.description,
      serviceRequest.priority,
      serviceRequest.issueType,
      serviceRequest.category,
      serviceRequest.requestDate || new Date(),
      serviceRequest.scheduledDate,
      serviceRequest.completionDate,
      serviceRequest.deadlineDate,
      serviceRequest.status,
      serviceRequest.clientCompanyId,
      serviceRequest.clientUserId,
      serviceRequest.providerCompanyId,
      serviceRequest.technicianId,
      serviceRequest.equipmentId,
      serviceRequest.locationId,
      serviceRequest.estimatedCost,
      serviceRequest.finalCost,
      serviceRequest.currency || 'CLP',
      serviceRequest.clientRating,
      serviceRequest.clientFeedback,
      serviceRequest.providerRating,
      serviceRequest.providerFeedback,
      serviceRequest.attachments ? JSON.stringify(serviceRequest.attachments) : null,
      serviceRequest.completionPhotos ? JSON.stringify(serviceRequest.completionPhotos) : null,
      serviceRequest.internalNotes,
      serviceRequest.clientNotes,
      serviceRequest.technicianNotes,
      new Date(),
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async update(serviceRequest) {
    const query = `
      UPDATE service_requests SET
        title = $2, description = $3, priority = $4, issue_type = $5,
        category = $6, scheduled_date = $7, completion_date = $8,
        deadline_date = $9, status = $10, technician_id = $11,
        estimated_cost = $12, final_cost = $13, client_rating = $14,
        client_feedback = $15, provider_rating = $16, provider_feedback = $17,
        attachments = $18, completion_photos = $19, internal_notes = $20,
        client_notes = $21, technician_notes = $22, updated_at = $23
      WHERE service_request_id = $1
      RETURNING *
    `;

    const params = [
      serviceRequest.serviceRequestId,
      serviceRequest.title,
      serviceRequest.description,
      serviceRequest.priority,
      serviceRequest.issueType,
      serviceRequest.category,
      serviceRequest.scheduledDate,
      serviceRequest.completionDate,
      serviceRequest.deadlineDate,
      serviceRequest.status,
      serviceRequest.technicianId,
      serviceRequest.estimatedCost,
      serviceRequest.finalCost,
      serviceRequest.clientRating,
      serviceRequest.clientFeedback,
      serviceRequest.providerRating,
      serviceRequest.providerFeedback,
      serviceRequest.attachments ? JSON.stringify(serviceRequest.attachments) : null,
      serviceRequest.completionPhotos ? JSON.stringify(serviceRequest.completionPhotos) : null,
      serviceRequest.internalNotes,
      serviceRequest.clientNotes,
      serviceRequest.technicianNotes,
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async count(criteria = {}) {
    try {
      let query = 'SELECT COUNT(*) FROM service_requests sr';
      const params = [];
      const conditions = [];
      let paramIndex = 1;

      if (criteria.providerCompanyId) {
        conditions.push(`sr.provider_company_id = $${paramIndex}`);
        params.push(criteria.providerCompanyId);
        paramIndex++;
      }

      if (criteria.clientCompanyId) {
        conditions.push(`sr.client_company_id = $${paramIndex}`);
        params.push(criteria.clientCompanyId);
        paramIndex++;
      }

      if (criteria.status) {
        if (Array.isArray(criteria.status)) {
          conditions.push(`sr.status = ANY($${paramIndex})`);
          params.push(criteria.status);
        } else {
          conditions.push(`sr.status = $${paramIndex}`);
          params.push(criteria.status);
        }
        paramIndex++;
      }

      if (criteria.priority) {
        conditions.push(`sr.priority = $${paramIndex}`);
        params.push(criteria.priority);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting service requests: ${error.message}`);
    }
  }

  async getStats(providerCompanyId, period) {
    try {
      const { startDate, endDate } = period;
      
      const query = `
        SELECT 
          status,
          priority,
          COUNT(*) as count,
          AVG(
            CASE 
              WHEN completion_date IS NOT NULL AND request_date IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (completion_date - request_date)) / 3600 
              ELSE NULL 
            END
          ) as avg_resolution_hours,
          SUM(final_cost) as total_revenue
        FROM service_requests
        WHERE provider_company_id = $1 
          AND request_date >= $2 
          AND request_date <= $3
        GROUP BY status, priority
        ORDER BY count DESC
      `;
      
      const result = await this.db.query(query, [providerCompanyId, startDate, endDate]);
      
      return {
        byStatus: this.groupBy(result.rows, 'status'),
        byPriority: this.groupBy(result.rows, 'priority'),
        totalRevenue: result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0),
        avgResolutionTime: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_resolution_hours || 0), 0) / result.rows.length
      };
    } catch (error) {
      throw new Error(`Error getting service request stats: ${error.message}`);
    }
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }

  mapToEntity(row) {
    return new ServiceRequest({
      serviceRequestId: row.service_request_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      issueType: row.issue_type,
      category: row.category,
      requestDate: row.request_date,
      scheduledDate: row.scheduled_date,
      completionDate: row.completion_date,
      deadlineDate: row.deadline_date,
      status: row.status,
      clientCompanyId: row.client_company_id,
      clientUserId: row.client_user_id,
      providerCompanyId: row.provider_company_id,
      technicianId: row.technician_id,
      equipmentId: row.equipment_id,
      locationId: row.location_id,
      estimatedCost: parseFloat(row.estimated_cost) || 0,
      finalCost: parseFloat(row.final_cost) || 0,
      currency: row.currency,
      clientRating: row.client_rating,
      clientFeedback: row.client_feedback,
      providerRating: row.provider_rating,
      providerFeedback: row.provider_feedback,
      attachments: row.attachments ? JSON.parse(row.attachments) : null,
      completionPhotos: row.completion_photos ? JSON.parse(row.completion_photos) : null,
      internalNotes: row.internal_notes,
      clientNotes: row.client_notes,
      technicianNotes: row.technician_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLServiceRequestRepository;
