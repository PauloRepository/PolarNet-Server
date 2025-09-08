const pool = require('../../lib/db');
const ResponseHandler = require('../../helpers/responseHandler');
const bcrypt = require('bcrypt');

class ClientProfileController {
  
  // GET /api/client/profile - Obtener información del perfil completo
  async getProfile(req, res) {
    try {
      const userId = req.user.user_id;
      const clientCompanyId = req.user.company_id;

      const profileQuery = `
        SELECT 
          u.user_id,
          u.email,
          u.full_name,
          u.phone,
          u.position,
          u.status as user_status,
          u.created_at as user_since,
          u.updated_at as last_updated,
          c.company_id,
          c.company_name,
          c.company_type,
          c.tax_id,
          c.contact_email as company_email,
          c.contact_phone as company_phone,
          c.address,
          c.city,
          c.state,
          c.country,
          c.postal_code,
          c.website,
          c.status as company_status,
          c.subscription_plan,
          c.plan_expiry_date,
          c.created_at as company_since,
          -- Contar recursos de la empresa
          (SELECT COUNT(*) FROM equipments WHERE company_id = c.company_id) as total_equipments,
          (SELECT COUNT(*) FROM users WHERE company_id = c.company_id AND status = 'ACTIVO') as active_users,
          (SELECT COUNT(*) FROM service_requests WHERE company_id = c.company_id) as total_service_requests,
          (SELECT COUNT(*) FROM maintenances WHERE company_id = c.company_id) as total_maintenances
        FROM users u
        INNER JOIN companies c ON u.company_id = c.company_id
        WHERE u.user_id = $1 AND u.company_id = $2
      `;

      const result = await pool.query(profileQuery, [userId, clientCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Perfil de usuario no encontrado');
      }

      const profile = result.rows[0];

      // Obtener estadísticas de actividad reciente
      const activityStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM service_requests 
           WHERE company_id = $1 AND request_date >= NOW() - INTERVAL '30 days') as recent_service_requests,
          (SELECT COUNT(*) FROM maintenances 
           WHERE company_id = $1 AND scheduled_date >= NOW() - INTERVAL '30 days') as recent_maintenances,
          (SELECT COUNT(*) FROM temperature_readings tr
           INNER JOIN equipments e ON tr.equipment_id = e.equipment_id
           WHERE e.company_id = $1 AND tr.reading_date >= NOW() - INTERVAL '24 hours') as recent_temperature_readings,
          (SELECT COUNT(*) FROM energy_readings er
           INNER JOIN equipments e ON er.equipment_id = e.equipment_id
           WHERE e.company_id = $1 AND er.reading_date >= NOW() - INTERVAL '24 hours') as recent_energy_readings
      `;

      const activityResult = await pool.query(activityStatsQuery, [clientCompanyId]);
      const activityStats = activityResult.rows[0];

      // Información del plan de suscripción
      const subscriptionInfo = {
        plan: profile.subscription_plan || 'BASICO',
        expiryDate: profile.plan_expiry_date,
        daysUntilExpiry: profile.plan_expiry_date 
          ? Math.ceil((new Date(profile.plan_expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
          : null,
        isExpired: profile.plan_expiry_date 
          ? new Date(profile.plan_expiry_date) < new Date()
          : false
      };

      // Límites del plan (esto podría venir de una configuración)
      const planLimits = {
        BASICO: { equipments: 10, users: 3, storage: '1GB' },
        ESTANDAR: { equipments: 50, users: 10, storage: '10GB' },
        PREMIUM: { equipments: 200, users: 50, storage: '100GB' },
        EMPRESARIAL: { equipments: -1, users: -1, storage: 'Ilimitado' }
      };

      const currentPlanLimits = planLimits[profile.subscription_plan] || planLimits.BASICO;

      return ResponseHandler.success(res, 'Perfil obtenido exitosamente', {
        user: {
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          position: profile.position,
          status: profile.user_status,
          userSince: profile.user_since,
          lastUpdated: profile.last_updated
        },
        company: {
          company_id: profile.company_id,
          company_name: profile.company_name,
          company_type: profile.company_type,
          tax_id: profile.tax_id,
          contact_email: profile.company_email,
          contact_phone: profile.company_phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          postal_code: profile.postal_code,
          website: profile.website,
          status: profile.company_status,
          companySince: profile.company_since
        },
        subscription: subscriptionInfo,
        planLimits: currentPlanLimits,
        usage: {
          totalEquipments: parseInt(profile.total_equipments) || 0,
          activeUsers: parseInt(profile.active_users) || 0,
          totalServiceRequests: parseInt(profile.total_service_requests) || 0,
          totalMaintenances: parseInt(profile.total_maintenances) || 0
        },
        recentActivity: {
          serviceRequestsLast30Days: parseInt(activityStats.recent_service_requests) || 0,
          maintenancesLast30Days: parseInt(activityStats.recent_maintenances) || 0,
          temperatureReadingsLast24Hours: parseInt(activityStats.recent_temperature_readings) || 0,
          energyReadingsLast24Hours: parseInt(activityStats.recent_energy_readings) || 0
        }
      });

    } catch (error) {
      console.error('Error en getProfile:', error);
      return ResponseHandler.error(res, 'Error al obtener perfil', 'FETCH_PROFILE_ERROR');
    }
  }

  // PUT /api/client/profile/user - Actualizar información personal del usuario
  async updateUserProfile(req, res) {
    try {
      const userId = req.user.user_id;
      const clientCompanyId = req.user.company_id;
      const {
        full_name,
        phone,
        position
      } = req.body;

      // Validaciones básicas
      if (!full_name || full_name.trim().length < 2) {
        return ResponseHandler.badRequest(res, 'El nombre completo debe tener al menos 2 caracteres');
      }

      const updateQuery = `
        UPDATE users 
        SET full_name = $1,
            phone = $2,
            position = $3,
            updated_at = NOW()
        WHERE user_id = $4 AND company_id = $5
        RETURNING user_id, full_name, phone, position, updated_at
      `;

      const result = await pool.query(updateQuery, [
        full_name.trim(),
        phone || null,
        position || null,
        userId,
        clientCompanyId
      ]);

      if (result.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Usuario no encontrado');
      }

      return ResponseHandler.success(res, 'Perfil de usuario actualizado exitosamente', {
        user: result.rows[0]
      });

    } catch (error) {
      console.error('Error en updateUserProfile:', error);
      return ResponseHandler.error(res, 'Error al actualizar perfil de usuario', 'UPDATE_USER_PROFILE_ERROR');
    }
  }

  // PUT /api/client/profile/company - Actualizar información de la empresa
  async updateCompanyProfile(req, res) {
    try {
      const clientCompanyId = req.user.company_id;
      const {
        company_name,
        contact_email,
        contact_phone,
        address,
        city,
        state,
        country,
        postal_code,
        website
      } = req.body;

      // Validaciones básicas
      if (!company_name || company_name.trim().length < 2) {
        return ResponseHandler.badRequest(res, 'El nombre de la empresa debe tener al menos 2 caracteres');
      }

      if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
        return ResponseHandler.badRequest(res, 'Email de contacto inválido');
      }

      const updateQuery = `
        UPDATE companies 
        SET company_name = $1,
            contact_email = $2,
            contact_phone = $3,
            address = $4,
            city = $5,
            state = $6,
            country = $7,
            postal_code = $8,
            website = $9,
            updated_at = NOW()
        WHERE company_id = $10 AND company_type = 'CLIENTE'
        RETURNING company_id, company_name, contact_email, contact_phone, 
                  address, city, state, country, postal_code, website, updated_at
      `;

      const result = await pool.query(updateQuery, [
        company_name.trim(),
        contact_email || null,
        contact_phone || null,
        address || null,
        city || null,
        state || null,
        country || null,
        postal_code || null,
        website || null,
        clientCompanyId
      ]);

      if (result.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Empresa no encontrada o no autorizada');
      }

      return ResponseHandler.success(res, 'Perfil de empresa actualizado exitosamente', {
        company: result.rows[0]
      });

    } catch (error) {
      console.error('Error en updateCompanyProfile:', error);
      return ResponseHandler.error(res, 'Error al actualizar perfil de empresa', 'UPDATE_COMPANY_PROFILE_ERROR');
    }
  }

  // PUT /api/client/profile/password - Cambiar contraseña
  async changePassword(req, res) {
    try {
      const userId = req.user.user_id;
      const { current_password, new_password } = req.body;

      // Validaciones
      if (!current_password || !new_password) {
        return ResponseHandler.badRequest(res, 'Contraseña actual y nueva contraseña son obligatorias');
      }

      if (new_password.length < 8) {
        return ResponseHandler.badRequest(res, 'La nueva contraseña debe tener al menos 8 caracteres');
      }

      // Verificar contraseña actual
      const userQuery = 'SELECT password_hash FROM users WHERE user_id = $1';
      const userResult = await pool.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Usuario no encontrado');
      }

      const isCurrentPasswordValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);

      if (!isCurrentPasswordValid) {
        return ResponseHandler.badRequest(res, 'La contraseña actual es incorrecta');
      }

      // Generar hash de la nueva contraseña
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

      // Actualizar contraseña
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1,
            updated_at = NOW()
        WHERE user_id = $2
        RETURNING user_id, updated_at
      `;

      const result = await pool.query(updateQuery, [newPasswordHash, userId]);

      return ResponseHandler.success(res, 'Contraseña cambiada exitosamente', {
        user_id: result.rows[0].user_id,
        updated_at: result.rows[0].updated_at
      });

    } catch (error) {
      console.error('Error en changePassword:', error);
      return ResponseHandler.error(res, 'Error al cambiar contraseña', 'CHANGE_PASSWORD_ERROR');
    }
  }

  // GET /api/client/profile/subscription - Detalles de suscripción
  async getSubscriptionDetails(req, res) {
    try {
      const clientCompanyId = req.user.company_id;

      const subscriptionQuery = `
        SELECT 
          company_name,
          subscription_plan,
          plan_start_date,
          plan_expiry_date,
          billing_cycle,
          monthly_cost,
          annual_cost,
          payment_method,
          auto_renewal,
          status
        FROM companies 
        WHERE company_id = $1 AND company_type = 'CLIENTE'
      `;

      const result = await pool.query(subscriptionQuery, [clientCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.notFound(res, 'Información de suscripción no encontrada');
      }

      const subscription = result.rows[0];

      // Calcular información adicional
      const now = new Date();
      const expiryDate = subscription.plan_expiry_date ? new Date(subscription.plan_expiry_date) : null;
      
      const subscriptionStatus = {
        isActive: subscription.status === 'ACTIVO',
        isExpired: expiryDate ? expiryDate < now : false,
        daysUntilExpiry: expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null,
        daysUntilRenewal: subscription.auto_renewal && expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null
      };

      // Características del plan actual
      const planFeatures = {
        BASICO: {
          equipments: 10,
          users: 3,
          storage: '1GB',
          monitoring: '24/7',
          support: 'Email',
          reports: 'Básicos',
          alerts: 'Email'
        },
        ESTANDAR: {
          equipments: 50,
          users: 10,
          storage: '10GB',
          monitoring: '24/7',
          support: 'Email + Chat',
          reports: 'Avanzados',
          alerts: 'Email + SMS'
        },
        PREMIUM: {
          equipments: 200,
          users: 50,
          storage: '100GB',
          monitoring: '24/7',
          support: 'Email + Chat + Teléfono',
          reports: 'Personalizados',
          alerts: 'Email + SMS + Push'
        },
        EMPRESARIAL: {
          equipments: 'Ilimitado',
          users: 'Ilimitado',
          storage: 'Ilimitado',
          monitoring: '24/7 + Dedicado',
          support: 'Soporte Prioritario 24/7',
          reports: 'Personalizados + API',
          alerts: 'Todos los canales + Webhooks'
        }
      };

      const currentFeatures = planFeatures[subscription.subscription_plan] || planFeatures.BASICO;

      return ResponseHandler.success(res, 'Detalles de suscripción obtenidos exitosamente', {
        subscription: {
          company_name: subscription.company_name,
          plan: subscription.subscription_plan,
          startDate: subscription.plan_start_date,
          expiryDate: subscription.plan_expiry_date,
          billingCycle: subscription.billing_cycle,
          monthlyCost: parseFloat(subscription.monthly_cost) || 0,
          annualCost: parseFloat(subscription.annual_cost) || 0,
          paymentMethod: subscription.payment_method,
          autoRenewal: subscription.auto_renewal,
          status: subscription.status
        },
        subscriptionStatus,
        planFeatures: currentFeatures,
        availablePlans: ['BASICO', 'ESTANDAR', 'PREMIUM', 'EMPRESARIAL']
      });

    } catch (error) {
      console.error('Error en getSubscriptionDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de suscripción', 'FETCH_SUBSCRIPTION_DETAILS_ERROR');
    }
  }

  // GET /api/client/profile/activity - Registro de actividad del usuario
  async getActivityLog(req, res) {
    try {
      const userId = req.user.user_id;
      const clientCompanyId = req.user.company_id;
      const { page = 1, limit = 20, days = 30 } = req.query;

      const offset = (page - 1) * limit;

      // Esta sería una tabla de logs de actividad (no existe en el schema actual, pero es una simulación)
      // En un sistema real, tendrías una tabla audit_logs o activity_logs
      
      // Por ahora simulamos actividad basada en las acciones disponibles
      const recentActivityQuery = `
        SELECT 'service_request' as activity_type, 
               'Solicitud de servicio creada' as description,
               request_date as activity_date,
               request_id as reference_id
        FROM service_requests 
        WHERE company_id = $1 AND requested_by = $2 
        AND request_date >= NOW() - INTERVAL '${parseInt(days)} days'
        
        UNION ALL
        
        SELECT 'service_request_update' as activity_type,
               'Solicitud de servicio actualizada' as description,
               updated_at as activity_date,
               request_id as reference_id
        FROM service_requests 
        WHERE company_id = $1 AND requested_by = $2
        AND updated_at >= NOW() - INTERVAL '${parseInt(days)} days'
        AND updated_at != created_at
        
        ORDER BY activity_date DESC
        LIMIT $3 OFFSET $4
      `;

      const countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT request_date as activity_date FROM service_requests 
          WHERE company_id = $1 AND requested_by = $2 
          AND request_date >= NOW() - INTERVAL '${parseInt(days)} days'
          
          UNION ALL
          
          SELECT updated_at as activity_date FROM service_requests 
          WHERE company_id = $1 AND requested_by = $2
          AND updated_at >= NOW() - INTERVAL '${parseInt(days)} days'
          AND updated_at != created_at
        ) activities
      `;

      const [activityResult, countResult] = await Promise.all([
        pool.query(recentActivityQuery, [clientCompanyId, userId, limit, offset]),
        pool.query(countQuery, [clientCompanyId, userId])
      ]);

      const activities = activityResult.rows;
      const totalActivities = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalActivities / limit);

      // Estadísticas de actividad por tipo
      const activityStats = activities.reduce((acc, activity) => {
        const type = activity.activity_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return ResponseHandler.success(res, 'Registro de actividad obtenido exitosamente', {
        activities,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalActivities,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        statistics: activityStats,
        period: parseInt(days)
      });

    } catch (error) {
      console.error('Error en getActivityLog:', error);
      return ResponseHandler.error(res, 'Error al obtener registro de actividad', 'FETCH_ACTIVITY_LOG_ERROR');
    }
  }

  // GET /api/client/profile/notifications - Configuración de notificaciones
  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.user_id;

      // En un sistema real, tendrías una tabla user_notification_settings
      // Por ahora simulamos configuraciones por defecto
      const defaultSettings = {
        email_notifications: {
          service_requests: true,
          maintenance_reminders: true,
          temperature_alerts: true,
          energy_alerts: false,
          system_updates: true,
          marketing: false
        },
        sms_notifications: {
          urgent_alerts: true,
          maintenance_reminders: false,
          service_completion: true
        },
        push_notifications: {
          all_alerts: true,
          maintenance_reminders: true,
          service_updates: true
        },
        notification_frequency: {
          digest_frequency: 'daily', // 'immediate', 'daily', 'weekly'
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00'
        }
      };

      return ResponseHandler.success(res, 'Configuración de notificaciones obtenida exitosamente', {
        user_id: userId,
        notification_settings: defaultSettings,
        last_updated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en getNotificationSettings:', error);
      return ResponseHandler.error(res, 'Error al obtener configuración de notificaciones', 'FETCH_NOTIFICATION_SETTINGS_ERROR');
    }
  }

  // PUT /api/client/profile/notifications - Actualizar configuración de notificaciones
  async updateNotificationSettings(req, res) {
    try {
      const userId = req.user.user_id;
      const { notification_settings } = req.body;

      if (!notification_settings) {
        return ResponseHandler.badRequest(res, 'Configuración de notificaciones requerida');
      }

      // En un sistema real, aquí actualizarías la tabla user_notification_settings
      // Por ahora simulamos la actualización exitosa
      
      return ResponseHandler.success(res, 'Configuración de notificaciones actualizada exitosamente', {
        user_id: userId,
        notification_settings,
        updated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en updateNotificationSettings:', error);
      return ResponseHandler.error(res, 'Error al actualizar configuración de notificaciones', 'UPDATE_NOTIFICATION_SETTINGS_ERROR');
    }
  }
}

module.exports = new ClientProfileController();
