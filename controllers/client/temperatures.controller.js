const pool = require('../../lib/db');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientTemperaturesController {
  
  // GET /api/client/temperatures/current - Temperaturas actuales de todos los equipos
  async getCurrentTemperatures(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      const temperatureQuery = `
        SELECT DISTINCT ON (e.equipment_id)
          e.equipment_id,
          e.equipment_name,
          e.equipment_type,
          tr.temperature,
          tr.reading_date,
          el.location_name,
          el.address as location_address,
          CASE 
            WHEN tr.temperature > 25 OR tr.temperature < -18 THEN 'CRITICAL'
            WHEN tr.temperature > 20 OR tr.temperature < -15 THEN 'WARNING'
            ELSE 'NORMAL'
          END as status,
          EXTRACT(EPOCH FROM (NOW() - tr.reading_date))/60 as minutes_ago
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE e.company_id = $1
        AND tr.reading_date >= NOW() - INTERVAL '2 hours'
        ORDER BY e.equipment_id, tr.reading_date DESC
      `;

      const result = await pool.query(temperatureQuery, [clientCompanyId]);

      // Estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_equipments,
          COUNT(CASE WHEN tr.temperature > 25 OR tr.temperature < -18 THEN 1 END) as critical_equipments,
          COUNT(CASE WHEN tr.temperature > 20 OR tr.temperature < -15 THEN 1 END) as warning_equipments,
          AVG(tr.temperature) as avg_temperature,
          MIN(tr.temperature) as min_temperature,
          MAX(tr.temperature) as max_temperature
        FROM equipments e
        INNER JOIN (
          SELECT DISTINCT ON (equipment_id) equipment_id, temperature, reading_date
          FROM temperature_readings 
          WHERE reading_date >= NOW() - INTERVAL '2 hours'
          ORDER BY equipment_id, reading_date DESC
        ) tr ON e.equipment_id = tr.equipment_id
        WHERE e.company_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [clientCompanyId]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Temperaturas actuales obtenidas exitosamente', {
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
      });

    } catch (error) {
      console.error('Error en getCurrentTemperatures:', error);
      return ResponseHandler.error(res, 'Error al obtener temperaturas actuales', 'FETCH_CURRENT_TEMPERATURES_ERROR');
    }
  }

  // GET /api/client/temperatures/alerts - Alertas de temperatura
  async getTemperatureAlerts(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      const alertsQuery = `
        SELECT DISTINCT ON (e.equipment_id)
          e.equipment_id,
          e.equipment_name,
          e.equipment_type,
          tr.temperature,
          tr.reading_date,
          el.location_name,
          el.address as location_address,
          CASE 
            WHEN tr.temperature > 25 THEN 'TEMPERATURA_ALTA'
            WHEN tr.temperature < -18 THEN 'TEMPERATURA_BAJA'
            ELSE 'NORMAL'
          END as alert_type,
          CASE 
            WHEN tr.temperature > 30 OR tr.temperature < -25 THEN 'CRITICO'
            ELSE 'ADVERTENCIA'
          END as severity,
          EXTRACT(EPOCH FROM (NOW() - tr.reading_date))/60 as minutes_ago
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE e.company_id = $1
        AND (tr.temperature > 25 OR tr.temperature < -18)
        AND tr.reading_date >= NOW() - INTERVAL '24 hours'
        ORDER BY e.equipment_id, tr.reading_date DESC
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

      return ResponseHandler.success(res, 'Alertas de temperatura obtenidas exitosamente', {
        alerts: result.rows,
        summary: {
          totalAlerts: result.rows.length,
          criticalAlerts: alertStats.critical,
          warningAlerts: alertStats.warning
        }
      });

    } catch (error) {
      console.error('Error en getTemperatureAlerts:', error);
      return ResponseHandler.error(res, 'Error al obtener alertas de temperatura', 'FETCH_TEMPERATURE_ALERTS_ERROR');
    }
  }

  // GET /api/client/temperatures/history - Historial de temperaturas con filtros
  async getTemperatureHistory(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
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
      whereConditions.push(`tr.reading_date >= NOW() - INTERVAL '${parseInt(days)} days'`);

      // Filtro por estado
      if (status === 'CRITICAL') {
        whereConditions.push('(tr.temperature > 25 OR tr.temperature < -18)');
      } else if (status === 'WARNING') {
        whereConditions.push('(tr.temperature > 20 AND tr.temperature <= 25) OR (tr.temperature >= -18 AND tr.temperature < -15)');
      } else if (status === 'NORMAL') {
        whereConditions.push('(tr.temperature <= 20 AND tr.temperature >= -15)');
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const historyQuery = `
        SELECT 
          e.equipment_id,
          e.equipment_name,
          e.equipment_type,
          tr.temperature,
          tr.reading_date,
          el.location_name,
          CASE 
            WHEN tr.temperature > 25 OR tr.temperature < -18 THEN 'CRITICAL'
            WHEN tr.temperature > 20 OR tr.temperature < -15 THEN 'WARNING'
            ELSE 'NORMAL'
          END as status
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
        ORDER BY tr.reading_date DESC
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
          AVG(tr.temperature) as avg_temperature,
          MIN(tr.temperature) as min_temperature,
          MAX(tr.temperature) as max_temperature,
          COUNT(*) as total_readings,
          COUNT(CASE WHEN tr.temperature > 25 OR tr.temperature < -18 THEN 1 END) as critical_readings,
          COUNT(CASE WHEN tr.temperature > 20 OR tr.temperature < -15 THEN 1 END) as warning_readings,
          COUNT(DISTINCT e.equipment_id) as total_equipments
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        ${whereClause}
      `;

      const statsResult = await pool.query(statsQuery, queryParams.slice(0, -2));
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Historial de temperaturas obtenido exitosamente', {
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
      });

    } catch (error) {
      console.error('Error en getTemperatureHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial de temperaturas', 'FETCH_TEMPERATURE_HISTORY_ERROR');
    }
  }

  // GET /api/client/temperatures/chart - Datos para gráficos de temperatura
  async getTemperatureChartData(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
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
      whereConditions.push(`tr.reading_date >= NOW() - INTERVAL '${parseInt(days)} days'`);

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Determinar el intervalo de agrupación
      const dateFormat = interval === 'day' 
        ? "DATE_TRUNC('day', tr.reading_date)" 
        : "DATE_TRUNC('hour', tr.reading_date)";

      const chartQuery = `
        SELECT 
          ${dateFormat} as period,
          e.equipment_id,
          e.equipment_name,
          AVG(tr.temperature) as avg_temperature,
          MIN(tr.temperature) as min_temperature,
          MAX(tr.temperature) as max_temperature,
          COUNT(tr.reading_id) as reading_count
        FROM equipments e
        INNER JOIN temperature_readings tr ON e.equipment_id = tr.equipment_id
        ${whereClause}
        GROUP BY ${dateFormat}, e.equipment_id, e.equipment_name
        ORDER BY period ASC, e.equipment_name ASC
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

      return ResponseHandler.success(res, 'Datos de gráfico de temperaturas obtenidos exitosamente', {
        chartData: Object.values(equipmentData),
        period: parseInt(days),
        interval,
        totalEquipments: Object.keys(equipmentData).length
      });

    } catch (error) {
      console.error('Error en getTemperatureChartData:', error);
      return ResponseHandler.error(res, 'Error al obtener datos de gráfico de temperaturas', 'FETCH_TEMPERATURE_CHART_ERROR');
    }
  }
}

module.exports = new ClientTemperaturesController();
