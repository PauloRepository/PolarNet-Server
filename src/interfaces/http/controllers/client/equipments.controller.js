const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');

class EquipmentsController {
  // GET /api/client/equipments - Obtener equipos rentados
  async getEquipments(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        type, 
        locationId,
        status,
        search 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'`;
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (type) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(type);
      }

      if (locationId) {
        whereClause += ` AND e.current_location_id = $${++paramCount}`;
        queryParams.push(locationId);
      }

      if (status) {
        whereClause += ` AND e.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (search) {
        whereClause += ` AND (e.name ILIKE $${++paramCount} OR e.model ILIKE $${++paramCount})`;
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const query = `
        SELECT 
          e.*,
          ar.rental_id,
          ar.start_date as rental_start,
          ar.end_date as rental_end,
          ar.monthly_rate,
          el.name as location_name,
          el.address as location_address,
          c.name as provider_name,
          c.phone as provider_phone,
          c.email as provider_email,
          -- Última lectura de temperatura
          tr.value as last_temperature,
          tr.timestamp as last_reading_time,
          tr.status as temperature_status,
          -- Conteo de alertas recientes
          COUNT(CASE WHEN tr_alerts.status = 'ALERT' AND tr_alerts.timestamp >= CURRENT_DATE - interval '24 hours' THEN 1 END) as alerts_24h,
          -- Próximo mantenimiento
          MIN(CASE WHEN m.status = 'SCHEDULED' AND m.scheduled_date >= CURRENT_DATE THEN m.scheduled_date END) as next_maintenance
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies c ON ar.provider_company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN LATERAL (
          SELECT value, timestamp, status 
          FROM temperature_readings 
          WHERE equipment_id = e.equipment_id 
          ORDER BY timestamp DESC 
          LIMIT 1
        ) tr ON true
        LEFT JOIN temperature_readings tr_alerts ON e.equipment_id = tr_alerts.equipment_id
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
        ${whereClause}
        GROUP BY e.equipment_id, ar.rental_id, el.equipment_location_id, c.company_id, tr.value, tr.timestamp, tr.status
        ORDER BY e.name ASC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT e.equipment_id) as total
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalEquipments = parseInt(countResult.rows[0].total);

      const equipments = result.rows.map(equipment => ({
        equipmentId: equipment.equipment_id.toString(),
        name: equipment.name,
        type: equipment.type,
        model: equipment.model,
        serialNumber: equipment.serial_number,
        status: equipment.status,
        rental: {
          rentalId: equipment.rental_id.toString(),
          startDate: equipment.rental_start,
          endDate: equipment.rental_end,
          monthlyRate: parseFloat(equipment.monthly_rate)
        },
        location: {
          locationId: equipment.current_location_id?.toString(),
          name: equipment.location_name,
          address: equipment.location_address
        },
        provider: {
          name: equipment.provider_name,
          phone: equipment.provider_phone,
          email: equipment.provider_email
        },
        currentReading: equipment.last_temperature ? {
          temperature: parseFloat(equipment.last_temperature),
          timestamp: equipment.last_reading_time,
          status: equipment.temperature_status
        } : null,
        alerts24h: parseInt(equipment.alerts_24h),
        nextMaintenance: equipment.next_maintenance,
        specifications: equipment.technical_specs
      }));

      // Obtener tipos de equipos para filtros
      const typesQuery = `
        SELECT DISTINCT e.type 
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
        ORDER BY e.type
      `;
      const typesResult = await db.query(typesQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        equipments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalEquipments,
          totalPages: Math.ceil(totalEquipments / limit)
        },
        filters: {
          types: typesResult.rows.map(row => row.type)
        }
      }, 'Equipos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getEquipments:', error);
      return ResponseHandler.error(res, 'Error al obtener equipos', 'GET_EQUIPMENTS_ERROR', 500);
    }
  }

  // GET /api/client/equipments/:id - Obtener detalles de un equipo
  async getEquipmentDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      const equipmentQuery = `
        SELECT 
          e.*,
          ar.rental_id,
          ar.start_date as rental_start,
          ar.end_date as rental_end,
          ar.monthly_rate,
          ar.contract_terms,
          el.name as location_name,
          el.address as location_address,
          el.contact_person as location_contact,
          el.contact_phone as location_phone,
          c.name as provider_name,
          c.phone as provider_phone,
          c.email as provider_email,
          c.address as provider_address
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies c ON ar.provider_company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        WHERE e.equipment_id = $1 AND ar.client_company_id = $2 AND ar.status = 'ACTIVE'
      `;

      const equipmentResult = await db.query(equipmentQuery, [id, clientCompanyId]);

      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado o no rentado por su empresa', 'EQUIPMENT_NOT_FOUND', 404);
      }

      const equipment = equipmentResult.rows[0];

      // Obtener lecturas recientes de temperatura
      const readingsQuery = `
        SELECT *
        FROM temperature_readings
        WHERE equipment_id = $1
        ORDER BY timestamp DESC
        LIMIT 20
      `;

      const readingsResult = await db.query(readingsQuery, [id]);

      // Obtener lecturas de energía recientes
      const energyQuery = `
        SELECT *
        FROM energy_readings
        WHERE equipment_id = $1
        ORDER BY timestamp DESC
        LIMIT 20
      `;

      const energyResult = await db.query(energyQuery, [id]);

      // Obtener servicios relacionados
      const servicesQuery = `
        SELECT 
          sr.*,
          u.name as technician_name
        FROM service_requests sr
        LEFT JOIN users u ON sr.technician_id = u.user_id
        WHERE sr.equipment_id = $1 AND sr.client_company_id = $2
        ORDER BY sr.request_date DESC
        LIMIT 10
      `;

      const servicesResult = await db.query(servicesQuery, [id, clientCompanyId]);

      // Obtener mantenimientos programados
      const maintenancesQuery = `
        SELECT 
          m.*,
          u.name as technician_name
        FROM maintenances m
        LEFT JOIN users u ON m.technician_id = u.user_id
        WHERE m.equipment_id = $1 AND m.client_company_id = $2
        ORDER BY m.scheduled_date DESC
        LIMIT 10
      `;

      const maintenancesResult = await db.query(maintenancesQuery, [id, clientCompanyId]);

      return ResponseHandler.success(res, {
        equipment: {
          equipmentId: equipment.equipment_id.toString(),
          name: equipment.name,
          description: equipment.description,
          type: equipment.type,
          category: equipment.category,
          model: equipment.model,
          serialNumber: equipment.serial_number,
          manufacturer: equipment.manufacturer,
          status: equipment.status,
          technicalSpecs: equipment.technical_specs,
          optimalTemperature: equipment.optimal_temperature,
          minTemperature: equipment.min_temperature,
          maxTemperature: equipment.max_temperature,
          powerWatts: equipment.power_watts,
          images: equipment.images,
          yearManufactured: equipment.year_manufactured,
          warrantyExpiry: equipment.warranty_expiry
        },
        rental: {
          rentalId: equipment.rental_id.toString(),
          startDate: equipment.rental_start,
          endDate: equipment.rental_end,
          monthlyRate: parseFloat(equipment.monthly_rate),
          contractTerms: equipment.contract_terms
        },
        location: {
          name: equipment.location_name,
          address: equipment.location_address,
          contactPerson: equipment.location_contact,
          contactPhone: equipment.location_phone
        },
        provider: {
          name: equipment.provider_name,
          phone: equipment.provider_phone,
          email: equipment.provider_email,
          address: equipment.provider_address
        },
        recentReadings: readingsResult.rows.map(reading => ({
          readingId: reading.temperature_reading_id.toString(),
          temperature: parseFloat(reading.value),
          status: reading.status,
          alertTriggered: reading.alert_triggered,
          timestamp: reading.timestamp
        })),
        energyReadings: energyResult.rows.map(energy => ({
          readingId: energy.energy_reading_id.toString(),
          consumptionKwh: parseFloat(energy.consumption_kwh),
          powerWatts: parseFloat(energy.power_watts),
          costEstimate: parseFloat(energy.cost_estimate),
          timestamp: energy.timestamp
        })),
        serviceHistory: servicesResult.rows.map(service => ({
          serviceId: service.service_request_id.toString(),
          title: service.title,
          status: service.status,
          priority: service.priority,
          requestDate: service.request_date,
          completionDate: service.completion_date,
          technicianName: service.technician_name,
          finalCost: service.final_cost ? parseFloat(service.final_cost) : null
        })),
        maintenanceHistory: maintenancesResult.rows.map(maintenance => ({
          maintenanceId: maintenance.maintenance_id.toString(),
          title: maintenance.title,
          type: maintenance.type,
          status: maintenance.status,
          scheduledDate: maintenance.scheduled_date,
          actualEndTime: maintenance.actual_end_time,
          technicianName: maintenance.technician_name,
          actualCost: maintenance.actual_cost ? parseFloat(maintenance.actual_cost) : null
        }))
      }, 'Detalles del equipo obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getEquipmentDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del equipo', 'GET_EQUIPMENT_DETAILS_ERROR', 500);
    }
  }

  // GET /api/client/equipments/:id/readings - Obtener lecturas de un equipo
  async getEquipmentReadings(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const { type = 'temperature', startDate, endDate, limit = 100 } = req.query;

      // Verificar que el equipo está rentado por este cliente
      const equipmentCheck = await db.query(`
        SELECT ar.rental_id 
        FROM active_rentals ar
        WHERE ar.equipment_id = $1 AND ar.client_company_id = $2 AND ar.status = 'ACTIVE'
      `, [id, clientCompanyId]);

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado o no rentado por su empresa', 'EQUIPMENT_NOT_FOUND', 404);
      }

      let query, queryParams;

      if (type === 'temperature') {
        let whereClause = 'WHERE equipment_id = $1';
        queryParams = [id];
        let paramCount = 1;

        if (startDate) {
          whereClause += ` AND timestamp >= $${++paramCount}`;
          queryParams.push(startDate);
        }

        if (endDate) {
          whereClause += ` AND timestamp <= $${++paramCount}`;
          queryParams.push(endDate);
        }

        query = `
          SELECT 
            temperature_reading_id,
            value as temperature,
            status,
            alert_triggered,
            timestamp
          FROM temperature_readings
          ${whereClause}
          ORDER BY timestamp DESC
          LIMIT $${++paramCount}
        `;

        queryParams.push(limit);

      } else if (type === 'energy') {
        let whereClause = 'WHERE equipment_id = $1';
        queryParams = [id];
        let paramCount = 1;

        if (startDate) {
          whereClause += ` AND timestamp >= $${++paramCount}`;
          queryParams.push(startDate);
        }

        if (endDate) {
          whereClause += ` AND timestamp <= $${++paramCount}`;
          queryParams.push(endDate);
        }

        query = `
          SELECT 
            energy_reading_id,
            consumption_kwh,
            power_watts,
            voltage,
            current_amps,
            cost_estimate,
            timestamp
          FROM energy_readings
          ${whereClause}
          ORDER BY timestamp DESC
          LIMIT $${++paramCount}
        `;

        queryParams.push(limit);
      }

      const result = await db.query(query, queryParams);

      const readings = result.rows.map(reading => {
        if (type === 'temperature') {
          return {
            readingId: reading.temperature_reading_id.toString(),
            temperature: parseFloat(reading.temperature),
            status: reading.status,
            alertTriggered: reading.alert_triggered,
            timestamp: reading.timestamp
          };
        } else {
          return {
            readingId: reading.energy_reading_id.toString(),
            consumptionKwh: parseFloat(reading.consumption_kwh),
            powerWatts: parseFloat(reading.power_watts),
            voltage: parseFloat(reading.voltage),
            currentAmps: parseFloat(reading.current_amps),
            costEstimate: parseFloat(reading.cost_estimate),
            timestamp: reading.timestamp
          };
        }
      });

      return ResponseHandler.success(res, {
        readings,
        type,
        equipmentId: id
      }, `Lecturas de ${type} obtenidas exitosamente`);

    } catch (error) {
      console.error('Error en getEquipmentReadings:', error);
      return ResponseHandler.error(res, 'Error al obtener lecturas', 'GET_READINGS_ERROR', 500);
    }
  }

  // GET /api/client/equipments/:id/history - Obtener historial completo del equipo
  async getEquipmentHistory(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const { page = 1, limit = 20, type } = req.query;
      const offset = (page - 1) * limit;

      // Verificar que el equipo está rentado por este cliente
      const equipmentCheck = await db.query(`
        SELECT ar.rental_id 
        FROM active_rentals ar
        WHERE ar.equipment_id = $1 AND ar.client_company_id = $2 AND ar.status = 'ACTIVE'
      `, [id, clientCompanyId]);

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado o no rentado por su empresa', 'EQUIPMENT_NOT_FOUND', 404);
      }

      let whereFilter = '';
      let queryParams = [id, clientCompanyId];

      if (type) {
        whereFilter = `AND activity_type = $3`;
        queryParams.push(type);
      }

      const historyQuery = `
        (
          SELECT 
            'service' as activity_type,
            'Solicitud de servicio: ' || sr.title as description,
            sr.status,
            sr.request_date as activity_date,
            sr.service_request_id::text as reference_id,
            sr.final_cost as cost
          FROM service_requests sr
          WHERE sr.equipment_id = $1 AND sr.client_company_id = $2
        )
        UNION ALL
        (
          SELECT 
            'maintenance' as activity_type,
            'Mantenimiento: ' || COALESCE(m.title, m.type) as description,
            m.status,
            m.scheduled_date::timestamp as activity_date,
            m.maintenance_id::text as reference_id,
            m.actual_cost as cost
          FROM maintenances m
          WHERE m.equipment_id = $1 AND m.client_company_id = $2
        )
        ${whereFilter ? `WHERE activity_type IN (${type === 'service' ? "'service'" : "'maintenance'"})` : ''}
        ORDER BY activity_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await db.query(historyQuery, queryParams);

      const history = result.rows.map(item => ({
        activityType: item.activity_type,
        description: item.description,
        status: item.status,
        activityDate: item.activity_date,
        referenceId: item.reference_id,
        cost: item.cost ? parseFloat(item.cost) : null
      }));

      return ResponseHandler.success(res, {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }, 'Historial del equipo obtenido exitosamente');

    } catch (error) {
      console.error('Error en getEquipmentHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial', 'GET_HISTORY_ERROR', 500);
    }
  }

  // GET /api/client/equipments/summary - Resumen de todos los equipos
  async getEquipmentsSummary(req, res) {
    try {
      const { clientCompanyId } = req.user;

      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT CASE WHEN e.status = 'AVAILABLE' THEN e.equipment_id END) as operational_equipments,
          COUNT(DISTINCT CASE WHEN e.status = 'MAINTENANCE' THEN e.equipment_id END) as maintenance_equipments,
          e.type,
          AVG(ar.monthly_rate) as avg_monthly_cost,
          SUM(ar.monthly_rate) as total_monthly_cost,
          -- Conteo de alertas recientes
          COUNT(CASE WHEN tr.status = 'ALERT' AND tr.timestamp >= CURRENT_DATE - interval '24 hours' THEN 1 END) as recent_alerts
        FROM active_rentals ar
        INNER JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
        GROUP BY e.type
        ORDER BY total_monthly_cost DESC
      `;

      const result = await db.query(summaryQuery, [clientCompanyId]);

      const summary = result.rows.map(item => ({
        type: item.type,
        totalEquipments: parseInt(item.total_equipments),
        operationalEquipments: parseInt(item.operational_equipments),
        maintenanceEquipments: parseInt(item.maintenance_equipments),
        avgMonthlyCost: parseFloat(item.avg_monthly_cost),
        totalMonthlyCost: parseFloat(item.total_monthly_cost),
        recentAlerts: parseInt(item.recent_alerts)
      }));

      const totals = {
        totalEquipments: summary.reduce((sum, item) => sum + item.totalEquipments, 0),
        totalMonthlyCost: summary.reduce((sum, item) => sum + item.totalMonthlyCost, 0),
        totalAlerts: summary.reduce((sum, item) => sum + item.recentAlerts, 0)
      };

      return ResponseHandler.success(res, {
        summary,
        totals
      }, 'Resumen de equipos obtenido exitosamente');

    } catch (error) {
      console.error('Error en getEquipmentsSummary:', error);
      return ResponseHandler.error(res, 'Error al obtener resumen', 'GET_SUMMARY_ERROR', 500);
    }
  }
}

module.exports = new EquipmentsController();
