const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');

class InvoicesController {
  // GET /api/provider/invoices - Obtener facturas
  async getInvoices(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        clientId, 
        startDate, 
        endDate,
        overdue = false 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE i.provider_company_id = $1`;
      let queryParams = [providerCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND i.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (clientId) {
        whereClause += ` AND i.client_company_id = $${++paramCount}`;
        queryParams.push(clientId);
      }

      if (startDate) {
        whereClause += ` AND i.created_at >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND i.created_at <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      if (overdue === 'true') {
        whereClause += ` AND i.due_date < CURRENT_DATE AND i.status != 'PAID'`;
      }

      const query = `
        SELECT 
          i.*,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email,
          ar.equipment_id,
          e.name as equipment_name,
          SUM(p.payment_amount) as total_paid
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id
        ${whereClause}
        GROUP BY i.invoice_id, c.company_id, ar.rental_id, e.equipment_id
        ORDER BY i.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT i.invoice_id) as total
        FROM invoices i
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalInvoices = parseInt(countResult.rows[0].total);

      const invoices = result.rows.map(invoice => ({
        invoiceId: invoice.invoice_id.toString(),
        invoiceNumber: invoice.invoice_number,
        client: {
          companyId: invoice.client_company_id.toString(),
          name: invoice.client_name,
          phone: invoice.client_phone,
          email: invoice.client_email
        },
        equipment: invoice.equipment_id ? {
          equipmentId: invoice.equipment_id.toString(),
          name: invoice.equipment_name
        } : null,
        amount: parseFloat(invoice.total_amount),
        totalPaid: parseFloat(invoice.total_paid) || 0,
        pendingAmount: parseFloat(invoice.total_amount) - (parseFloat(invoice.total_paid) || 0),
        status: invoice.status,
        dueDate: invoice.due_date,
        isOverdue: new Date(invoice.due_date) < new Date() && invoice.status !== 'PAID',
        createdAt: invoice.created_at,
        sentAt: invoice.sent_at
      }));

      return ResponseHandler.success(res, {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalInvoices,
          totalPages: Math.ceil(totalInvoices / limit)
        }
      }, 'Facturas obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getInvoices:', error);
      return ResponseHandler.error(res, 'Error al obtener facturas', 'GET_INVOICES_ERROR', 500);
    }
  }

  // GET /api/provider/invoices/:id - Obtener detalles de una factura
  async getInvoiceDetails(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      const invoiceQuery = `
        SELECT 
          i.*,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email,
          c.address as client_address,
          c.tax_id as client_tax_id,
          ar.rental_id,
          ar.monthly_rate,
          ar.start_date as rental_start,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.invoice_id = $1 AND i.provider_company_id = $2
      `;

      const invoiceResult = await db.query(invoiceQuery, [id, providerCompanyId]);

      if (invoiceResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Factura no encontrada', 'INVOICE_NOT_FOUND', 404);
      }

      const invoice = invoiceResult.rows[0];

      // Obtener pagos relacionados
      const paymentsQuery = `
        SELECT *
        FROM payments
        WHERE invoice_id = $1
        ORDER BY payment_date DESC
      `;

      const paymentsResult = await db.query(paymentsQuery, [id]);

      // Obtener items de la factura (si tienes tabla de items)
      const itemsQuery = `
        SELECT *
        FROM invoice_items
        WHERE invoice_id = $1
        ORDER BY item_order ASC
      `;

      let itemsResult = { rows: [] };
      try {
        itemsResult = await db.query(itemsQuery, [id]);
      } catch (itemsError) {
        // La tabla invoice_items puede no existir aún
        console.log('Tabla invoice_items no encontrada, continuando sin items');
      }

      const totalPaid = paymentsResult.rows.reduce((sum, payment) => 
        sum + parseFloat(payment.payment_amount), 0
      );

      return ResponseHandler.success(res, {
        invoice: {
          invoiceId: invoice.invoice_id.toString(),
          invoiceNumber: invoice.invoice_number,
          client: {
            companyId: invoice.client_company_id.toString(),
            name: invoice.client_name,
            phone: invoice.client_phone,
            email: invoice.client_email,
            address: invoice.client_address,
            taxId: invoice.client_tax_id
          },
          rental: invoice.rental_id ? {
            rentalId: invoice.rental_id.toString(),
            monthlyRate: parseFloat(invoice.monthly_rate),
            startDate: invoice.rental_start,
            equipment: {
              name: invoice.equipment_name,
              type: invoice.equipment_type,
              model: invoice.equipment_model
            }
          } : null,
          amount: parseFloat(invoice.total_amount),
          totalPaid,
          pendingAmount: parseFloat(invoice.total_amount) - totalPaid,
          status: invoice.status,
          dueDate: invoice.due_date,
          isOverdue: new Date(invoice.due_date) < new Date() && invoice.status !== 'PAID',
          description: invoice.description,
          notes: invoice.notes,
          createdAt: invoice.created_at,
          sentAt: invoice.sent_at
        },
        items: itemsResult.rows.map(item => ({
          itemId: item.item_id?.toString(),
          description: item.description,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price)
        })),
        payments: paymentsResult.rows.map(payment => ({
          paymentId: payment.payment_id.toString(),
          amount: parseFloat(payment.payment_amount),
          date: payment.payment_date,
          method: payment.payment_method,
          reference: payment.reference_number,
          notes: payment.notes
        }))
      }, 'Detalles de factura obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getInvoiceDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de factura', 'GET_INVOICE_DETAILS_ERROR', 500);
    }
  }

  // POST /api/provider/invoices - Crear nueva factura
  async createInvoice(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const {
        clientCompanyId,
        rentalId,
        amount,
        description,
        dueDate,
        items = [],
        notes
      } = req.body;

      // Verificar que el cliente y rental pertenecen al proveedor
      if (rentalId) {
        const rentalCheck = await db.query(
          'SELECT rental_id FROM active_rentals WHERE rental_id = $1 AND provider_company_id = $2 AND client_company_id = $3',
          [rentalId, providerCompanyId, clientCompanyId]
        );

        if (rentalCheck.rows.length === 0) {
          return ResponseHandler.error(res, 'Contrato no válido', 'INVALID_RENTAL', 400);
        }
      }

      // Generar número de factura
      const invoiceNumberQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_number
        FROM invoices 
        WHERE provider_company_id = $1 
          AND invoice_number ~ '^[A-Z]+-[0-9]+$'
      `;

      const numberResult = await db.query(invoiceNumberQuery, [providerCompanyId]);
      const nextNumber = numberResult.rows[0].next_number;
      const invoiceNumber = `FAC-${nextNumber.toString().padStart(6, '0')}`;

      const insertQuery = `
        INSERT INTO invoices (
          invoice_number, client_company_id, provider_company_id, rental_id,
          total_amount, description, due_date, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
        RETURNING *
      `;

      const values = [
        invoiceNumber, clientCompanyId, providerCompanyId, rentalId,
        amount, description, dueDate, notes
      ];

      const result = await db.query(insertQuery, values);
      const invoiceId = result.rows[0].invoice_id;

      // Agregar items si existen (si tienes tabla de items)
      if (items.length > 0) {
        try {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await db.query(`
              INSERT INTO invoice_items (
                invoice_id, description, quantity, unit_price, total_price, item_order
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              invoiceId,
              item.description,
              item.quantity || 1,
              item.unitPrice,
              item.totalPrice || (item.quantity * item.unitPrice),
              i + 1
            ]);
          }
        } catch (itemsError) {
          console.log('Error al agregar items, tabla invoice_items puede no existir:', itemsError.message);
        }
      }

      return ResponseHandler.success(res, {
        invoice: result.rows[0]
      }, 'Factura creada exitosamente');

    } catch (error) {
      console.error('Error en createInvoice:', error);
      return ResponseHandler.error(res, 'Error al crear factura', 'CREATE_INVOICE_ERROR', 500);
    }
  }

  // PUT /api/provider/invoices/:id - Actualizar factura
  async updateInvoice(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const {
        amount,
        description,
        dueDate,
        notes,
        status
      } = req.body;

      const updateQuery = `
        UPDATE invoices SET
          total_amount = COALESCE($1, total_amount),
          description = COALESCE($2, description),
          due_date = COALESCE($3, due_date),
          notes = COALESCE($4, notes),
          status = COALESCE($5, status),
          updated_at = NOW()
        WHERE invoice_id = $6 AND provider_company_id = $7
        RETURNING *
      `;

      const values = [amount, description, dueDate, notes, status, id, providerCompanyId];

      const result = await db.query(updateQuery, values);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Factura no encontrada', 'INVOICE_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        invoice: result.rows[0]
      }, 'Factura actualizada exitosamente');

    } catch (error) {
      console.error('Error en updateInvoice:', error);
      return ResponseHandler.error(res, 'Error al actualizar factura', 'UPDATE_INVOICE_ERROR', 500);
    }
  }

  // PUT /api/provider/invoices/:id/send - Marcar factura como enviada
  async sendInvoice(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      const updateQuery = `
        UPDATE invoices SET
          status = CASE WHEN status = 'DRAFT' THEN 'PENDING' ELSE status END,
          sent_at = NOW(),
          updated_at = NOW()
        WHERE invoice_id = $1 AND provider_company_id = $2
        RETURNING *
      `;

      const result = await db.query(updateQuery, [id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Factura no encontrada', 'INVOICE_NOT_FOUND', 404);
      }

      // Aquí podrías agregar lógica para enviar email al cliente
      // await sendInvoiceEmail(result.rows[0]);

      return ResponseHandler.success(res, {
        invoice: result.rows[0]
      }, 'Factura enviada exitosamente');

    } catch (error) {
      console.error('Error en sendInvoice:', error);
      return ResponseHandler.error(res, 'Error al enviar factura', 'SEND_INVOICE_ERROR', 500);
    }
  }

  // GET /api/provider/invoices/stats - Estadísticas de facturación
  async getInvoiceStats(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { period = '30' } = req.query; // days

      const statsQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_invoices,
          SUM(total_amount) as total_billed,
          SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as total_collected,
          SUM(CASE WHEN status = 'PENDING' OR status = 'OVERDUE' THEN total_amount ELSE 0 END) as total_pending
        FROM invoices
        WHERE provider_company_id = $1 
          AND created_at >= CURRENT_DATE - interval '${period} days'
      `;

      const statsResult = await db.query(statsQuery, [providerCompanyId]);
      const stats = statsResult.rows[0];

      // Facturación por mes
      const monthlyQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as invoice_count,
          SUM(total_amount) as total_amount
        FROM invoices
        WHERE provider_company_id = $1 
          AND created_at >= CURRENT_DATE - interval '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `;

      const monthlyResult = await db.query(monthlyQuery, [providerCompanyId]);

      // Top clientes por facturación
      const topClientsQuery = `
        SELECT 
          c.name as client_name,
          c.company_id,
          COUNT(i.invoice_id) as invoice_count,
          SUM(i.total_amount) as total_billed
        FROM companies c
        INNER JOIN invoices i ON c.company_id = i.client_company_id
        WHERE i.provider_company_id = $1 
          AND i.created_at >= CURRENT_DATE - interval '${period} days'
        GROUP BY c.company_id, c.name
        ORDER BY total_billed DESC
        LIMIT 5
      `;

      const topClientsResult = await db.query(topClientsQuery, [providerCompanyId]);

      return ResponseHandler.success(res, {
        stats: {
          totalInvoices: parseInt(stats.total_invoices),
          pendingInvoices: parseInt(stats.pending_invoices),
          paidInvoices: parseInt(stats.paid_invoices),
          overdueInvoices: parseInt(stats.overdue_invoices),
          totalBilled: parseFloat(stats.total_billed) || 0,
          totalCollected: parseFloat(stats.total_collected) || 0,
          totalPending: parseFloat(stats.total_pending) || 0,
          collectionRate: stats.total_billed > 0 
            ? ((stats.total_collected / stats.total_billed) * 100).toFixed(1) 
            : '0.0'
        },
        monthlyBilling: monthlyResult.rows.map(row => ({
          month: row.month,
          invoiceCount: parseInt(row.invoice_count),
          totalAmount: parseFloat(row.total_amount)
        })),
        topClients: topClientsResult.rows.map(row => ({
          clientId: row.company_id.toString(),
          name: row.client_name,
          invoiceCount: parseInt(row.invoice_count),
          totalBilled: parseFloat(row.total_billed)
        })),
        period: parseInt(period)
      }, 'Estadísticas de facturación obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getInvoiceStats:', error);
      return ResponseHandler.error(res, 'Error al obtener estadísticas', 'GET_INVOICE_STATS_ERROR', 500);
    }
  }
}

module.exports = new InvoicesController();
