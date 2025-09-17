/**
 * PostgreSQL Company Repository Implementation
 */
const ICompanyRepository = require('../../domain/repositories/ICompanyRepository');
const Company = require('../../domain/entities/Company');

class PostgreSQLCompanyRepository extends ICompanyRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  async findById(companyId) {
    try {
      const query = `
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.status = 'active') as active_users_count,
          (SELECT COUNT(*) FROM equipments e WHERE e.provider_company_id = c.company_id) as equipment_count,
          (SELECT COUNT(*) FROM service_requests sr WHERE sr.provider_company_id = c.company_id) as service_requests_count
        FROM companies c
        WHERE c.company_id = $1
      `;
      
      const result = await this.db.query(query, [companyId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding company by ID: ${error.message}`);
    }
  }

  async findByType(type, filters = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.status = 'active') as active_users_count
        FROM companies c
        WHERE c.type = $1
      `;
      
      const params = [type];
      let paramIndex = 2;

      // Aplicar filtros
      if (filters.status) {
        query += ` AND c.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.industry) {
        query += ` AND c.industry = $${paramIndex}`;
        params.push(filters.industry);
        paramIndex++;
      }

      if (filters.city) {
        query += ` AND c.city ILIKE $${paramIndex}`;
        params.push(`%${filters.city}%`);
        paramIndex++;
      }

      if (filters.country) {
        query += ` AND c.country = $${paramIndex}`;
        params.push(filters.country);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.serviceTypes && filters.serviceTypes.length > 0) {
        query += ` AND c.service_types && $${paramIndex}`;
        params.push(filters.serviceTypes);
        paramIndex++;
      }

      query += ` ORDER BY c.name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding companies by type: ${error.message}`);
    }
  }

  async findProviders(filters = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.status = 'active') as active_users_count,
          (SELECT COUNT(*) FROM equipments e WHERE e.provider_company_id = c.company_id) as equipment_count,
          (SELECT AVG(rating) FROM service_requests sr WHERE sr.provider_company_id = c.company_id AND sr.rating IS NOT NULL) as avg_rating,
          (SELECT COUNT(*) FROM service_requests sr WHERE sr.provider_company_id = c.company_id AND sr.status = 'COMPLETED') as completed_services
        FROM companies c
        WHERE c.type = 'provider' AND c.status = 'active'
      `;
      
      const params = [];
      let paramIndex = 1;

      if (filters.serviceTypes && filters.serviceTypes.length > 0) {
        query += ` AND c.service_types && $${paramIndex}`;
        params.push(filters.serviceTypes);
        paramIndex++;
      }

      if (filters.city) {
        query += ` AND c.city ILIKE $${paramIndex}`;
        params.push(`%${filters.city}%`);
        paramIndex++;
      }

      if (filters.country) {
        query += ` AND c.country = $${paramIndex}`;
        params.push(filters.country);
        paramIndex++;
      }

      if (filters.minRating) {
        query += ` AND (
          SELECT AVG(rating) 
          FROM service_requests sr 
          WHERE sr.provider_company_id = c.company_id 
            AND sr.rating IS NOT NULL
        ) >= $${paramIndex}`;
        params.push(filters.minRating);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Ordenar por rating promedio descendente, luego por nombre
      query += ` ORDER BY avg_rating DESC NULLS LAST, c.name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => {
        const company = this.mapToEntity(row);
        company.avgRating = parseFloat(row.avg_rating) || 0;
        company.completedServices = parseInt(row.completed_services) || 0;
        return company;
      });
    } catch (error) {
      throw new Error(`Error finding providers: ${error.message}`);
    }
  }

  async findClients(providerCompanyId, filters = {}) {
    try {
      let query = `
        SELECT DISTINCT
          c.*,
          (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.status = 'active') as active_users_count,
          (SELECT COUNT(*) FROM service_requests sr WHERE sr.client_company_id = c.company_id AND sr.provider_company_id = $1) as service_requests_count,
          (SELECT COUNT(*) FROM active_rentals ar JOIN equipments e ON ar.equipment_id = e.equipment_id WHERE ar.client_company_id = c.company_id AND e.provider_company_id = $1) as active_rentals_count,
          (SELECT MAX(sr.created_at) FROM service_requests sr WHERE sr.client_company_id = c.company_id AND sr.provider_company_id = $1) as last_service_date
        FROM companies c
        WHERE c.type = 'client' 
          AND c.status = 'active'
          AND EXISTS (
            SELECT 1 FROM service_requests sr 
            WHERE sr.client_company_id = c.company_id 
              AND sr.provider_company_id = $1
          )
      `;
      
      const params = [providerCompanyId];
      let paramIndex = 2;

      if (filters.industry) {
        query += ` AND c.industry = $${paramIndex}`;
        params.push(filters.industry);
        paramIndex++;
      }

      if (filters.city) {
        query += ` AND c.city ILIKE $${paramIndex}`;
        params.push(`%${filters.city}%`);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY last_service_date DESC NULLS LAST, c.name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => {
        const company = this.mapToEntity(row);
        company.serviceRequestsCount = parseInt(row.service_requests_count) || 0;
        company.activeRentalsCount = parseInt(row.active_rentals_count) || 0;
        company.lastServiceDate = row.last_service_date;
        return company;
      });
    } catch (error) {
      throw new Error(`Error finding clients: ${error.message}`);
    }
  }

  async findByIndustry(industry, filters = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.status = 'active') as active_users_count
        FROM companies c
        WHERE c.industry = $1
      `;
      
      const params = [industry];
      let paramIndex = 2;

      if (filters.type) {
        query += ` AND c.type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND c.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      query += ` ORDER BY c.name ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding companies by industry: ${error.message}`);
    }
  }

  async getBusinessStats(companyId, period) {
    try {
      const { startDate, endDate } = period;
      const company = await this.findById(companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      if (company.type === 'provider') {
        return await this.getProviderStats(companyId, startDate, endDate);
      } else if (company.type === 'client') {
        return await this.getClientStats(companyId, startDate, endDate);
      }

      return {};
    } catch (error) {
      throw new Error(`Error getting business stats: ${error.message}`);
    }
  }

  async getProviderStats(companyId, startDate, endDate) {
    // Revenue stats
    const revenueQuery = `
      SELECT 
        SUM(sr.estimated_cost) as total_revenue,
        COUNT(sr.service_request_id) as total_services,
        COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END) as completed_services,
        AVG(sr.rating) as avg_rating,
        COUNT(DISTINCT sr.client_company_id) as unique_clients
      FROM service_requests sr
      WHERE sr.provider_company_id = $1 
        AND sr.created_at >= $2 
        AND sr.created_at <= $3
    `;

    // Equipment stats
    const equipmentQuery = `
      SELECT 
        COUNT(e.equipment_id) as total_equipment,
        COUNT(CASE WHEN e.status = 'available' THEN 1 END) as available_equipment,
        COUNT(CASE WHEN e.status = 'rented' THEN 1 END) as rented_equipment,
        COUNT(CASE WHEN e.status = 'maintenance' THEN 1 END) as maintenance_equipment
      FROM equipments e
      WHERE e.provider_company_id = $1
    `;

    // Rental stats
    const rentalQuery = `
      SELECT 
        COUNT(ar.rental_id) as active_rentals,
        SUM(ar.daily_rate) as daily_rental_income,
        AVG(ar.daily_rate) as avg_daily_rate
      FROM active_rentals ar
      JOIN equipments e ON ar.equipment_id = e.equipment_id
      WHERE e.provider_company_id = $1
    `;

    // Maintenance stats
    const maintenanceQuery = `
      SELECT 
        COUNT(m.maintenance_id) as total_maintenances,
        COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as completed_maintenances,
        SUM(m.actual_cost) as maintenance_costs,
        AVG(m.quality_rating) as avg_maintenance_rating
      FROM maintenances m
      WHERE m.provider_company_id = $1 
        AND m.scheduled_date >= $2 
        AND m.scheduled_date <= $3
    `;

    const [
      revenueResult,
      equipmentResult,
      rentalResult,
      maintenanceResult
    ] = await Promise.all([
      this.db.query(revenueQuery, [companyId, startDate, endDate]),
      this.db.query(equipmentQuery, [companyId]),
      this.db.query(rentalQuery, [companyId]),
      this.db.query(maintenanceQuery, [companyId, startDate, endDate])
    ]);

    const revenue = revenueResult.rows[0];
    const equipment = equipmentResult.rows[0];
    const rental = rentalResult.rows[0];
    const maintenance = maintenanceResult.rows[0];

    return {
      revenue: {
        total: parseFloat(revenue.total_revenue) || 0,
        totalServices: parseInt(revenue.total_services) || 0,
        completedServices: parseInt(revenue.completed_services) || 0,
        completionRate: revenue.total_services > 0 ? 
          (revenue.completed_services / revenue.total_services) * 100 : 0,
        avgRating: parseFloat(revenue.avg_rating) || 0,
        uniqueClients: parseInt(revenue.unique_clients) || 0
      },
      equipment: {
        total: parseInt(equipment.total_equipment) || 0,
        available: parseInt(equipment.available_equipment) || 0,
        rented: parseInt(equipment.rented_equipment) || 0,
        maintenance: parseInt(equipment.maintenance_equipment) || 0,
        utilizationRate: equipment.total_equipment > 0 ? 
          (equipment.rented_equipment / equipment.total_equipment) * 100 : 0
      },
      rentals: {
        active: parseInt(rental.active_rentals) || 0,
        dailyIncome: parseFloat(rental.daily_rental_income) || 0,
        avgDailyRate: parseFloat(rental.avg_daily_rate) || 0
      },
      maintenance: {
        total: parseInt(maintenance.total_maintenances) || 0,
        completed: parseInt(maintenance.completed_maintenances) || 0,
        totalCosts: parseFloat(maintenance.maintenance_costs) || 0,
        avgRating: parseFloat(maintenance.avg_maintenance_rating) || 0,
        completionRate: maintenance.total_maintenances > 0 ? 
          (maintenance.completed_maintenances / maintenance.total_maintenances) * 100 : 0
      }
    };
  }

  async getClientStats(companyId, startDate, endDate) {
    // Service requests stats
    const serviceQuery = `
      SELECT 
        COUNT(sr.service_request_id) as total_requests,
        COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN sr.status = 'PENDING' THEN 1 END) as pending_requests,
        SUM(sr.estimated_cost) as total_costs,
        AVG(sr.satisfaction_rating) as avg_satisfaction,
        COUNT(DISTINCT sr.provider_company_id) as unique_providers
      FROM service_requests sr
      WHERE sr.client_company_id = $1 
        AND sr.created_at >= $2 
        AND sr.created_at <= $3
    `;

    // Equipment requests stats
    const equipmentQuery = `
      SELECT 
        COUNT(er.request_id) as total_equipment_requests,
        COUNT(CASE WHEN er.status = 'APPROVED' THEN 1 END) as approved_requests,
        SUM(er.budget) as total_budget
      FROM equipment_requests er
      WHERE er.client_company_id = $1 
        AND er.created_at >= $2 
        AND er.created_at <= $3
    `;

    const [serviceResult, equipmentResult] = await Promise.all([
      this.db.query(serviceQuery, [companyId, startDate, endDate]),
      this.db.query(equipmentQuery, [companyId, startDate, endDate])
    ]);

    const service = serviceResult.rows[0];
    const equipment = equipmentResult.rows[0];

    return {
      services: {
        total: parseInt(service.total_requests) || 0,
        completed: parseInt(service.completed_requests) || 0,
        pending: parseInt(service.pending_requests) || 0,
        completionRate: service.total_requests > 0 ? 
          (service.completed_requests / service.total_requests) * 100 : 0,
        totalCosts: parseFloat(service.total_costs) || 0,
        avgSatisfaction: parseFloat(service.avg_satisfaction) || 0,
        uniqueProviders: parseInt(service.unique_providers) || 0
      },
      equipmentRequests: {
        total: parseInt(equipment.total_equipment_requests) || 0,
        approved: parseInt(equipment.approved_requests) || 0,
        approvalRate: equipment.total_equipment_requests > 0 ? 
          (equipment.approved_requests / equipment.total_equipment_requests) * 100 : 0,
        totalBudget: parseFloat(equipment.total_budget) || 0
      }
    };
  }

  async save(company) {
    try {
      if (company.companyId) {
        return await this.update(company);
      } else {
        return await this.create(company);
      }
    } catch (error) {
      throw new Error(`Error saving company: ${error.message}`);
    }
  }

  async create(company) {
    const query = `
      INSERT INTO companies (
        name, type, industry, description, address, city, state, 
        country, postal_code, phone, email, website, tax_id,
        registration_number, service_types, coverage_areas,
        certifications, insurance_info, business_hours,
        emergency_contact, logo_url, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const params = [
      company.name,
      company.type,
      company.industry,
      company.description,
      company.address,
      company.city,
      company.state,
      company.country,
      company.postalCode,
      company.phone,
      company.email,
      company.website,
      company.taxId,
      company.registrationNumber,
      company.serviceTypes,
      company.coverageAreas,
      company.certifications ? JSON.stringify(company.certifications) : null,
      company.insuranceInfo ? JSON.stringify(company.insuranceInfo) : null,
      company.businessHours ? JSON.stringify(company.businessHours) : null,
      company.emergencyContact ? JSON.stringify(company.emergencyContact) : null,
      company.logoUrl,
      company.status || 'active'
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async update(company) {
    const query = `
      UPDATE companies SET
        name = $2, industry = $3, description = $4, address = $5,
        city = $6, state = $7, country = $8, postal_code = $9,
        phone = $10, email = $11, website = $12, tax_id = $13,
        registration_number = $14, service_types = $15, coverage_areas = $16,
        certifications = $17, insurance_info = $18, business_hours = $19,
        emergency_contact = $20, logo_url = $21, status = $22, updated_at = $23
      WHERE company_id = $1
      RETURNING *
    `;

    const params = [
      company.companyId,
      company.name,
      company.industry,
      company.description,
      company.address,
      company.city,
      company.state,
      company.country,
      company.postalCode,
      company.phone,
      company.email,
      company.website,
      company.taxId,
      company.registrationNumber,
      company.serviceTypes,
      company.coverageAreas,
      company.certifications ? JSON.stringify(company.certifications) : null,
      company.insuranceInfo ? JSON.stringify(company.insuranceInfo) : null,
      company.businessHours ? JSON.stringify(company.businessHours) : null,
      company.emergencyContact ? JSON.stringify(company.emergencyContact) : null,
      company.logoUrl,
      company.status,
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async count(criteria = {}) {
    try {
      let query = 'SELECT COUNT(*) FROM companies c';
      const params = [];
      const conditions = [];
      let paramIndex = 1;

      if (criteria.type) {
        conditions.push(`c.type = $${paramIndex}`);
        params.push(criteria.type);
        paramIndex++;
      }

      if (criteria.status) {
        conditions.push(`c.status = $${paramIndex}`);
        params.push(criteria.status);
        paramIndex++;
      }

      if (criteria.industry) {
        conditions.push(`c.industry = $${paramIndex}`);
        params.push(criteria.industry);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting companies: ${error.message}`);
    }
  }

  mapToEntity(row) {
    return new Company({
      companyId: row.company_id,
      name: row.name,
      type: row.type,
      industry: row.industry,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postal_code,
      phone: row.phone,
      email: row.email,
      website: row.website,
      taxId: row.tax_id,
      registrationNumber: row.registration_number,
      serviceTypes: row.service_types,
      coverageAreas: row.coverage_areas,
      certifications: row.certifications ? JSON.parse(row.certifications) : null,
      insuranceInfo: row.insurance_info ? JSON.parse(row.insurance_info) : null,
      businessHours: row.business_hours ? JSON.parse(row.business_hours) : null,
      emergencyContact: row.emergency_contact ? JSON.parse(row.emergency_contact) : null,
      logoUrl: row.logo_url,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLCompanyRepository;
