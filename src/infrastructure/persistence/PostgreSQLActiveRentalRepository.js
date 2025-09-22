const IActiveRentalRepository = require('../../domain/repositories/IActiveRentalRepository');
const ActiveRental = require('../../domain/entities/ActiveRental');

/**
 * PostgreSQL Implementation: ActiveRental Repository
 * Implements active rental contract data persistence using PostgreSQL
 */
class PostgreSQLActiveRentalRepository extends IActiveRentalRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find active rental by ID
   * @param {number} rentalId - Rental ID
   * @returns {Promise<ActiveRental|null>}
   */
  async findById(rentalId) {
    try {
      const query = `
        SELECT ar.*, 
               ce.name as client_company_name, ce.type as client_company_type,
               pe.name as provider_company_name, pe.type as provider_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.rental_id = $1
      `;
      
      const result = await this.db.query(query, [rentalId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.findById:', error);
      throw new Error(`Failed to find active rental by ID: ${error.message}`);
    }
  }

  /**
   * Find active rentals by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ActiveRental[]>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT ar.*, 
               ce.name as client_company_name, ce.type as client_company_type,
               pe.name as provider_company_name, pe.type as provider_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND ar.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.equipmentType) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.equipmentType);
      }

      if (filters.startDateFrom) {
        paramCount++;
        query += ` AND ar.start_date >= $${paramCount}`;
        params.push(filters.startDateFrom);
      }

      if (filters.startDateTo) {
        paramCount++;
        query += ` AND ar.start_date <= $${paramCount}`;
        params.push(filters.startDateTo);
      }

      if (filters.endDateFrom) {
        paramCount++;
        query += ` AND ar.end_date >= $${paramCount}`;
        params.push(filters.endDateFrom);
      }

      if (filters.endDateTo) {
        paramCount++;
        query += ` AND ar.end_date <= $${paramCount}`;
        params.push(filters.endDateTo);
      }

      query += ` ORDER BY ar.start_date DESC`;

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
      console.error('Error in PostgreSQLActiveRentalRepository.findByClientCompany:', error);
      throw new Error(`Failed to find rentals by client company: ${error.message}`);
    }
  }

  /**
   * Find active rentals by provider company
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ActiveRental[]>}
   */
  async findByProviderCompany(providerCompanyId, filters = {}) {
    try {
      let query = `
        SELECT ar.*, 
               ce.name as client_company_name, ce.type as client_company_type,
               pe.name as provider_company_name, pe.type as provider_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.provider_company_id = $1
      `;
      
      const params = [providerCompanyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND ar.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.clientCompanyId) {
        paramCount++;
        query += ` AND ar.client_company_id = $${paramCount}`;
        params.push(filters.clientCompanyId);
      }

      query += ` ORDER BY ar.start_date DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.findByProviderCompany:', error);
      throw new Error(`Failed to find rentals by provider company: ${error.message}`);
    }
  }

  /**
   * Get active rental by equipment
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<ActiveRental|null>}
   */
  async getActiveRentalByEquipment(equipmentId) {
    try {
      const query = `
        SELECT ar.*, 
               ce.name as client_company_name, ce.type as client_company_type,
               pe.name as provider_company_name, pe.type as provider_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.equipment_id = $1 AND ar.status = 'ACTIVE'
        ORDER BY ar.start_date DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getActiveRentalByEquipment:', error);
      throw new Error(`Failed to get active rental by equipment: ${error.message}`);
    }
  }

  /**
   * Find active contracts for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<ActiveRental[]>}
   */
  async findActiveByClient(clientCompanyId) {
    try {
      const query = `
        SELECT ar.*, 
               ce.name as client_company_name, ce.type as client_company_type,
               pe.name as provider_company_name, pe.type as provider_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1 
          AND ar.status = 'ACTIVE' 
         
        ORDER BY ar.start_date DESC
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.findActiveByClient:', error);
      throw new Error(`Failed to find active contracts by client: ${error.message}`);
    }
  }

  /**
   * Find expiring contracts for client
   * @param {number} clientCompanyId - Client company ID
   * @param {number} daysAhead - Number of days ahead to check
   * @returns {Promise<ActiveRental[]>}
   */
  async findExpiringByClient(clientCompanyId, daysAhead = 30) {
    try {
      const query = `
        SELECT ar.*, 
               ce.name as client_company_name, ce.type as client_company_type,
               pe.name as provider_company_name, pe.type as provider_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1 
          AND ar.status = 'ACTIVE'
          AND ar.end_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
          AND ar.end_date > CURRENT_DATE
         
        ORDER BY ar.end_date ASC
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.findExpiringByClient:', error);
      throw new Error(`Failed to find expiring contracts: ${error.message}`);
    }
  }

  /**
   * Create new active rental
   * @param {Object} rentalData - Rental data
   * @returns {Promise<ActiveRental>}
   */
  async create(rentalData) {
    try {
      const query = `
        INSERT INTO active_rentals (
          equipment_id, client_company_id, provider_company_id,
          start_date, end_date, monthly_rate, currency, security_deposit,
          status, renewal_terms, special_conditions, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING rental_id
      `;
      
      const now = new Date();
      const params = [
        rentalData.equipmentId,
        rentalData.clientCompanyId,
        rentalData.providerCompanyId,
        rentalData.startDate,
        rentalData.endDate,
        rentalData.monthlyRate,
        rentalData.currency || 'CLP',
        rentalData.securityDeposit,
        rentalData.status || 'ACTIVE',
        rentalData.renewalTerms,
        rentalData.specialConditions,
        rentalData.createdAt || now,
        now
      ];

      const result = await this.db.query(query, params);
      return await this.findById(result.rows[0].rental_id);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.create:', error);
      throw new Error(`Failed to create active rental: ${error.message}`);
    }
  }

  /**
   * Update active rental
   * @param {number} rentalId - Rental ID
   * @param {Object} updateData - Update data
   * @returns {Promise<ActiveRental>}
   */
  async update(rentalId, updateData) {
    try {
      const allowedFields = [
        'end_date', 'monthly_rate', 'security_deposit', 'status',
        'renewal_terms', 'special_conditions'
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

      // Add rental ID parameter
      paramCount++;
      params.push(rentalId);

      const query = `
        UPDATE active_rentals 
        SET ${updateFields.join(', ')}
        WHERE rental_id = $${paramCount}
        RETURNING rental_id
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Active rental not found');
      }

      return await this.findById(result.rows[0].rental_id);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.update:', error);
      throw new Error(`Failed to update active rental: ${error.message}`);
    }
  }

  /**
   * Delete active rental (soft delete)
   * @param {number} rentalId - Rental ID
   * @returns {Promise<boolean>}
   */
  async delete(rentalId) {
    try {
      const query = `
        UPDATE active_rentals 
        SET deleted_at = $1, status = 'TERMINATED'
        WHERE rental_id = $2
        RETURNING rental_id
      `;

      const result = await this.db.query(query, [new Date(), rentalId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.delete:', error);
      throw new Error(`Failed to delete active rental: ${error.message}`);
    }
  }

  /**
   * Get client contract count
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async getClientContractCount(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND ar.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.equipmentType) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.equipmentType);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getClientContractCount:', error);
      throw new Error(`Failed to get client contract count: ${error.message}`);
    }
  }

  /**
   * Get contract financial summary
   * @param {number} contractId - Contract ID
   * @returns {Promise<Object>}
   */
  async getContractFinancialSummary(contractId) {
    try {
      const query = `
        SELECT 
          ar.monthly_rate,
          ar.security_deposit,
          ar.currency,
          ar.start_date,
          ar.end_date,
          EXTRACT(MONTH FROM AGE(ar.end_date, ar.start_date)) as duration_months,
          (ar.monthly_rate * EXTRACT(MONTH FROM AGE(ar.end_date, ar.start_date))) as total_contract_value,
          (SELECT SUM(total_amount) FROM invoices WHERE rental_id = ar.rental_id AND status = 'PAID') as total_paid,
          (SELECT SUM(total_amount) FROM invoices WHERE rental_id = ar.rental_id AND status = 'PENDING') as total_pending
        FROM active_rentals ar
        WHERE ar.rental_id = $1
      `;
      
      const result = await this.db.query(query, [contractId]);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getContractFinancialSummary:', error);
      throw new Error(`Failed to get contract financial summary: ${error.message}`);
    }
  }

  /**
   * Get contract equipment history
   * @param {number} contractId - Contract ID
   * @returns {Promise<Object[]>}
   */
  async getContractEquipmentHistory(contractId) {
    try {
      const query = `
        SELECT 
          ar.rental_id,
          e.equipment_id as equipment_id,
          e.serial_number,
          e.type,
          e.manufacturer,
          e.model,
          ar.start_date,
          ar.end_date,
          ar.monthly_rate,
          ar.status
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.rental_id = $1
        ORDER BY ar.start_date DESC
      `;
      
      const result = await this.db.query(query, [contractId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getContractEquipmentHistory:', error);
      throw new Error(`Failed to get contract equipment history: ${error.message}`);
    }
  }

  /**
   * Create modification request
   * @param {Object} modificationRequest - Modification request data
   * @returns {Promise<Object>}
   */
  async createModificationRequest(modificationRequest) {
    try {
      // This would typically create a record in a contract_modifications table
      // For now, we'll simulate the creation and return the request data
      const requestId = Date.now(); // Simple ID generation for demo
      
      return {
        requestId,
        ...modificationRequest,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.createModificationRequest:', error);
      throw new Error(`Failed to create modification request: ${error.message}`);
    }
  }

  /**
   * Get client statistics
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientStatistics(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_contracts,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_contracts,
          COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired_contracts,
          COUNT(CASE WHEN end_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'ACTIVE' THEN 1 END) as expiring_soon,
          SUM(monthly_rate) as total_monthly_cost,
          AVG(monthly_rate) as avg_monthly_cost,
          MIN(start_date) as first_contract_date,
          MAX(end_date) as latest_end_date
        FROM active_rentals
        WHERE client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getClientStatistics:', error);
      throw new Error(`Failed to get client statistics: ${error.message}`);
    }
  }

  /**
   * Get provider statistics
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(providerCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_contracts,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_contracts,
          COUNT(DISTINCT client_company_id) as unique_clients,
          COUNT(DISTINCT equipment_id) as rented_equipment,
          SUM(monthly_rate) as total_monthly_revenue,
          AVG(monthly_rate) as avg_contract_value,
          MIN(start_date) as first_contract_date
        FROM active_rentals
        WHERE provider_company_id = $1
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get provider statistics: ${error.message}`);
    }
  }

  /**
   * Get client contracts by equipment type
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object[]>}
   */
  async getClientContractsByEquipmentType(clientCompanyId) {
    try {
      const query = `
        SELECT 
          e.type as equipment_type,
          COUNT(ar.rental_id) as contract_count,
          SUM(ar.monthly_rate) as total_value,
          AVG(ar.monthly_rate) as avg_value,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'rentalId', ar.rental_id,
              'equipmentId', e.id,
              'serialNumber', e.serial_number,
              'monthlyRate', ar.monthly_rate,
              'status', ar.status,
              'startDate', ar.start_date,
              'endDate', ar.end_date
            )
          ) as contracts
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1
        GROUP BY e.type
        ORDER BY total_value DESC
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getClientContractsByEquipmentType:', error);
      throw new Error(`Failed to get client contracts by equipment type: ${error.message}`);
    }
  }

  /**
   * Get contracts with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Contracts with pagination info
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        clientCompanyId,
        providerCompanyId,
        status,
        equipmentType,
        sortBy = 'start_date',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      const params = [];
      let paramCount = 0;

      if (clientCompanyId) {
        paramCount++;
        whereConditions.push(`ar.client_company_id = $${paramCount}`);
        params.push(clientCompanyId);
      }

      if (providerCompanyId) {
        paramCount++;
        whereConditions.push(`ar.provider_company_id = $${paramCount}`);
        params.push(providerCompanyId);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`ar.status = $${paramCount}`);
        params.push(status);
      }

      if (equipmentType) {
        paramCount++;
        whereConditions.push(`e.type = $${paramCount}`);
        params.push(equipmentType);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get contracts
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      
      const dataQuery = `
        SELECT ar.*, 
               ce.name as client_company_name, ce.type as client_company_type,
               pe.name as provider_company_name, pe.type as provider_company_type,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM active_rentals ar
        LEFT JOIN companies ce ON ar.client_company_id = ce.company_id
        LEFT JOIN companies pe ON ar.provider_company_id = pe.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ${whereClause}
        ORDER BY ar.${sortBy} ${sortOrder}
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
      console.error('Error in PostgreSQLActiveRentalRepository.findWithPagination:', error);
      throw new Error(`Failed to get contracts with pagination: ${error.message}`);
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
   * Map database row to ActiveRental entity
   * @param {Object} row - Database row
   * @returns {ActiveRental} ActiveRental entity
   */
  mapRowToEntity(row) {
    return new ActiveRental({
      rentalId: row.rental_id,
      equipmentId: row.equipment_id,
      clientCompanyId: row.client_company_id,
      providerCompanyId: row.provider_company_id,
      startDate: row.start_date,
      endDate: row.end_date,
      monthlyRate: row.monthly_rate,
      currency: row.currency,
      securityDeposit: row.security_deposit,
      status: row.status,
      renewalTerms: row.renewal_terms,
      specialConditions: row.special_conditions,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  /**
   * Alias for getClientContractCount for compatibility
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async countByClientCompany(clientCompanyId, filters = {}) {
    return this.getClientContractCount(clientCompanyId, filters);
  }

  /**
   * Get client summary (alias for getClientStatistics)
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientSummary(clientCompanyId) {
    return this.getClientStatistics(clientCompanyId);
  }

  /**
   * Count active rentals by provider
   * @param {number} providerId - Provider company ID
   * @returns {Promise<number>}
   */
  async countActiveByProvider(providerId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM active_rentals 
        WHERE provider_company_id = $1 AND status = 'ACTIVE'
      `;
      
      const result = await this.db.query(query, [providerId]);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.countActiveByProvider:', error);
      return 0;
    }
  }

  /**
   * Get rental statistics
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Statistics filters
   * @returns {Promise<Object>}
   */
  async getStatistics(providerId, filters = {}) {
    try {
      const { period = '30days' } = filters;
      
      let dateFilter = '';
      if (period === '30days') {
        dateFilter = `AND ar.start_date >= CURRENT_DATE - INTERVAL '30 days'`;
      } else if (period === '6months') {
        dateFilter = `AND ar.start_date >= CURRENT_DATE - INTERVAL '6 months'`;
      }

      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ar.status = 'ACTIVE' THEN 1 END) as active,
          COALESCE(SUM(ar.monthly_rate), 0) as revenue,
          COALESCE(AVG(CASE WHEN ar.status = 'ACTIVE' THEN 1 ELSE 0 END) * 100, 0) as utilization
        FROM active_rentals ar
        WHERE ar.provider_company_id = $1 ${dateFilter}
      `;

      const result = await this.db.query(query, [providerId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getStatistics:', error);
      return { total: 0, active: 0, revenue: 0, utilization: 0 };
    }
  }

  /**
   * Get revenue analytics
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Revenue filters
   * @returns {Promise<Object>}
   */
  async getRevenueAnalytics(providerId, filters = {}) {
    try {
      const { period = '12months', groupBy = 'month' } = filters;
      
      let dateGrouping = 'month';
      let intervalClause = '12 months';
      
      if (period === '30days') {
        dateGrouping = 'day';
        intervalClause = '30 days';
      } else if (period === '6months') {
        dateGrouping = 'month';
        intervalClause = '6 months';
      }

      const query = `
        SELECT 
          DATE_TRUNC('${dateGrouping}', ar.start_date) as period,
          COUNT(*) as rental_count,
          COALESCE(SUM(ar.monthly_rate), 0) as total_revenue,
          COALESCE(AVG(ar.monthly_rate), 0) as avg_revenue
        FROM active_rentals ar
        WHERE ar.provider_company_id = $1 
          AND ar.start_date >= CURRENT_DATE - INTERVAL '${intervalClause}'
        GROUP BY DATE_TRUNC('${dateGrouping}', ar.start_date)
        ORDER BY period
      `;

      const result = await this.db.query(query, [providerId]);
      
      const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0);
      const avgMonthlyRevenue = totalRevenue / Math.max(result.rows.length, 1);
      
      return {
        revenue: result.rows,
        totalRevenue,
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue * 100) / 100,
        growth: totalRevenue * 0.1, // Mock growth
        projectedRevenue: totalRevenue * 1.1 // Mock projection
      };
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getRevenueAnalytics:', error);
      return {
        revenue: [],
        totalRevenue: 0,
        avgMonthlyRevenue: 0,
        growth: 0,
        projectedRevenue: 0
      };
    }
  }

  /**
   * Get revenue KPI
   * @param {number} providerId - Provider company ID
   * @param {string} period - Time period
   * @returns {Promise<Object>}
   */
  async getRevenueKPI(providerId, period) {
    try {
      const currentQuery = `
        SELECT COALESCE(SUM(monthly_rate), 0) as revenue
        FROM active_rentals
        WHERE provider_company_id = $1 AND status = 'ACTIVE'
      `;

      const result = await this.db.query(currentQuery, [providerId]);
      const current = parseFloat(result.rows[0].revenue) || 0;

      return {
        current: current,
        previous: current * 0.9, // Mock previous period
        change: current * 0.1, // Mock change
        target: current * 1.2 // Mock target
      };
    } catch (error) {
      console.error('Error in PostgreSQLActiveRentalRepository.getRevenueKPI:', error);
      return { current: 0, previous: 0, change: 0, target: 0 };
    }
  }
}

module.exports = PostgreSQLActiveRentalRepository;

