const pool = require('../../lib/database');
const ResponseHandler = require('../../helpers/responseHandler');

class ProviderRentalsController {
  
  // GET /api/provider/rentals - Rentas de equipos gestionadas por el proveedor
  async getRentals(req, res) {
    try {
      const providerUserId = req.user.user_id;
      const providerCompanyId = req.user.company_id;
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        status = '', 
        client_id = '',
        equipment_type = '',
        sortBy = 'start_date',
        sortOrder = 'desc',
        date_from = '',
        date_to = '',
        expiring_soon = '' // 'true' para rentas que expiran pronto
      } = req.query;

      const offset = (page - 1) * limit;

      // Construir filtros dinámicamente
      let whereConditions = [`r.provider_company_id = $1`];
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (search.trim()) {
        paramCount++;
        whereConditions.push(`(
          e.equipment_name ILIKE $${paramCount} 
          OR e.model ILIKE $${paramCount}
          OR e.serial_number ILIKE $${paramCount}
          OR c.company_name ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search.trim()}%`);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`r.status = $${paramCount}`);
        queryParams.push(status);
      }

      if (client_id) {
        paramCount++;
        whereConditions.push(`r.client_company_id = $${paramCount}`);
        queryParams.push(client_id);
      }

      if (equipment_type) {
        paramCount++;
        whereConditions.push(`e.equipment_type = $${paramCount}`);
        queryParams.push(equipment_type);
      }

      if (date_from) {
        paramCount++;
        whereConditions.push(`r.start_date >= $${paramCount}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        whereConditions.push(`r.end_date <= $${paramCount}`);
        queryParams.push(date_to);
      }

      if (expiring_soon === 'true') {
        whereConditions.push(`r.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND r.status = 'ACTIVO'`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar sortBy para prevenir SQL injection
      const validSortFields = ['start_date', 'end_date', 'status', 'monthly_rate', 'created_at'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'start_date';
      const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Query principal con información completa
      const rentalsQuery = `
        SELECT 
          r.rental_id,
          r.equipment_id,
          r.client_company_id,
          r.provider_company_id,
          r.start_date,
          r.end_date,
          r.monthly_rate,
          r.total_amount,
          r.deposit_amount,
          r.status,
          r.contract_terms,
          r.notes,
          r.created_at,
          r.updated_at,
          -- Información del equipo
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          e.status as equipment_status,
          -- Información del cliente
          c.company_name as client_name,
          c.contact_phone as client_phone,
          c.contact_email as client_email,
          c.address as client_address,
          -- Ubicación del equipo
          el.location_name,
          el.address as equipment_location,
          -- Cálculos
          EXTRACT(EPOCH FROM (r.end_date - r.start_date))/2592000 as duration_months,
          EXTRACT(EPOCH FROM (r.end_date - NOW()))/86400 as days_until_expiry,
          CASE 
            WHEN r.end_date < NOW() AND r.status = 'ACTIVO' THEN true 
            ELSE false 
          END as is_expired,
          CASE 
            WHEN r.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND r.status = 'ACTIVO' THEN true 
            ELSE false 
          END as expires_soon,
          -- Pagos y facturación
          (SELECT COUNT(*) FROM rental_payments WHERE rental_id = r.rental_id) as total_payments,
          (SELECT SUM(amount) FROM rental_payments WHERE rental_id = r.rental_id AND status = 'PAGADO') as total_paid,
          (SELECT COUNT(*) FROM rental_payments WHERE rental_id = r.rental_id AND status = 'PENDIENTE') as pending_payments
        FROM rentals r
        INNER JOIN equipments e ON r.equipment_id = e.equipment_id
        INNER JOIN companies c ON r.client_company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
        ORDER BY r.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM rentals r
        INNER JOIN equipments e ON r.equipment_id = e.equipment_id
        INNER JOIN companies c ON r.client_company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        ${whereClause}
      `;

      const [rentalsResult, countResult] = await Promise.all([
        pool.query(rentalsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const rentals = rentalsResult.rows;
      const totalRentals = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRentals / limit);

      // Estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_rentals,
          COUNT(CASE WHEN r.status = 'ACTIVO' THEN 1 END) as active_rentals,
          COUNT(CASE WHEN r.status = 'COMPLETADO' THEN 1 END) as completed_rentals,
          COUNT(CASE WHEN r.status = 'CANCELADO' THEN 1 END) as cancelled_rentals,
          COUNT(CASE WHEN r.end_date < NOW() AND r.status = 'ACTIVO' THEN 1 END) as expired_rentals,
          COUNT(CASE WHEN r.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND r.status = 'ACTIVO' THEN 1 END) as expiring_soon,
          SUM(r.monthly_rate) as total_monthly_revenue,
          SUM(r.total_amount) as total_contracted_revenue,
          AVG(r.monthly_rate) as average_monthly_rate,
          COUNT(DISTINCT r.client_company_id) as unique_clients,
          COUNT(DISTINCT r.equipment_id) as rented_equipments,
          SUM(CASE WHEN rp.status = 'PAGADO' THEN rp.amount ELSE 0 END) as total_payments_received
        FROM rentals r
        LEFT JOIN rental_payments rp ON r.rental_id = rp.rental_id
        WHERE r.provider_company_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [providerCompanyId]);
      const stats = statsResult.rows[0];

      return ResponseHandler.success(res, 'Rentas obtenidas exitosamente', {
        rentals,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRentals,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        stats: {
          totalRentals: parseInt(stats.total_rentals) || 0,
          activeRentals: parseInt(stats.active_rentals) || 0,
          completedRentals: parseInt(stats.completed_rentals) || 0,
          cancelledRentals: parseInt(stats.cancelled_rentals) || 0,
          expiredRentals: parseInt(stats.expired_rentals) || 0,
          expiringSoon: parseInt(stats.expiring_soon) || 0,
          totalMonthlyRevenue: parseFloat(stats.total_monthly_revenue) || 0,
          totalContractedRevenue: parseFloat(stats.total_contracted_revenue) || 0,
          averageMonthlyRate: parseFloat(stats.average_monthly_rate) || 0,
          uniqueClients: parseInt(stats.unique_clients) || 0,
          rentedEquipments: parseInt(stats.rented_equipments) || 0,
          totalPaymentsReceived: parseFloat(stats.total_payments_received) || 0
        },
        filters: {
          search,
          status,
          client_id,
          equipment_type,
          date_from,
          date_to,
          expiring_soon,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        }
      });

    } catch (error) {
      console.error('Error en getRentals:', error);
      return ResponseHandler.error(res, 'Error al obtener rentas', 'FETCH_RENTALS_ERROR');
    }
  }

  // POST /api/provider/rentals - Crear nueva renta
  async createRental(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const providerCompanyId = req.user.company_id;
      const {
        equipment_id,
        client_company_id,
        start_date,
        end_date,
        monthly_rate,
        deposit_amount,
        contract_terms,
        notes,
        payment_schedule = 'MENSUAL' // MENSUAL, TRIMESTRAL, SEMESTRAL, ANUAL
      } = req.body;

      // Validaciones
      if (!equipment_id || !client_company_id || !start_date || !end_date || !monthly_rate) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Campos requeridos: equipment_id, client_company_id, start_date, end_date, monthly_rate', 'VALIDATION_ERROR');
      }

      // Verificar que las fechas sean válidas
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      if (endDate <= startDate) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'La fecha de fin debe ser posterior a la fecha de inicio', 'INVALID_DATE_RANGE');
      }

      // Verificar que el equipo existe y pertenece al proveedor
      const equipmentQuery = `
        SELECT e.*, c.company_name as owner_name
        FROM equipments e
        LEFT JOIN companies c ON e.company_id = c.company_id
        WHERE e.equipment_id = $1 AND (
          e.provider_company_id = $2 OR 
          e.company_id IN (SELECT company_id FROM companies WHERE company_type = 'PROVEEDOR' AND company_id = $2)
        )
      `;

      const equipmentResult = await client.query(equipmentQuery, [equipment_id, providerCompanyId]);
      
      if (equipmentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Equipo no encontrado o no disponible para renta', 'EQUIPMENT_NOT_AVAILABLE');
      }

      const equipment = equipmentResult.rows[0];

      // Verificar que el equipo no esté ya rentado en ese período
      const conflictQuery = `
        SELECT rental_id, start_date, end_date
        FROM rentals 
        WHERE equipment_id = $1 
        AND status IN ('ACTIVO', 'PENDIENTE')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      `;

      const conflictResult = await client.query(conflictQuery, [equipment_id, start_date, end_date]);
      
      if (conflictResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'El equipo ya tiene una renta activa en ese período', 'EQUIPMENT_ALREADY_RENTED');
      }

      // Verificar que el cliente existe
      const clientQuery = `
        SELECT company_id, company_name, contact_email
        FROM companies 
        WHERE company_id = $1 AND company_type = 'CLIENTE'
      `;

      const clientResult = await client.query(clientQuery, [client_company_id]);
      
      if (clientResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Cliente no encontrado', 'CLIENT_NOT_FOUND');
      }

      // Calcular duración en meses y monto total
      const durationMonths = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
      const totalAmount = monthly_rate * durationMonths;

      // Crear la renta
      const insertRentalQuery = `
        INSERT INTO rentals (
          equipment_id,
          client_company_id,
          provider_company_id,
          start_date,
          end_date,
          monthly_rate,
          total_amount,
          deposit_amount,
          status,
          contract_terms,
          notes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;

      const rentalValues = [
        equipment_id,
        client_company_id,
        providerCompanyId,
        start_date,
        end_date,
        monthly_rate,
        totalAmount,
        deposit_amount || 0,
        'ACTIVO',
        contract_terms,
        notes
      ];

      const rentalResult = await client.query(insertRentalQuery, rentalValues);
      const newRental = rentalResult.rows[0];

      // Crear cronograma de pagos según la frecuencia
      if (payment_schedule) {
        await this.createPaymentSchedule(client, newRental.rental_id, {
          start_date: startDate,
          end_date: endDate,
          monthly_rate,
          payment_schedule,
          deposit_amount
        });
      }

      // Actualizar estado del equipo si es necesario
      await client.query(
        'UPDATE equipments SET status = $1, updated_at = NOW() WHERE equipment_id = $2',
        ['RENTADO', equipment_id]
      );

      // Obtener la renta creada con información completa
      const fullRentalQuery = `
        SELECT 
          r.*,
          e.equipment_name,
          e.equipment_type,
          e.model,
          c.company_name as client_name,
          c.contact_phone as client_phone,
          c.contact_email as client_email
        FROM rentals r
        INNER JOIN equipments e ON r.equipment_id = e.equipment_id
        INNER JOIN companies c ON r.client_company_id = c.company_id
        WHERE r.rental_id = $1
      `;

      const fullRentalResult = await client.query(fullRentalQuery, [newRental.rental_id]);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Renta creada exitosamente', {
        rental: fullRentalResult.rows[0],
        paymentScheduleCreated: payment_schedule ? true : false
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en createRental:', error);
      return ResponseHandler.error(res, 'Error al crear renta', 'CREATE_RENTAL_ERROR');
    } finally {
      client.release();
    }
  }

  // Función auxiliar para crear cronograma de pagos
  async createPaymentSchedule(client, rentalId, scheduleData) {
    const { start_date, end_date, monthly_rate, payment_schedule, deposit_amount } = scheduleData;
    
    // Intervalos según frecuencia
    const intervals = {
      'MENSUAL': 1,
      'TRIMESTRAL': 3,
      'SEMESTRAL': 6,
      'ANUAL': 12
    };

    const monthsInterval = intervals[payment_schedule] || 1;
    const paymentAmount = monthly_rate * monthsInterval;
    
    let currentDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    // Crear depósito si existe
    if (deposit_amount > 0) {
      await client.query(`
        INSERT INTO rental_payments (rental_id, payment_date, amount, payment_type, status, created_at)
        VALUES ($1, $2, $3, 'DEPOSITO', 'PENDIENTE', NOW())
      `, [rentalId, start_date, deposit_amount]);
    }
    
    // Crear pagos periódicos
    while (currentDate < endDate) {
      await client.query(`
        INSERT INTO rental_payments (rental_id, payment_date, amount, payment_type, status, created_at)
        VALUES ($1, $2, $3, 'RENTA', 'PENDIENTE', NOW())
      `, [rentalId, currentDate.toISOString(), paymentAmount]);
      
      currentDate.setMonth(currentDate.getMonth() + monthsInterval);
    }
  }

  // GET /api/provider/rentals/:id - Detalles de renta específica
  async getRentalDetails(req, res) {
    try {
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;

      // Obtener detalles completos de la renta
      const rentalQuery = `
        SELECT 
          r.*,
          e.equipment_name,
          e.equipment_type,
          e.model,
          e.serial_number,
          e.status as equipment_status,
          c.company_name as client_name,
          c.contact_phone as client_phone,
          c.contact_email as client_email,
          c.address as client_address,
          el.location_name,
          el.address as equipment_location,
          -- Cálculos
          EXTRACT(EPOCH FROM (r.end_date - r.start_date))/2592000 as duration_months,
          EXTRACT(EPOCH FROM (r.end_date - NOW()))/86400 as days_until_expiry,
          CASE 
            WHEN r.end_date < NOW() AND r.status = 'ACTIVO' THEN true 
            ELSE false 
          END as is_expired,
          -- Estadísticas de pagos
          (SELECT COUNT(*) FROM rental_payments WHERE rental_id = r.rental_id) as total_payments_scheduled,
          (SELECT COUNT(*) FROM rental_payments WHERE rental_id = r.rental_id AND status = 'PAGADO') as payments_completed,
          (SELECT COUNT(*) FROM rental_payments WHERE rental_id = r.rental_id AND status = 'PENDIENTE') as payments_pending,
          (SELECT SUM(amount) FROM rental_payments WHERE rental_id = r.rental_id AND status = 'PAGADO') as total_paid,
          (SELECT SUM(amount) FROM rental_payments WHERE rental_id = r.rental_id AND status = 'PENDIENTE') as total_pending
        FROM rentals r
        INNER JOIN equipments e ON r.equipment_id = e.equipment_id
        INNER JOIN companies c ON r.client_company_id = c.company_id
        LEFT JOIN equipment_locations el ON e.location_id = el.location_id
        WHERE r.rental_id = $1 AND r.provider_company_id = $2
      `;

      const rentalResult = await pool.query(rentalQuery, [id, providerCompanyId]);
      
      if (rentalResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Renta no encontrada', 'RENTAL_NOT_FOUND');
      }

      const rental = rentalResult.rows[0];

      // Obtener cronograma de pagos
      const paymentsQuery = `
        SELECT 
          payment_id,
          payment_date,
          amount,
          payment_type,
          status,
          paid_date,
          payment_method,
          transaction_reference,
          notes
        FROM rental_payments
        WHERE rental_id = $1
        ORDER BY payment_date ASC
      `;

      const paymentsResult = await pool.query(paymentsQuery, [id]);

      // Obtener historial de servicios del equipo durante la renta
      const servicesQuery = `
        SELECT 
          sr.request_id,
          sr.request_type,
          sr.priority,
          sr.status,
          sr.description,
          sr.created_at,
          sr.actual_cost,
          u.first_name,
          u.last_name
        FROM service_requests sr
        LEFT JOIN users u ON sr.provider_user_id = u.user_id
        WHERE sr.equipment_id = $1 
        AND sr.created_at BETWEEN $2 AND COALESCE($3, NOW())
        ORDER BY sr.created_at DESC
      `;

      const servicesResult = await pool.query(servicesQuery, [
        rental.equipment_id,
        rental.start_date,
        rental.status === 'COMPLETADO' ? rental.updated_at : new Date()
      ]);

      return ResponseHandler.success(res, 'Detalles de la renta obtenidos exitosamente', {
        rental,
        payments: paymentsResult.rows,
        services: servicesResult.rows
      });

    } catch (error) {
      console.error('Error en getRentalDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de la renta', 'FETCH_RENTAL_DETAILS_ERROR');
    }
  }

  // PUT /api/provider/rentals/:id - Actualizar renta
  async updateRental(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;
      const updates = req.body;

      // Verificar acceso a la renta
      const rentalQuery = `
        SELECT r.*, e.equipment_name, c.company_name
        FROM rentals r
        INNER JOIN equipments e ON r.equipment_id = e.equipment_id
        INNER JOIN companies c ON r.client_company_id = c.company_id
        WHERE r.rental_id = $1 AND r.provider_company_id = $2
      `;

      const rentalResult = await client.query(rentalQuery, [id, providerCompanyId]);
      
      if (rentalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Renta no encontrada', 'RENTAL_NOT_FOUND');
      }

      const currentRental = rentalResult.rows[0];

      // Campos permitidos para actualizar
      const allowedFields = [
        'end_date', 'monthly_rate', 'deposit_amount', 'status', 
        'contract_terms', 'notes'
      ];

      // Construir query dinámico
      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field) && updates[field] !== undefined) {
          fieldsToUpdate.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
          paramCount++;
        }
      });

      if (fieldsToUpdate.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'No hay campos válidos para actualizar', 'NO_VALID_FIELDS');
      }

      // Validaciones específicas
      if (updates.end_date) {
        const newEndDate = new Date(updates.end_date);
        const startDate = new Date(currentRental.start_date);
        
        if (newEndDate <= startDate) {
          await client.query('ROLLBACK');
          return ResponseHandler.error(res, 'La nueva fecha de fin debe ser posterior a la fecha de inicio', 'INVALID_END_DATE');
        }

        // Recalcular total si cambia la fecha de fin y/o la tarifa mensual
        const newMonthlyRate = updates.monthly_rate || currentRental.monthly_rate;
        const newDurationMonths = Math.ceil((newEndDate - startDate) / (1000 * 60 * 60 * 24 * 30));
        const newTotalAmount = newMonthlyRate * newDurationMonths;
        
        fieldsToUpdate.push(`total_amount = $${paramCount}`);
        values.push(newTotalAmount);
        paramCount++;
      }

      // Si se completa/cancela, actualizar estado del equipo
      if (updates.status === 'COMPLETADO' || updates.status === 'CANCELADO') {
        await client.query(
          'UPDATE equipments SET status = $1, updated_at = NOW() WHERE equipment_id = $2',
          ['DISPONIBLE', currentRental.equipment_id]
        );
      }

      // Agregar updated_at
      fieldsToUpdate.push(`updated_at = NOW()`);
      
      // Construir y ejecutar query
      values.push(id);
      const updateQuery = `
        UPDATE rentals 
        SET ${fieldsToUpdate.join(', ')}
        WHERE rental_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      
      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Renta actualizada exitosamente', {
        rental: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en updateRental:', error);
      return ResponseHandler.error(res, 'Error al actualizar renta', 'UPDATE_RENTAL_ERROR');
    } finally {
      client.release();
    }
  }

  // DELETE /api/provider/rentals/:id - Cancelar renta
  async deleteRental(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const providerCompanyId = req.user.company_id;

      // Verificar acceso y que pueda ser cancelada
      const rentalQuery = `
        SELECT r.*, e.equipment_name, c.company_name
        FROM rentals r
        INNER JOIN equipments e ON r.equipment_id = e.equipment_id
        INNER JOIN companies c ON r.client_company_id = c.company_id
        WHERE r.rental_id = $1 
        AND r.provider_company_id = $2 
        AND r.status IN ('ACTIVO', 'PENDIENTE')
      `;

      const rentalResult = await client.query(rentalQuery, [id, providerCompanyId]);
      
      if (rentalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Renta no encontrada o no se puede cancelar', 'RENTAL_NOT_FOUND_OR_NOT_CANCELLABLE');
      }

      const rental = rentalResult.rows[0];

      // Cancelar la renta
      const cancelQuery = `
        UPDATE rentals 
        SET status = 'CANCELADO', updated_at = NOW()
        WHERE rental_id = $1
        RETURNING *
      `;

      const cancelResult = await client.query(cancelQuery, [id]);

      // Actualizar estado del equipo
      await client.query(
        'UPDATE equipments SET status = $1, updated_at = NOW() WHERE equipment_id = $2',
        ['DISPONIBLE', rental.equipment_id]
      );

      // Cancelar pagos pendientes
      await client.query(`
        UPDATE rental_payments 
        SET status = 'CANCELADO', updated_at = NOW() 
        WHERE rental_id = $1 AND status = 'PENDIENTE'
      `, [id]);

      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Renta cancelada exitosamente', {
        rental: cancelResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en deleteRental:', error);
      return ResponseHandler.error(res, 'Error al cancelar renta', 'DELETE_RENTAL_ERROR');
    } finally {
      client.release();
    }
  }

  // POST /api/provider/rentals/:id/extend - Extender renta
  async extendRental(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { new_end_date, additional_terms } = req.body;
      const providerCompanyId = req.user.company_id;

      if (!new_end_date) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Se requiere la nueva fecha de fin', 'NEW_END_DATE_REQUIRED');
      }

      // Verificar que la renta existe y está activa
      const rentalQuery = `
        SELECT r.*, e.equipment_name, c.company_name
        FROM rentals r
        INNER JOIN equipments e ON r.equipment_id = e.equipment_id
        INNER JOIN companies c ON r.client_company_id = c.company_id
        WHERE r.rental_id = $1 
        AND r.provider_company_id = $2 
        AND r.status = 'ACTIVO'
      `;

      const rentalResult = await client.query(rentalQuery, [id, providerCompanyId]);
      
      if (rentalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'Renta no encontrada o no está activa', 'RENTAL_NOT_FOUND_OR_NOT_ACTIVE');
      }

      const rental = rentalResult.rows[0];
      const currentEndDate = new Date(rental.end_date);
      const newEndDate = new Date(new_end_date);

      if (newEndDate <= currentEndDate) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'La nueva fecha debe ser posterior a la fecha actual de fin', 'INVALID_EXTENSION_DATE');
      }

      // Verificar que el equipo no tenga conflictos en el nuevo período
      const conflictQuery = `
        SELECT rental_id
        FROM rentals 
        WHERE equipment_id = $1 
        AND rental_id != $2
        AND status IN ('ACTIVO', 'PENDIENTE')
        AND start_date <= $3 AND end_date >= $4
      `;

      const conflictResult = await client.query(conflictQuery, [
        rental.equipment_id, 
        id,
        new_end_date,
        rental.end_date
      ]);

      if (conflictResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return ResponseHandler.error(res, 'El equipo ya tiene otra renta programada en el período de extensión', 'EXTENSION_CONFLICT');
      }

      // Calcular nuevos montos
      const additionalMonths = Math.ceil((newEndDate - currentEndDate) / (1000 * 60 * 60 * 24 * 30));
      const additionalAmount = rental.monthly_rate * additionalMonths;
      const newTotalAmount = parseFloat(rental.total_amount) + additionalAmount;

      // Extender la renta
      const extendQuery = `
        UPDATE rentals 
        SET 
          end_date = $1,
          total_amount = $2,
          contract_terms = CASE 
            WHEN $3 IS NOT NULL THEN COALESCE(contract_terms, '') || '\n\nExtensión: ' || $3
            ELSE contract_terms
          END,
          notes = COALESCE(notes, '') || '\n\nRenta extendida hasta ' || $1 || ' - Monto adicional: $' || $4,
          updated_at = NOW()
        WHERE rental_id = $5
        RETURNING *
      `;

      const extendResult = await client.query(extendQuery, [
        new_end_date,
        newTotalAmount,
        additional_terms,
        additionalAmount,
        id
      ]);

      // Crear pagos adicionales para el período extendido
      const paymentsQuery = `
        SELECT payment_date FROM rental_payments 
        WHERE rental_id = $1 
        ORDER BY payment_date DESC 
        LIMIT 1
      `;
      
      const lastPaymentResult = await client.query(paymentsQuery, [id]);
      
      if (lastPaymentResult.rows.length > 0) {
        const lastPaymentDate = new Date(lastPaymentResult.rows[0].payment_date);
        let nextPaymentDate = new Date(lastPaymentDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

        // Crear pagos para los meses adicionales
        while (nextPaymentDate <= newEndDate) {
          await client.query(`
            INSERT INTO rental_payments (rental_id, payment_date, amount, payment_type, status, created_at)
            VALUES ($1, $2, $3, 'RENTA_EXTENSION', 'PENDIENTE', NOW())
          `, [id, nextPaymentDate.toISOString(), rental.monthly_rate]);
          
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        }
      }

      await client.query('COMMIT');

      return ResponseHandler.success(res, 'Renta extendida exitosamente', {
        rental: extendResult.rows[0],
        extension: {
          additionalMonths,
          additionalAmount,
          newTotalAmount,
          originalEndDate: rental.end_date,
          newEndDate: new_end_date
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en extendRental:', error);
      return ResponseHandler.error(res, 'Error al extender renta', 'EXTEND_RENTAL_ERROR');
    } finally {
      client.release();
    }
  }
}

module.exports = new ProviderRentalsController();
