/**
 * PostgreSQL Rental Repository Implementation
 */
const IRentalRepository = require('../../domain/repositories/IRentalRepository');
const Rental = require('../../domain/entities/Rental');

class PostgreSQLRentalRepository extends IRentalRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  async findById(rentalId) {
    try {
      const query = `
        SELECT 
          ar.*,
          e.name as equipment_name,
          e.type as equipment_type,
          cc.name as client_company_name,
          pc.name as provider_company_name
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies cc ON ar.client_company_id = cc.company_id
        LEFT JOIN companies pc ON ar.provider_company_id = pc.company_id
        WHERE ar.rental_id = $1
      `;
      
      const result = await this.db.query(query, [rentalId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding rental by ID: ${error.message}`);
    }
  }

  async findByProvider(providerCompanyId, filters = {}) {
    try {
      let query = `
        SELECT 
          ar.*,
          e.name as equipment_name,
          e.type as equipment_type,
          c.name as client_company_name
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ar.provider_company_id = $1
      `;
      
      const params = [providerCompanyId];
      let paramIndex = 2;

      // Aplicar filtros
      if (filters.status) {
        query += ` AND ar.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.clientId) {
        query += ` AND ar.client_company_id = $${paramIndex}`;
        params.push(filters.clientId);
        paramIndex++;
      }

      if (filters.equipmentType) {
        query += ` AND e.type = $${paramIndex}`;
        params.push(filters.equipmentType);
        paramIndex++;
      }

      if (filters.startDate) {
        query += ` AND ar.start_date >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND ar.start_date <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      query += ` ORDER BY ar.created_at DESC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding rentals by provider: ${error.message}`);
    }
  }

  async findActiveRentals(providerCompanyId) {
    try {
      const query = `
        SELECT 
          ar.*,
          e.name as equipment_name,
          e.type as equipment_type,
          c.name as client_company_name
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ar.provider_company_id = $1 AND ar.status = 'ACTIVE'
        ORDER BY ar.start_date DESC
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding active rentals: ${error.message}`);
    }
  }

  async findExpiringRentals(providerCompanyId, daysAhead = 30) {
    try {
      const query = `
        SELECT 
          ar.*,
          e.name as equipment_name,
          e.type as equipment_type,
          c.name as client_company_name
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE ar.provider_company_id = $1 
          AND ar.status = 'ACTIVE'
          AND ar.end_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
        ORDER BY ar.end_date ASC
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding expiring rentals: ${error.message}`);
    }
  }

  async getRevenueStats(providerCompanyId, period) {
    try {
      const { startDate, endDate } = period;
      
      const query = `
        SELECT 
          SUM(ar.monthly_rate) as total_monthly_revenue,
          COUNT(*) as total_rentals,
          AVG(ar.monthly_rate) as avg_monthly_rate,
          e.type,
          COUNT(*) as rentals_by_type
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.provider_company_id = $1 
          AND ar.created_at >= $2 
          AND ar.created_at <= $3
        GROUP BY e.type
        ORDER BY total_monthly_revenue DESC
      `;
      
      const result = await this.db.query(query, [providerCompanyId, startDate, endDate]);
      
      return {
        totalRevenue: result.rows.reduce((sum, row) => sum + parseFloat(row.total_monthly_revenue || 0), 0),
        totalRentals: result.rows.reduce((sum, row) => sum + parseInt(row.total_rentals || 0), 0),
        revenueByType: result.rows.map(row => ({
          type: row.type,
          revenue: parseFloat(row.total_monthly_revenue || 0),
          count: parseInt(row.rentals_by_type || 0)
        }))
      };
    } catch (error) {
      throw new Error(`Error getting revenue stats: ${error.message}`);
    }
  }

  async save(rental) {
    try {
      if (rental.rentalId) {
        return await this.update(rental);
      } else {
        return await this.create(rental);
      }
    } catch (error) {
      throw new Error(`Error saving rental: ${error.message}`);
    }
  }

  async create(rental) {
    const query = `
      INSERT INTO active_rentals (
        client_company_id, provider_company_id, equipment_id,
        start_date, end_date, daily_rate, monthly_rate, total_amount,
        deposit_paid, status, payment_status, current_location_id,
        contract_terms, delivery_notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const params = [
      rental.clientCompanyId,
      rental.providerCompanyId,
      rental.equipmentId,
      rental.startDate,
      rental.endDate,
      rental.dailyRate || 0,
      rental.monthlyRate,
      rental.totalAmount || rental.calculateTotalRevenue(),
      rental.securityDeposit || 0,
      rental.status,
      'CURRENT', // payment_status default
      rental.currentLocationId,
      rental.contractTerms,
      rental.notes,
      new Date(),
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async update(rental) {
    const query = `
      UPDATE active_rentals SET
        start_date = $2, end_date = $3, daily_rate = $4, monthly_rate = $5,
        total_amount = $6, deposit_paid = $7, status = $8, payment_status = $9,
        current_location_id = $10, contract_terms = $11, delivery_notes = $12,
        return_notes = $13, updated_at = $14
      WHERE rental_id = $1
      RETURNING *
    `;

    const params = [
      rental.rentalId,
      rental.startDate,
      rental.endDate,
      rental.dailyRate || 0,
      rental.monthlyRate,
      rental.totalAmount || rental.calculateTotalRevenue(),
      rental.securityDeposit,
      rental.status,
      rental.paymentStatus || 'CURRENT',
      rental.currentLocationId,
      rental.contractTerms,
      rental.notes,
      rental.notes, // return_notes
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async count(criteria = {}) {
    try {
      let query = 'SELECT COUNT(*) FROM active_rentals ar';
      const params = [];
      const conditions = [];
      let paramIndex = 1;

      if (criteria.providerCompanyId) {
        conditions.push(`ar.provider_company_id = $${paramIndex}`);
        params.push(criteria.providerCompanyId);
        paramIndex++;
      }

      if (criteria.status) {
        conditions.push(`ar.status = $${paramIndex}`);
        params.push(criteria.status);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting rentals: ${error.message}`);
    }
  }

  mapToEntity(row) {
    return new Rental({
      rentalId: row.rental_id,
      equipmentId: row.equipment_id,
      clientCompanyId: row.client_company_id,
      providerCompanyId: row.provider_company_id,
      startDate: row.start_date,
      endDate: row.end_date,
      monthlyRate: parseFloat(row.monthly_rate) || 0,
      securityDeposit: parseFloat(row.deposit_paid) || 0,
      status: row.status,
      paymentTerms: row.contract_terms,
      contractTerms: row.contract_terms,
      notes: row.delivery_notes || row.return_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLRentalRepository;
