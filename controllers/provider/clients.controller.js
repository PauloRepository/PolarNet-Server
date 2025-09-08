// controllers/provider/clients.controller.js
const db = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

// Obtener clientes asignados al proveedor
const getAssignedClients = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { search, status, limit = 50, offset = 0 } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    let query = `
      SELECT DISTINCT
        c.company_id,
        c.name as company_name,
        c.phone as company_phone,
        c.email as company_email,
        c.address as company_address,
        c.business_type,
        COUNT(DISTINCT e.equipment_id) as total_equipments,
        COUNT(DISTINCT sr.service_request_id) as total_service_requests,
        COUNT(DISTINCT m.maintenance_id) as total_maintenances,
        MAX(sr.requested_date) as last_service_request,
        MAX(m.scheduled_date) as last_maintenance
      FROM companies c
      JOIN equipments e ON c.company_id = e.company_id
      LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id 
        AND sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id 
        AND m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      WHERE e.equipment_id IN (
        SELECT DISTINCT equipment_id 
        FROM service_requests 
        WHERE provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        UNION
        SELECT DISTINCT equipment_id 
        FROM maintenances 
        WHERE technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      )
    `;

    const queryParams = [companyId];
    let paramIndex = 2;

    if (search) {
      query += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    query += ` 
      GROUP BY c.company_id, c.name, c.phone, c.email, c.address, c.business_type
      ORDER BY c.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, queryParams);

    const clients = result.rows.map(row => ({
      companyId: row.company_id.toString(),
      companyName: row.company_name,
      phone: row.company_phone,
      email: row.company_email,
      address: row.company_address,
      businessType: row.business_type,
      stats: {
        totalEquipments: parseInt(row.total_equipments),
        totalServiceRequests: parseInt(row.total_service_requests),
        totalMaintenances: parseInt(row.total_maintenances),
        lastServiceRequest: row.last_service_request,
        lastMaintenance: row.last_maintenance
      }
    }));

    // Obtener conteo total
    const countQuery = `
      SELECT COUNT(DISTINCT c.company_id) as total
      FROM companies c
      JOIN equipments e ON c.company_id = e.company_id
      WHERE e.equipment_id IN (
        SELECT DISTINCT equipment_id 
        FROM service_requests 
        WHERE provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
        UNION
        SELECT DISTINCT equipment_id 
        FROM maintenances 
        WHERE technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
      )
      ${search ? `AND (c.name ILIKE $2 OR c.email ILIKE $2)` : ''}
    `;

    const countParams = search ? [companyId, `%${search}%`] : [companyId];
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return ResponseHandler.success(res, 'Clientes asignados obtenidos correctamente', {
      clients,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Error obteniendo clientes asignados:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

// Obtener detalles de un cliente específico
const getClientDetails = async (req, res) => {
  try {
    const { clientId } = req.params;
    const companyId = req.user.company_id;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    // Verificar que el proveedor tiene acceso a este cliente
    const accessQuery = `
      SELECT DISTINCT c.company_id
      FROM companies c
      JOIN equipments e ON c.company_id = e.company_id
      WHERE c.company_id = $1
      AND e.equipment_id IN (
        SELECT DISTINCT equipment_id 
        FROM service_requests 
        WHERE provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
        UNION
        SELECT DISTINCT equipment_id 
        FROM maintenances 
        WHERE technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
      )
    `;

    const accessResult = await db.query(accessQuery, [clientId, companyId]);

    if (accessResult.rows.length === 0) {
      return ResponseHandler.error(res, 'Cliente no encontrado o sin acceso', 'CLIENT_NOT_FOUND', 404);
    }

    // Obtener detalles completos del cliente
    const [clientResult, equipmentsResult, contactsResult] = await Promise.all([
      // Datos básicos del cliente
      db.query(`
        SELECT 
          c.*,
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT sr.service_request_id) as total_service_requests,
          COUNT(DISTINCT m.maintenance_id) as total_maintenances,
          AVG(CASE WHEN sr.status = 'COMPLETADA' THEN 5 ELSE 3 END) as service_rating
        FROM companies c
        LEFT JOIN equipments e ON c.company_id = e.company_id
        LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id 
          AND sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
        LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id 
          AND m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
        WHERE c.company_id = $1
        GROUP BY c.company_id
      `, [clientId, companyId]),

      // Equipos del cliente bajo gestión
      db.query(`
        SELECT 
          e.equipment_id,
          e.name,
          e.type,
          e.status,
          el.address as location
        FROM equipments e
        LEFT JOIN equipment_locations el ON e.equipment_location_id = el.equipment_location_id
        WHERE e.company_id = $1
        AND e.equipment_id IN (
          SELECT DISTINCT equipment_id 
          FROM service_requests 
          WHERE provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
          UNION
          SELECT DISTINCT equipment_id 
          FROM maintenances 
          WHERE technician_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
        )
        ORDER BY e.name
      `, [clientId, companyId]),

      // Contactos del cliente
      db.query(`
        SELECT 
          u.user_id,
          u.name,
          u.email,
          u.phone
        FROM users u
        WHERE u.company_id = $1
        AND u.role = 'CLIENTE'
        ORDER BY u.name
      `, [clientId])
    ]);

    const client = clientResult.rows[0];
    const equipments = equipmentsResult.rows;
    const contacts = contactsResult.rows;

    const clientDetails = {
      companyId: client.company_id.toString(),
      companyName: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      businessType: client.business_type,
      stats: {
        totalEquipments: parseInt(client.total_equipments),
        totalServiceRequests: parseInt(client.total_service_requests),
        totalMaintenances: parseInt(client.total_maintenances),
        serviceRating: parseFloat(client.service_rating) || 0
      },
      equipments: equipments.map(eq => ({
        equipmentId: eq.equipment_id.toString(),
        name: eq.name,
        type: eq.type,
        status: eq.status,
        location: eq.location
      })),
      contacts: contacts.map(contact => ({
        userId: contact.user_id.toString(),
        name: contact.name,
        email: contact.email,
        phone: contact.phone
      }))
    };

    return ResponseHandler.success(res, 'Detalles del cliente obtenidos correctamente', clientDetails);

  } catch (error) {
    console.error('Error obteniendo detalles del cliente:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

// Obtener historial de servicios para un cliente
const getClientServiceHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    const companyId = req.user.company_id;
    const { limit = 20, offset = 0, status } = req.query;

    if (!companyId) {
      return ResponseHandler.error(res, 'Usuario no tiene empresa asociada', 'NO_COMPANY_ASSOCIATED', 400);
    }

    let query = `
      SELECT 
        sr.service_request_id,
        sr.description,
        sr.priority,
        sr.status,
        sr.requested_date,
        sr.scheduled_date,
        sr.completed_date,
        sr.actual_cost,
        e.name as equipment_name,
        e.type as equipment_type,
        u_tech.name as technician_name
      FROM service_requests sr
      JOIN equipments e ON sr.equipment_id = e.equipment_id
      LEFT JOIN users u_tech ON sr.provider_user_id = u_tech.user_id
      WHERE e.company_id = $1
      AND sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $2)
    `;

    const queryParams = [clientId, companyId];
    let paramIndex = 3;

    if (status) {
      query += ` AND sr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    query += ` ORDER BY sr.requested_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, queryParams);

    const serviceHistory = result.rows.map(row => ({
      serviceRequestId: row.service_request_id.toString(),
      description: row.description,
      priority: row.priority,
      status: row.status,
      requestedDate: row.requested_date,
      scheduledDate: row.scheduled_date,
      completedDate: row.completed_date,
      cost: parseFloat(row.actual_cost) || 0,
      equipment: {
        name: row.equipment_name,
        type: row.equipment_type
      },
      technician: row.technician_name
    }));

    return ResponseHandler.success(res, 'Historial de servicios obtenido correctamente', serviceHistory);

  } catch (error) {
    console.error('Error obteniendo historial de servicios:', error);
    return ResponseHandler.error(res, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR', 500);
  }
};

module.exports = {
  getAssignedClients,
  getClientDetails,
  getClientServiceHistory
};
