const pool = require('../../lib/db');
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
      let whereConditions = ['m.company_id = $1'];
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereConditions.push(`m.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (maintenance_type) {
        paramCount++;
        whereConditions.push(`m.maintenance_type = $${paramCount}`);
        queryParams.push(maintenance_type);
      }

      if (equipment_id) {
        paramCount++;
        whereConditions.push(`m.equipment_id = $${paramCount}`);
        queryParams.push(equipment_id);
      }

      if (date_from) {
        paramCount++;
        whereConditions.push(`m.scheduled_date >= $${paramCount}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereConditions.push(`m.scheduled_date <= $${paramCount}`);
        queryParams.push(date_to);
      }

      // Filtro para próximos mantenimientos
      if (upcoming_only === 'true') {
        whereConditions.push(`m.scheduled_date >= CURRENT_DATE`);
        whereConditions.push(`m.status IN ('PROGRAMADO', 'EN_PROGRESO')`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const maintenancesQuery = `
        SELECT 
          m.maintenance_id,
          m.equipment_id,
          m.maintenance_type,
          m.priority,
          m.status,
          m.description,
          m.scheduled_date,
          m.completion_date,
          m.estimated_duration,
          m.actual_duration,
          m.estimated_cost,
          m.actual_cost,
          m.notes,
          m.created_at,
          m.updated_at,
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          el.location_name,
          el.address as location_address,
          prov.company_name as provider_name,
          prov_user.full_name as assigned_technician,
          -- Calcular días hasta el mantenimiento
          CASE 
            WHEN m.scheduled_date >= CURRENT_DATE THEN 
              EXTRACT(DAY FROM (m.scheduled_date - CURRENT_DATE))
            ELSE 
              -EXTRACT(DAY FROM (CURRENT_DATE - m.scheduled_date))
          END as days_until_maintenance,
          -- Estado de urgencia
          CASE 
            WHEN m.scheduled_date < CURRENT_DATE AND m.status != 'COMPLETADO' THEN 'VENCIDO'
            WHEN m.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' AND m.status = 'PROGRAMADO' THEN 'URGENTE'
            WHEN m.scheduled_date <= CURRENT_DATE + INTERVAL '30 days' AND m.status = 'PROGRAMADO' THEN 'PROXIMO'
            ELSE 'PROGRAMADO'
          END as urgency_status
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN companies prov ON m.provider_id = prov.company_id
        LEFT JOIN users prov_user ON m.assigned_technician = prov_user.user_id
        ${whereClause}
        ORDER BY 
          m.scheduled_date ASC,
          CASE m.priority 
            WHEN 'ALTA' THEN 1 
            WHEN 'MEDIA' THEN 2 
            WHEN 'BAJA' THEN 3 
          END,
          m.created_at DESC
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

      // Estadísticas por estado y urgencia
      const statsQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'PROGRAMADO' THEN 1 END) as scheduled_count,
          COUNT(CASE WHEN status = 'EN_PROGRESO' THEN 1 END) as in_progress_count,
          COUNT(CASE WHEN status = 'COMPLETADO' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'CANCELADO' THEN 1 END) as cancelled_count,
          COUNT(CASE WHEN scheduled_date < CURRENT_DATE AND status != 'COMPLETADO' THEN 1 END) as overdue_count,
          COUNT(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '7 days' AND status = 'PROGRAMADO' THEN 1 END) as urgent_count,
          COUNT(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'PROGRAMADO' THEN 1 END) as upcoming_count
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const statsResult = await pool.query(statsQuery, queryParams.slice(0, -2));
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Mantenimientos obtenidos exitosamente', {
        maintenances,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMaintenances,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        statistics: {
          totalMaintenances: parseInt(stats.total_count),
          scheduledMaintenances: parseInt(stats.scheduled_count),
          inProgressMaintenances: parseInt(stats.in_progress_count),
          completedMaintenances: parseInt(stats.completed_count),
          cancelledMaintenances: parseInt(stats.cancelled_count),
          overdueMaintenances: parseInt(stats.overdue_count),
          urgentMaintenances: parseInt(stats.urgent_count),
          upcomingMaintenances: parseInt(stats.upcoming_count)
        },
        filters: {
          status,
          maintenance_type,
          equipment_id,
          date_from,
          date_to,
          upcoming_only
        }
      });

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
          m.maintenance_type,
          m.priority,
          m.status,
          m.description,
          m.scheduled_date,
          m.completion_date,
          m.estimated_duration,
          m.actual_duration,
          m.estimated_cost,
          m.actual_cost,
          m.notes,
          m.checklist_items,
          m.completion_notes,
          m.created_at,
          m.updated_at,
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          e.installation_date,
          el.location_name,
          el.address as location_address,
          el.contact_person,
          el.contact_phone,
          prov.company_name as provider_name,
          prov.contact_email as provider_email,
          prov.contact_phone as provider_phone,
          prov_user.full_name as assigned_technician,
          prov_user.email as technician_email,
          prov_user.phone as technician_phone
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN companies prov ON m.provider_id = prov.company_id
        LEFT JOIN users prov_user ON m.assigned_technician = prov_user.user_id
        WHERE m.maintenance_id = $1 
        AND m.company_id = $2
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
          maintenance_type,
          status,
          scheduled_date,
          completion_date,
          actual_cost,
          notes
        FROM maintenances 
        WHERE equipment_id = $1 
        AND maintenance_id != $2
        AND status = 'COMPLETADO'
        ORDER BY completion_date DESC
        LIMIT 5
      `;

      const historyResult = await pool.query(historyQuery, [maintenance.equipment_id, id]);

      // Crear timeline del mantenimiento
      const timeline = [];

      timeline.push({
        event: 'CREADO',
        date: maintenance.created_at,
        description: 'Mantenimiento programado',
        status: 'PROGRAMADO'
      });

      if (maintenance.status === 'EN_PROGRESO') {
        timeline.push({
          event: 'INICIADO',
          date: maintenance.updated_at,
          description: 'Mantenimiento iniciado por el técnico',
          status: 'EN_PROGRESO'
        });
      }

      if (maintenance.completion_date) {
        timeline.push({
          event: 'COMPLETADO',
          date: maintenance.completion_date,
          description: 'Mantenimiento completado exitosamente',
          status: 'COMPLETADO'
        });
      }

      // Parsear checklist si existe
      let checklist = [];
      if (maintenance.checklist_items) {
        try {
          checklist = JSON.parse(maintenance.checklist_items);
        } catch (e) {
          checklist = [];
        }
      }

      return ResponseHandler.success(res, 'Detalles de mantenimiento obtenidos exitosamente', {
        maintenance: {
          ...maintenance,
          checklist
        },
        timeline: timeline.sort((a, b) => new Date(a.date) - new Date(b.date)),
        history: historyResult.rows
      });

    } catch (error) {
      console.error('Error en getMaintenanceDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de mantenimiento', 'FETCH_MAINTENANCE_DETAILS_ERROR');
    }
  }

  // GET /api/client/maintenances/upcoming - Próximos mantenimientos (dashboard)
  async getUpcomingMaintenances(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { days = 30 } = req.query;

      const upcomingQuery = `
        SELECT 
          m.maintenance_id,
          m.equipment_id,
          m.maintenance_type,
          m.priority,
          m.scheduled_date,
          m.estimated_cost,
          e.equipment_name,
          e.equipment_type,
          el.location_name,
          prov.company_name as provider_name,
          -- Días hasta el mantenimiento
          EXTRACT(DAY FROM (m.scheduled_date - CURRENT_DATE)) as days_until,
          -- Estado de urgencia
          CASE 
            WHEN m.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'URGENTE'
            WHEN m.scheduled_date <= CURRENT_DATE + INTERVAL '15 days' THEN 'PROXIMO'
            ELSE 'PROGRAMADO'
          END as urgency_level
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN companies prov ON m.provider_id = prov.company_id
        WHERE m.company_id = $1
        AND m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${parseInt(days)} days'
        AND m.status IN ('PROGRAMADO', 'EN_PROGRESO')
        ORDER BY m.scheduled_date ASC, 
                 CASE m.priority WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 WHEN 'BAJA' THEN 3 END
        LIMIT 20
      `;

      const result = await pool.query(upcomingQuery, [clientCompanyId]);

      // Agrupar por urgencia
      const maintenancesByUrgency = result.rows.reduce((acc, maintenance) => {
        const urgency = maintenance.urgency_level;
        if (!acc[urgency]) {
          acc[urgency] = [];
        }
        acc[urgency].push(maintenance);
        return acc;
      }, {});

      // Estadísticas rápidas
      const totalUpcoming = result.rows.length;
      const urgentCount = (maintenancesByUrgency.URGENTE || []).length;
      const nextWeekCount = result.rows.filter(m => m.days_until <= 7).length;
      const totalEstimatedCost = result.rows.reduce((sum, m) => sum + (parseFloat(m.estimated_cost) || 0), 0);

      return ResponseHandler.success(res, 'Próximos mantenimientos obtenidos exitosamente', {
        upcomingMaintenances: result.rows,
        groupedByUrgency: maintenancesByUrgency,
        summary: {
          totalUpcoming,
          urgentMaintenances: urgentCount,
          nextWeekMaintenances: nextWeekCount,
          totalEstimatedCost
        },
        period: parseInt(days)
      });

    } catch (error) {
      console.error('Error en getUpcomingMaintenances:', error);
      return ResponseHandler.error(res, 'Error al obtener próximos mantenimientos', 'FETCH_UPCOMING_MAINTENANCES_ERROR');
    }
  }

  // GET /api/client/maintenances/calendar - Calendario de mantenimientos
  async getMaintenanceCalendar(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { 
        year = new Date().getFullYear(),
        month = new Date().getMonth() + 1
      } = req.query;

      // Obtener primer y último día del mes
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const calendarQuery = `
        SELECT 
          m.maintenance_id,
          m.equipment_id,
          m.maintenance_type,
          m.priority,
          m.status,
          m.scheduled_date,
          m.estimated_duration,
          e.equipment_name,
          e.equipment_type,
          el.location_name,
          prov.company_name as provider_name
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        LEFT JOIN companies prov ON m.provider_id = prov.company_id
        WHERE m.company_id = $1
        AND m.scheduled_date BETWEEN $2 AND $3
        ORDER BY m.scheduled_date ASC
      `;

      const result = await pool.query(calendarQuery, [clientCompanyId, startDate, endDate]);

      // Agrupar por fecha
      const maintenancesByDate = result.rows.reduce((acc, maintenance) => {
        const dateKey = maintenance.scheduled_date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(maintenance);
        return acc;
      }, {});

      // Crear estructura de calendario
      const calendarData = [];
      const daysInMonth = endDate.getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayMaintenances = maintenancesByDate[dateKey] || [];

        calendarData.push({
          date: dateKey,
          dayOfWeek: new Date(year, month - 1, day).getDay(),
          maintenanceCount: dayMaintenances.length,
          maintenances: dayMaintenances,
          hasUrgent: dayMaintenances.some(m => m.priority === 'ALTA'),
          hasOverdue: dayMaintenances.some(m => 
            new Date(m.scheduled_date) < new Date() && m.status !== 'COMPLETADO'
          )
        });
      }

      // Estadísticas del mes
      const monthStats = {
        totalMaintenances: result.rows.length,
        scheduledMaintenances: result.rows.filter(m => m.status === 'PROGRAMADO').length,
        completedMaintenances: result.rows.filter(m => m.status === 'COMPLETADO').length,
        urgentMaintenances: result.rows.filter(m => m.priority === 'ALTA').length,
        busiestDay: calendarData.reduce((max, day) => 
          day.maintenanceCount > max.maintenanceCount ? day : max, 
          { maintenanceCount: 0 }
        )
      };

      return ResponseHandler.success(res, 'Calendario de mantenimientos obtenido exitosamente', {
        calendarData,
        monthStatistics: monthStats,
        period: {
          year: parseInt(year),
          month: parseInt(month),
          monthName: new Date(year, month - 1).toLocaleString('es', { month: 'long' }),
          daysInMonth
        }
      });

    } catch (error) {
      console.error('Error en getMaintenanceCalendar:', error);
      return ResponseHandler.error(res, 'Error al obtener calendario de mantenimientos', 'FETCH_MAINTENANCE_CALENDAR_ERROR');
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
        'SELECT equipment_name, equipment_type FROM equipments WHERE equipment_id = $1 AND company_id = $2',
        [equipmentId, clientCompanyId]
      );

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Equipo no encontrado');
      }

      const historyQuery = `
        SELECT 
          m.maintenance_id,
          m.maintenance_type,
          m.priority,
          m.status,
          m.scheduled_date,
          m.completion_date,
          m.actual_duration,
          m.actual_cost,
          m.notes,
          m.completion_notes,
          prov.company_name as provider_name,
          prov_user.full_name as technician_name,
          -- Tiempo desde último mantenimiento
          LAG(m.completion_date) OVER (ORDER BY m.scheduled_date DESC) - m.completion_date as time_since_last
        FROM maintenances m
        LEFT JOIN companies prov ON m.provider_id = prov.company_id
        LEFT JOIN users prov_user ON m.assigned_technician = prov_user.user_id
        WHERE m.equipment_id = $1 
        AND m.company_id = $2
        ORDER BY m.scheduled_date DESC
        LIMIT $3 OFFSET $4
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM maintenances 
        WHERE equipment_id = $1 AND company_id = $2
      `;

      const [historyResult, countResult] = await Promise.all([
        pool.query(historyQuery, [equipmentId, clientCompanyId, limit, offset]),
        pool.query(countQuery, [equipmentId, clientCompanyId])
      ]);

      const maintenanceHistory = historyResult.rows;
      const totalRecords = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRecords / limit);

      // Estadísticas del equipo
      const statsQuery = `
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN status = 'COMPLETADO' THEN 1 END) as completed_maintenances,
          AVG(actual_cost) as avg_cost,
          SUM(actual_cost) as total_cost,
          AVG(actual_duration) as avg_duration,
          MAX(completion_date) as last_maintenance,
          MIN(scheduled_date) as first_maintenance
        FROM maintenances 
        WHERE equipment_id = $1 AND company_id = $2
      `;

      const statsResult = await pool.query(statsQuery, [equipmentId, clientCompanyId]);
      const equipmentStats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Historial de mantenimiento obtenido exitosamente', {
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
          averageCost: parseFloat(equipmentStats.avg_cost) || 0,
          totalCost: parseFloat(equipmentStats.total_cost) || 0,
          averageDuration: parseFloat(equipmentStats.avg_duration) || 0,
          lastMaintenance: equipmentStats.last_maintenance,
          firstMaintenance: equipmentStats.first_maintenance
        }
      });

    } catch (error) {
      console.error('Error en getEquipmentMaintenanceHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial de mantenimiento', 'FETCH_EQUIPMENT_MAINTENANCE_HISTORY_ERROR');
    }
  }

  // GET /api/client/maintenances/statistics - Estadísticas generales de mantenimiento
  async getMaintenanceStatistics(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { months = 12 } = req.query;

      // Estadísticas generales
      const generalStatsQuery = `
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN status = 'COMPLETADO' THEN 1 END) as completed_maintenances,
          COUNT(CASE WHEN status = 'PROGRAMADO' THEN 1 END) as scheduled_maintenances,
          COUNT(CASE WHEN scheduled_date < CURRENT_DATE AND status != 'COMPLETADO' THEN 1 END) as overdue_maintenances,
          AVG(actual_cost) as avg_cost,
          SUM(actual_cost) as total_cost,
          AVG(EXTRACT(EPOCH FROM (completion_date - scheduled_date))/3600) as avg_delay_hours,
          COUNT(DISTINCT equipment_id) as total_equipment_with_maintenance
        FROM maintenances 
        WHERE company_id = $1
        AND scheduled_date >= NOW() - INTERVAL '${parseInt(months)} months'
      `;

      // Estadísticas por tipo de mantenimiento
      const typeStatsQuery = `
        SELECT 
          maintenance_type,
          COUNT(*) as count,
          AVG(actual_cost) as avg_cost,
          AVG(actual_duration) as avg_duration
        FROM maintenances 
        WHERE company_id = $1
        AND scheduled_date >= NOW() - INTERVAL '${parseInt(months)} months'
        AND status = 'COMPLETADO'
        GROUP BY maintenance_type
        ORDER BY count DESC
      `;

      // Tendencia mensual
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', scheduled_date) as month,
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN status = 'COMPLETADO' THEN 1 END) as completed_maintenances,
          AVG(actual_cost) as avg_cost,
          SUM(actual_cost) as total_cost
        FROM maintenances 
        WHERE company_id = $1
        AND scheduled_date >= NOW() - INTERVAL '${parseInt(months)} months'
        GROUP BY DATE_TRUNC('month', scheduled_date)
        ORDER BY month DESC
      `;

      // Estadísticas por equipo
      const equipmentStatsQuery = `
        SELECT 
          e.equipment_id,
          e.equipment_name,
          e.equipment_type,
          COUNT(m.maintenance_id) as maintenance_count,
          SUM(m.actual_cost) as total_cost,
          MAX(m.completion_date) as last_maintenance,
          AVG(EXTRACT(DAY FROM (LEAD(m.scheduled_date) OVER (PARTITION BY e.equipment_id ORDER BY m.scheduled_date) - m.scheduled_date))) as avg_interval_days
        FROM equipments e
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id 
        WHERE e.company_id = $1
        AND (m.scheduled_date IS NULL OR m.scheduled_date >= NOW() - INTERVAL '${parseInt(months)} months')
        GROUP BY e.equipment_id, e.equipment_name, e.equipment_type
        ORDER BY maintenance_count DESC
        LIMIT 10
      `;

      const [generalResult, typeResult, trendResult, equipmentResult] = await Promise.all([
        pool.query(generalStatsQuery, [clientCompanyId]),
        pool.query(typeStatsQuery, [clientCompanyId]),
        pool.query(monthlyTrendQuery, [clientCompanyId]),
        pool.query(equipmentStatsQuery, [clientCompanyId])
      ]);

      const generalStats = generalResult.rows[0];

      // Calcular métricas adicionales
      const completionRate = generalStats.total_maintenances > 0 
        ? (generalStats.completed_maintenances / generalStats.total_maintenances * 100) 
        : 0;

      const onTimeRate = generalStats.completed_maintenances > 0 
        ? Math.max(0, 100 - (parseFloat(generalStats.avg_delay_hours) || 0) * 2) 
        : 100;

      return ResponseHandler.success(res, 'Estadísticas de mantenimiento obtenidas exitosamente', {
        summary: {
          totalMaintenances: parseInt(generalStats.total_maintenances) || 0,
          completedMaintenances: parseInt(generalStats.completed_maintenances) || 0,
          scheduledMaintenances: parseInt(generalStats.scheduled_maintenances) || 0,
          overdueMaintenances: parseInt(generalStats.overdue_maintenances) || 0,
          totalEquipmentWithMaintenance: parseInt(generalStats.total_equipment_with_maintenance) || 0,
          completionRate: parseFloat(completionRate.toFixed(2)),
          onTimeRate: parseFloat(onTimeRate.toFixed(2)),
          averageCost: parseFloat(generalStats.avg_cost) || 0,
          totalCost: parseFloat(generalStats.total_cost) || 0,
          averageDelayHours: parseFloat(generalStats.avg_delay_hours) || 0
        },
        maintenanceTypes: typeResult.rows.map(row => ({
          type: row.maintenance_type,
          count: parseInt(row.count),
          avgCost: parseFloat(row.avg_cost) || 0,
          avgDuration: parseFloat(row.avg_duration) || 0
        })),
        monthlyTrend: trendResult.rows.map(row => ({
          month: row.month,
          totalMaintenances: parseInt(row.total_maintenances),
          completedMaintenances: parseInt(row.completed_maintenances),
          avgCost: parseFloat(row.avg_cost) || 0,
          totalCost: parseFloat(row.total_cost) || 0,
          completionRate: row.total_maintenances > 0 
            ? (row.completed_maintenances / row.total_maintenances * 100) 
            : 0
        })),
        equipmentStatistics: equipmentResult.rows.map(row => ({
          equipment_id: row.equipment_id,
          equipment_name: row.equipment_name,
          equipment_type: row.equipment_type,
          maintenanceCount: parseInt(row.maintenance_count) || 0,
          totalCost: parseFloat(row.total_cost) || 0,
          lastMaintenance: row.last_maintenance,
          avgIntervalDays: parseFloat(row.avg_interval_days) || 0
        })),
        analysisPeriod: parseInt(months)
      });

    } catch (error) {
      console.error('Error en getMaintenanceStatistics:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas de mantenimiento', 'FETCH_MAINTENANCE_STATISTICS_ERROR');
    }
  }
}

module.exports = new ClientMaintenancesController();
