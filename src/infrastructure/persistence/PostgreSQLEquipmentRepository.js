/**
 * PostgreSQL Equipment Repository Implementation
 */
const IEquipmentRepository = require('../../domain/repositories/IEquipmentRepository');
const Equipment = require('../../domain/entities/Equipment');

class PostgreSQLEquipmentRepository extends IEquipmentRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  async findById(equipmentId) {
    try {
      const query = `
        SELECT * FROM equipments 
        WHERE equipment_id = $1
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding equipment by ID: ${error.message}`);
    }
  }

  async findByOwnerCompany(ownerCompanyId, filters = {}) {
    try {
      let query = `
        SELECT * FROM equipments 
        WHERE owner_company_id = $1
      `;
      
      const params = [ownerCompanyId];
      let paramIndex = 2;

      // Aplicar filtros
      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.condition) {
        query += ` AND condition = $${paramIndex}`;
        params.push(filters.condition);
        paramIndex++;
      }

      if (filters.manufacturer) {
        query += ` AND manufacturer ILIKE $${paramIndex}`;
        params.push(`%${filters.manufacturer}%`);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding equipment by owner: ${error.message}`);
    }
  }

  async findAvailableForRent(criteria = {}) {
    try {
      let query = `
        SELECT * FROM equipments 
        WHERE status = 'AVAILABLE' 
        AND condition != 'POOR'
      `;
      
      const params = [];
      let paramIndex = 1;

      if (criteria.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(criteria.type);
        paramIndex++;
      }

      if (criteria.maxRate) {
        query += ` AND rental_rate <= $${paramIndex}`;
        params.push(criteria.maxRate);
        paramIndex++;
      }

      if (criteria.location) {
        query += ` AND location ILIKE $${paramIndex}`;
        params.push(`%${criteria.location}%`);
        paramIndex++;
      }

      query += ` ORDER BY rental_rate ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding available equipment: ${error.message}`);
    }
  }

  async findByStatus(status) {
    try {
      const query = `
        SELECT * FROM equipments 
        WHERE status = $1
        ORDER BY updated_at DESC
      `;
      
      const result = await this.db.query(query, [status]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding equipment by status: ${error.message}`);
    }
  }

  async save(equipment) {
    try {
      if (equipment.equipmentId) {
        // Actualizar equipo existente
        return await this.update(equipment);
      } else {
        // Crear nuevo equipo
        return await this.create(equipment);
      }
    } catch (error) {
      throw new Error(`Error saving equipment: ${error.message}`);
    }
  }

  async create(equipment) {
    const query = `
      INSERT INTO equipments (
        name, type, manufacturer, model, serial_number, technical_specs,
        installation_date, warranty_expiry, status, condition, location,
        owner_company_id, purchase_price, rental_rate, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const params = [
      equipment.name,
      equipment.type,
      equipment.manufacturer,
      equipment.model,
      equipment.serialNumber,
      JSON.stringify(equipment.technicalSpecs),
      equipment.installationDate,
      equipment.warrantyExpiry,
      equipment.status,
      equipment.condition,
      equipment.location,
      equipment.ownerCompanyId,
      equipment.purchasePrice,
      equipment.rentalRate,
      new Date(),
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async update(equipment) {
    const query = `
      UPDATE equipments SET
        name = $2, type = $3, manufacturer = $4, model = $5,
        serial_number = $6, technical_specs = $7, installation_date = $8,
        warranty_expiry = $9, status = $10, condition = $11, location = $12,
        current_client_id = $13, purchase_price = $14, rental_rate = $15,
        updated_at = $16
      WHERE equipment_id = $1
      RETURNING *
    `;

    const params = [
      equipment.equipmentId,
      equipment.name,
      equipment.type,
      equipment.manufacturer,
      equipment.model,
      equipment.serialNumber,
      JSON.stringify(equipment.technicalSpecs),
      equipment.installationDate,
      equipment.warrantyExpiry,
      equipment.status,
      equipment.condition,
      equipment.location,
      equipment.currentClientId,
      equipment.purchasePrice,
      equipment.rentalRate,
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async findWithPagination({ ownerCompanyId, filters = {}, page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;
      
      let baseQuery = `
        FROM equipments 
        WHERE owner_company_id = $1
      `;
      
      const params = [ownerCompanyId];
      let paramIndex = 2;

      // Aplicar filtros (similar a findByOwnerCompany)
      if (filters.status) {
        baseQuery += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.type) {
        baseQuery += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      // Consulta para contar total
      const countQuery = `SELECT COUNT(*) ${baseQuery}`;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Consulta para obtener datos
      const dataQuery = `
        SELECT * ${baseQuery}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await this.db.query(dataQuery, params);
      const equipment = dataResult.rows.map(row => this.mapToEntity(row));

      return { equipment, total };
    } catch (error) {
      throw new Error(`Error finding equipment with pagination: ${error.message}`);
    }
  }

  mapToEntity(row) {
    return new Equipment({
      equipmentId: row.equipment_id,
      name: row.name,
      type: row.type,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serial_number,
      technicalSpecs: typeof row.technical_specs === 'string' 
        ? JSON.parse(row.technical_specs) 
        : row.technical_specs,
      installationDate: row.installation_date,
      warrantyExpiry: row.warranty_expiry,
      status: row.status,
      condition: row.condition,
      location: row.location,
      ownerCompanyId: row.owner_company_id,
      currentClientId: row.current_client_id,
      purchasePrice: parseFloat(row.purchase_price) || 0,
      rentalRate: parseFloat(row.rental_rate) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLEquipmentRepository;
