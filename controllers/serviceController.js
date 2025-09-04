const { validationResult } = require('express-validator');
const db = require('../lib/database');

// Obtener todas las solicitudes de servicio
const getServiceRequests = async (req, res) => {
  try {
    const { status, priority, equipment_id } = req.query;
    
    let query = `
      SELECT sr.*, 
             u.name as user_name, u.phone as user_phone,
             t.name as technician_name, t.phone as technician_phone,
             e.name as equipment_name, e.type as equipment_type,
             c.name as company_name
      FROM service_requests sr
      LEFT JOIN users u ON sr.user_id = u.id
      LEFT JOIN users t ON sr.technician_id = t.id
      LEFT JOIN equipments e ON sr.equipment_id = e.id
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filtro por rol del usuario
    if (req.user.role === 'EMPRESA') {
      // Las empresas solo ven sus propias solicitudes
      paramCount++;
      query += ` AND sr.user_id = $${paramCount}`;
      queryParams.push(req.user.id);
    } else if (req.user.role === 'TECNICO') {
      // Los técnicos pueden ver solicitudes asignadas a ellos o sin asignar
      paramCount++;
      query += ` AND (sr.technician_id = $${paramCount} OR sr.technician_id IS NULL)`;
      queryParams.push(req.user.id);
    }

    // Filtros adicionales
    if (status) {
      paramCount++;
      query += ` AND sr.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND sr.priority = $${paramCount}`;
      queryParams.push(priority);
    }

    if (equipment_id) {
      paramCount++;
      query += ` AND sr.equipment_id = $${paramCount}`;
      queryParams.push(equipment_id);
    }

    query += ' ORDER BY sr.created_at DESC';

    const result = await db.query(query, queryParams);

    res.json({
      service_requests: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes de servicio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nueva solicitud de servicio (solo empresas)
const createServiceRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    if (req.user.role !== 'EMPRESA') {
      return res.status(403).json({
        error: 'Solo las empresas pueden crear solicitudes de servicio',
        code: 'FORBIDDEN'
      });
    }

    const { description, priority, issue_type, equipment_id } = req.body;

    // Verificar que el equipo pertenece a la empresa
    const equipmentQuery = 'SELECT id FROM equipments WHERE id = $1 AND company_id = $2';
    const equipmentResult = await db.query(equipmentQuery, [equipment_id, req.user.company_id]);
    
    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Equipo no encontrado o no pertenece a tu empresa',
        code: 'EQUIPMENT_NOT_FOUND'
      });
    }

    // Crear la solicitud
    const insertQuery = `
      INSERT INTO service_requests (description, priority, issue_type, status, user_id, equipment_id)
      VALUES ($1, $2, $3, 'OPEN', $4, $5)
      RETURNING *
    `;

    const values = [description, priority, issue_type, req.user.id, equipment_id];
    const result = await db.query(insertQuery, values);

    res.status(201).json({
      message: 'Solicitud de servicio creada exitosamente',
      service_request: result.rows[0]
    });

  } catch (error) {
    console.error('Error creando solicitud de servicio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Asignar técnico a solicitud (solo técnicos)
const assignTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'TECNICO') {
      return res.status(403).json({
        error: 'Solo los técnicos pueden asignarse solicitudes',
        code: 'FORBIDDEN'
      });
    }

    // Verificar que la solicitud existe y está disponible
    const requestQuery = 'SELECT * FROM service_requests WHERE id = $1 AND (technician_id IS NULL OR status = \'OPEN\')';
    const requestResult = await db.query(requestQuery, [id]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Solicitud no encontrada o ya asignada',
        code: 'REQUEST_NOT_AVAILABLE'
      });
    }

    // Asignar el técnico
    const updateQuery = `
      UPDATE service_requests 
      SET technician_id = $1, status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(updateQuery, [req.user.id, id]);

    res.json({
      message: 'Solicitud asignada exitosamente',
      service_request: result.rows[0]
    });

  } catch (error) {
    console.error('Error asignando técnico:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Actualizar estado de solicitud
const updateServiceRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Verificar permisos
    let query = 'SELECT * FROM service_requests WHERE id = $1';
    let queryParams = [id];

    if (req.user.role === 'EMPRESA') {
      query += ' AND user_id = $2';
      queryParams.push(req.user.id);
    } else if (req.user.role === 'TECNICO') {
      query += ' AND technician_id = $2';
      queryParams.push(req.user.id);
    }

    const requestResult = await db.query(query, queryParams);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Solicitud no encontrada o sin permisos',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Actualizar el estado
    const updateQuery = `
      UPDATE service_requests 
      SET status = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [status, notes, id]);

    res.json({
      message: 'Estado actualizado exitosamente',
      service_request: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getServiceRequests,
  createServiceRequest,
  assignTechnician,
  updateServiceRequestStatus
};
