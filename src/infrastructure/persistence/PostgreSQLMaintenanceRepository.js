/**
 * PostgreSQL Maintenance Repository Implementation
 */
const IMaintenanceRepository = require('../../domain/repositories/IMaintenanceRepository');
const Maintenance = require('../../domain/entities/Maintenance');

class PostgreSQLMaintenanceRepository extends IMaintenanceRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  async findById(maintenanceId) {
    try {
      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          cc.name as client_company_name,
          pc.name as provider_company_name,
          tu.name as technician_name,
          sr.title as service_request_title
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies cc ON m.client_company_id = cc.company_id
        LEFT JOIN companies pc ON m.provider_company_id = pc.company_id
        LEFT JOIN users tu ON m.technician_id = tu.user_id
        LEFT JOIN service_requests sr ON m.service_request_id = sr.service_request_id
        WHERE m.maintenance_id = $1
      `;
      
      const result = await this.db.query(query, [maintenanceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding maintenance by ID: ${error.message}`);
    }
  }

  async findByProvider(providerCompanyId, filters = {}) {
    try {
      let query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          cc.name as client_company_name,
          tu.name as technician_name
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies cc ON m.client_company_id = cc.company_id
        LEFT JOIN users tu ON m.technician_id = tu.user_id
        WHERE m.provider_company_id = $1
      `;
      
      const params = [providerCompanyId];
      let paramIndex = 2;

      // Aplicar filtros
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query += ` AND m.status = ANY($${paramIndex})`;
          params.push(filters.status);
        } else {
          query += ` AND m.status = $${paramIndex}`;
          params.push(filters.status);
        }
        paramIndex++;
      }

      if (filters.type) {
        query += ` AND m.type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.equipmentId) {
        query += ` AND m.equipment_id = $${paramIndex}`;
        params.push(filters.equipmentId);
        paramIndex++;
      }

      if (filters.technicianId) {
        query += ` AND m.technician_id = $${paramIndex}`;
        params.push(filters.technicianId);
        paramIndex++;
      }

      if (filters.startDate) {
        query += ` AND m.scheduled_date >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND m.scheduled_date <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      query += ` ORDER BY m.scheduled_date ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding maintenances by provider: ${error.message}`);
    }
  }

  async findByEquipment(equipmentId) {
    try {
      const query = `
        SELECT 
          m.*,
          pc.name as provider_company_name,
          tu.name as technician_name
        FROM maintenances m
        LEFT JOIN companies pc ON m.provider_company_id = pc.company_id
        LEFT JOIN users tu ON m.technician_id = tu.user_id
        WHERE m.equipment_id = $1
        ORDER BY m.scheduled_date DESC
      `;
      
      const result = await this.db.query(query, [equipmentId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding maintenances by equipment: ${error.message}`);
    }
  }

  async findScheduledMaintenances(providerCompanyId, dateRange = {}) {
    try {
      let query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          cc.name as client_company_name,
          tu.name as technician_name
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies cc ON m.client_company_id = cc.company_id
        LEFT JOIN users tu ON m.technician_id = tu.user_id
        WHERE m.provider_company_id = $1 AND m.status = 'SCHEDULED'
      `;
      
      const params = [providerCompanyId];
      let paramIndex = 2;

      if (dateRange.startDate) {
        query += ` AND m.scheduled_date >= $${paramIndex}`;
        params.push(dateRange.startDate);
        paramIndex++;
      }

      if (dateRange.endDate) {
        query += ` AND m.scheduled_date <= $${paramIndex}`;
        params.push(dateRange.endDate);
        paramIndex++;
      }

      query += ` ORDER BY m.scheduled_date ASC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding scheduled maintenances: ${error.message}`);
    }
  }

  async findOverdueMaintenances(providerCompanyId) {
    try {
      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          cc.name as client_company_name
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies cc ON m.client_company_id = cc.company_id
        WHERE m.provider_company_id = $1 
          AND m.status = 'SCHEDULED'
          AND m.scheduled_date < CURRENT_DATE
        ORDER BY m.scheduled_date ASC
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding overdue maintenances: ${error.message}`);
    }
  }

  async findUpcomingMaintenances(providerCompanyId, daysAhead = 7) {
    try {
      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          cc.name as client_company_name,
          tu.name as technician_name
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies cc ON m.client_company_id = cc.company_id
        LEFT JOIN users tu ON m.technician_id = tu.user_id
        WHERE m.provider_company_id = $1 
          AND m.status = 'SCHEDULED'
          AND m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysAhead} days'
        ORDER BY m.scheduled_date ASC
      `;
      
      const result = await this.db.query(query, [providerCompanyId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error finding upcoming maintenances: ${error.message}`);
    }
  }

  async getMaintenanceCalendar(providerCompanyId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          cc.name as client_company_name,
          tu.name as technician_name
        FROM maintenances m
        LEFT JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN companies cc ON m.client_company_id = cc.company_id
        LEFT JOIN users tu ON m.technician_id = tu.user_id
        WHERE m.provider_company_id = $1 
          AND m.scheduled_date >= $2 
          AND m.scheduled_date <= $3
        ORDER BY m.scheduled_date ASC
      `;
      
      const result = await this.db.query(query, [providerCompanyId, startDate, endDate]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      throw new Error(`Error getting maintenance calendar: ${error.message}`);
    }
  }

  async getKPIs(providerCompanyId, period) {
    try {
      const { startDate, endDate } = period;
      
      // KPI 1: Mantenimientos completados vs programados
      const completionRateQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'SCHEDULED' AND scheduled_date < CURRENT_DATE THEN 1 END) as overdue,
          COUNT(*) as total,
          AVG(actual_cost) as avg_cost,
          SUM(actual_cost) as total_cost
        FROM maintenances
        WHERE provider_company_id = $1 
          AND scheduled_date >= $2 
          AND scheduled_date <= $3
      `;

      // KPI 2: Tiempo promedio de resolución
      const resolutionTimeQuery = `
        SELECT 
          AVG(
            CASE 
              WHEN actual_end_time IS NOT NULL AND actual_start_time IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 3600 
              ELSE NULL 
            END
          ) as avg_duration_hours,
          AVG(
            CASE 
              WHEN actual_end_time IS NOT NULL AND scheduled_date IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (actual_end_time::date - scheduled_date)) / 86400 
              ELSE NULL 
            END
          ) as avg_delay_days
        FROM maintenances
        WHERE provider_company_id = $1 
          AND status = 'COMPLETED'
          AND scheduled_date >= $2 
          AND scheduled_date <= $3
      `;

      // KPI 3: Distribución por tipo
      const typeDistributionQuery = `
        SELECT 
          type,
          COUNT(*) as count,
          AVG(actual_cost) as avg_cost,
          SUM(actual_cost) as total_cost
        FROM maintenances
        WHERE provider_company_id = $1 
          AND scheduled_date >= $2 
          AND scheduled_date <= $3
        GROUP BY type
      `;

      // KPI 4: Eficiencia por técnico
      const technicianEfficiencyQuery = `
        SELECT 
          u.name as technician_name,
          COUNT(m.maintenance_id) as maintenances_count,
          AVG(m.actual_cost) as avg_cost,
          AVG(m.quality_rating) as avg_rating,
          COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as completed_count
        FROM maintenances m
        LEFT JOIN users u ON m.technician_id = u.user_id
        WHERE m.provider_company_id = $1 
          AND m.scheduled_date >= $2 
          AND m.scheduled_date <= $3
          AND m.technician_id IS NOT NULL
        GROUP BY u.user_id, u.name
        ORDER BY completed_count DESC
      `;

      const [
        completionResult,
        resolutionResult,
        typeResult,
        technicianResult
      ] = await Promise.all([
        this.db.query(completionRateQuery, [providerCompanyId, startDate, endDate]),
        this.db.query(resolutionTimeQuery, [providerCompanyId, startDate, endDate]),
        this.db.query(typeDistributionQuery, [providerCompanyId, startDate, endDate]),
        this.db.query(technicianEfficiencyQuery, [providerCompanyId, startDate, endDate])
      ]);

      const completion = completionResult.rows[0];
      const resolution = resolutionResult.rows[0];

      return {
        completionRate: completion.total > 0 ? (completion.completed / completion.total) * 100 : 0,
        overdueCount: parseInt(completion.overdue),
        totalMaintenances: parseInt(completion.total),
        totalCost: parseFloat(completion.total_cost) || 0,
        avgCost: parseFloat(completion.avg_cost) || 0,
        avgDurationHours: parseFloat(resolution.avg_duration_hours) || 0,
        avgDelayDays: parseFloat(resolution.avg_delay_days) || 0,
        typeDistribution: typeResult.rows.map(row => ({
          type: row.type,
          count: parseInt(row.count),
          avgCost: parseFloat(row.avg_cost) || 0,
          totalCost: parseFloat(row.total_cost) || 0
        })),
        technicianEfficiency: technicianResult.rows.map(row => ({
          technicianName: row.technician_name,
          maintenancesCount: parseInt(row.maintenances_count),
          completedCount: parseInt(row.completed_count),
          avgCost: parseFloat(row.avg_cost) || 0,
          avgRating: parseFloat(row.avg_rating) || 0,
          completionRate: row.maintenances_count > 0 ? (row.completed_count / row.maintenances_count) * 100 : 0
        }))
      };
    } catch (error) {
      throw new Error(`Error getting maintenance KPIs: ${error.message}`);
    }
  }

  async save(maintenance) {
    try {
      if (maintenance.maintenanceId) {
        return await this.update(maintenance);
      } else {
        return await this.create(maintenance);
      }
    } catch (error) {
      throw new Error(`Error saving maintenance: ${error.message}`);
    }
  }

  async create(maintenance) {
    const query = `
      INSERT INTO maintenances (
        title, description, type, category, scheduled_date,
        estimated_duration_hours, actual_start_time, actual_end_time,
        next_scheduled_date, status, equipment_id, service_request_id,
        technician_id, client_company_id, provider_company_id,
        estimated_cost, actual_cost, parts_cost, labor_cost,
        work_performed, parts_used, findings, recommendations,
        before_photos, after_photos, documents, quality_rating, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *
    `;

    const params = [
      maintenance.title,
      maintenance.description,
      maintenance.type,
      maintenance.category,
      maintenance.scheduledDate,
      maintenance.estimatedDurationHours,
      maintenance.actualStartTime,
      maintenance.actualEndTime,
      maintenance.nextScheduledDate,
      maintenance.status,
      maintenance.equipmentId,
      maintenance.serviceRequestId,
      maintenance.technicianId,
      maintenance.clientCompanyId,
      maintenance.providerCompanyId,
      maintenance.estimatedCost,
      maintenance.actualCost,
      maintenance.partsCost,
      maintenance.laborCost,
      maintenance.workPerformed,
      maintenance.partsUsed ? JSON.stringify(maintenance.partsUsed) : null,
      maintenance.findings,
      maintenance.recommendations,
      maintenance.beforePhotos ? JSON.stringify(maintenance.beforePhotos) : null,
      maintenance.afterPhotos ? JSON.stringify(maintenance.afterPhotos) : null,
      maintenance.documents ? JSON.stringify(maintenance.documents) : null,
      maintenance.qualityRating,
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async update(maintenance) {
    const query = `
      UPDATE maintenances SET
        title = $2, description = $3, type = $4, category = $5,
        scheduled_date = $6, estimated_duration_hours = $7,
        actual_start_time = $8, actual_end_time = $9,
        next_scheduled_date = $10, status = $11, technician_id = $12,
        estimated_cost = $13, actual_cost = $14, parts_cost = $15,
        labor_cost = $16, work_performed = $17, parts_used = $18,
        findings = $19, recommendations = $20, before_photos = $21,
        after_photos = $22, documents = $23, quality_rating = $24,
        updated_at = $25
      WHERE maintenance_id = $1
      RETURNING *
    `;

    const params = [
      maintenance.maintenanceId,
      maintenance.title,
      maintenance.description,
      maintenance.type,
      maintenance.category,
      maintenance.scheduledDate,
      maintenance.estimatedDurationHours,
      maintenance.actualStartTime,
      maintenance.actualEndTime,
      maintenance.nextScheduledDate,
      maintenance.status,
      maintenance.technicianId,
      maintenance.estimatedCost,
      maintenance.actualCost,
      maintenance.partsCost,
      maintenance.laborCost,
      maintenance.workPerformed,
      maintenance.partsUsed ? JSON.stringify(maintenance.partsUsed) : null,
      maintenance.findings,
      maintenance.recommendations,
      maintenance.beforePhotos ? JSON.stringify(maintenance.beforePhotos) : null,
      maintenance.afterPhotos ? JSON.stringify(maintenance.afterPhotos) : null,
      maintenance.documents ? JSON.stringify(maintenance.documents) : null,
      maintenance.qualityRating,
      new Date()
    ];

    const result = await this.db.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async count(criteria = {}) {
    try {
      let query = 'SELECT COUNT(*) FROM maintenances m';
      const params = [];
      const conditions = [];
      let paramIndex = 1;

      if (criteria.providerCompanyId) {
        conditions.push(`m.provider_company_id = $${paramIndex}`);
        params.push(criteria.providerCompanyId);
        paramIndex++;
      }

      if (criteria.status) {
        if (Array.isArray(criteria.status)) {
          conditions.push(`m.status = ANY($${paramIndex})`);
          params.push(criteria.status);
        } else {
          conditions.push(`m.status = $${paramIndex}`);
          params.push(criteria.status);
        }
        paramIndex++;
      }

      if (criteria.type) {
        conditions.push(`m.type = $${paramIndex}`);
        params.push(criteria.type);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting maintenances: ${error.message}`);
    }
  }

  mapToEntity(row) {
    return new Maintenance({
      maintenanceId: row.maintenance_id,
      title: row.title,
      description: row.description,
      type: row.type,
      category: row.category,
      scheduledDate: row.scheduled_date,
      estimatedDurationHours: row.estimated_duration_hours,
      actualStartTime: row.actual_start_time,
      actualEndTime: row.actual_end_time,
      nextScheduledDate: row.next_scheduled_date,
      status: row.status,
      equipmentId: row.equipment_id,
      serviceRequestId: row.service_request_id,
      technicianId: row.technician_id,
      clientCompanyId: row.client_company_id,
      providerCompanyId: row.provider_company_id,
      estimatedCost: parseFloat(row.estimated_cost) || 0,
      actualCost: parseFloat(row.actual_cost) || 0,
      partsCost: parseFloat(row.parts_cost) || 0,
      laborCost: parseFloat(row.labor_cost) || 0,
      workPerformed: row.work_performed,
      partsUsed: row.parts_used ? JSON.parse(row.parts_used) : null,
      findings: row.findings,
      recommendations: row.recommendations,
      beforePhotos: row.before_photos ? JSON.parse(row.before_photos) : null,
      afterPhotos: row.after_photos ? JSON.parse(row.after_photos) : null,
      documents: row.documents ? JSON.parse(row.documents) : null,
      qualityRating: row.quality_rating,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLMaintenanceRepository;
