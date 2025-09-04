const { validationResult } = require('express-validator');
const db = require('../lib/database');

// Obtener todos los equipos (con filtros por empresa si es necesario)
const getEquipments = async (req, res) => {
  try {
    const { company_id, status, type } = req.query;
    let query = `
      SELECT e.*, el.address as location_address, el.lat, el.lng,
             c.name as company_name
      FROM equipments e
      LEFT JOIN equipment_locations el ON e.equipment_location_id = el.id
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filtro por empresa (automático para usuarios de tipo EMPRESA)
    if (req.user.role === 'EMPRESA') {
      paramCount++;
      query += ` AND e.company_id = $${paramCount}`;
      queryParams.push(req.user.company_id);
    } else if (company_id) {
      paramCount++;
      query += ` AND e.company_id = $${paramCount}`;
      queryParams.push(company_id);
    }

    // Filtros adicionales
    if (status) {
      paramCount++;
      query += ` AND e.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (type) {
      paramCount++;
      query += ` AND e.type = $${paramCount}`;
      queryParams.push(type);
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await db.query(query, queryParams);

    res.json({
      equipments: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo equipos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener un equipo específico
const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT e.*, el.address as location_address, el.lat, el.lng,
             c.name as company_name, c.phone as company_phone
      FROM equipments e
      LEFT JOIN equipment_locations el ON e.equipment_location_id = el.id
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE e.id = $1
    `;
    const queryParams = [id];

    // Si es empresa, solo puede ver sus propios equipos
    if (req.user.role === 'EMPRESA') {
      query += ' AND e.company_id = $2';
      queryParams.push(req.user.company_id);
    }

    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Equipo no encontrado',
        code: 'EQUIPMENT_NOT_FOUND'
      });
    }

    res.json({
      equipment: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo equipo:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener lecturas de temperatura de un equipo
const getTemperatureReadings = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, from_date, to_date } = req.query;

    // Verificar que el equipo existe y el usuario tiene acceso
    let equipmentQuery = 'SELECT company_id FROM equipments WHERE id = $1';
    const equipmentParams = [id];
    
    if (req.user.role === 'EMPRESA') {
      equipmentQuery += ' AND company_id = $2';
      equipmentParams.push(req.user.company_id);
    }

    const equipmentResult = await db.query(equipmentQuery, equipmentParams);
    
    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Equipo no encontrado o sin permisos',
        code: 'EQUIPMENT_NOT_FOUND'
      });
    }

    // Construir query de lecturas
    let query = `
      SELECT id, value, status, created_at
      FROM temperature_readings
      WHERE equipment_id = $1
    `;
    const queryParams = [id];
    let paramCount = 1;

    if (from_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      queryParams.push(from_date);
    }

    if (to_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      queryParams.push(to_date);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    res.json({
      readings: result.rows,
      total: result.rows.length,
      equipment_id: id
    });

  } catch (error) {
    console.error('Error obteniendo lecturas de temperatura:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener lecturas de energía de un equipo
const getEnergyReadings = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, from_date, to_date } = req.query;

    // Verificar acceso al equipo
    let equipmentQuery = 'SELECT company_id FROM equipments WHERE id = $1';
    const equipmentParams = [id];
    
    if (req.user.role === 'EMPRESA') {
      equipmentQuery += ' AND company_id = $2';
      equipmentParams.push(req.user.company_id);
    }

    const equipmentResult = await db.query(equipmentQuery, equipmentParams);
    
    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Equipo no encontrado o sin permisos',
        code: 'EQUIPMENT_NOT_FOUND'
      });
    }

    // Construir query de lecturas de energía
    let query = `
      SELECT id, consumption, usage_time, status, created_at
      FROM energy_readings
      WHERE equipment_id = $1
    `;
    const queryParams = [id];
    let paramCount = 1;

    if (from_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      queryParams.push(from_date);
    }

    if (to_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      queryParams.push(to_date);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    res.json({
      readings: result.rows,
      total: result.rows.length,
      equipment_id: id
    });

  } catch (error) {
    console.error('Error obteniendo lecturas de energía:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getEquipments,
  getEquipmentById,
  getTemperatureReadings,
  getEnergyReadings
};
