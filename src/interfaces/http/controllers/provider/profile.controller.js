const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');
const bcrypt = require('bcrypt');

class ProfileController {
  // GET /api/provider/profile - Obtener perfil completo
  async getProfile(req, res) {
    try {
      const { userId, providerCompanyId } = req.user;

      // Obtener datos del usuario
      const userQuery = `
        SELECT 
          u.*,
          c.name as company_name,
          c.type as company_type,
          c.phone as company_phone,
          c.email as company_email,
          c.address as company_address,
          c.city as company_city,
          c.state as company_state,
          c.website as company_website,
          c.description as company_description
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.user_id = $1
      `;

      const userResult = await db.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'USER_NOT_FOUND', 404);
      }

      const user = userResult.rows[0];

      // Obtener estadísticas del usuario si es técnico
      let userStats = null;
      if (user.role === 'PROVIDER') {
        const statsQuery = `
          SELECT 
            COUNT(DISTINCT sr.service_request_id) as assigned_services,
            COUNT(DISTINCT CASE WHEN sr.status = 'COMPLETED' THEN sr.service_request_id END) as completed_services,
            COUNT(DISTINCT m.maintenance_id) as assigned_maintenances,
            COUNT(DISTINCT CASE WHEN m.status = 'COMPLETED' THEN m.maintenance_id END) as completed_maintenances,
            AVG(CASE WHEN sr.client_rating IS NOT NULL THEN sr.client_rating END) as avg_rating
          FROM users u
          LEFT JOIN service_requests sr ON u.user_id = sr.assigned_technician_id
          LEFT JOIN maintenances m ON u.user_id = m.technician_id
          WHERE u.user_id = $1
        `;

        const statsResult = await db.query(statsQuery, [userId]);
        userStats = statsResult.rows[0];
      }

      return ResponseHandler.success(res, {
        user: {
          userId: user.user_id.toString(),
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at,
          stats: userStats ? {
            assignedServices: parseInt(userStats.assigned_services),
            completedServices: parseInt(userStats.completed_services),
            assignedMaintenances: parseInt(userStats.assigned_maintenances),
            completedMaintenances: parseInt(userStats.completed_maintenances),
            avgRating: userStats.avg_rating ? parseFloat(userStats.avg_rating).toFixed(1) : null
          } : null
        },
        company: {
          companyId: user.company_id.toString(),
          name: user.company_name,
          type: user.company_type,
          phone: user.company_phone,
          email: user.company_email,
          address: user.company_address,
          city: user.company_city,
          state: user.company_state,
          website: user.company_website,
          description: user.company_description
        }
      }, 'Perfil obtenido exitosamente');

    } catch (error) {
      console.error('Error en getProfile:', error);
      return ResponseHandler.error(res, 'Error al obtener perfil', 'GET_PROFILE_ERROR', 500);
    }
  }

  // PUT /api/provider/profile/user - Actualizar perfil de usuario
  async updateUserProfile(req, res) {
    try {
      const { userId } = req.user;
      const { firstName, lastName, phone } = req.body;

      const updateQuery = `
        UPDATE users SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          updated_at = NOW()
        WHERE user_id = $4
        RETURNING user_id, first_name, last_name, email, phone, role, is_active, created_at, updated_at
      `;

      const result = await db.query(updateQuery, [firstName, lastName, phone, userId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'USER_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        user: result.rows[0]
      }, 'Perfil de usuario actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateUserProfile:', error);
      return ResponseHandler.error(res, 'Error al actualizar perfil de usuario', 'UPDATE_USER_PROFILE_ERROR', 500);
    }
  }

  // PUT /api/provider/profile/company - Actualizar perfil de empresa
  async updateCompanyProfile(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const {
        name, phone, email, address, city, state,
        website, description, businessType, specialization
      } = req.body;

      const updateQuery = `
        UPDATE companies SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          address = COALESCE($4, address),
          city = COALESCE($5, city),
          state = COALESCE($6, state),
          website = COALESCE($7, website),
          description = COALESCE($8, description),
          business_type = COALESCE($9, business_type),
          specialization = COALESCE($10, specialization),
          updated_at = NOW()
        WHERE company_id = $11
        RETURNING *
      `;

      const values = [
        name, phone, email, address, city, state,
        website, description, businessType, specialization, providerCompanyId
      ];

      const result = await db.query(updateQuery, values);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Empresa no encontrada', 'COMPANY_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        company: result.rows[0]
      }, 'Perfil de empresa actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateCompanyProfile:', error);
      return ResponseHandler.error(res, 'Error al actualizar perfil de empresa', 'UPDATE_COMPANY_PROFILE_ERROR', 500);
    }
  }

  // PUT /api/provider/profile/password - Cambiar contraseña
  async changePassword(req, res) {
    try {
      const { userId } = req.user;
      const { currentPassword, newPassword } = req.body;

      // Obtener contraseña actual
      const userQuery = `
        SELECT password_hash FROM users WHERE user_id = $1
      `;

      const userResult = await db.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'USER_NOT_FOUND', 404);
      }

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

      if (!isValidPassword) {
        return ResponseHandler.error(res, 'Contraseña actual incorrecta', 'INVALID_CURRENT_PASSWORD', 400);
      }

      // Hash de la nueva contraseña
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      const updateQuery = `
        UPDATE users SET
          password_hash = $1,
          updated_at = NOW()
        WHERE user_id = $2
      `;

      await db.query(updateQuery, [hashedNewPassword, userId]);

      return ResponseHandler.success(res, {
        message: 'Contraseña actualizada exitosamente'
      }, 'Contraseña cambiada exitosamente');

    } catch (error) {
      console.error('Error en changePassword:', error);
      return ResponseHandler.error(res, 'Error al cambiar contraseña', 'CHANGE_PASSWORD_ERROR', 500);
    }
  }

  // GET /api/provider/profile/team - Obtener miembros del equipo
  async getTeamMembers(req, res) {
    try {
      const { providerCompanyId } = req.user;

      const teamQuery = `
        SELECT 
          u.user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.role,
          u.is_active,
          u.created_at,
          COUNT(DISTINCT sr.service_request_id) as assigned_services,
          COUNT(DISTINCT CASE WHEN sr.status = 'COMPLETED' THEN sr.service_request_id END) as completed_services,
          COUNT(DISTINCT m.maintenance_id) as assigned_maintenances,
          AVG(CASE WHEN sr.client_rating IS NOT NULL THEN sr.client_rating END) as avg_rating
        FROM users u
        LEFT JOIN service_requests sr ON u.user_id = sr.assigned_technician_id 
          AND sr.created_at >= CURRENT_DATE - interval '30 days'
        LEFT JOIN maintenances m ON u.user_id = m.technician_id 
          AND m.created_at >= CURRENT_DATE - interval '30 days'
        WHERE u.company_id = $1 AND u.role = 'PROVIDER'
        GROUP BY u.user_id
        ORDER BY u.first_name, u.last_name
      `;

      const result = await db.query(teamQuery, [providerCompanyId]);

      const teamMembers = result.rows.map(member => ({
        userId: member.user_id.toString(),
        firstName: member.first_name,
        lastName: member.last_name,
        fullName: `${member.first_name} ${member.last_name}`,
        email: member.email,
        phone: member.phone,
        role: member.role,
        isActive: member.is_active,
        createdAt: member.created_at,
        stats: {
          assignedServices: parseInt(member.assigned_services),
          completedServices: parseInt(member.completed_services),
          assignedMaintenances: parseInt(member.assigned_maintenances),
          avgRating: member.avg_rating ? parseFloat(member.avg_rating).toFixed(1) : null
        }
      }));

      return ResponseHandler.success(res, {
        teamMembers,
        totalMembers: teamMembers.length
      }, 'Miembros del equipo obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getTeamMembers:', error);
      return ResponseHandler.error(res, 'Error al obtener miembros del equipo', 'GET_TEAM_MEMBERS_ERROR', 500);
    }
  }

  // POST /api/provider/profile/team - Agregar nuevo miembro del equipo
  async addTeamMember(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { firstName, lastName, email, phone, password } = req.body;

      // Verificar si el email ya existe
      const emailCheck = await db.query(
        'SELECT user_id FROM users WHERE email = $1',
        [email]
      );

      if (emailCheck.rows.length > 0) {
        return ResponseHandler.error(res, 'El email ya está registrado', 'EMAIL_EXISTS', 400);
      }

      // Hash de la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertQuery = `
        INSERT INTO users (
          first_name, last_name, email, phone, password_hash,
          company_id, role, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PROVIDER', true)
        RETURNING user_id, first_name, last_name, email, phone, role, is_active, created_at
      `;

      const values = [firstName, lastName, email, phone, hashedPassword, providerCompanyId];

      const result = await db.query(insertQuery, values);

      return ResponseHandler.success(res, {
        teamMember: result.rows[0]
      }, 'Miembro del equipo agregado exitosamente');

    } catch (error) {
      console.error('Error en addTeamMember:', error);
      return ResponseHandler.error(res, 'Error al agregar miembro del equipo', 'ADD_TEAM_MEMBER_ERROR', 500);
    }
  }

  // PUT /api/provider/profile/team/:userId - Actualizar miembro del equipo
  async updateTeamMember(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { userId } = req.params;
      const { firstName, lastName, phone, isActive } = req.body;

      // Verificar que el usuario pertenece a la empresa
      const memberCheck = await db.query(
        'SELECT user_id FROM users WHERE user_id = $1 AND company_id = $2 AND role = $3',
        [userId, providerCompanyId, 'PROVIDER']
      );

      if (memberCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Miembro del equipo no encontrado', 'TEAM_MEMBER_NOT_FOUND', 404);
      }

      const updateQuery = `
        UPDATE users SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
        WHERE user_id = $5 AND company_id = $6
        RETURNING user_id, first_name, last_name, email, phone, role, is_active, created_at, updated_at
      `;

      const result = await db.query(updateQuery, [
        firstName, lastName, phone, isActive, userId, providerCompanyId
      ]);

      return ResponseHandler.success(res, {
        teamMember: result.rows[0]
      }, 'Miembro del equipo actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateTeamMember:', error);
      return ResponseHandler.error(res, 'Error al actualizar miembro del equipo', 'UPDATE_TEAM_MEMBER_ERROR', 500);
    }
  }

  // DELETE /api/provider/profile/team/:userId - Remover miembro del equipo
  async removeTeamMember(req, res) {
    try {
      const { providerCompanyId, userId: currentUserId } = req.user;
      const { userId } = req.params;

      // No permitir que se elimine a sí mismo
      if (userId === currentUserId.toString()) {
        return ResponseHandler.error(res, 'No puedes eliminarte a ti mismo', 'CANNOT_DELETE_SELF', 400);
      }

      // Verificar que el usuario pertenece a la empresa
      const memberCheck = await db.query(
        'SELECT user_id FROM users WHERE user_id = $1 AND company_id = $2 AND role = $3',
        [userId, providerCompanyId, 'PROVIDER']
      );

      if (memberCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Miembro del equipo no encontrado', 'TEAM_MEMBER_NOT_FOUND', 404);
      }

      // En lugar de eliminar, desactivar el usuario para mantener integridad referencial
      const updateQuery = `
        UPDATE users SET
          is_active = false,
          updated_at = NOW()
        WHERE user_id = $1 AND company_id = $2
        RETURNING user_id, first_name, last_name, email, is_active
      `;

      const result = await db.query(updateQuery, [userId, providerCompanyId]);

      return ResponseHandler.success(res, {
        removedMember: result.rows[0]
      }, 'Miembro del equipo removido exitosamente');

    } catch (error) {
      console.error('Error en removeTeamMember:', error);
      return ResponseHandler.error(res, 'Error al remover miembro del equipo', 'REMOVE_TEAM_MEMBER_ERROR', 500);
    }
  }
}

module.exports = new ProfileController();
