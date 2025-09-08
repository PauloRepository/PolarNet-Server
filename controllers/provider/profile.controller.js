const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');
const bcrypt = require('bcrypt');

class ProviderProfileController {
  
  // GET /api/provider/profile - Perfil completo del proveedor (usuario + empresa)
  async getProfile(req, res) {
    try {
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;

      // Obtener datos del usuario y empresa en una sola consulta
      const profileQuery = `
        SELECT 
          -- Datos del usuario
          u.user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.role,
          u.is_active,
          u.created_at as user_created_at,
          u.updated_at as user_updated_at,
          -- Datos de la empresa
          c.company_id,
          c.company_name,
          c.company_type,
          c.tax_id,
          c.address,
          c.city,
          c.state,
          c.postal_code,
          c.country,
          c.contact_phone,
          c.contact_email,
          c.website,
          c.description,
          c.logo_url,
          c.is_active as company_is_active,
          c.created_at as company_created_at,
          c.updated_at as company_updated_at
        FROM users u
        INNER JOIN companies c ON u.company_id = c.company_id
        WHERE u.user_id = $1 AND u.company_id = $2
      `;

      const profileResult = await pool.query(profileQuery, [providerUserId, providerCompanyId]);
      
      if (profileResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Perfil no encontrado', 'PROFILE_NOT_FOUND');
      }

      const profile = profileResult.rows[0];

      // Obtener estadísticas del proveedor
      const statsQuery = `
        SELECT 
          -- Clientes asignados
          COUNT(DISTINCT e.company_id) as total_clients,
          
          -- Equipos gestionados
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT CASE WHEN e.status = 'ACTIVO' THEN e.equipment_id END) as active_equipments,
          
          -- Solicitudes de servicio
          COUNT(DISTINCT sr.request_id) as total_service_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'PENDIENTE' THEN sr.request_id END) as pending_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'COMPLETADO' THEN sr.request_id END) as completed_requests,
          
          -- Mantenimientos
          COUNT(DISTINCT m.maintenance_id) as total_maintenances,
          COUNT(DISTINCT CASE WHEN m.status = 'PROGRAMADO' THEN m.maintenance_id END) as scheduled_maintenances,
          COUNT(DISTINCT CASE WHEN m.status = 'COMPLETADO' THEN m.maintenance_id END) as completed_maintenances,
          
          -- Rentas
          COUNT(DISTINCT r.rental_id) as total_rentals,
          COUNT(DISTINCT CASE WHEN r.status = 'ACTIVO' THEN r.rental_id END) as active_rentals,
          
          -- Ingresos
          COALESCE(SUM(DISTINCT sr.actual_cost), 0) as service_revenue,
          COALESCE(SUM(DISTINCT m.actual_cost), 0) as maintenance_revenue,
          COALESCE(SUM(DISTINCT r.monthly_rate), 0) as monthly_rental_revenue,
          
          -- Fechas importantes
          MIN(sr.created_at) as first_service_date,
          MAX(sr.completed_date) as last_service_date
        FROM users u
        LEFT JOIN service_requests sr ON sr.provider_user_id = u.user_id
        LEFT JOIN maintenances m ON m.technician_user_id = u.user_id
        LEFT JOIN equipments e ON (
          e.equipment_id = sr.equipment_id OR 
          e.equipment_id = m.equipment_id OR
          e.provider_company_id = u.company_id
        )
        LEFT JOIN rentals r ON r.provider_company_id = u.company_id
        WHERE u.company_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [providerCompanyId]);
      const stats = statsResult.rows[0];

      // Obtener actividad reciente del proveedor
      const recentActivityQuery = `
        SELECT * FROM (
          SELECT 
            'SERVICE_REQUEST' as activity_type,
            sr.request_id as activity_id,
            'Solicitud de servicio ' || 
            CASE 
              WHEN sr.status = 'COMPLETADO' THEN 'completada'
              WHEN sr.status = 'EN_PROCESO' THEN 'iniciada'
              ELSE sr.status
            END || ' para ' || e.equipment_name as description,
            sr.updated_at as activity_date,
            c.company_name as client_name
          FROM service_requests sr
          INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
          INNER JOIN companies c ON e.company_id = c.company_id
          WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          
          UNION ALL
          
          SELECT 
            'MAINTENANCE' as activity_type,
            m.maintenance_id as activity_id,
            'Mantenimiento ' || 
            CASE 
              WHEN m.status = 'COMPLETADO' THEN 'completado'
              WHEN m.status = 'EN_PROCESO' THEN 'iniciado'
              ELSE m.status
            END || ' de ' || e.equipment_name as description,
            m.updated_at as activity_date,
            c.company_name as client_name
          FROM maintenances m
          INNER JOIN equipments e ON m.equipment_id = e.equipment_id
          INNER JOIN companies c ON e.company_id = c.company_id
          WHERE m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          
          UNION ALL
          
          SELECT 
            'RENTAL' as activity_type,
            r.rental_id as activity_id,
            'Renta ' || r.status || ' de equipo para ' || c.company_name as description,
            r.updated_at as activity_date,
            c.company_name as client_name
          FROM rentals r
          INNER JOIN companies c ON r.client_company_id = c.company_id
          WHERE r.provider_company_id = $1
        ) activities
        ORDER BY activity_date DESC
        LIMIT 10
      `;

      const recentActivityResult = await pool.query(recentActivityQuery, [providerCompanyId]);

      return ResponseHandler.success(res, 'Perfil del proveedor obtenido exitosamente', {
        user: {
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          is_active: profile.is_active,
          created_at: profile.user_created_at,
          updated_at: profile.user_updated_at
        },
        company: {
          company_id: profile.company_id,
          company_name: profile.company_name,
          company_type: profile.company_type,
          tax_id: profile.tax_id,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          postal_code: profile.postal_code,
          country: profile.country,
          contact_phone: profile.contact_phone,
          contact_email: profile.contact_email,
          website: profile.website,
          description: profile.description,
          logo_url: profile.logo_url,
          is_active: profile.company_is_active,
          created_at: profile.company_created_at,
          updated_at: profile.company_updated_at
        },
        statistics: {
          totalClients: parseInt(stats.total_clients) || 0,
          totalEquipments: parseInt(stats.total_equipments) || 0,
          activeEquipments: parseInt(stats.active_equipments) || 0,
          totalServiceRequests: parseInt(stats.total_service_requests) || 0,
          pendingRequests: parseInt(stats.pending_requests) || 0,
          completedRequests: parseInt(stats.completed_requests) || 0,
          totalMaintenances: parseInt(stats.total_maintenances) || 0,
          scheduledMaintenances: parseInt(stats.scheduled_maintenances) || 0,
          completedMaintenances: parseInt(stats.completed_maintenances) || 0,
          totalRentals: parseInt(stats.total_rentals) || 0,
          activeRentals: parseInt(stats.active_rentals) || 0,
          serviceRevenue: parseFloat(stats.service_revenue) || 0,
          maintenanceRevenue: parseFloat(stats.maintenance_revenue) || 0,
          monthlyRentalRevenue: parseFloat(stats.monthly_rental_revenue) || 0,
          firstServiceDate: stats.first_service_date,
          lastServiceDate: stats.last_service_date
        },
        recentActivity: recentActivityResult.rows
      });

    } catch (error) {
      console.error('Error en getProfile:', error);
      return ResponseHandler.error(res, 'Error al obtener perfil', 'FETCH_PROFILE_ERROR');
    }
  }

  // PUT /api/provider/profile - Actualizar perfil personal del usuario
  async updateProfile(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const providerUserId = req.user.user_id;
      const {
        first_name,
        last_name,
        email,
        phone,
        current_password,
        new_password
      } = req.body;

      // Verificar que el usuario existe
      const userQuery = 'SELECT * FROM users WHERE user_id = $1';
      const userResult = await client.query(userQuery, [providerUserId]);
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Usuario no encontrado', 'USER_NOT_FOUND');
      }

      const currentUser = userResult.rows[0];

      // Si se proporciona email, verificar que no esté en uso por otro usuario
      if (email && email !== currentUser.email) {
        const emailCheckQuery = 'SELECT user_id FROM users WHERE email = $1 AND user_id != $2';
        const emailResult = await client.query(emailCheckQuery, [email, providerUserId]);
        
        if (emailResult.rows.length > 0) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'El email ya está en uso', 'EMAIL_ALREADY_EXISTS');
        }
      }

      // Manejar cambio de contraseña
      let hashedPassword = null;
      if (new_password) {
        if (!current_password) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Se requiere la contraseña actual para cambiar la contraseña', 'CURRENT_PASSWORD_REQUIRED');
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(current_password, currentUser.password);
        if (!isValidPassword) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'Contraseña actual incorrecta', 'INVALID_CURRENT_PASSWORD');
        }

        // Validar nueva contraseña
        if (new_password.length < 6) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'La nueva contraseña debe tener al menos 6 caracteres', 'PASSWORD_TOO_SHORT');
        }

        hashedPassword = await bcrypt.hash(new_password, 10);
      }

      // Construir query de actualización dinámicamente
      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;

      if (first_name !== undefined) {
        fieldsToUpdate.push(`first_name = $${paramCount}`);
        values.push(first_name);
        paramCount++;
      }

      if (last_name !== undefined) {
        fieldsToUpdate.push(`last_name = $${paramCount}`);
        values.push(last_name);
        paramCount++;
      }

      if (email !== undefined) {
        fieldsToUpdate.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }

      if (phone !== undefined) {
        fieldsToUpdate.push(`phone = $${paramCount}`);
        values.push(phone);
        paramCount++;
      }

      if (hashedPassword) {
        fieldsToUpdate.push(`password = $${paramCount}`);
        values.push(hashedPassword);
        paramCount++;
      }

      if (fieldsToUpdate.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'No se proporcionaron campos para actualizar', 'NO_FIELDS_TO_UPDATE');
      }

      fieldsToUpdate.push(`updated_at = NOW()`);
      values.push(providerUserId);

      const updateUserQuery = `
        UPDATE users 
        SET ${fieldsToUpdate.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING user_id, first_name, last_name, email, phone, role, is_active, created_at, updated_at
      `;

      const updateResult = await client.query(updateUserQuery, values);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Perfil actualizado exitosamente', {
        user: updateResult.rows[0],
        passwordChanged: hashedPassword ? true : false
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en updateProfile:', error);
      return ResponseHandler.error(res, 'Error al actualizar perfil', 'UPDATE_PROFILE_ERROR');
    } finally {
      client.release();
    }
  }

  // GET /api/provider/profile/company - Datos de la empresa
  async getCompanyProfile(req, res) {
    try {
      const providerCompanyId = req.user.company_id;

      const companyQuery = `
        SELECT 
          c.*,
          -- Estadísticas adicionales de la empresa
          (SELECT COUNT(*) FROM users WHERE company_id = c.company_id AND is_active = true) as active_employees,
          (SELECT COUNT(DISTINCT e.company_id) FROM equipments e
           LEFT JOIN service_requests sr ON e.equipment_id = sr.equipment_id
           LEFT JOIN maintenances m ON e.equipment_id = m.equipment_id
           WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = c.company_id)
           OR m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = c.company_id)
           OR e.provider_company_id = c.company_id
          ) as total_clients,
          (SELECT COUNT(*) FROM rentals WHERE provider_company_id = c.company_id AND status = 'ACTIVO') as active_rentals
        FROM companies c
        WHERE c.company_id = $1
      `;

      const companyResult = await pool.query(companyQuery, [providerCompanyId]);
      
      if (companyResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Empresa no encontrada', 'COMPANY_NOT_FOUND');
      }

      const company = companyResult.rows[0];

      return ResponseHandler.success(res, 'Datos de la empresa obtenidos exitosamente', {
        company
      });

    } catch (error) {
      console.error('Error en getCompanyProfile:', error);
      return ResponseHandler.error(res, 'Error al obtener datos de la empresa', 'FETCH_COMPANY_PROFILE_ERROR');
    }
  }

  // PUT /api/provider/profile/company - Actualizar datos de la empresa
  async updateCompanyProfile(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const providerCompanyId = req.user.company_id;
      const {
        company_name,
        tax_id,
        address,
        city,
        state,
        postal_code,
        country,
        contact_phone,
        contact_email,
        website,
        description,
        logo_url
      } = req.body;

      // Verificar que la empresa existe
      const companyQuery = 'SELECT * FROM companies WHERE company_id = $1';
      const companyResult = await client.query(companyQuery, [providerCompanyId]);
      
      if (companyResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Empresa no encontrada', 'COMPANY_NOT_FOUND');
      }

      const currentCompany = companyResult.rows[0];

      // Si se proporciona tax_id, verificar que no esté en uso por otra empresa
      if (tax_id && tax_id !== currentCompany.tax_id) {
        const taxIdCheckQuery = 'SELECT company_id FROM companies WHERE tax_id = $1 AND company_id != $2';
        const taxIdResult = await client.query(taxIdCheckQuery, [tax_id, providerCompanyId]);
        
        if (taxIdResult.rows.length > 0) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'El ID fiscal ya está en uso', 'TAX_ID_ALREADY_EXISTS');
        }
      }

      // Si se proporciona contact_email, verificar formato
      if (contact_email && !contact_email.includes('@')) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Email de contacto inválido', 'INVALID_CONTACT_EMAIL');
      }

      // Construir query de actualización dinámicamente
      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;

      const updateFields = {
        company_name,
        tax_id,
        address,
        city,
        state,
        postal_code,
        country,
        contact_phone,
        contact_email,
        website,
        description,
        logo_url
      };

      Object.keys(updateFields).forEach(field => {
        if (updateFields[field] !== undefined) {
          fieldsToUpdate.push(`${field} = $${paramCount}`);
          values.push(updateFields[field]);
          paramCount++;
        }
      });

      if (fieldsToUpdate.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'No se proporcionaron campos para actualizar', 'NO_FIELDS_TO_UPDATE');
      }

      fieldsToUpdate.push(`updated_at = NOW()`);
      values.push(providerCompanyId);

      const updateCompanyQuery = `
        UPDATE companies 
        SET ${fieldsToUpdate.join(', ')}
        WHERE company_id = $${paramCount}
        RETURNING *
      `;

      const updateResult = await client.query(updateCompanyQuery, values);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Datos de la empresa actualizados exitosamente', {
        company: updateResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en updateCompanyProfile:', error);
      return ResponseHandler.error(res, 'Error al actualizar datos de la empresa', 'UPDATE_COMPANY_PROFILE_ERROR');
    } finally {
      client.release();
    }
  }

  // GET /api/provider/profile/stats - Estadísticas detalladas del proveedor
  async getProviderStats(req, res) {
    try {
      const providerCompanyId = req.user.company_id;
      const { period = '30' } = req.query; // días

      // Estadísticas por período
      const periodStatsQuery = `
        SELECT 
          -- Servicios
          COUNT(DISTINCT sr.request_id) as services_completed,
          COALESCE(SUM(sr.actual_cost), 0) as service_revenue,
          COALESCE(AVG(sr.actual_cost), 0) as avg_service_cost,
          
          -- Mantenimientos
          COUNT(DISTINCT m.maintenance_id) as maintenances_completed,
          COALESCE(SUM(m.actual_cost), 0) as maintenance_revenue,
          COALESCE(AVG(m.actual_cost), 0) as avg_maintenance_cost,
          
          -- Rentas
          COUNT(DISTINCT r.rental_id) as rentals_active,
          COALESCE(SUM(r.monthly_rate), 0) as rental_revenue,
          
          -- Totales
          COALESCE(SUM(sr.actual_cost), 0) + COALESCE(SUM(m.actual_cost), 0) + COALESCE(SUM(r.monthly_rate), 0) as total_revenue
        FROM (SELECT user_id FROM users WHERE company_id = $1) company_users
        LEFT JOIN service_requests sr ON sr.provider_user_id = company_users.user_id 
          AND sr.status = 'COMPLETADO'
          AND sr.completed_date >= NOW() - INTERVAL '${parseInt(period)} days'
        LEFT JOIN maintenances m ON m.technician_user_id = company_users.user_id
          AND m.status = 'COMPLETADO'
          AND m.completed_date >= NOW() - INTERVAL '${parseInt(period)} days'
        LEFT JOIN rentals r ON r.provider_company_id = $1
          AND r.status = 'ACTIVO'
          AND r.start_date >= NOW() - INTERVAL '${parseInt(period)} days'
      `;

      // Evolución mensual (últimos 12 meses)
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', month_date) as month,
          COALESCE(service_revenue, 0) as service_revenue,
          COALESCE(maintenance_revenue, 0) as maintenance_revenue,
          COALESCE(rental_revenue, 0) as rental_revenue,
          COALESCE(service_revenue, 0) + COALESCE(maintenance_revenue, 0) + COALESCE(rental_revenue, 0) as total_revenue
        FROM (
          SELECT generate_series(
            DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
            DATE_TRUNC('month', NOW()),
            '1 month'::interval
          ) as month_date
        ) months
        LEFT JOIN (
          SELECT 
            DATE_TRUNC('month', sr.completed_date) as month,
            SUM(sr.actual_cost) as service_revenue
          FROM service_requests sr
          WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          AND sr.status = 'COMPLETADO'
          AND sr.completed_date >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', sr.completed_date)
        ) services ON months.month_date = services.month
        LEFT JOIN (
          SELECT 
            DATE_TRUNC('month', m.completed_date) as month,
            SUM(m.actual_cost) as maintenance_revenue
          FROM maintenances m
          WHERE m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          AND m.status = 'COMPLETADO'
          AND m.completed_date >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', m.completed_date)
        ) maintenances ON months.month_date = maintenances.month
        LEFT JOIN (
          SELECT 
            DATE_TRUNC('month', r.start_date) as month,
            SUM(r.monthly_rate) as rental_revenue
          FROM rentals r
          WHERE r.provider_company_id = $1
          AND r.start_date >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', r.start_date)
        ) rentals ON months.month_date = rentals.month
        ORDER BY month_date
      `;

      // Top clientes por ingresos
      const topClientsQuery = `
        SELECT 
          c.company_id,
          c.company_name,
          COALESCE(service_revenue, 0) + COALESCE(maintenance_revenue, 0) + COALESCE(rental_revenue, 0) as total_revenue,
          COALESCE(service_count, 0) as total_services,
          COALESCE(maintenance_count, 0) as total_maintenances,
          COALESCE(rental_count, 0) as total_rentals
        FROM companies c
        LEFT JOIN (
          SELECT 
            e.company_id,
            SUM(sr.actual_cost) as service_revenue,
            COUNT(sr.request_id) as service_count
          FROM service_requests sr
          INNER JOIN equipments e ON sr.equipment_id = e.equipment_id
          WHERE sr.provider_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          AND sr.status = 'COMPLETADO'
          GROUP BY e.company_id
        ) services ON c.company_id = services.company_id
        LEFT JOIN (
          SELECT 
            e.company_id,
            SUM(m.actual_cost) as maintenance_revenue,
            COUNT(m.maintenance_id) as maintenance_count
          FROM maintenances m
          INNER JOIN equipments e ON m.equipment_id = e.equipment_id
          WHERE m.technician_user_id IN (SELECT user_id FROM users WHERE company_id = $1)
          AND m.status = 'COMPLETADO'
          GROUP BY e.company_id
        ) maintenances ON c.company_id = maintenances.company_id
        LEFT JOIN (
          SELECT 
            r.client_company_id as company_id,
            SUM(r.monthly_rate) as rental_revenue,
            COUNT(r.rental_id) as rental_count
          FROM rentals r
          WHERE r.provider_company_id = $1
          GROUP BY r.client_company_id
        ) rentals ON c.company_id = rentals.company_id
        WHERE (services.company_id IS NOT NULL OR maintenances.company_id IS NOT NULL OR rentals.company_id IS NOT NULL)
        ORDER BY total_revenue DESC
        LIMIT 10
      `;

      const [periodStats, monthlyTrend, topClients] = await Promise.all([
        pool.query(periodStatsQuery, [providerCompanyId]),
        pool.query(monthlyTrendQuery, [providerCompanyId]),
        pool.query(topClientsQuery, [providerCompanyId])
      ]);

      const stats = periodStats.rows[0];

      return ResponseHandler.success(res, 'Estadísticas del proveedor obtenidas exitosamente', {
        period: parseInt(period),
        summary: {
          servicesCompleted: parseInt(stats.services_completed) || 0,
          serviceRevenue: parseFloat(stats.service_revenue) || 0,
          avgServiceCost: parseFloat(stats.avg_service_cost) || 0,
          maintenancesCompleted: parseInt(stats.maintenances_completed) || 0,
          maintenanceRevenue: parseFloat(stats.maintenance_revenue) || 0,
          avgMaintenanceCost: parseFloat(stats.avg_maintenance_cost) || 0,
          rentalsActive: parseInt(stats.rentals_active) || 0,
          rentalRevenue: parseFloat(stats.rental_revenue) || 0,
          totalRevenue: parseFloat(stats.total_revenue) || 0
        },
        monthlyTrend: monthlyTrend.rows,
        topClients: topClients.rows
      });

    } catch (error) {
      console.error('Error en getProviderStats:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas del proveedor', 'FETCH_PROVIDER_STATS_ERROR');
    }
  }
}

module.exports = new ProviderProfileController();
