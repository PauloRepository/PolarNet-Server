const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class RentalsController {
  // GET /api/provider/rentals - Obtener contratos de arriendo
  async getRentals(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        clientId, 
        equipmentType,
        startDate,
        endDate 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE ar.provider_company_id = $1`;
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND ar.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (clientId) {
        whereClause += ` AND ar.client_company_id = $${++paramCount}`;
        queryParams.push(clientId);
      }

      if (equipmentType) {
        whereClause += ` AND e.type = $${++paramCount}`;
        queryParams.push(equipmentType);
      }

      if (startDate) {
        whereClause += ` AND ar.start_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND ar.start_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      const query = `
        SELECT 
          ar.*,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number as equipment_serial,
          el.name as location_name,
          el.address as location_address,
          COUNT(sr.service_request_id) as service_requests_count
        FROM active_rentals ar
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        LEFT JOIN service_requests sr ON ar.rental_id = sr.rental_id
        ${whereClause}
        GROUP BY ar.rental_id, c.company_id, e.equipment_id, el.equipment_location_id
        ORDER BY ar.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT ar.rental_id) as total
        FROM active_rentals ar
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalRentals = parseInt(countResult.rows[0].total);

      const rentals = result.rows.map(rental => ({
        rentalId: rental.rental_id.toString(),
        client: {
          companyId: rental.client_company_id.toString(),
          name: rental.client_name,
          phone: rental.client_phone,
          email: rental.client_email
        },
        equipment: {
          equipmentId: rental.equipment_id.toString(),
          name: rental.equipment_name,
          type: rental.equipment_type,
          model: rental.equipment_model,
          serialNumber: rental.equipment_serial
        },
        location: {
          name: rental.location_name,
          address: rental.location_address
        },
        monthlyRate: parseFloat(rental.monthly_rate),
        depositAmount: rental.deposit_amount ? parseFloat(rental.deposit_amount) : null,
        startDate: rental.start_date,
        endDate: rental.end_date,
        status: rental.status,
        serviceRequestsCount: parseInt(rental.service_requests_count),
        contractTerms: rental.contract_terms,
        createdAt: rental.created_at
      }));

      return ResponseHandler.success(res, {
        rentals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRentals,
          totalPages: Math.ceil(totalRentals / limit)
        }
      }, 'Contratos de arriendo obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getRentals:', error);
      return ResponseHandler.error(res, 'Error al obtener contratos', 'GET_RENTALS_ERROR', 500);
    }
  }

  // GET /api/provider/rentals/:id - Obtener detalles de un contrato
  async getRentalDetails(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      const rentalQuery = `
        SELECT 
          ar.*,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email,
          c.address as client_address,
          c.tax_id as client_tax_id,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.brand as equipment_brand,
          e.serial_number as equipment_serial,
          e.specifications as equipment_specs,
          el.name as location_name,
          el.address as location_address,
          el.contact_person as location_contact,
          el.contact_phone as location_phone
        FROM active_rentals ar
        LEFT JOIN companies c ON ar.client_company_id = c.company_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN equipment_locations el ON e.current_location_id = el.equipment_location_id
        WHERE ar.rental_id = $1 AND ar.provider_company_id = $2
      `;

      const rentalResult = await db.query(rentalQuery, [id, providerCompanyId]);

      if (rentalResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Contrato no encontrado', 'RENTAL_NOT_FOUND', 404);
      }

      const rental = rentalResult.rows[0];

      // Obtener facturas relacionadas
      const invoicesQuery = `
        SELECT 
          i.*
        FROM invoices i
        WHERE i.rental_id = $1
        ORDER BY i.created_at DESC
      `;

      const invoicesResult = await db.query(invoicesQuery, [id]);

      // Obtener solicitudes de servicio relacionadas
      const serviceRequestsQuery = `
        SELECT 
          sr.*,
          u.first_name || ' ' || u.last_name as technician_name
        FROM service_requests sr
        LEFT JOIN users u ON sr.assigned_technician_id = u.user_id
        WHERE sr.equipment_id = $1 
          AND sr.client_company_id = $2
          AND sr.provider_company_id = $3
        ORDER BY sr.created_at DESC
        LIMIT 10
      `;

      const serviceRequestsResult = await db.query(serviceRequestsQuery, [
        rental.equipment_id, 
        rental.client_company_id, 
        providerCompanyId
      ]);

      return ResponseHandler.success(res, {
        rental: {
          rentalId: rental.rental_id.toString(),
          client: {
            companyId: rental.client_company_id.toString(),
            name: rental.client_name,
            phone: rental.client_phone,
            email: rental.client_email,
            address: rental.client_address,
            taxId: rental.client_tax_id
          },
          equipment: {
            equipmentId: rental.equipment_id.toString(),
            name: rental.equipment_name,
            type: rental.equipment_type,
            model: rental.equipment_model,
            brand: rental.equipment_brand,
            serialNumber: rental.equipment_serial,
            specifications: rental.equipment_specs
          },
          location: {
            name: rental.location_name,
            address: rental.location_address,
            contactPerson: rental.location_contact,
            contactPhone: rental.location_phone
          },
          monthlyRate: parseFloat(rental.monthly_rate),
          depositAmount: rental.deposit_amount ? parseFloat(rental.deposit_amount) : null,
          startDate: rental.start_date,
          endDate: rental.end_date,
          status: rental.status,
          contractTerms: rental.contract_terms,
          notes: rental.notes,
          createdAt: rental.created_at,
          updatedAt: rental.updated_at
        },
        invoices: invoicesResult.rows.map(invoice => ({
          invoiceId: invoice.invoice_id.toString(),
          invoiceNumber: invoice.invoice_number,
          amount: parseFloat(invoice.total_amount),
          status: invoice.status,
          dueDate: invoice.due_date,
          createdAt: invoice.created_at
        })),
        serviceRequests: serviceRequestsResult.rows.map(sr => ({
          requestId: sr.service_request_id.toString(),
          type: sr.request_type,
          priority: sr.priority,
          status: sr.status,
          description: sr.description,
          technicianName: sr.technician_name,
          createdAt: sr.created_at,
          completedAt: sr.completed_at
        }))
      }, 'Detalles del contrato obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getRentalDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles del contrato', 'GET_RENTAL_DETAILS_ERROR', 500);
    }
  }

  // POST /api/provider/rentals - Crear nuevo contrato
  async createRental(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const {
        clientCompanyId,
        equipmentId,
        monthlyRate,
        depositAmount,
        startDate,
        endDate,
        contractTerms,
        notes
      } = req.body;

      // Verificar que el equipo pertenece al proveedor y está disponible
      const equipmentCheck = await db.query(`
        SELECT e.equipment_id, e.name 
        FROM equipments e
        LEFT JOIN active_rentals ar ON e.equipment_id = ar.equipment_id AND ar.status = 'ACTIVE'
        WHERE e.equipment_id = $1 AND e.owner_company_id = $2 AND ar.rental_id IS NULL
      `, [equipmentId, providerCompanyId]);

      if (equipmentCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Equipo no disponible o no encontrado', 'EQUIPMENT_NOT_AVAILABLE', 400);
      }

      // Verificar que el cliente existe
      const clientCheck = await db.query(
        'SELECT company_id FROM companies WHERE company_id = $1 AND type = $2',
        [clientCompanyId, 'CLIENT']
      );

      if (clientCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Cliente no encontrado', 'CLIENT_NOT_FOUND', 404);
      }

      const insertQuery = `
        INSERT INTO active_rentals (
          client_company_id, provider_company_id, equipment_id,
          monthly_rate, deposit_amount, start_date, end_date,
          contract_terms, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
        RETURNING *
      `;

      const values = [
        clientCompanyId, providerCompanyId, equipmentId,
        monthlyRate, depositAmount, startDate, endDate,
        contractTerms, notes
      ];

      const result = await db.query(insertQuery, values);

      // Actualizar estado del equipo
      await db.query(
        'UPDATE equipments SET status = $1 WHERE equipment_id = $2',
        ['RENTED', equipmentId]
      );

      return ResponseHandler.success(res, {
        rental: result.rows[0]
      }, 'Contrato creado exitosamente');

    } catch (error) {
      console.error('Error en createRental:', error);
      return ResponseHandler.error(res, 'Error al crear contrato', 'CREATE_RENTAL_ERROR', 500);
    }
  }

  // PUT /api/provider/rentals/:id - Actualizar contrato
  async updateRental(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const {
        monthlyRate,
        endDate,
        contractTerms,
        notes
      } = req.body;

      const updateQuery = `
        UPDATE active_rentals SET
          monthly_rate = COALESCE($1, monthly_rate),
          end_date = COALESCE($2, end_date),
          contract_terms = COALESCE($3, contract_terms),
          notes = COALESCE($4, notes),
          updated_at = NOW()
        WHERE rental_id = $5 AND provider_company_id = $6
        RETURNING *
      `;

      const values = [monthlyRate, endDate, contractTerms, notes, id, providerCompanyId];

      const result = await db.query(updateQuery, values);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Contrato no encontrado', 'RENTAL_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        rental: result.rows[0]
      }, 'Contrato actualizado exitosamente');

    } catch (error) {
      console.error('Error en updateRental:', error);
      return ResponseHandler.error(res, 'Error al actualizar contrato', 'UPDATE_RENTAL_ERROR', 500);
    }
  }

  // PUT /api/provider/rentals/:id/terminate - Terminar contrato
  async terminateRental(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const { reason, notes } = req.body;

      // Obtener datos del contrato antes de terminarlo
      const rentalCheck = await db.query(
        'SELECT equipment_id, status FROM active_rentals WHERE rental_id = $1 AND provider_company_id = $2',
        [id, providerCompanyId]
      );

      if (rentalCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Contrato no encontrado', 'RENTAL_NOT_FOUND', 404);
      }

      if (rentalCheck.rows[0].status === 'TERMINATED') {
        return ResponseHandler.error(res, 'El contrato ya está terminado', 'RENTAL_ALREADY_TERMINATED', 400);
      }

      const equipmentId = rentalCheck.rows[0].equipment_id;

      // Actualizar contrato
      const updateQuery = `
        UPDATE active_rentals SET
          status = 'TERMINATED',
          end_date = CURRENT_DATE,
          notes = COALESCE(notes || E'\\n\\n', '') || $1,
          updated_at = NOW()
        WHERE rental_id = $2 AND provider_company_id = $3
        RETURNING *
      `;

      const terminationNote = `Contrato terminado: ${new Date().toISOString()}\nRazón: ${reason}\nNotas: ${notes || ''}`;

      const result = await db.query(updateQuery, [terminationNote, id, providerCompanyId]);

      // Actualizar estado del equipo
      await db.query(
        'UPDATE equipments SET status = $1 WHERE equipment_id = $2',
        ['AVAILABLE', equipmentId]
      );

      return ResponseHandler.success(res, {
        rental: result.rows[0]
      }, 'Contrato terminado exitosamente');

    } catch (error) {
      console.error('Error en terminateRental:', error);
      return ResponseHandler.error(res, 'Error al terminar contrato', 'TERMINATE_RENTAL_ERROR', 500);
    }
  }

  // GET /api/provider/rentals/:id/payments - Obtener pagos del contrato
  async getRentalPayments(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      // Verificar que el contrato pertenece al proveedor
      const rentalCheck = await db.query(
        'SELECT rental_id FROM active_rentals WHERE rental_id = $1 AND provider_company_id = $2',
        [id, providerCompanyId]
      );

      if (rentalCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Contrato no encontrado', 'RENTAL_NOT_FOUND', 404);
      }

      const paymentsQuery = `
        SELECT 
          i.*,
          p.payment_id,
          p.payment_amount,
          p.payment_date,
          p.payment_method,
          p.reference_number as payment_reference
        FROM invoices i
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id
        WHERE i.rental_id = $1
        ORDER BY i.created_at DESC
      `;

      const result = await db.query(paymentsQuery, [id]);

      // Agrupar pagos por factura
      const invoicesMap = new Map();

      result.rows.forEach(row => {
        const invoiceId = row.invoice_id.toString();
        
        if (!invoicesMap.has(invoiceId)) {
          invoicesMap.set(invoiceId, {
            invoiceId,
            invoiceNumber: row.invoice_number,
            amount: parseFloat(row.total_amount),
            status: row.status,
            dueDate: row.due_date,
            createdAt: row.created_at,
            payments: []
          });
        }

        if (row.payment_id) {
          invoicesMap.get(invoiceId).payments.push({
            paymentId: row.payment_id.toString(),
            amount: parseFloat(row.payment_amount),
            date: row.payment_date,
            method: row.payment_method,
            reference: row.payment_reference
          });
        }
      });

      const invoicesWithPayments = Array.from(invoicesMap.values());

      // Calcular totales
      const totalBilled = invoicesWithPayments.reduce((sum, invoice) => sum + invoice.amount, 0);
      const totalPaid = invoicesWithPayments.reduce((sum, invoice) => 
        sum + invoice.payments.reduce((paySum, payment) => paySum + payment.amount, 0), 0
      );

      return ResponseHandler.success(res, {
        invoices: invoicesWithPayments,
        summary: {
          totalBilled,
          totalPaid,
          pendingAmount: totalBilled - totalPaid
        }
      }, 'Pagos del contrato obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getRentalPayments:', error);
      return ResponseHandler.error(res, 'Error al obtener pagos', 'GET_RENTAL_PAYMENTS_ERROR', 500);
    }
  }
}

module.exports = new RentalsController();
