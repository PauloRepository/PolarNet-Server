const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

class ClientEnergyController {
  
  // GET /api/client/energy/current - Consumo energético actual
  async getCurrentConsumption(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      const consumptionQuery = `
        SELECT DISTINCT ON (e.equipment_id)
          e.equipment_id,
          e.name as equipment_name,
          e.type as equipment_type,
          er.consumption as power_consumption,
          er.consumption as energy_consumed,
          er.timestamp as reading_date,
          el.address as location_name,
          el.address as location_address,
          CASE 
            WHEN er.consumption > 1000 THEN 'ALTO'
            WHEN er.consumption > 500 THEN 'MEDIO'
            ELSE 'BAJO'
          END as consumption_level,
          EXTRACT(EPOCH FROM (NOW() - er.timestamp))/60 as minutes_ago
        FROM equipments e
        INNER JOIN energy_readings er ON e.equipment_id = er.equipment_id
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE e.company_id = $1
        AND er.timestamp >= NOW() - INTERVAL '7 days'
        ORDER BY e.equipment_id, er.timestamp DESC
      `;

      const result = await pool.query(consumptionQuery, [clientCompanyId]);

      // Estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_equipments,
          SUM(er.consumption) as total_power_consumption,
          AVG(er.consumption) as avg_power_consumption,
          MAX(er.consumption) as max_power_consumption,
          SUM(er.consumption) as total_energy_consumed,
          COUNT(CASE WHEN er.consumption > 1000 THEN 1 END) as high_consumption_equipments,
          COUNT(CASE WHEN er.consumption > 500 AND er.consumption <= 1000 THEN 1 END) as medium_consumption_equipments
        FROM equipments e
        INNER JOIN (
          SELECT DISTINCT ON (equipment_id) 
            equipment_id, 
            consumption,
            timestamp
          FROM energy_readings 
          WHERE timestamp >= NOW() - INTERVAL '7 days'
          ORDER BY equipment_id, timestamp DESC
        ) er ON e.equipment_id = er.equipment_id
        WHERE e.company_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [clientCompanyId]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, {
        consumption: result.rows,
        summary: {
          totalEquipments: parseInt(stats.total_equipments) || 0,
          totalPowerConsumption: parseFloat(stats.total_power_consumption) || 0,
          averagePowerConsumption: parseFloat(stats.avg_power_consumption) || 0,
          maximumPowerConsumption: parseFloat(stats.max_power_consumption) || 0,
          totalEnergyConsumed: parseFloat(stats.total_energy_consumed) || 0,
          highConsumptionEquipments: parseInt(stats.high_consumption_equipments) || 0,
          mediumConsumptionEquipments: parseInt(stats.medium_consumption_equipments) || 0,
          lowConsumptionEquipments: (parseInt(stats.total_equipments) || 0) - (parseInt(stats.high_consumption_equipments) || 0) - (parseInt(stats.medium_consumption_equipments) || 0)
        }
      }, 'Consumo energético actual obtenido exitosamente');

    } catch (error) {
      console.error('Error en getCurrentConsumption:', error);
      return ResponseHandler.error(res, 'Error al obtener consumo energético actual', 'FETCH_CURRENT_CONSUMPTION_ERROR');
    }
  }

  // GET /api/client/energy/daily - Consumo diario
  async getDailyConsumption(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { 
        days = 30,
        equipment_id = ''
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
      whereConditions.push(`er.timestamp >= NOW() - INTERVAL '${parseInt(days)} days'`);

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const dailyQuery = `
        SELECT 
          DATE(er.timestamp) as consumption_date,
          e.equipment_id,
          e.name as equipment_name,
          e.type as equipment_type,
          SUM(er.consumption) as daily_energy_consumed,
          AVG(er.consumption) as avg_power_consumption,
          MAX(er.consumption) as max_power_consumption,
          COUNT(er.energy_reading_id) as reading_count
        FROM equipments e
        INNER JOIN energy_readings er ON e.equipment_id = er.equipment_id
        ${whereClause}
        GROUP BY DATE(er.timestamp), e.equipment_id, e.name, e.type
        ORDER BY consumption_date DESC, e.name ASC
      `;

      const result = await pool.query(dailyQuery, queryParams);

      // Calcular tendencia y totales por día
      const dailyTotals = {};
      result.rows.forEach(row => {
        const date = row.consumption_date;
        if (!dailyTotals[date]) {
          dailyTotals[date] = {
            date,
            totalEnergyConsumed: 0,
            equipmentCount: 0,
            avgPowerConsumption: 0,
            maxPowerConsumption: 0,
            equipments: []
          };
        }
        
        dailyTotals[date].totalEnergyConsumed += parseFloat(row.daily_energy_consumed) || 0;
        dailyTotals[date].equipmentCount++;
        dailyTotals[date].avgPowerConsumption += parseFloat(row.avg_power_consumption) || 0;
        dailyTotals[date].maxPowerConsumption = Math.max(
          dailyTotals[date].maxPowerConsumption, 
          parseFloat(row.max_power_consumption) || 0
        );
        
        dailyTotals[date].equipments.push({
          equipment_id: row.equipment_id,
          equipment_name: row.equipment_name,
          equipment_type: row.equipment_type,
          dailyEnergyConsumed: parseFloat(row.daily_energy_consumed) || 0,
          avgPowerConsumption: parseFloat(row.avg_power_consumption) || 0,
          maxPowerConsumption: parseFloat(row.max_power_consumption) || 0,
          readingCount: parseInt(row.reading_count) || 0
        });
      });

      // Calcular promedio de potencia por día
      Object.keys(dailyTotals).forEach(date => {
        if (dailyTotals[date].equipmentCount > 0) {
          dailyTotals[date].avgPowerConsumption = dailyTotals[date].avgPowerConsumption / dailyTotals[date].equipmentCount;
        }
      });

      const dailyData = Object.values(dailyTotals).sort((a, b) => new Date(b.date) - new Date(a.date));

      // Estadísticas del período
      const totalEnergyPeriod = dailyData.reduce((sum, day) => sum + day.totalEnergyConsumed, 0);
      const avgDailyConsumption = dailyData.length > 0 ? totalEnergyPeriod / dailyData.length : 0;

      return ResponseHandler.success(res, {
        dailyConsumption: dailyData,
        summary: {
          totalDays: dailyData.length,
          totalEnergyPeriod,
          averageDailyConsumption: avgDailyConsumption,
          maxDailyConsumption: Math.max(...dailyData.map(d => d.totalEnergyConsumed)),
          minDailyConsumption: Math.min(...dailyData.map(d => d.totalEnergyConsumed))
        },
        filters: {
          days: parseInt(days),
          equipment_id
        }
      }, 'Consumo diario obtenido exitosamente');

    } catch (error) {
      console.error('Error en getDailyConsumption:', error);
      return ResponseHandler.error(res, 'Error al obtener consumo diario', 'FETCH_DAILY_CONSUMPTION_ERROR');
    }
  }

  // GET /api/client/energy/monthly - Consumo mensual
  async getMonthlyConsumption(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { 
        months = 12,
        equipment_id = ''
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
      whereConditions.push(`er.timestamp >= NOW() - INTERVAL '${parseInt(months)} months'`);

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const monthlyQuery = `
        SELECT 
          DATE_TRUNC('month', er.timestamp) as consumption_month,
          e.equipment_id,
          e.name as equipment_name,
          e.type as equipment_type,
          SUM(er.consumption) as monthly_energy_consumed,
          AVG(er.consumption) as avg_power_consumption,
          MAX(er.consumption) as max_power_consumption,
          COUNT(er.energy_reading_id) as reading_count
        FROM equipments e
        INNER JOIN energy_readings er ON e.equipment_id = er.equipment_id
        ${whereClause}
        GROUP BY DATE_TRUNC('month', er.timestamp), e.equipment_id, e.name, e.type
        ORDER BY consumption_month DESC, e.name ASC
      `;

      const result = await pool.query(monthlyQuery, queryParams);

      // Calcular totales por mes
      const monthlyTotals = {};
      result.rows.forEach(row => {
        const month = row.consumption_month;
        if (!monthlyTotals[month]) {
          monthlyTotals[month] = {
            month,
            totalEnergyConsumed: 0,
            equipmentCount: 0,
            avgPowerConsumption: 0,
            maxPowerConsumption: 0,
            equipments: []
          };
        }
        
        monthlyTotals[month].totalEnergyConsumed += parseFloat(row.monthly_energy_consumed) || 0;
        monthlyTotals[month].equipmentCount++;
        monthlyTotals[month].avgPowerConsumption += parseFloat(row.avg_power_consumption) || 0;
        monthlyTotals[month].maxPowerConsumption = Math.max(
          monthlyTotals[month].maxPowerConsumption, 
          parseFloat(row.max_power_consumption) || 0
        );
        
        monthlyTotals[month].equipments.push({
          equipment_id: row.equipment_id,
          equipment_name: row.equipment_name,
          equipment_type: row.equipment_type,
          monthlyEnergyConsumed: parseFloat(row.monthly_energy_consumed) || 0,
          avgPowerConsumption: parseFloat(row.avg_power_consumption) || 0,
          maxPowerConsumption: parseFloat(row.max_power_consumption) || 0,
          readingCount: parseInt(row.reading_count) || 0
        });
      });

      // Calcular promedio de potencia por mes
      Object.keys(monthlyTotals).forEach(month => {
        if (monthlyTotals[month].equipmentCount > 0) {
          monthlyTotals[month].avgPowerConsumption = monthlyTotals[month].avgPowerConsumption / monthlyTotals[month].equipmentCount;
        }
      });

      const monthlyData = Object.values(monthlyTotals).sort((a, b) => new Date(b.month) - new Date(a.month));

      // Estadísticas del período y tendencia
      const totalEnergyPeriod = monthlyData.reduce((sum, month) => sum + month.totalEnergyConsumed, 0);
      const avgMonthlyConsumption = monthlyData.length > 0 ? totalEnergyPeriod / monthlyData.length : 0;

      // Calcular tendencia (comparar últimos 3 meses con 3 anteriores)
      let trend = 'STABLE';
      if (monthlyData.length >= 6) {
        const recent3Months = monthlyData.slice(0, 3).reduce((sum, m) => sum + m.totalEnergyConsumed, 0) / 3;
        const previous3Months = monthlyData.slice(3, 6).reduce((sum, m) => sum + m.totalEnergyConsumed, 0) / 3;
        
        const changePercent = ((recent3Months - previous3Months) / previous3Months) * 100;
        
        if (changePercent > 10) trend = 'INCREASING';
        else if (changePercent < -10) trend = 'DECREASING';
      }

      return ResponseHandler.success(res, {
        monthlyConsumption: monthlyData,
        summary: {
          totalMonths: monthlyData.length,
          totalEnergyPeriod,
          averageMonthlyConsumption: avgMonthlyConsumption,
          maxMonthlyConsumption: Math.max(...monthlyData.map(m => m.totalEnergyConsumed)),
          minMonthlyConsumption: Math.min(...monthlyData.map(m => m.totalEnergyConsumed)),
          consumptionTrend: trend
        },
        filters: {
          months: parseInt(months),
          equipment_id
        }
      }, 'Consumo mensual obtenido exitosamente');

    } catch (error) {
      console.error('Error en getMonthlyConsumption:', error);
      return ResponseHandler.error(res, 'Error al obtener consumo mensual', 'FETCH_MONTHLY_CONSUMPTION_ERROR');
    }
  }

  // GET /api/client/energy/efficiency - Análisis de eficiencia energética
  async getEnergyEfficiency(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { days = 30 } = req.query;

      // Eficiencia por equipo (últimos 30 días)
      const efficiencyQuery = `
        SELECT 
          e.equipment_id,
          e.name as equipment_name,
          e.type as equipment_type,
          AVG(er.consumption) as avg_power_consumption,
          SUM(er.consumption) as total_energy_consumed,
          COUNT(er.energy_reading_id) as total_readings,
          MIN(er.timestamp) as first_reading,
          MAX(er.timestamp) as last_reading,
          EXTRACT(EPOCH FROM (MAX(er.timestamp) - MIN(er.timestamp)))/3600 as hours_monitored,
          -- Eficiencia basada en consumo vs tiempo de operación
          CASE 
            WHEN AVG(er.consumption) <= 300 THEN 'EXCELENTE'
            WHEN AVG(er.consumption) <= 600 THEN 'BUENA'
            WHEN AVG(er.consumption) <= 1000 THEN 'REGULAR'
            ELSE 'DEFICIENTE'
          END as efficiency_rating,
          -- Calcular variabilidad del consumo
          STDDEV(er.consumption) as consumption_variability
        FROM equipments e
        INNER JOIN energy_readings er ON e.equipment_id = er.equipment_id
        WHERE e.company_id = $1
        AND er.timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY e.equipment_id, e.name, e.type
        HAVING COUNT(er.energy_reading_id) > 0
        ORDER BY AVG(er.consumption) ASC
      `;

      const result = await pool.query(efficiencyQuery, [clientCompanyId]);

      const equipmentEfficiency = result.rows.map(row => ({
        equipment_id: row.equipment_id,
        equipment_name: row.equipment_name,
        equipment_type: row.equipment_type,
        averagePowerConsumption: parseFloat(row.avg_power_consumption) || 0,
        totalEnergyConsumed: parseFloat(row.total_energy_consumed) || 0,
        totalReadings: parseInt(row.total_readings) || 0,
        hoursMonitored: parseFloat(row.hours_monitored) || 0,
        efficiencyRating: row.efficiency_rating,
        consumptionVariability: parseFloat(row.consumption_variability) || 0,
        firstReading: row.first_reading,
        lastReading: row.last_reading,
        // Cálculo de eficiencia por hora
        energyPerHour: row.hours_monitored > 0 ? parseFloat(row.total_energy_consumed) / parseFloat(row.hours_monitored) : 0
      }));

      // Estadísticas generales de eficiencia
      const totalEquipments = equipmentEfficiency.length;
      const efficiencyStats = equipmentEfficiency.reduce((acc, eq) => {
        switch(eq.efficiencyRating) {
          case 'EXCELENTE': acc.excellent++; break;
          case 'BUENA': acc.good++; break;
          case 'REGULAR': acc.regular++; break;
          case 'DEFICIENTE': acc.poor++; break;
        }
        acc.totalConsumption += eq.totalEnergyConsumed;
        acc.totalPower += eq.averagePowerConsumption;
        return acc;
      }, { excellent: 0, good: 0, regular: 0, poor: 0, totalConsumption: 0, totalPower: 0 });

      // Recomendaciones basadas en el análisis
      const recommendations = [];
      
      if (efficiencyStats.poor > 0) {
        recommendations.push({
          type: 'MAINTENANCE_REQUIRED',
          priority: 'HIGH',
          message: `${efficiencyStats.poor} equipo(s) con eficiencia deficiente requieren mantenimiento urgente`,
          affectedEquipments: equipmentEfficiency.filter(e => e.efficiencyRating === 'DEFICIENTE').length
        });
      }

      if (efficiencyStats.regular > totalEquipments * 0.3) {
        recommendations.push({
          type: 'EFFICIENCY_OPTIMIZATION',
          priority: 'MEDIUM',
          message: 'Más del 30% de los equipos tienen eficiencia regular. Considere optimización preventiva',
          affectedEquipments: efficiencyStats.regular
        });
      }

      const highVariabilityEquipments = equipmentEfficiency.filter(e => e.consumptionVariability > e.averagePowerConsumption * 0.3);
      if (highVariabilityEquipments.length > 0) {
        recommendations.push({
          type: 'CONSUMPTION_VARIABILITY',
          priority: 'MEDIUM',
          message: `${highVariabilityEquipments.length} equipo(s) tienen alta variabilidad en el consumo`,
          affectedEquipments: highVariabilityEquipments.length
        });
      }

      return ResponseHandler.success(res, {
        equipmentEfficiency,
        summary: {
          totalEquipments,
          excellentEfficiency: efficiencyStats.excellent,
          goodEfficiency: efficiencyStats.good,
          regularEfficiency: efficiencyStats.regular,
          poorEfficiency: efficiencyStats.poor,
          averageConsumption: totalEquipments > 0 ? efficiencyStats.totalPower / totalEquipments : 0,
          totalEnergyConsumed: efficiencyStats.totalConsumption,
          efficiencyScore: totalEquipments > 0 ? 
            ((efficiencyStats.excellent * 4 + efficiencyStats.good * 3 + efficiencyStats.regular * 2 + efficiencyStats.poor * 1) / totalEquipments / 4 * 100) : 0
        },
        recommendations,
        analysisпериод: parseInt(days)
      }, 'Análisis de eficiencia energética obtenido exitosamente');

    } catch (error) {
      console.error('Error en getEnergyEfficiency:', error);
      return ResponseHandler.error(res, 'Error al obtener análisis de eficiencia energética', 'FETCH_ENERGY_EFFICIENCY_ERROR');
    }
  }

  // GET /api/client/energy/chart - Datos para gráficos de consumo energético
  async getEnergyChartData(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const { 
        equipment_id = '',
        days = 7,
        interval = 'hour', // 'hour', 'day'
        metric = 'power' // 'power', 'energy', 'both'
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
      whereConditions.push(`er.timestamp >= NOW() - INTERVAL '${parseInt(days)} days'`);

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Determinar el intervalo de agrupación
      const dateFormat = interval === 'day' 
        ? "DATE_TRUNC('day', er.timestamp)" 
        : "DATE_TRUNC('hour', er.timestamp)";

      const chartQuery = `
        SELECT 
          ${dateFormat} as period,
          e.equipment_id,
          e.name as equipment_name,
          AVG(er.consumption) as avg_power_consumption,
          MAX(er.consumption) as max_power_consumption,
          MIN(er.consumption) as min_power_consumption,
          SUM(er.consumption) as total_energy_consumed,
          COUNT(er.energy_reading_id) as reading_count
        FROM equipments e
        INNER JOIN energy_readings er ON e.equipment_id = er.equipment_id
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
        
        const dataPoint = {
          period: row.period,
          readingCount: parseInt(row.reading_count)
        };

        if (metric === 'power' || metric === 'both') {
          dataPoint.avgPowerConsumption = parseFloat(row.avg_power_consumption);
          dataPoint.maxPowerConsumption = parseFloat(row.max_power_consumption);
          dataPoint.minPowerConsumption = parseFloat(row.min_power_consumption);
        }

        if (metric === 'energy' || metric === 'both') {
          dataPoint.totalEnergyConsumed = parseFloat(row.total_energy_consumed);
        }
        
        equipmentData[row.equipment_id].data.push(dataPoint);
      });

      return ResponseHandler.success(res, {
        chartData: Object.values(equipmentData),
        period: parseInt(days),
        interval,
        metric,
        totalEquipments: Object.keys(equipmentData).length
      }, 'Datos de gráfico de consumo energético obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getEnergyChartData:', error);
      return ResponseHandler.error(res, 'Error al obtener datos de gráfico de consumo energético', 'FETCH_ENERGY_CHART_ERROR');
    }
  }
}

module.exports = new ClientEnergyController();
