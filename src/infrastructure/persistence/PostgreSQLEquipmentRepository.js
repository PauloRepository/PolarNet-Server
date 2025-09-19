const IEquipmentRepository = require('../../domain/repositories/IEquipmentRepository');
const Equipment = require('../../domain/entities/Equipment');

/**
 * PostgreSQL Implementation: Equipment Repository
 * Implements equipment data persistence using PostgreSQL
 */
class PostgreSQLEquipmentRepository extends IEquipmentRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find equipment by ID
   * @param {number} id - Equipment ID
   * @returns {Promise<Equipment|null>}
   */
  async findById(id) {
    try {
      const query = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.owner_company_id = c.company_id
        WHERE e.equipment_id = $1
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findById:', error);
      throw new Error(`Failed to find equipment by ID: ${error.message}`);
    }
  }

  /**
   * Find equipment by serial number
   * @param {string} serialNumber - Equipment serial number
   * @returns {Promise<Equipment|null>}
   */
  async findBySerialNumber(serialNumber) {
    try {
      const query = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE e.serial_number = $1
      `;
      
      const result = await this.db.query(query, [serialNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findBySerialNumber:', error);
      throw new Error(`Failed to find equipment by serial number: ${error.message}`);
    }
  }

  /**
   * Find equipment by provider company
   * @param {number} companyId - Provider company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findByProvider(companyId, filters = {}) {
    try {
      let query = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE e.company_id = $1
      `;
      
      const params = [companyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.type) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND e.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      if (filters.search) {
        paramCount++;
  query += ` AND (e.serial_number ILIKE $${paramCount} OR e.manufacturer ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      query += ` ORDER BY e.serial_number ASC`;

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
      console.error('Error in PostgreSQLEquipmentRepository.findByProvider:', error);
      throw new Error(`Failed to find equipment by provider: ${error.message}`);
    }
  }

  /**
   * Find equipment rented by client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findRentedByClient(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT DISTINCT e.*, c.name as company_name, c.type as company_type,
               ar.rental_id, ar.start_date as rental_start_date, 
               ar.end_date as rental_end_date, ar.monthly_rate,
               el.name as location_name, el.address as equipment_address
        FROM equipments e
        LEFT JOIN companies c ON e.owner_company_id = c.company_id
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        LEFT JOIN equipment_locations el ON ar.current_location_id = el.equipment_location_id
        WHERE ar.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.type) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.locationId) {
        paramCount++;
        query += ` AND el.equipment_location_id = $${paramCount}`;
        params.push(filters.locationId);
      }

      if (filters.search) {
        paramCount++;
  query += ` AND (e.serial_number ILIKE $${paramCount} OR e.manufacturer ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      if (filters.needsMaintenance) {
        query += ` AND e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days'`;
      }

      query += ` ORDER BY e.serial_number ASC`;

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
      console.error('Error in PostgreSQLEquipmentRepository.findRentedByClient:', error);
      throw new Error(`Failed to find equipment rented by client: ${error.message}`);
    }
  }

  /**
   * Find available equipment
   * @param {Object} filters - Filtering options
   * @returns {Promise<Equipment[]>}
   */
  async findAvailable(filters = {}) {
    try {
      let query = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE e.status = 'AVAILABLE' AND e.is_active = true
      `;
      
      const params = [];
      let paramCount = 0;

      if (filters.type) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.companyId) {
        paramCount++;
        query += ` AND e.company_id = $${paramCount}`;
        params.push(filters.companyId);
      }

      if (filters.minCapacity) {
        paramCount++;
        query += ` AND e.capacity >= $${paramCount}`;
        params.push(filters.minCapacity);
      }

      if (filters.maxCapacity) {
        paramCount++;
        query += ` AND e.capacity <= $${paramCount}`;
        params.push(filters.maxCapacity);
      }

      if (filters.search) {
        paramCount++;
  query += ` AND (e.serial_number ILIKE $${paramCount} OR e.manufacturer ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      query += ` ORDER BY e.type ASC, e.capacity ASC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findAvailable:', error);
      throw new Error(`Failed to find available equipment: ${error.message}`);
    }
  }

  /**
   * Find equipment by status
   * @param {string} status - Equipment status
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findByStatus(status, filters = {}) {
    try {
      let query = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE e.status = $1
      `;
      
      const params = [status];
      let paramCount = 1;

      if (filters.companyId) {
        paramCount++;
        query += ` AND e.company_id = $${paramCount}`;
        params.push(filters.companyId);
      }

      if (filters.type) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.type);
      }

      query += ` ORDER BY e.updated_at DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findByStatus:', error);
      throw new Error(`Failed to find equipment by status: ${error.message}`);
    }
  }

  /**
   * Find equipment by type
   * @param {string} type - Equipment type
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findByType(type, filters = {}) {
    try {
      let query = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE e.type = $1
      `;
      
      const params = [type];
      let paramCount = 1;

      if (filters.companyId) {
        paramCount++;
        query += ` AND e.company_id = $${paramCount}`;
        params.push(filters.companyId);
      }

      if (filters.status) {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        query += ` AND e.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

  query += ` ORDER BY e.manufacturer ASC, e.model ASC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findByType:', error);
      throw new Error(`Failed to find equipment by type: ${error.message}`);
    }
  }

  /**
   * Create new equipment
   * @param {Object} equipmentData - Equipment data
   * @returns {Promise<Equipment>}
   */
  async create(equipmentData) {
    try {
      const query = `
        INSERT INTO equipments (
          company_id, serial_number, type, manufacturer, model, capacity,
          status, acquisition_date, warranty_expiry, last_maintenance_date,
          next_maintenance_date, is_active, specifications, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING *
      `;
      
      const now = new Date();
      const params = [
        equipmentData.companyId,
        equipmentData.serialNumber,
        equipmentData.type,
  equipmentData.brand || equipmentData.manufacturer,
        equipmentData.model,
        equipmentData.capacity,
        equipmentData.status || 'AVAILABLE',
        equipmentData.acquisitionDate,
        equipmentData.warrantyExpiry,
        equipmentData.lastMaintenanceDate,
        equipmentData.nextMaintenanceDate,
        equipmentData.isActive !== undefined ? equipmentData.isActive : true,
        JSON.stringify(equipmentData.specifications || {}),
        equipmentData.createdAt || now,
        now
      ];

      const result = await this.db.query(query, params);
      return await this.findById(result.rows[0].id);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.create:', error);
      throw new Error(`Failed to create equipment: ${error.message}`);
    }
  }

  /**
   * Update equipment
   * @param {number} id - Equipment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Equipment>}
   */
  async update(id, updateData) {
    try {
      const allowedFields = [
  'type', 'brand', 'model', 'capacity', 'status', 'warranty_expiry',
        'last_maintenance_date', 'next_maintenance_date', 'is_active', 'specifications'
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
          
          if (field === 'specifications') {
            params.push(JSON.stringify(updateData[camelField]));
          } else {
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

      // Add equipment ID parameter
      paramCount++;
      params.push(id);

      const query = `
        UPDATE equipments 
        SET ${updateFields.join(', ')}
        WHERE equipment_id = $${paramCount}
        RETURNING equipment_id
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Equipment not found');
      }

      return await this.findById(result.rows[0].equipment_id);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.update:', error);
      throw new Error(`Failed to update equipment: ${error.message}`);
    }
  }

  /**
   * Delete equipment (soft delete)
   * @param {number} id - Equipment ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const query = `
        UPDATE equipments 
        SET deleted_at = $1, is_active = false, status = 'OUT_OF_SERVICE'
        WHERE equipment_id = $2
        RETURNING equipment_id
      `;

      const result = await this.db.query(query, [new Date(), id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.delete:', error);
      throw new Error(`Failed to delete equipment: ${error.message}`);
    }
  }

  /**
   * Update equipment status
   * @param {number} id - Equipment ID
   * @param {string} status - New status
   * @returns {Promise<Equipment>}
   */
  async updateStatus(id, status) {
    try {
      const query = `
        UPDATE equipments 
        SET status = $1, updated_at = $2
        WHERE equipment_id = $3
        RETURNING equipment_id
      `;

      const result = await this.db.query(query, [status, new Date(), id]);
      
      if (result.rows.length === 0) {
        throw new Error('Equipment not found');
      }

      return await this.findById(result.rows[0].equipment_id);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.updateStatus:', error);
      throw new Error(`Failed to update equipment status: ${error.message}`);
    }
  }

  /**
   * Find equipment needing maintenance
   * @param {number} companyId - Provider company ID
   * @returns {Promise<Equipment[]>}
   */
  async findNeedingMaintenance(companyId) {
    try {
      const query = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE e.company_id = $1 
         
          AND e.is_active = true
          AND e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY e.next_maintenance_date ASC
      `;
      
      const result = await this.db.query(query, [companyId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.findNeedingMaintenance:', error);
      throw new Error(`Failed to find equipment needing maintenance: ${error.message}`);
    }
  }

  /**
   * Get equipment statistics for provider
   * @param {number} companyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(companyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_equipment,
          COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available_equipment,
          COUNT(CASE WHEN status = 'RENTED' THEN 1 END) as rented_equipment,
          COUNT(CASE WHEN status = 'MAINTENANCE' THEN 1 END) as maintenance_equipment,
          COUNT(CASE WHEN status = 'OUT_OF_SERVICE' THEN 1 END) as out_of_service_equipment,
          COUNT(CASE WHEN next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as needs_maintenance,
          AVG(capacity) as avg_capacity,
          COUNT(CASE WHEN warranty_expiry <= CURRENT_DATE THEN 1 END) as expired_warranty
        FROM equipments
        WHERE company_id = $1
      `;
      
      const result = await this.db.query(query, [companyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get provider statistics: ${error.message}`);
    }
  }

  /**
   * Get client equipment metrics
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientEquipmentMetrics(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT e.equipment_id) as total_rented_equipment,
          COUNT(CASE WHEN e.status = 'MAINTENANCE' THEN 1 END) as equipment_in_maintenance,
          COUNT(CASE WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as upcoming_maintenance,
          COUNT(CASE WHEN tr.status = 'ALERT' AND tr.timestamp > CURRENT_DATE - INTERVAL '24 hours' THEN 1 END) as active_alerts,
          AVG(e.capacity) as avg_capacity,
          COUNT(DISTINCT e.type) as equipment_types,
          COUNT(DISTINCT ar.provider_company_id) as providers_count
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
  LEFT JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id AND tr.timestamp > CURRENT_DATE - INTERVAL '24 hours'
        WHERE ar.client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getClientEquipmentMetrics:', error);
      throw new Error(`Failed to get client equipment metrics: ${error.message}`);
    }
  }

  /**
   * Get client equipment count
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<number>}
   */
  async getClientEquipmentCount(clientCompanyId) {
    try {
      const query = `
        SELECT COUNT(DISTINCT e.equipment_id) as count
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getClientEquipmentCount:', error);
      throw new Error(`Failed to get client equipment count: ${error.message}`);
    }
  }

  // Count rented equipments for a client company (used for pagination)
  async countRentedByClient(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT COUNT(DISTINCT e.equipment_id) as count
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1
      `;
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.type) {
        paramCount++;
        query += ` AND e.type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.locationId) {
        paramCount++;
        query += ` AND ar.current_location_id = $${paramCount}`;
        params.push(filters.locationId);
      }

      if (filters.status) {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.search) {
        paramCount++;
        query += ` AND (e.serial_number ILIKE $${paramCount} OR e.manufacturer ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count || 0);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.countRentedByClient:', error);
      throw new Error(`Failed to count equipment rented by client: ${error.message}`);
    }
  }

  // Check if a given equipment is rented by the provided client company
  async isRentedByClient(equipmentId, clientCompanyId) {
    try {
      const query = `
        SELECT 1 FROM active_rentals ar
        WHERE ar.equipment_id = $1 AND ar.client_company_id = $2 AND ar.status = 'ACTIVE'
        LIMIT 1
      `;
      const result = await this.db.query(query, [equipmentId, clientCompanyId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.isRentedByClient:', error);
      throw new Error(`Failed to check rental ownership: ${error.message}`);
    }
  }

  // Get available equipment types for a client (used for filters)
  async getAvailableTypesByClient(clientCompanyId) {
    try {
      const query = `
        SELECT DISTINCT e.type FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1
        ORDER BY e.type ASC
      `;
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows.map(r => r.type);
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getAvailableTypesByClient:', error);
      throw new Error(`Failed to get available equipment types: ${error.message}`);
    }
  }

  /**
   * Get client equipment by location
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object[]>}
   */
  async getClientEquipmentByLocation(clientCompanyId) {
    try {
      const query = `
        SELECT 
          el.id as location_id,
          el.location_name,
          el.address,
          COUNT(e.equipment_id) as equipment_count,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'id', e.equipment_id,
              'serialNumber', e.serial_number,
              'type', e.type,
              'manufacturer', e.manufacturer,
              'model', e.model,
              'status', e.status
            )
          ) as equipments
        FROM equipment_locations el
        INNER JOIN equipments e ON el.equipment_id = e.equipment_id
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1
        GROUP BY el.id, el.location_name, el.address
        ORDER BY el.location_name ASC
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getClientEquipmentByLocation:', error);
      throw new Error(`Failed to get client equipment by location: ${error.message}`);
    }
  }

  /**
   * Search equipment
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async search(query, filters = {}) {
    try {
      let sqlQuery = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        
        AND (
          e.serial_number ILIKE $1 OR 
          e.manufacturer ILIKE $1 OR 
          e.model ILIKE $1 OR
          e.type ILIKE $1
        )
      `;
      
      const params = [`%${query}%`];
      let paramCount = 1;

      if (filters.companyId) {
        paramCount++;
        sqlQuery += ` AND e.company_id = $${paramCount}`;
        params.push(filters.companyId);
      }

      if (filters.status) {
        paramCount++;
        sqlQuery += ` AND e.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.type) {
        paramCount++;
        sqlQuery += ` AND e.type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        sqlQuery += ` AND e.is_active = $${paramCount}`;
        params.push(filters.isActive);
      }

      sqlQuery += ` ORDER BY e.serial_number ASC`;

      if (filters.limit) {
        paramCount++;
        sqlQuery += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.query(sqlQuery, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.search:', error);
      throw new Error(`Failed to search equipment: ${error.message}`);
    }
  }

  /**
   * Get equipment count by status
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getCountByStatus(companyId) {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM equipments
        WHERE company_id = $1
        GROUP BY status
      `;
      
      const result = await this.db.query(query, [companyId]);
      
      const statusCounts = {};
      result.rows.forEach(row => {
        statusCounts[row.status] = parseInt(row.count);
      });
      
      return statusCounts;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getCountByStatus:', error);
      throw new Error(`Failed to get count by status: ${error.message}`);
    }
  }

  /**
   * Get equipment count by type
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getCountByType(companyId) {
    try {
      const query = `
        SELECT 
          type,
          COUNT(*) as count,
          AVG(capacity) as avg_capacity
        FROM equipments
        WHERE company_id = $1
        GROUP BY type
        ORDER BY type ASC
      `;
      
      const result = await this.db.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getCountByType:', error);
      throw new Error(`Failed to get count by type: ${error.message}`);
    }
  }

  /**
   * Get equipment utilization metrics
   * @param {number} companyId - Provider company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>}
   */
  async getUtilizationMetrics(companyId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let query = `
        SELECT 
          e.type,
          COUNT(e.equipment_id) as total_equipment,
          COUNT(ar.rental_id) as rented_equipment,
          ROUND(
            (COUNT(ar.rental_id)::FLOAT / COUNT(e.equipment_id) * 100), 2
          ) as utilization_rate,
          AVG(ar.monthly_rate) as avg_monthly_rate
        FROM equipments e
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
      `;
      
      const params = [companyId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND ar.start_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND ar.start_date <= $${paramCount}`;
        params.push(endDate);
      }

      query += `
        WHERE e.company_id = $1
        GROUP BY e.type
        ORDER BY utilization_rate DESC
      `;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getUtilizationMetrics:', error);
      throw new Error(`Failed to get utilization metrics: ${error.message}`);
    }
  }

  /**
   * Get equipment maintenance history
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object[]>}
   */
  async getMaintenanceHistory(equipmentId) {
    try {
      // This would typically join with a maintenance_records table
      // For now, returning basic maintenance info from equipment record
      const query = `
        SELECT 
          e.equipment_id,
          e.serial_number,
          e.last_maintenance_date,
          e.next_maintenance_date,
          e.updated_at
        FROM equipments e
        WHERE e.equipment_id = \$1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getMaintenanceHistory:', error);
      throw new Error(`Failed to get maintenance history: ${error.message}`);
    }
  }

  /**
   * Get equipment rental history
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object[]>}
   */
  async getRentalHistory(equipmentId) {
    try {
      const query = `
        SELECT 
          ar.rental_id,
          ar.client_company_id,
          c.name as client_company_name,
          ar.start_date,
          ar.end_date,
          ar.monthly_rate,
          ar.status
        FROM active_rentals ar
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ar.equipment_id = $1
        ORDER BY ar.start_date DESC
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getRentalHistory:', error);
      throw new Error(`Failed to get rental history: ${error.message}`);
    }
  }

  /**
   * Check if serial number exists
   * @param {string} serialNumber - Serial number to check
   * @param {number} excludeId - Equipment ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async serialNumberExists(serialNumber, excludeId = null) {
    try {
      let query = `
        SELECT COUNT(*) as count 
        FROM equipments 
        WHERE serial_number = $1
      `;
      
      const params = [serialNumber];

      if (excludeId) {
        query += ` AND id != $2`;
        params.push(excludeId);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.serialNumberExists:', error);
      throw new Error(`Failed to check serial number existence: ${error.message}`);
    }
  }

  /**
   * Get equipment with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Equipment with pagination info
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        companyId,
        status,
        type,
        isActive,
        search,
        sortBy = 'serial_number',
        sortOrder = 'ASC'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      const params = [];
      let paramCount = 0;

      if (companyId) {
        paramCount++;
        whereConditions.push(`e.company_id = $${paramCount}`);
        params.push(companyId);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`e.status = $${paramCount}`);
        params.push(status);
      }

      if (type) {
        paramCount++;
        whereConditions.push(`e.type = $${paramCount}`);
        params.push(type);
      }

      if (isActive !== undefined) {
        paramCount++;
        whereConditions.push(`e.is_active = $${paramCount}`);
        params.push(isActive);
      }

      if (search) {
        paramCount++;
  whereConditions.push(`(e.serial_number ILIKE $${paramCount} OR e.manufacturer ILIKE $${paramCount} OR e.model ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM equipments e 
        WHERE ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get equipment
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      
      const dataQuery = `
        SELECT e.*, c.name as company_name, c.type as company_type
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE ${whereClause}
        ORDER BY e.${sortBy} ${sortOrder}
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
      console.error('Error in PostgreSQLEquipmentRepository.findWithPagination:', error);
      throw new Error(`Failed to get equipment with pagination: ${error.message}`);
    }
  }

  /**
   * Get revenue by equipment
   * @param {number} companyId - Provider company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object[]>}
   */
  async getRevenueByEquipment(companyId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let query = `
        SELECT 
          e.equipment_id,
          e.serial_number,
          e.type,
          e.manufacturer,
          e.model,
          COUNT(ar.rental_id) as total_rentals,
          SUM(ar.monthly_rate) as total_revenue,
          AVG(ar.monthly_rate) as avg_monthly_rate,
          MAX(ar.start_date) as last_rental_date
        FROM equipments e
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE e.company_id = $1
      `;
      
      const params = [companyId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND ar.start_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND ar.start_date <= $${paramCount}`;
        params.push(endDate);
      }

      query += `
  GROUP BY e.equipment_id, e.serial_number, e.type, e.manufacturer, e.model
        ORDER BY total_revenue DESC NULLS LAST
      `;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLEquipmentRepository.getRevenueByEquipment:', error);
      throw new Error(`Failed to get revenue by equipment: ${error.message}`);
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
   * Map database row to Equipment entity
   * @param {Object} row - Database row
   * @returns {Equipment} Equipment entity
   */
  mapRowToEntity(row) {
    return new Equipment({
      id: row.equipment_id,
      companyId: row.owner_company_id,
      serialNumber: row.serial_number,
      type: row.type,
      brand: row.manufacturer,
      model: row.model,
      capacity: row.capacity,
      status: row.status,
      acquisitionDate: row.acquisition_date,
      warrantyExpiry: row.warranty_expiry,
      lastMaintenanceDate: row.last_maintenance_date,
      nextMaintenanceDate: row.next_maintenance_date,
      isActive: row.is_active,
      specifications: row.technical_specs || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLEquipmentRepository;

