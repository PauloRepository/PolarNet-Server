const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientTemperaturesController {
  
  // GET /api/client/temperatures/current - Temperaturas actuales de todos los equipos
  async getCurrentTemperatures(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const temperatureQuery = `
        SELECT DISTINCT ON (e.equipment_id)
          e.equipment_id,
          e.name as equipment_name,
          e.equipment_type,
          tr.value as temperature,
          tr.timestamp as reading_date,
          el.location_name,
          el.address as location_address,
          CASE 
            WHEN tr.value > 25 OR tr.value < -18 THEN 'CRITICAL'
            WHEN tr.value > 20 OR tr.value < -15 THEN 'WARNING'
            ELSE 'NORMAL'
          END as status,
          EXTRACT(EPOCH FROM (NOW() - tr.timestamp))/60 as minutes_ago
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE e.company_id = $1
        AND tr.timestamp >= NOW() - INTERVAL '2 hours'
        ORDER BY e.equipment_id, tr.timestamp DESC
      `;

      const result = await pool.query(temperatureQuery, [clientCompanyId]);

      // Estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_equipments,
          COUNT(CASE WHEN tr.value > 25 OR tr.value < -18 THEN 1 END) as critical_equipments,
          COUNT(CASE WHEN tr.value > 20 OR tr.value < -15 THEN 1 END) as warning_equipments,
          AVG(tr.value) as avg_temperature,
          MIN(tr.value) as min_temperature,
          MAX(tr.value) as max_temperature
        FROM equipments e
        INNER JOIN (
          SELECT DISTINCT ON (equipment_id) equipment_id, value, timestamp
          FROM temperature_readings 
          WHERE timestamp >= NOW() - INTERVAL '2 hours'
          ORDER BY equipment_id, timestamp DESC
        ) tr ON e.equipment_id = tr.equipment_id
        WHERE e.company_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [clientCompanyId]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, {
        temperatures: result.rows,
        summary: {
          totalEquipments: parseInt(stats.total_equipments) || 0,
          criticalEquipments: parseInt(stats.critical_equipments) || 0,
          warningEquipments: parseInt(stats.warning_equipments) || 0,
          normalEquipments: (parseInt(stats.total_equipments) || 0) - (parseInt(stats.critical_equipments) || 0) - (parseInt(stats.warning_equipments) || 0),
          averageTemperature: parseFloat(stats.avg_temperature) || 0,
          minimumTemperature: parseFloat(stats.min_temperature) || 0,
          maximumTemperature: parseFloat(stats.max_temperature) || 0
        }
      }, 'Temperaturas actuales obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getCurrentTemperatures:', error);
      return ResponseHandler.error(res, 'Error al obtener temperaturas actuales', 'FETCH_CURRENT_TEMPERATURES_ERROR');
    }
  }

  // GET /api/client/temperatures/alerts - Alertas de temperatura
  async getTemperatureAlerts(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const alertsQuery = `
        SELECT DISTINCT ON (e.equipment_id)
          e.equipment_id,
          e.name as equipment_name,
          e.equipment_type,
          tr.value as temperature,
          tr.timestamp as reading_date,
          el.location_name,
          el.address as location_address,
          CASE 
            WHEN tr.value > 25 THEN 'TEMPERATURA_ALTA'
            WHEN tr.value < -18 THEN 'TEMPERATURA_BAJA'
            ELSE 'NORMAL'
          END as alert_type,
          CASE 
            WHEN tr.value > 30 OR tr.value < -25 THEN 'CRITICO'
            ELSE 'ADVERTENCIA'
          END as severity,
          EXTRACT(EPOCH FROM (NOW() - tr.timestamp))/60 as minutes_ago
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE e.company_id = $1
        AND (tr.value > 25 OR tr.value < -18)
        AND tr.timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY e.equipment_id, tr.timestamp DESC
      `;

      const result = await pool.query(alertsQuery, [clientCompanyId]);

      // Contar alertas por severidad
      const alertStats = result.rows.reduce((acc, alert) => {
        if (alert.severity === 'CRITICO') {
          acc.critical++;
        } else {
          acc.warning++;
        }
        return acc;
      }, { critical: 0, warning: 0 });

      return ResponseHandler.success(res, {
        alerts: result.rows,
        summary: {
          totalAlerts: result.rows.length,
          criticalAlerts: alertStats.critical,
          warningAlerts: alertStats.warning
        }
      }, 'Alertas de temperatura obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getTemperatureAlerts:', error);
      return ResponseHandler.error(res, 'Error al obtener alertas de temperatura', 'FETCH_TEMPERATURE_ALERTS_ERROR');
    }
  }

  // GET /api/client/temperatures/history - Historial de temperaturas con filtros
  async getTemperatureHistory(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const { 
        equipment_id = '',
        days = 7,
        page = 1,
        limit = 100,
        status = '' // 'CRITICAL', 'WARNING', 'NORMAL'
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = ['e.company_id = $1'];
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (equipment_id) {
        paramCount++;
        whereConditions.push(`e.equipment_id = $${paramCount}`);
        queryParams.push(equipment_id);
      }

      paramCount++;
      whereConditions.push(`tr.timestamp >= NOW() - INTERVAL '${parseInt(days)} days'`);

      // Filtro por estado
      if (status === 'CRITICAL') {
        whereConditions.push('(tr.value > 25 OR tr.value < -18)');
      } else if (status === 'WARNING') {
        whereConditions.push('(tr.value > 20 AND tr.value <= 25) OR (tr.value >= -18 AND tr.value < -15)');
      } else if (status === 'NORMAL') {
        whereConditions.push('(tr.value <= 20 AND tr.value >= -15)');
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const historyQuery = `
        SELECT 
          e.equipment_id,
          e.name as equipment_name,
          e.equipment_type,
          tr.value as temperature,
          tr.timestamp as reading_date,
          el.location_name,
          CASE 
            WHEN tr.value > 25 OR tr.value < -18 THEN 'CRITICAL'
            WHEN tr.value > 20 OR tr.value < -15 THEN 'WARNING'
            ELSE 'NORMAL'
          END as status
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
        ORDER BY tr.timestamp DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
      `;

      const [historyResult, countResult] = await Promise.all([
        pool.query(historyQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const temperatureHistory = historyResult.rows;
      const totalReadings = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalReadings / limit);

      // Estadísticas del período
      const statsQuery = `
        SELECT 
          AVG(tr.value) as avg_temperature,
          MIN(tr.value) as min_temperature,
          MAX(tr.value) as max_temperature,
          COUNT(*) as total_readings,
          COUNT(CASE WHEN tr.value > 25 OR tr.value < -18 THEN 1 END) as critical_readings,
          COUNT(CASE WHEN tr.value > 20 OR tr.value < -15 THEN 1 END) as warning_readings,
          COUNT(DISTINCT e.equipment_id) as total_equipments
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        ${whereClause}
      `;

      const statsResult = await pool.query(statsQuery, queryParams.slice(0, -2));
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, {
        temperatureHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalReadings,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        statistics: {
          averageTemperature: parseFloat(stats.avg_temperature) || 0,
          minimumTemperature: parseFloat(stats.min_temperature) || 0,
          maximumTemperature: parseFloat(stats.max_temperature) || 0,
          totalReadings: parseInt(stats.total_readings) || 0,
          criticalReadings: parseInt(stats.critical_readings) || 0,
          warningReadings: parseInt(stats.warning_readings) || 0,
          normalReadings: (parseInt(stats.total_readings) || 0) - (parseInt(stats.critical_readings) || 0) - (parseInt(stats.warning_readings) || 0),
          totalEquipments: parseInt(stats.total_equipments) || 0
        },
        filters: {
          equipment_id,
          days: parseInt(days),
          status
        }
      }, 'Historial de temperaturas obtenido exitosamente');

    } catch (error) {
      console.error('Error en getTemperatureHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial de temperaturas', 'FETCH_TEMPERATURE_HISTORY_ERROR');
    }
  }

  // GET /api/client/temperatures/chart - Datos para gráficos de temperatura
  async getTemperatureChartData(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      if (!clientCompanyId) {
        return ResponseHandler.error(res, 'Company ID no encontrado en token', 'MISSING_COMPANY_ID', 401);
      }

      const { 
        equipment_id = '',
        days = 7,
        interval = 'hour' // 'hour', 'day'
      } = req.query;

      let whereConditions = ['e.company_id = $1'];
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (equipment_id) {
        paramCount++;
        whereConditions.push(`e.equipment_id = $${paramCount}`);
        queryParams.push(equipment_id);
      }

      paramCount++;
      whereConditions.push(`tr.timestamp >= NOW() - INTERVAL '${parseInt(days)} days'`);

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Determinar el intervalo de agrupación
      const dateFormat = interval === 'day' 
        ? "DATE_TRUNC('day', tr.timestamp)" 
        : "DATE_TRUNC('hour', tr.timestamp)";

      const chartQuery = `
        SELECT 
          ${dateFormat} as period,
          e.equipment_id,
          e.name as equipment_name,
          AVG(tr.value) as avg_temperature,
          MIN(tr.value) as min_temperature,
          MAX(tr.value) as max_temperature,
          COUNT(tr.temperature_reading_id) as reading_count
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        ${whereClause}
        GROUP BY ${dateFormat}, e.equipment_id, e.name
        ORDER BY period ASC, e.name ASC
      `;

      const result = await pool.query(chartQuery, queryParams);

      // Agrupar datos por equipo
      const equipmentData = {};
      result.rows.forEach(row => {
        if (!equipmentData[row.equipment_id]) {
          equipmentData[row.equipment_id] = {
            equipment_id: row.equipment_id,
            equipment_name: row.equipment_name,
            data: []
          };
        }
        
        equipmentData[row.equipment_id].data.push({
          period: row.period,
          avgTemperature: parseFloat(row.avg_temperature),
          minTemperature: parseFloat(row.min_temperature),
          maxTemperature: parseFloat(row.max_temperature),
          readingCount: parseInt(row.reading_count)
        });
      });

      return ResponseHandler.success(res, {
        chartData: Object.values(equipmentData),
        period: parseInt(days),
        interval,
        totalEquipments: Object.keys(equipmentData).length
      }, 'Datos de gráfico de temperaturas obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getTemperatureChartData:', error);
      return ResponseHandler.error(res, 'Error al obtener datos de gráfico de temperaturas', 'FETCH_TEMPERATURE_CHART_ERROR');
    }
  }
}

module.exports = new ClientTemperaturesController();
