const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class ProfileController {
  // GET /api/client/profile - Obtener perfil de empresa
  async getProfile(req, res) {
    try {
      const { clientCompanyId } = req.user;

      const companyQuery = `
        SELECT 
          c.*,
          COUNT(DISTINCT u.user_id) as total_users,
          COUNT(DISTINCT l.location_id) as total_locations,
          COUNT(DISTINCT ar.rental_id) as active_rentals
        FROM companies c
        LEFT JOIN users u ON c.company_id = u.company_id AND u.status = 'ACTIVE'
        LEFT JOIN company_locations l ON c.company_id = l.company_id AND l.status = 'ACTIVE'
        LEFT JOIN active_rentals ar ON c.company_id = ar.client_company_id
        WHERE c.company_id = $1
        GROUP BY c.company_id
      `;

      const result = await db.query(companyQuery, [clientCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Empresa no encontrada', 'COMPANY_NOT_FOUND', 404);
      }

      const company = result.rows[0];

      return ResponseHandler.success(res, {
        company: {
          companyId: company.company_id.toString(),
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          state: company.state,
          zipCode: company.zip_code,
          country: company.country,
          taxId: company.tax_id,
          website: company.website,
          industry: company.industry,
          companySize: company.company_size,
          description: company.description,
          logoUrl: company.logo_url,
          status: company.status,
          createdAt: company.created_at,
          stats: {
            totalUsers: parseInt(company.total_users),
            totalLocations: parseInt(company.total_locations),
            activeRentals: parseInt(company.active_rentals)
          }
        }
      }, 'Perfil de empresa obtenido exitosamente');

    } catch (error) {
      console.error('Error en getProfile:', error);
      return ResponseHandler.error(res, 'Error al obtener perfil', 'GET_PROFILE_ERROR', 500);
    }
  }

  // PUT /api/client/profile - Actualizar perfil de empresa
  async updateProfile(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const {
        name,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        website,
        industry,
        companySize,
        description
      } = req.body;

      const updateQuery = `
        UPDATE companies 
        SET 
          name = $2,
          email = $3,
          phone = $4,
          address = $5,
          city = $6,
          state = $7,
          zip_code = $8,
          country = $9,
          website = $10,
          industry = $11,
          company_size = $12,
          description = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $1
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        clientCompanyId,
        name,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        website,
        industry,
        companySize,
        description
      ]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Empresa no encontrada', 'COMPANY_NOT_FOUND', 404);
      }

      const company = result.rows[0];

      return ResponseHandler.success(res, {
        company: {
          companyId: company.company_id.toString(),
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          state: company.state,
          zipCode: company.zip_code,
          country: company.country,
          website: company.website,
          industry: company.industry,
          companySize: company.company_size,
          description: company.description,
          updatedAt: company.updated_at
        }
      }, 'Perfil actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateProfile:', error);
      return ResponseHandler.error(res, 'Error al actualizar perfil', 'UPDATE_PROFILE_ERROR', 500);
    }
  }

  // GET /api/client/profile/locations - Obtener ubicaciones de la empresa
  async getLocations(req, res) {
    try {
      const { clientCompanyId } = req.user;

      const locationsQuery = `
        SELECT 
          cl.*,
          COUNT(DISTINCT ar.rental_id) as active_rentals
        FROM company_locations cl
        LEFT JOIN active_rentals ar ON cl.location_id = ar.location_id
        WHERE cl.company_id = $1
        GROUP BY cl.location_id
        ORDER BY cl.is_main DESC, cl.name ASC
      `;

      const result = await db.query(locationsQuery, [clientCompanyId]);

      const locations = result.rows.map(location => ({
        locationId: location.location_id.toString(),
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        zipCode: location.zip_code,
        country: location.country,
        phone: location.phone,
        email: location.email,
        isMain: location.is_main,
        status: location.status,
        activeRentals: parseInt(location.active_rentals),
        createdAt: location.created_at
      }));

      return ResponseHandler.success(res, {
        locations
      }, 'Ubicaciones obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getLocations:', error);
      return ResponseHandler.error(res, 'Error al obtener ubicaciones', 'GET_LOCATIONS_ERROR', 500);
    }
  }

  // POST /api/client/profile/locations - Crear nueva ubicación
  async createLocation(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const {
        name,
        address,
        city,
        state,
        zipCode,
        country,
        phone,
        email,
        isMain = false
      } = req.body;

      // Si es ubicación principal, actualizar las demás
      if (isMain) {
        await db.query(`
          UPDATE company_locations 
          SET is_main = false 
          WHERE company_id = $1
        `, [clientCompanyId]);
      }

      const insertQuery = `
        INSERT INTO company_locations (
          company_id,
          name,
          address,
          city,
          state,
          zip_code,
          country,
          phone,
          email,
          is_main,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await db.query(insertQuery, [
        clientCompanyId,
        name,
        address,
        city,
        state,
        zipCode,
        country,
        phone,
        email,
        isMain
      ]);

      const location = result.rows[0];

      return ResponseHandler.success(res, {
        location: {
          locationId: location.location_id.toString(),
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zip_code,
          country: location.country,
          phone: location.phone,
          email: location.email,
          isMain: location.is_main,
          status: location.status,
          createdAt: location.created_at
        }
      }, 'Ubicación creada exitosamente');

    } catch (error) {
      console.error('Error en createLocation:', error);
      return ResponseHandler.error(res, 'Error al crear ubicación', 'CREATE_LOCATION_ERROR', 500);
    }
  }

  // PUT /api/client/profile/locations/:id - Actualizar ubicación
  async updateLocation(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const {
        name,
        address,
        city,
        state,
        zipCode,
        country,
        phone,
        email,
        isMain
      } = req.body;

      // Verificar que la ubicación pertenece a la empresa
      const checkQuery = `
        SELECT location_id FROM company_locations 
        WHERE location_id = $1 AND company_id = $2
      `;

      const checkResult = await db.query(checkQuery, [id, clientCompanyId]);

      if (checkResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Ubicación no encontrada', 'LOCATION_NOT_FOUND', 404);
      }

      // Si es ubicación principal, actualizar las demás
      if (isMain) {
        await db.query(`
          UPDATE company_locations 
          SET is_main = false 
          WHERE company_id = $1 AND location_id != $2
        `, [clientCompanyId, id]);
      }

      const updateQuery = `
        UPDATE company_locations 
        SET 
          name = $3,
          address = $4,
          city = $5,
          state = $6,
          zip_code = $7,
          country = $8,
          phone = $9,
          email = $10,
          is_main = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE location_id = $1 AND company_id = $2
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        id,
        clientCompanyId,
        name,
        address,
        city,
        state,
        zipCode,
        country,
        phone,
        email,
        isMain
      ]);

      const location = result.rows[0];

      return ResponseHandler.success(res, {
        location: {
          locationId: location.location_id.toString(),
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zip_code,
          country: location.country,
          phone: location.phone,
          email: location.email,
          isMain: location.is_main,
          status: location.status,
          updatedAt: location.updated_at
        }
      }, 'Ubicación actualizada exitosamente');

    } catch (error) {
      console.error('Error en updateLocation:', error);
      return ResponseHandler.error(res, 'Error al actualizar ubicación', 'UPDATE_LOCATION_ERROR', 500);
    }
  }

  // DELETE /api/client/profile/locations/:id - Eliminar ubicación
  async deleteLocation(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      // Verificar que no sea la ubicación principal
      const checkQuery = `
        SELECT location_id, is_main FROM company_locations 
        WHERE location_id = $1 AND company_id = $2
      `;

      const checkResult = await db.query(checkQuery, [id, clientCompanyId]);

      if (checkResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Ubicación no encontrada', 'LOCATION_NOT_FOUND', 404);
      }

      if (checkResult.rows[0].is_main) {
        return ResponseHandler.error(res, 'No se puede eliminar la ubicación principal', 'CANNOT_DELETE_MAIN_LOCATION', 400);
      }

      // Verificar que no tenga equipos activos
      const equipmentCheck = await db.query(`
        SELECT COUNT(*) as count
        FROM active_rentals 
        WHERE location_id = $1
      `, [id]);

      if (parseInt(equipmentCheck.rows[0].count) > 0) {
        return ResponseHandler.error(res, 'No se puede eliminar ubicación con equipos activos', 'LOCATION_HAS_ACTIVE_RENTALS', 400);
      }

      await db.query(`
        UPDATE company_locations 
        SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE location_id = $1 AND company_id = $2
      `, [id, clientCompanyId]);

      return ResponseHandler.success(res, {
        message: 'Ubicación eliminada exitosamente'
      }, 'Ubicación eliminada exitosamente');

    } catch (error) {
      console.error('Error en deleteLocation:', error);
      return ResponseHandler.error(res, 'Error al eliminar ubicación', 'DELETE_LOCATION_ERROR', 500);
    }
  }

  // GET /api/client/profile/users - Obtener usuarios de la empresa
  async getUsers(req, res) {
    try {
      const { clientCompanyId } = req.user;

      const usersQuery = `
        SELECT 
          u.*,
          COUNT(DISTINCT ar.rental_id) as managed_rentals
        FROM users u
        LEFT JOIN active_rentals ar ON u.user_id = ar.client_contact_id
        WHERE u.company_id = $1
        GROUP BY u.user_id
        ORDER BY u.created_at DESC
      `;

      const result = await db.query(usersQuery, [clientCompanyId]);

      const users = result.rows.map(user => ({
        userId: user.user_id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login,
        managedRentals: parseInt(user.managed_rentals),
        createdAt: user.created_at
      }));

      return ResponseHandler.success(res, {
        users
      }, 'Usuarios obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getUsers:', error);
      return ResponseHandler.error(res, 'Error al obtener usuarios', 'GET_USERS_ERROR', 500);
    }
  }

  // POST /api/client/profile/users - Invitar nuevo usuario
  async inviteUser(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const {
        name,
        email,
        phone,
        role = 'USER'
      } = req.body;

      // Verificar que el email no esté en uso
      const emailCheck = await db.query(`
        SELECT user_id FROM users WHERE email = $1
      `, [email]);

      if (emailCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'El email ya está en uso', 'EMAIL_ALREADY_EXISTS', 400);
      }

      const insertQuery = `
        INSERT INTO users (
          company_id,
          name,
          email,
          phone,
          role,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING', CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await db.query(insertQuery, [
        clientCompanyId,
        name,
        email,
        phone,
        role
      ]);

      const user = result.rows[0];

      return ResponseHandler.success(res, {
        user: {
          userId: user.user_id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          createdAt: user.created_at
        },
        message: 'Invitación enviada. El usuario recibirá un email para completar el registro.'
      }, 'Usuario invitado exitosamente');

    } catch (error) {
      console.error('Error en inviteUser:', error);
      return ResponseHandler.error(res, 'Error al invitar usuario', 'INVITE_USER_ERROR', 500);
    }
  }

  // PUT /api/client/profile/users/:id/status - Actualizar estado de usuario
  async updateUserStatus(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const { status } = req.body;

      // Verificar que el usuario pertenece a la empresa
      const checkQuery = `
        SELECT user_id FROM users 
        WHERE user_id = $1 AND company_id = $2
      `;

      const checkResult = await db.query(checkQuery, [id, clientCompanyId]);

      if (checkResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'USER_NOT_FOUND', 404);
      }

      const updateQuery = `
        UPDATE users 
        SET status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND company_id = $2
        RETURNING *
      `;

      const result = await db.query(updateQuery, [id, clientCompanyId, status]);

      const user = result.rows[0];

      return ResponseHandler.success(res, {
        user: {
          userId: user.user_id.toString(),
          name: user.name,
          email: user.email,
          status: user.status,
          updatedAt: user.updated_at
        }
      }, 'Estado de usuario actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateUserStatus:', error);
      return ResponseHandler.error(res, 'Error al actualizar estado', 'UPDATE_USER_STATUS_ERROR', 500);
    }
  }

  // GET /api/client/profile/activity - Obtener actividad de la empresa
  async getCompanyActivity(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20,
        startDate,
        endDate 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE (
        ar.client_company_id = $1 OR 
        sr.client_company_id = $1 OR 
        i.client_company_id = $1
      )`;
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (startDate) {
        whereClause += ` AND activity_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND activity_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      const activityQuery = `
        SELECT * FROM (
          SELECT 
            'RENTAL_STARTED' as activity_type,
            ar.start_date as activity_date,
            'Inicio de renta de ' || e.name as description,
            ar.rental_id::text as reference_id
          FROM active_rentals ar
          LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
          WHERE ar.client_company_id = $1
          
          UNION ALL
          
          SELECT 
            'SERVICE_REQUEST' as activity_type,
            sr.created_at as activity_date,
            'Solicitud de servicio: ' || sr.description as description,
            sr.request_id::text as reference_id
          FROM service_requests sr
          WHERE sr.client_company_id = $1
          
          UNION ALL
          
          SELECT 
            'INVOICE_GENERATED' as activity_type,
            i.invoice_date as activity_date,
            'Factura generada: ' || i.invoice_number as description,
            i.invoice_id::text as reference_id
          FROM invoices i
          WHERE i.client_company_id = $1
        ) activities
        ${whereClause.replace('WHERE (', 'WHERE (')}
        ORDER BY activity_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(activityQuery, queryParams);

      const activities = result.rows.map(activity => ({
        activityType: activity.activity_type,
        activityDate: activity.activity_date,
        description: activity.description,
        referenceId: activity.reference_id
      }));

      return ResponseHandler.success(res, {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activities.length
        }
      }, 'Actividad empresarial obtenida exitosamente');

    } catch (error) {
      console.error('Error en getCompanyActivity:', error);
      return ResponseHandler.error(res, 'Error al obtener actividad', 'GET_ACTIVITY_ERROR', 500);
    }
  }
}

module.exports = new ProfileController();
