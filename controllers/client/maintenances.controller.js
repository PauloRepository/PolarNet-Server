const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientMaintenancesController {
  
  // GET /api/client/maintenances - Obtener mantenimientos programados y completados
  async getMaintenances(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { 
        status = '',
        maintenance_type = '',
        page = 1,
        limit = 20,
        equipment_id = '',
        date_from = '',
        date_to = '',
        upcoming_only = false
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = ['e.company_id = $1'];
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereConditions.push(`m.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (maintenance_type) {
        paramCount++;
        whereConditions.push(`m.type = $${paramCount}`);
        queryParams.push(maintenance_type);
      }

      if (equipment_id) {
        paramCount++;
        whereConditions.push(`m.equipment_id = $${paramCount}`);
        queryParams.push(equipment_id);
      }

      if (date_from) {
        paramCount++;
        whereConditions.push(`m.date >= $${paramCount}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereConditions.push(`m.date <= $${paramCount}`);
        queryParams.push(date_to);
      }

      // Filtro para próximos mantenimientos
      if (upcoming_only === 'true') {
        whereConditions.push(`m.date >= CURRENT_DATE`);
        whereConditions.push(`m.status IN ('SCHEDULED', 'DONE')`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const maintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.equipment_id,
          m.type as maintenance_type,
          m.status,
          m.notes as description,
          m.date as scheduled_date,
          m.next_scheduled_date,
          m.notes,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model,
          e.serial_number,
          el.address as location_name,
          el.address as location_address,
          -- Calcular días hasta el mantenimiento
          CASE 
            WHEN m.date >= CURRENT_DATE THEN 
              (m.date::date - CURRENT_DATE)
            ELSE 
              -(CURRENT_DATE - m.date::date)
          END as days_until_maintenance,
          -- Estado de urgencia
          CASE 
            WHEN m.date < CURRENT_DATE AND m.status != 'DONE' THEN 'VENCIDO'
            WHEN m.date <= CURRENT_DATE + INTERVAL '7 days' AND m.status = 'SCHEDULED' THEN 'URGENTE'
            WHEN m.date <= CURRENT_DATE + INTERVAL '30 days' AND m.status = 'SCHEDULED' THEN 'PROXIMO'
            ELSE 'PROGRAMADO'
          END as urgency_status
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        ${whereClause}
        ORDER BY 
          m.date ASC,
          m.maintenance_id DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const [maintenancesResult, countResult] = await Promise.all([
        pool.query(maintenancesQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const maintenances = maintenancesResult.rows;
      const totalMaintenances = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalMaintenances / limit);

      // Estadísticas simples sin consulta adicional para mejorar rendimiento
      const totalCount = maintenances.length;
      const scheduledCount = maintenances.filter(m => m.status === 'SCHEDULED').length;
      const completedCount = maintenances.filter(m => m.status === 'DONE').length;
      const cancelledCount = maintenances.filter(m => m.status === 'CANCELED').length;
      const overdueCount = maintenances.filter(m => m.urgency_status === 'VENCIDO').length;
      const urgentCount = maintenances.filter(m => m.urgency_status === 'URGENTE').length;
      const upcomingCount = maintenances.filter(m => m.urgency_status === 'PROXIMO').length;

      return ResponseHandler.success(res, {
        maintenances,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMaintenances,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        statistics: {
          totalMaintenances: totalMaintenances,
          scheduledMaintenances: scheduledCount,
          completedMaintenances: completedCount,
          cancelledMaintenances: cancelledCount,
          overdueMaintenances: overdueCount,
          urgentMaintenances: urgentCount,
          upcomingMaintenances: upcomingCount
        },
        filters: {
          status,
          maintenance_type,
          equipment_id,
          date_from,
          date_to,
          upcoming_only
        }
      }, 'Mantenimientos obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getMaintenances:', error);
      return ResponseHandler.error(res, 'Error al obtener mantenimientos', 'FETCH_MAINTENANCES_ERROR');
    }
  }

  // GET /api/client/maintenances/:id - Obtener detalles de mantenimiento específico
  async getMaintenanceDetails(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { id } = req.params;

      const detailQuery = `
        SELECT 
          m.maintenance_id,
          m.equipment_id,
          m.type as maintenance_type,
          m.status,
          m.notes as description,
          m.date as scheduled_date,
          m.next_scheduled_date,
          m.notes,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model,
          e.serial_number,
          el.address as location_name,
          el.address as location_address
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE m.maintenance_id = $1 
        AND e.company_id = $2
      `;

      const result = await pool.query(detailQuery, [id, clientCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Mantenimiento no encontrado');
      }

      const maintenance = result.rows[0];

      // Obtener historial de mantenimientos previos para este equipo
      const historyQuery = `
        SELECT 
          maintenance_id,
          type as maintenance_type,
          status,
          date as scheduled_date,
          notes
        FROM maintenances 
        WHERE equipment_id = $1 
        AND maintenance_id != $2
        AND status = 'DONE'
        ORDER BY date DESC
        LIMIT 5
      `;

      const historyResult = await pool.query(historyQuery, [maintenance.equipment_id, id]);

      // Crear timeline del mantenimiento
      const timeline = [];

      timeline.push({
        event: 'CREADO',
        date: maintenance.scheduled_date,
        description: 'Mantenimiento programado',
        status: 'SCHEDULED'
      });

      if (maintenance.status === 'DONE') {
        timeline.push({
          event: 'COMPLETADO',
          date: maintenance.scheduled_date,
          description: 'Mantenimiento completado exitosamente',
          status: 'DONE'
        });
      }

      // Parsear checklist si existe
      let checklist = [];

      return ResponseHandler.success(res, {
        maintenance: {
          ...maintenance,
          checklist
        },
        timeline: timeline.sort((a, b) => new Date(a.date) - new Date(b.date)),
        history: historyResult.rows
      }, 'Detalles de mantenimiento obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getMaintenanceDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de mantenimiento', 'FETCH_MAINTENANCE_DETAILS_ERROR');
    }
  }

  // GET /api/client/maintenances/history/:equipmentId - Historial de mantenimiento por equipo
  async getEquipmentMaintenanceHistory(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { equipmentId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const offset = (page - 1) * limit;

      // Verificar que el equipo pertenece al cliente
      const equipmentCheck = await pool.query(
        'SELECT name as equipment_name, type as equipment_type FROM equipments WHERE equipment_id = $1 AND company_id = $2',
        [equipmentId, clientCompanyId]
      );

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Equipo no encontrado');
      }

      const historyQuery = `
        SELECT 
          m.maintenance_id,
          m.type as maintenance_type,
          m.status,
          m.date as scheduled_date,
          m.notes
        FROM maintenances m
        WHERE m.equipment_id = $1 
        ORDER BY m.date DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM maintenances 
        WHERE equipment_id = $1
      `;

      const [historyResult, countResult] = await Promise.all([
        pool.query(historyQuery, [equipmentId, limit, offset]),
        pool.query(countQuery, [equipmentId])
      ]);

      const maintenanceHistory = historyResult.rows;
      const totalRecords = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRecords / limit);

      // Estadísticas del equipo
      const statsQuery = `
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN status = 'DONE' THEN 1 END) as completed_maintenances,
          MAX(date) as last_maintenance,
          MIN(date) as first_maintenance
        FROM maintenances 
        WHERE equipment_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [equipmentId]);
      const equipmentStats = statsResult.rows[0];

      return ResponseHandler.success(res, {
        equipment: equipmentCheck.rows[0],
        maintenanceHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        statistics: {
          totalMaintenances: parseInt(equipmentStats.total_maintenances) || 0,
          completedMaintenances: parseInt(equipmentStats.completed_maintenances) || 0,
          averageCost: 0,
          totalCost: 0,
          averageDuration: 0,
          lastMaintenance: equipmentStats.last_maintenance,
          firstMaintenance: equipmentStats.first_maintenance
        }
      }, 'Historial de mantenimiento obtenido exitosamente');

    } catch (error) {
      console.error('Error en getEquipmentMaintenanceHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial de mantenimiento', 'FETCH_EQUIPMENT_MAINTENANCE_HISTORY_ERROR');
    }
  }
}

module.exports = new ClientMaintenancesController();
