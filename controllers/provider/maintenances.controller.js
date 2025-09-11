const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class MaintenancesController {
  // GET /api/provider/maintenances - Obtener mantenimientos
  async getMaintenances(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        equipmentId,
        technicianId,
        startDate,
        endDate,
        type
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE e.owner_company_id = $1`;
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND m.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (equipmentId) {
        whereClause += ` AND m.equipment_id = $${++paramCount}`;
        queryParams.push(equipmentId);
      }

      if (technicianId) {
        whereClause += ` AND m.technician_id = $${++paramCount}`;
        queryParams.push(technicianId);
      }

      if (type) {
        whereClause += ` AND m.maintenance_type = $${++paramCount}`;
        queryParams.push(type);
      }

      if (startDate) {
        whereClause += ` AND m.scheduled_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND m.scheduled_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          el.name as location_name,
          el.address as location_address,
          u.first_name || ' ' || u.last_name as technician_name,
          u.phone as technician_phone,
          ar.client_company_id,
          c.name as client_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN users u ON m.technician_id = u.user_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        ${whereClause}
        ORDER BY m.scheduled_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(*) as total
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalMaintenances = parseInt(countResult.rows[0].total);

      const maintenances = result.rows.map(maintenance => ({
        maintenanceId: maintenance.maintenance_id.toString(),
        type: maintenance.maintenance_type,
        status: maintenance.status,
        scheduledDate: maintenance.scheduled_date,
        completedDate: maintenance.completed_date,
        description: maintenance.description,
        equipment: {
          equipmentId: maintenance.equipment_id.toString(),
          name: maintenance.equipment_name,
          type: maintenance.equipment_type,
          model: maintenance.equipment_model
        },
        location: {
          name: maintenance.location_name,
          address: maintenance.location_address
        },
        technician: maintenance.technician_id ? {
          userId: maintenance.technician_id.toString(),
          name: maintenance.technician_name,
          phone: maintenance.technician_phone
        } : null,
        client: maintenance.client_company_id ? {
          companyId: maintenance.client_company_id.toString(),
          name: maintenance.client_name
        } : null,
        cost: maintenance.cost ? parseFloat(maintenance.cost) : null,
        notes: maintenance.notes,
        createdAt: maintenance.created_at
      }));

      return ResponseHandler.success(res, {
        maintenances,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMaintenances,
          totalPages: Math.ceil(totalMaintenances / limit)
        }
      }, 'Mantenimientos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getMaintenances:', error);
      return ResponseHandler.error(res, 'Error al obtener mantenimientos', 'GET_MAINTENANCES_ERROR', 500);
    }
  }

  // GET /api/provider/maintenances/:id - Obtener detalles de un mantenimiento
  async getMaintenanceDetails(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number as equipment_serial,
          el.name as location_name,
          el.address as location_address,
          el.contact_person as location_contact,
          el.contact_phone as location_phone,
          u.first_name || ' ' || u.last_name as technician_name,
          u.phone as technician_phone,
          u.email as technician_email,
          ar.client_company_id,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN users u ON m.technician_id = u.user_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        WHERE m.maintenance_id = $1 AND e.owner_company_id = $2
      `;

      const result = await db.query(query, [id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Mantenimiento no encontrado', 'MAINTENANCE_NOT_FOUND', 404);
      }

      const maintenance = result.rows[0];

      return ResponseHandler.success(res, {
        maintenance: {
          maintenanceId: maintenance.maintenance_id.toString(),
          type: maintenance.maintenance_type,
          status: maintenance.status,
          scheduledDate: maintenance.scheduled_date,
          completedDate: maintenance.completed_date,
          description: maintenance.description,
          equipment: {
            equipmentId: maintenance.equipment_id.toString(),
            name: maintenance.equipment_name,
            type: maintenance.equipment_type,
            model: maintenance.equipment_model,
            serialNumber: maintenance.equipment_serial
          },
          location: {
            name: maintenance.location_name,
            address: maintenance.location_address,
            contactPerson: maintenance.location_contact,
            contactPhone: maintenance.location_phone
          },
          technician: maintenance.technician_id ? {
            userId: maintenance.technician_id.toString(),
            name: maintenance.technician_name,
            phone: maintenance.technician_phone,
            email: maintenance.technician_email
          } : null,
          client: maintenance.client_company_id ? {
            companyId: maintenance.client_company_id.toString(),
            name: maintenance.client_name,
            phone: maintenance.client_phone,
            email: maintenance.client_email
          } : null,
          cost: maintenance.cost ? parseFloat(maintenance.cost) : null,
          notes: maintenance.notes,
          createdAt: maintenance.created_at,
          updatedAt: maintenance.updated_at
        }
      }, 'Detalles del mantenimiento obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getMaintenanceDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del mantenimiento', 'GET_MAINTENANCE_DETAILS_ERROR', 500);
    }
  }

  // POST /api/provider/maintenances - Crear nuevo mantenimiento
  async createMaintenance(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const {
        equipmentId,
        maintenanceType,
        scheduledDate,
        description,
        technicianId,
        estimatedCost,
        notes
      } = req.body;

      // Verificar que el equipo pertenece al proveedor
      const equipmentCheck = await db.query(
        'SELECT equipment_id FROM equipments WHERE equipment_id = $1 AND owner_company_id = $2',
        [equipmentId, providerCompanyId]
      );

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no encontrado', 'EQUIPMENT_NOT_FOUND', 404);
      }

      // Verificar técnico si se proporciona
      if (technicianId) {
        const technicianCheck = await db.query(
          'SELECT user_id FROM users WHERE user_id = $1 AND company_id = $2 AND role = $3',
          [technicianId, providerCompanyId, 'PROVIDER']
        );

        if (technicianCheck.rows.length === 0) {
          return ResponseHandler.error(res, 'Técnico no válido', 'INVALID_TECHNICIAN', 400);
        }
      }

      const insertQuery = `
        INSERT INTO maintenances (
          equipment_id, maintenance_type, scheduled_date, description,
          technician_id, cost, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SCHEDULED')
        RETURNING *
      `;

      const values = [
        equipmentId, maintenanceType, scheduledDate, description,
        technicianId, estimatedCost, notes
      ];

      const result = await db.query(insertQuery, values);

      return ResponseHandler.success(res, {
        maintenance: result.rows[0]
      }, 'Mantenimiento creado exitosamente');

    } catch (error) {
      console.error('Error en createMaintenance:', error);
      return ResponseHandler.error(res, 'Error al crear mantenimiento', 'CREATE_MAINTENANCE_ERROR', 500);
    }
  }

  // PUT /api/provider/maintenances/:id - Actualizar mantenimiento
  async updateMaintenance(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const {
        maintenanceType,
        scheduledDate,
        description,
        technicianId,
        status,
        cost,
        notes,
        completedDate
      } = req.body;

      // Verificar que el mantenimiento pertenece al proveedor
      const maintenanceCheck = await db.query(`
        SELECT m.maintenance_id 
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        WHERE m.maintenance_id = $1 AND e.owner_company_id = $2
      `, [id, providerCompanyId]);

      if (maintenanceCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Mantenimiento no encontrado', 'MAINTENANCE_NOT_FOUND', 404);
      }

      // Verificar técnico si se proporciona
      if (technicianId) {
        const technicianCheck = await db.query(
          'SELECT user_id FROM users WHERE user_id = $1 AND company_id = $2 AND role = $3',
          [technicianId, providerCompanyId, 'PROVIDER']
        );

        if (technicianCheck.rows.length === 0) {
          return ResponseHandler.error(res, 'Técnico no válido', 'INVALID_TECHNICIAN', 400);
        }
      }

      const updateQuery = `
        UPDATE maintenances SET
          maintenance_type = COALESCE($1, maintenance_type),
          scheduled_date = COALESCE($2, scheduled_date),
          description = COALESCE($3, description),
          technician_id = COALESCE($4, technician_id),
          status = COALESCE($5, status),
          cost = COALESCE($6, cost),
          notes = COALESCE($7, notes),
          completed_date = COALESCE($8, completed_date),
          updated_at = NOW()
        WHERE maintenance_id = $9
        RETURNING *
      `;

      const values = [
        maintenanceType, scheduledDate, description, technicianId,
        status, cost, notes, completedDate, id
      ];

      const result = await db.query(updateQuery, values);

      // Si se marca como completado, actualizar fecha de último mantenimiento del equipo
      if (status === 'COMPLETED') {
        await db.query(`
          UPDATE equipments SET 
            last_maintenance_date = COALESCE($1, NOW())
          WHERE equipment_id = (
            SELECT equipment_id FROM maintenances WHERE maintenance_id = $2
          )
        `, [completedDate, id]);
      }

      return ResponseHandler.success(res, {
        maintenance: result.rows[0]
      }, 'Mantenimiento actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateMaintenance:', error);
      return ResponseHandler.error(res, 'Error al actualizar mantenimiento', 'UPDATE_MAINTENANCE_ERROR', 500);
    }
  }

  // DELETE /api/provider/maintenances/:id - Eliminar mantenimiento
  async deleteMaintenance(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      const deleteQuery = `
        DELETE FROM maintenances 
        WHERE maintenance_id = $1 
          AND equipment_id IN (
            SELECT equipment_id FROM equipments WHERE owner_company_id = $2
          )
        RETURNING *
      `;

      const result = await db.query(deleteQuery, [id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Mantenimiento no encontrado', 'MAINTENANCE_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        deletedMaintenance: result.rows[0]
      }, 'Mantenimiento eliminado exitosamente');

    } catch (error) {
      console.error('Error en deleteMaintenance:', error);
      return ResponseHandler.error(res, 'Error al eliminar mantenimiento', 'DELETE_MAINTENANCE_ERROR', 500);
    }
  }

  // GET /api/provider/maintenances/calendar - Obtener calendario de mantenimientos
  async getMaintenanceCalendar(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { startDate, endDate, technicianId } = req.query;

      let whereClause = `WHERE e.owner_company_id = $1`;
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (startDate) {
        whereClause += ` AND m.scheduled_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND m.scheduled_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      if (technicianId) {
        whereClause += ` AND m.technician_id = $${++paramCount}`;
        queryParams.push(technicianId);
      }

      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          el.name as location_name,
          el.address as location_address,
          u.first_name || ' ' || u.last_name as technician_name,
          c.name as client_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN users u ON m.technician_id = u.user_id
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        ${whereClause}
        ORDER BY m.scheduled_date ASC
      `;

      const result = await db.query(query, queryParams);

      const events = result.rows.map(maintenance => ({
        id: maintenance.maintenance_id.toString(),
        title: `${maintenance.maintenance_type} - ${maintenance.equipment_name}`,
        start: maintenance.scheduled_date,
        end: maintenance.completed_date || maintenance.scheduled_date,
        status: maintenance.status,
        equipment: {
          equipmentId: maintenance.equipment_id.toString(),
          name: maintenance.equipment_name,
          type: maintenance.equipment_type
        },
        location: {
          name: maintenance.location_name,
          address: maintenance.location_address
        },
        technician: maintenance.technician_name,
        client: maintenance.client_name,
        description: maintenance.description,
        backgroundColor: this.getStatusColor(maintenance.status),
        borderColor: this.getStatusColor(maintenance.status)
      }));

      return ResponseHandler.success(res, {
        events
      }, 'Calendario de mantenimientos obtenido exitosamente');

    } catch (error) {
      console.error('Error en getMaintenanceCalendar:', error);
      return ResponseHandler.error(res, 'Error al obtener calendario', 'GET_CALENDAR_ERROR', 500);
    }
  }

  // Helper method para colores del calendario
  getStatusColor(status) {
    const colors = {
      'SCHEDULED': '#007bff',
      'IN_PROGRESS': '#ffc107',
      'COMPLETED': '#28a745',
      'CANCELLED': '#dc3545',
      'DELAYED': '#fd7e14'
    };
    return colors[status] || '#6c757d';
  }
}

module.exports = new MaintenancesController();
