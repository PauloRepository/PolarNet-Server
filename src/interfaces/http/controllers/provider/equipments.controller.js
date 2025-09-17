const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');

class EquipmentsController {
  // GET /api/provider/equipments - Obtener catálogo de equipos
  async getEquipments(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        type, 
        status, 
        availability,
        location 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE e.owner_company_id = $1`;
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (search) {
        whereClause += ` AND (e.name ILIKE $${++paramCount} OR e.model ILIKE $${++paramCount} OR e.serial_number ILIKE $${++paramCount})`;
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (type) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(type);
      }

      if (status) {
        whereClause += ` AND e.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (availability) {
        if (availability === 'available') {
          whereClause += ` AND ar.rental_id IS NULL`;
        } else if (availability === 'rented') {
          whereClause += ` AND ar.rental_id IS NOT NULL AND ar.status = 'ACTIVE'`;
        }
      }

      if (location) {
        whereClause += ` AND e.current_location_id = $${++paramCount}`;
        queryParams.push(location);
      }

      const query = `
        SELECT DISTINCT
          e.*,
          el.name as location_name,
          el.address as location_address,
          ar.rental_id,
          ar.client_company_id,
          c.name as client_name,
          ar.monthly_rate as current_rental_rate,
          ar.start_date as rental_start_date,
          COUNT(sr.service_request_id) as pending_services
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id 
          AND sr.status IN ('PENDING', 'IN_PROGRESS')
        ${whereClause}
        GROUP BY e.equipment_id, el.equipment_location_id, ar.rental_id, c.company_id
        ORDER BY e.name ASC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT e.equipment_id) as total
        FROM equipments e
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalEquipments = parseInt(countResult.rows[0].total);

      const equipments = result.rows.map(equipment => ({
        equipmentId: equipment.equipment_id.toString(),
        name: equipment.name,
        type: equipment.type,
        model: equipment.model,
        brand: equipment.manufacturer,
        serialNumber: equipment.serial_number,
        status: equipment.status,
        specifications: equipment.technical_specs,
        dailyRate: equipment.rental_price_daily ? parseFloat(equipment.rental_price_daily) : null,
        monthlyRate: equipment.rental_price_monthly ? parseFloat(equipment.rental_price_monthly) : null,
        depositAmount: null, // This column doesn't exist in equipments table
        location: {
          locationId: equipment.current_location_id?.toString(),
          name: equipment.location_name,
          address: equipment.location_address
        },
        rental: equipment.rental_id ? {
          rentalId: equipment.rental_id.toString(),
          clientCompanyId: equipment.client_company_id.toString(),
          clientName: equipment.client_name,
          currentRate: parseFloat(equipment.current_rental_rate),
          startDate: equipment.rental_start_date
        } : null,
        pendingServices: parseInt(equipment.pending_services),
        isAvailable: !equipment.rental_id,
        createdAt: equipment.created_at,
        updatedAt: equipment.updated_at
      }));

      // Obtener tipos de equipos para filtros
      const typesQuery = `
        SELECT DISTINCT type 
        FROM equipments 
        WHERE owner_company_id = $1 
        ORDER BY type
      `;
      const typesResult = await db.query(typesQuery, [providerCompanyId]);

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

  // GET /api/provider/equipments/:id - Obtener detalles de un equipo
  async getEquipmentDetails(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      const equipmentQuery = `
        SELECT 
          e.*,
          el.name as location_name,
          el.address as location_address,
          el.city as location_city,
          el.state as location_state,
          ar.rental_id,
          ar.client_company_id,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email,
          ar.monthly_rate as current_rental_rate,
          ar.start_date as rental_start_date,
          ar.end_date as rental_end_date
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE e.equipment_id = $1 AND e.owner_company_id = $2
      `;

      const equipmentResult = await db.query(equipmentQuery, [id, providerCompanyId]);

      if (equipmentResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND', 404);
      }

      const equipment = equipmentResult.rows[0];

      // Obtener historial de servicios
      const serviceHistoryQuery = `
        SELECT 
          sr.*,
          u.name as technician_name
        FROM service_requests sr
        LEFT JOIN users u ON sr.technician_id = u.user_id
        WHERE sr.equipment_id = $1
        ORDER BY sr.request_date DESC
        LIMIT 10
      `;

      const serviceHistoryResult = await db.query(serviceHistoryQuery, [id]);

      // Obtener historial de mantenimientos
      const maintenanceHistoryQuery = `
        SELECT 
          m.*,
          u.name as technician_name
        FROM maintenances m
        LEFT JOIN users u ON m.technician_id = u.user_id
        WHERE m.equipment_id = $1
        ORDER BY m.scheduled_date DESC
        LIMIT 10
      `;

      const maintenanceHistoryResult = await db.query(maintenanceHistoryQuery, [id]);

      // Obtener lecturas de temperatura recientes
      const readingsQuery = `
        SELECT 
          tr.*
        FROM temperature_readings tr
        WHERE tr.equipment_id = $1
        ORDER BY tr.timestamp DESC
        LIMIT 20
      `;

      const readingsResult = await db.query(readingsQuery, [id]);

      return ResponseHandler.success(res, {
        equipment: {
          equipmentId: equipment.equipment_id.toString(),
          name: equipment.name,
          type: equipment.type,
          model: equipment.model,
          brand: equipment.manufacturer,
          serialNumber: equipment.serial_number,
          status: equipment.status,
          specifications: equipment.technical_specs,
          dailyRate: equipment.rental_price_daily ? parseFloat(equipment.rental_price_daily) : null,
          monthlyRate: equipment.rental_price_monthly ? parseFloat(equipment.rental_price_monthly) : null,
          depositAmount: null, // This column doesn't exist
          purchaseDate: null, // This column doesn't exist
          warrantyExpiry: equipment.warranty_expiry,
          lastMaintenanceDate: null, // This column doesn't exist
          createdAt: equipment.created_at,
          updatedAt: equipment.updated_at
        },
        location: equipment.current_location_id ? {
          locationId: equipment.current_location_id.toString(),
          name: equipment.location_name,
          address: equipment.location_address,
          city: equipment.location_city,
          state: equipment.location_state
        } : null,
        currentRental: equipment.rental_id ? {
          rentalId: equipment.rental_id.toString(),
          clientCompanyId: equipment.client_company_id.toString(),
          clientName: equipment.client_name,
          clientPhone: equipment.client_phone,
          clientEmail: equipment.client_email,
          monthlyRate: parseFloat(equipment.current_rental_rate),
          startDate: equipment.rental_start_date,
          endDate: equipment.rental_end_date
        } : null,
        serviceHistory: serviceHistoryResult.rows.map(sr => ({
          requestId: sr.service_request_id.toString(),
          type: sr.issue_type,
          priority: sr.priority,
          status: sr.status,
          description: sr.description,
          technicianName: sr.technician_name,
          createdAt: sr.request_date,
          completedAt: sr.completion_date,
          cost: sr.final_cost ? parseFloat(sr.final_cost) : null
        })),
        maintenanceHistory: maintenanceHistoryResult.rows.map(m => ({
          maintenanceId: m.maintenance_id.toString(),
          type: m.type,
          status: m.status,
          scheduledDate: m.scheduled_date,
          completedDate: m.actual_end_time,
          technicianName: m.technician_name,
          description: m.description,
          cost: m.actual_cost ? parseFloat(m.actual_cost) : null
        })),
        recentReadings: readingsResult.rows.map(reading => ({
          readingId: reading.temperature_reading_id.toString(),
          temperature: parseFloat(reading.value),
          humidity: null, // This column doesn't exist in temperature_readings
          readingDate: reading.timestamp,
          status: reading.status
        }))
      }, 'Detalles del equipo obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getEquipmentDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del equipo', 'GET_EQUIPMENT_DETAILS_ERROR', 500);
    }
  }

  // POST /api/provider/equipments - Crear nuevo equipo
  async createEquipment(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const {
        name, type, model, brand, serialNumber, specifications,
        dailyRate, monthlyRate, currentLocationId, warrantyExpiry
      } = req.body;

      // Verificar que el serial number no exista
      const serialCheck = await db.query(
        'SELECT equipment_id FROM equipments WHERE serial_number = $1',
        [serialNumber]
      );

      if (serialCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'Ya existe un equipo con este número de serie', 'SERIAL_NUMBER_EXISTS', 400);
      }

      // Verificar que la ubicación pertenece al proveedor
      if (currentLocationId) {
        const locationCheck = await db.query(
          'SELECT equipment_location_id FROM equipment_locations WHERE equipment_location_id = $1 AND company_id = $2',
          [currentLocationId, providerCompanyId]
        );

        if (locationCheck.rows.length === 0) {
          return ResponseHandler.error(res, 'Ubicación no válida', 'INVALID_LOCATION', 400);
        }
      }

      const insertQuery = `
        INSERT INTO equipments (
          name, type, model, manufacturer, serial_number, technical_specs,
          rental_price_daily, rental_price_monthly, current_location_id,
          warranty_expiry, owner_company_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'AVAILABLE')
        RETURNING *
      `;

      const values = [
        name, type, model, brand, serialNumber, specifications,
        dailyRate, monthlyRate, currentLocationId,
        warrantyExpiry, providerCompanyId
      ];

      const result = await db.query(insertQuery, values);

      return ResponseHandler.success(res, {
        equipment: result.rows[0]
      }, 'Equipo creado exitosamente');

    } catch (error) {
      console.error('Error en createEquipment:', error);
      return ResponseHandler.error(res, 'Error al crear equipo', 'CREATE_EQUIPMENT_ERROR', 500);
    }
  }

  // PUT /api/provider/equipments/:id - Actualizar equipo
  async updateEquipment(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const {
        name, type, model, brand, specifications,
        dailyRate, monthlyRate, depositAmount, currentLocationId,
        status, warrantyExpiry
      } = req.body;

      // Verificar que el equipo pertenece al proveedor
      const equipmentCheck = await db.query(
        'SELECT equipment_id FROM equipments WHERE equipment_id = $1 AND owner_company_id = $2',
        [id, providerCompanyId]
      );

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND', 404);
      }

      // Verificar ubicación si se proporciona
      if (currentLocationId) {
        const locationCheck = await db.query(
          'SELECT equipment_location_id FROM equipment_locations WHERE equipment_location_id = $1 AND company_id = $2',
          [currentLocationId, providerCompanyId]
        );

        if (locationCheck.rows.length === 0) {
          return ResponseHandler.error(res, 'Ubicación no válida', 'INVALID_LOCATION', 400);
        }
      }

      const updateQuery = `
        UPDATE equipments SET
          name = $1, type = $2, model = $3, manufacturer = $4, technical_specs = $5,
          rental_price_daily = $6, rental_price_monthly = $7,
          current_location_id = $8, status = $9, warranty_expiry = $10,
          updated_at = NOW()
        WHERE equipment_id = $11 AND owner_company_id = $12
        RETURNING *
      `;

      const values = [
        name, type, model, brand, specifications,
        dailyRate, monthlyRate, currentLocationId,
        status, warrantyExpiry, id, providerCompanyId
      ];

      const result = await db.query(updateQuery, values);

      return ResponseHandler.success(res, {
        equipment: result.rows[0]
      }, 'Equipo actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateEquipment:', error);
      return ResponseHandler.error(res, 'Error al actualizar equipo', 'UPDATE_EQUIPMENT_ERROR', 500);
    }
  }

  // DELETE /api/provider/equipments/:id - Eliminar equipo
  async deleteEquipment(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      // Verificar que no esté en contrato activo
      const rentalCheck = await db.query(
        'SELECT rental_id FROM active_rentals WHERE equipment_id = $1 AND status = $2',
        [id, 'ACTIVE']
      );

      if (rentalCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'No se puede eliminar. El equipo tiene un contrato activo', 'EQUIPMENT_IN_RENTAL', 400);
      }

      const deleteQuery = `
        DELETE FROM equipments 
        WHERE equipment_id = $1 AND owner_company_id = $2
        RETURNING *
      `;

      const result = await db.query(deleteQuery, [id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        deletedEquipment: result.rows[0]
      }, 'Equipo eliminado exitosamente');

    } catch (error) {
      console.error('Error en deleteEquipment:', error);
      return ResponseHandler.error(res, 'Error al eliminar equipo', 'DELETE_EQUIPMENT_ERROR', 500);
    }
  }

  // GET /api/provider/equipments/:id/readings - Obtener lecturas de un equipo
  async getEquipmentReadings(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { startDate, endDate, limit = 100 } = req.query;

      // Verificar que el equipo pertenece al proveedor
      const equipmentCheck = await db.query(
        'SELECT equipment_id FROM equipments WHERE equipment_id = $1 AND owner_company_id = $2',
        [id, providerCompanyId]
      );

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND', 404);
      }

      let whereClause = 'WHERE equipment_id = $1';
      let queryParams = [id];
      let paramCount = 1;

      if (startDate) {
        whereClause += ` AND timestamp >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND timestamp <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      const query = `
        SELECT *
        FROM temperature_readings
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${++paramCount}
      `;

      queryParams.push(limit);

      const result = await db.query(query, queryParams);

      const readings = result.rows.map(reading => ({
        readingId: reading.temperature_reading_id.toString(),
        temperature: parseFloat(reading.value),
        humidity: null, // This column doesn't exist
        readingDate: reading.timestamp,
        status: reading.status,
        notes: null // This column doesn't exist
      }));

      // Estadísticas de las lecturas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_readings,
          AVG(value) as avg_temperature,
          MIN(value) as min_temperature,
          MAX(value) as max_temperature,
          COUNT(CASE WHEN status = 'ALERT' THEN 1 END) as alert_count
        FROM temperature_readings
        ${whereClause}
      `;

      const statsResult = await db.query(statsQuery, queryParams.slice(0, -1));
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, {
        readings,
        stats: {
          totalReadings: parseInt(stats.total_readings),
          avgTemperature: stats.avg_temperature ? parseFloat(stats.avg_temperature).toFixed(1) : null,
          minTemperature: stats.min_temperature ? parseFloat(stats.min_temperature) : null,
          maxTemperature: stats.max_temperature ? parseFloat(stats.max_temperature) : null,
          alertCount: parseInt(stats.alert_count)
        }
      }, 'Lecturas del equipo obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getEquipmentReadings:', error);
      return ResponseHandler.error(res, 'Error al obtener lecturas del equipo', 'GET_EQUIPMENT_READINGS_ERROR', 500);
    }
  }

  // POST /api/provider/equipments/:id/move - Mover equipo a otra ubicación
  async moveEquipment(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { newLocationId, notes } = req.body;

      // Verificar que el equipo pertenece al proveedor
      const equipmentCheck = await db.query(
        'SELECT equipment_id, current_location_id FROM equipments WHERE equipment_id = $1 AND owner_company_id = $2',
        [id, providerCompanyId]
      );

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND', 404);
      }

      // Verificar nueva ubicación
      const locationCheck = await db.query(
        'SELECT equipment_location_id FROM equipment_locations WHERE equipment_location_id = $1 AND company_id = $2',
        [newLocationId, providerCompanyId]
      );

      if (locationCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Ubicación no válida', 'INVALID_LOCATION', 400);
      }

      // Actualizar ubicación del equipo
      const updateQuery = `
        UPDATE equipments 
        SET current_location_id = $1, updated_at = NOW()
        WHERE equipment_id = $2 AND owner_company_id = $3
        RETURNING *
      `;

      const result = await db.query(updateQuery, [newLocationId, id, providerCompanyId]);

      // Registrar el movimiento en el historial (si tienes tabla de historial)
      // TODO: Agregar tabla equipment_movements si es necesario

      return ResponseHandler.success(res, {
        equipment: result.rows[0]
      }, 'Equipo movido exitosamente');

    } catch (error) {
      console.error('Error en moveEquipment:', error);
      return ResponseHandler.error(res, 'Error al mover equipo', 'MOVE_EQUIPMENT_ERROR', 500);
    }
  }
}

module.exports = new EquipmentsController();
