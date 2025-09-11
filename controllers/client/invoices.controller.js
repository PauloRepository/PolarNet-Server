const ResponseHandler = require('../../helpers/responseHandler');
const db = require('../../lib/database');

class InvoicesController {
  // GET /api/client/invoices - Obtener facturas
  async getInvoices(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        startDate, 
        endDate,
        rentalId,
        search 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE i.client_company_id = $1`;
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND i.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (rentalId) {
        whereClause += ` AND i.rental_id = $${++paramCount}`;
        queryParams.push(rentalId);
      }

      if (startDate) {
        whereClause += ` AND i.invoice_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND i.invoice_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      if (search) {
        whereClause += ` AND (i.invoice_number ILIKE $${++paramCount} OR i.description ILIKE $${++paramCount})`;
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const query = `
        SELECT 
          i.*,
          ar.rental_id,
          e.name as equipment_name,
          e.type as equipment_type,
          provider.name as provider_name,
          provider.email as provider_email,
          provider.phone as provider_phone,
          -- Calcular días de vencimiento
          EXTRACT(days FROM (CURRENT_DATE - i.due_date)) as days_overdue,
          -- Obtener total pagado
          COALESCE(SUM(p.amount), 0) as total_paid,
          COUNT(p.payment_id) as payment_count
        FROM invoices i
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies provider ON i.provider_company_id = provider.company_id
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id AND p.status = 'COMPLETED'
        ${whereClause}
        GROUP BY i.invoice_id, ar.rental_id, e.equipment_id, provider.company_id
        ORDER BY i.invoice_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Count total para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT i.invoice_id) as total
        FROM invoices i
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const totalInvoices = parseInt(countResult.rows[0].total);

      const invoices = result.rows.map(invoice => {
        const totalPaid = parseFloat(invoice.total_paid);
        const totalAmount = parseFloat(invoice.total_amount);
        const remainingBalance = totalAmount - totalPaid;
        const isOverdue = invoice.days_overdue > 0 && invoice.status === 'PENDING';

        return {
          invoiceId: invoice.invoice_id.toString(),
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          status: invoice.status,
          totalAmount: totalAmount,
          totalPaid: totalPaid,
          remainingBalance: remainingBalance,
          description: invoice.description,
          rental: invoice.rental_id ? {
            rentalId: invoice.rental_id.toString(),
            equipment: {
              name: invoice.equipment_name,
              type: invoice.equipment_type
            }
          } : null,
          provider: {
            name: invoice.provider_name,
            email: invoice.provider_email,
            phone: invoice.provider_phone
          },
          paymentInfo: {
            paymentCount: parseInt(invoice.payment_count),
            isOverdue: isOverdue,
            daysOverdue: isOverdue ? parseInt(invoice.days_overdue) : 0
          }
        };
      });

      // Obtener estadísticas para filtros
      const statsQuery = `
        SELECT 
          i.status,
          COUNT(*) as count,
          SUM(i.total_amount) as total_amount
        FROM invoices i
        WHERE i.client_company_id = $1
        GROUP BY i.status
      `;

      const statsResult = await db.query(statsQuery, [clientCompanyId]);
      const statusStats = {};
      statsResult.rows.forEach(row => {
        statusStats[row.status] = {
          count: parseInt(row.count),
          totalAmount: parseFloat(row.total_amount)
        };
      });

      return ResponseHandler.success(res, {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalInvoices,
          totalPages: Math.ceil(totalInvoices / limit)
        },
        stats: statusStats
      }, 'Facturas obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getInvoices:', error);
      return ResponseHandler.error(res, 'Error al obtener facturas', 'GET_INVOICES_ERROR', 500);
    }
  }

  // GET /api/client/invoices/:id - Obtener detalles de una factura
  async getInvoiceDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      const invoiceQuery = `
        SELECT 
          i.*,
          ar.rental_id,
          ar.start_date as rental_start,
          ar.end_date as rental_end,
          ar.monthly_rate,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number,
          provider.name as provider_name,
          provider.email as provider_email,
          provider.phone as provider_phone,
          provider.address as provider_address,
          provider.tax_id as provider_tax_id,
          client.name as client_name,
          client.address as client_address,
          client.tax_id as client_tax_id,
          -- Calcular total pagado
          COALESCE(SUM(p.amount), 0) as total_paid
        FROM invoices i
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies provider ON i.provider_company_id = provider.company_id
        LEFT JOIN companies client ON i.client_company_id = client.company_id
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id AND p.status = 'COMPLETED'
        WHERE i.invoice_id = $1 AND i.client_company_id = $2
        GROUP BY i.invoice_id, ar.rental_id, e.equipment_id, provider.company_id, client.company_id
      `;

      const invoiceResult = await db.query(invoiceQuery, [id, clientCompanyId]);

      if (invoiceResult.rows.length === 0) {
        return ResponseHandler.error(res, 'Factura no encontrada', 'INVOICE_NOT_FOUND', 404);
      }

      const invoice = invoiceResult.rows[0];

      // Obtener detalles de líneas de factura
      const itemsQuery = `
        SELECT *
        FROM invoice_items
        WHERE invoice_id = $1
        ORDER BY item_order ASC
      `;

      const itemsResult = await db.query(itemsQuery, [id]);

      // Obtener historial de pagos
      const paymentsQuery = `
        SELECT 
          p.*,
          u.name as processed_by_name
        FROM payments p
        LEFT JOIN users u ON p.processed_by = u.user_id
        WHERE p.invoice_id = $1
        ORDER BY p.payment_date DESC
      `;

      const paymentsResult = await db.query(paymentsQuery, [id]);

      const totalPaid = parseFloat(invoice.total_paid);
      const totalAmount = parseFloat(invoice.total_amount);
      const remainingBalance = totalAmount - totalPaid;

      return ResponseHandler.success(res, {
        invoice: {
          invoiceId: invoice.invoice_id.toString(),
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          status: invoice.status,
          totalAmount: totalAmount,
          subtotal: parseFloat(invoice.subtotal),
          taxAmount: parseFloat(invoice.tax_amount),
          taxRate: parseFloat(invoice.tax_rate),
          totalPaid: totalPaid,
          remainingBalance: remainingBalance,
          description: invoice.description,
          notes: invoice.notes,
          
          rental: invoice.rental_id ? {
            rentalId: invoice.rental_id.toString(),
            startDate: invoice.rental_start,
            endDate: invoice.rental_end,
            monthlyRate: parseFloat(invoice.monthly_rate),
            equipment: {
              name: invoice.equipment_name,
              type: invoice.equipment_type,
              model: invoice.equipment_model,
              serialNumber: invoice.serial_number
            }
          } : null,
          
          provider: {
            name: invoice.provider_name,
            email: invoice.provider_email,
            phone: invoice.provider_phone,
            address: invoice.provider_address,
            taxId: invoice.provider_tax_id
          },
          
          client: {
            name: invoice.client_name,
            address: invoice.client_address,
            taxId: invoice.client_tax_id
          }
        },
        
        items: itemsResult.rows.map(item => ({
          itemId: item.item_id.toString(),
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price)
        })),
        
        payments: paymentsResult.rows.map(payment => ({
          paymentId: payment.payment_id.toString(),
          amount: parseFloat(payment.amount),
          paymentDate: payment.payment_date,
          paymentMethod: payment.payment_method,
          transactionReference: payment.transaction_reference,
          status: payment.status,
          processedBy: payment.processed_by_name,
          notes: payment.notes
        }))
        
      }, 'Detalles de factura obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getInvoiceDetails:', error);
      return ResponseHandler.error(res, 'Error al obtener detalles de factura', 'GET_INVOICE_DETAILS_ERROR', 500);
    }
  }

  // GET /api/client/invoices/:id/pdf - Descargar factura en PDF
  async downloadInvoicePDF(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      // Verificar que la factura pertenece al cliente
      const invoiceCheck = await db.query(`
        SELECT invoice_id, invoice_number, pdf_url
        FROM invoices 
        WHERE invoice_id = $1 AND client_company_id = $2
      `, [id, clientCompanyId]);

      if (invoiceCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Factura no encontrada', 'INVOICE_NOT_FOUND', 404);
      }

      const invoice = invoiceCheck.rows[0];

      if (!invoice.pdf_url) {
        return ResponseHandler.error(res, 'PDF no disponible para esta factura', 'PDF_NOT_AVAILABLE', 404);
      }

      return ResponseHandler.success(res, {
        pdfUrl: invoice.pdf_url,
        invoiceNumber: invoice.invoice_number
      }, 'URL de PDF obtenida exitosamente');

    } catch (error) {
      console.error('Error en downloadInvoicePDF:', error);
      return ResponseHandler.error(res, 'Error al obtener PDF', 'DOWNLOAD_PDF_ERROR', 500);
    }
  }

  // POST /api/client/invoices/:id/mark-paid - Marcar factura como pagada (notificación)
  async markInvoiceAsPaid(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const {
        paymentAmount,
        paymentMethod,
        transactionReference,
        paymentDate,
        notes
      } = req.body;

      // Verificar que la factura pertenece al cliente
      const invoiceCheck = await db.query(`
        SELECT i.invoice_id, i.total_amount, i.status,
               COALESCE(SUM(p.amount), 0) as total_paid
        FROM invoices i
        LEFT JOIN payments p ON i.invoice_id = p.invoice_id AND p.status = 'COMPLETED'
        WHERE i.invoice_id = $1 AND i.client_company_id = $2
        GROUP BY i.invoice_id
      `, [id, clientCompanyId]);

      if (invoiceCheck.rows.length === 0) {
        return ResponseHandler.error(res, 'Factura no encontrada', 'INVOICE_NOT_FOUND', 404);
      }

      const invoice = invoiceCheck.rows[0];

      if (invoice.status === 'PAID') {
        return ResponseHandler.error(res, 'La factura ya está marcada como pagada', 'INVOICE_ALREADY_PAID', 400);
      }

      const totalPaid = parseFloat(invoice.total_paid);
      const newTotal = totalPaid + parseFloat(paymentAmount);
      const totalAmount = parseFloat(invoice.total_amount);

      if (newTotal > totalAmount) {
        return ResponseHandler.error(res, 'El monto del pago excede el saldo pendiente', 'PAYMENT_EXCEEDS_BALANCE', 400);
      }

      // Registrar el pago con estado PENDING (pendiente de verificación)
      const paymentQuery = `
        INSERT INTO payments (
          invoice_id,
          amount,
          payment_method,
          transaction_reference,
          payment_date,
          status,
          notes,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, CURRENT_TIMESTAMP)
        RETURNING payment_id
      `;

      const result = await db.query(paymentQuery, [
        id,
        paymentAmount,
        paymentMethod,
        transactionReference,
        paymentDate || new Date(),
        notes
      ]);

      // Si el pago cubre el total, actualizar estado de factura a UNDER_REVIEW
      if (newTotal >= totalAmount) {
        await db.query(`
          UPDATE invoices 
          SET status = 'UNDER_REVIEW', updated_at = CURRENT_TIMESTAMP
          WHERE invoice_id = $1
        `, [id]);
      }

      return ResponseHandler.success(res, {
        paymentId: result.rows[0].payment_id.toString(),
        message: 'Notificación de pago enviada. Pendiente de verificación por el proveedor.'
      }, 'Pago registrado exitosamente');

    } catch (error) {
      console.error('Error en markInvoiceAsPaid:', error);
      return ResponseHandler.error(res, 'Error al registrar pago', 'MARK_PAID_ERROR', 500);
    }
  }

  // GET /api/client/invoices/summary - Resumen de facturas
  async getInvoicesSummary(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { period = '12' } = req.query; // Últimos 12 meses por defecto

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN i.status = 'PENDING' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN i.status = 'PAID' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN i.status = 'OVERDUE' THEN 1 END) as overdue_invoices,
          COUNT(CASE WHEN i.status = 'UNDER_REVIEW' THEN 1 END) as under_review_invoices,
          SUM(i.total_amount) as total_amount,
          SUM(CASE WHEN i.status = 'PAID' THEN i.total_amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN i.status = 'PENDING' THEN i.total_amount ELSE 0 END) as total_pending,
          SUM(CASE WHEN i.status = 'OVERDUE' THEN i.total_amount ELSE 0 END) as total_overdue,
          AVG(i.total_amount) as avg_invoice_amount,
          -- Facturas vencidas
          COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status = 'PENDING' THEN 1 END) as overdue_count
        FROM invoices i
        WHERE i.client_company_id = $1 
          AND i.invoice_date >= CURRENT_DATE - interval '${period} months'
      `;

      const result = await db.query(summaryQuery, [clientCompanyId]);
      const summary = result.rows[0];

      // Facturas por mes (últimos 12 meses)
      const monthlyQuery = `
        SELECT 
          DATE_TRUNC('month', i.invoice_date) as month,
          COUNT(*) as invoice_count,
          SUM(i.total_amount) as total_amount,
          SUM(CASE WHEN i.status = 'PAID' THEN i.total_amount ELSE 0 END) as paid_amount
        FROM invoices i
        WHERE i.client_company_id = $1 
          AND i.invoice_date >= CURRENT_DATE - interval '12 months'
        GROUP BY DATE_TRUNC('month', i.invoice_date)
        ORDER BY month DESC
      `;

      const monthlyResult = await db.query(monthlyQuery, [clientCompanyId]);

      // Próximas facturas por vencer
      const upcomingQuery = `
        SELECT 
          i.invoice_id,
          i.invoice_number,
          i.due_date,
          i.total_amount,
          EXTRACT(days FROM (i.due_date - CURRENT_DATE)) as days_until_due,
          e.name as equipment_name
        FROM invoices i
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.client_company_id = $1 
          AND i.status = 'PENDING'
          AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '30 days'
        ORDER BY i.due_date ASC
        LIMIT 5
      `;

      const upcomingResult = await db.query(upcomingQuery, [clientCompanyId]);

      return ResponseHandler.success(res, {
        summary: {
          totalInvoices: parseInt(summary.total_invoices),
          pendingInvoices: parseInt(summary.pending_invoices),
          paidInvoices: parseInt(summary.paid_invoices),
          overdueInvoices: parseInt(summary.overdue_invoices),
          underReviewInvoices: parseInt(summary.under_review_invoices),
          totalAmount: parseFloat(summary.total_amount || 0),
          totalPaid: parseFloat(summary.total_paid || 0),
          totalPending: parseFloat(summary.total_pending || 0),
          totalOverdue: parseFloat(summary.total_overdue || 0),
          avgInvoiceAmount: parseFloat(summary.avg_invoice_amount || 0),
          overdueCount: parseInt(summary.overdue_count)
        },
        monthlyData: monthlyResult.rows.map(month => ({
          month: month.month,
          invoiceCount: parseInt(month.invoice_count),
          totalAmount: parseFloat(month.total_amount),
          paidAmount: parseFloat(month.paid_amount)
        })),
        upcomingDue: upcomingResult.rows.map(invoice => ({
          invoiceId: invoice.invoice_id.toString(),
          invoiceNumber: invoice.invoice_number,
          dueDate: invoice.due_date,
          totalAmount: parseFloat(invoice.total_amount),
          daysUntilDue: parseInt(invoice.days_until_due),
          equipmentName: invoice.equipment_name
        }))
      }, 'Resumen de facturas obtenido exitosamente');

    } catch (error) {
      console.error('Error en getInvoicesSummary:', error);
      return ResponseHandler.error(res, 'Error al obtener resumen', 'GET_SUMMARY_ERROR', 500);
    }
  }

  // GET /api/client/invoices/payment-history - Historial de pagos
  async getPaymentHistory(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20,
        startDate,
        endDate,
        status 
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE i.client_company_id = $1`;
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND p.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (startDate) {
        whereClause += ` AND p.payment_date >= $${++paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ` AND p.payment_date <= $${++paramCount}`;
        queryParams.push(endDate);
      }

      const query = `
        SELECT 
          p.*,
          i.invoice_number,
          i.total_amount as invoice_total,
          e.name as equipment_name,
          provider.name as provider_name
        FROM payments p
        INNER JOIN invoices i ON p.invoice_id = i.invoice_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        LEFT JOIN companies provider ON i.provider_company_id = provider.company_id
        ${whereClause}
        ORDER BY p.payment_date DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      const payments = result.rows.map(payment => ({
        paymentId: payment.payment_id.toString(),
        amount: parseFloat(payment.amount),
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        transactionReference: payment.transaction_reference,
        status: payment.status,
        notes: payment.notes,
        invoice: {
          invoiceNumber: payment.invoice_number,
          totalAmount: parseFloat(payment.invoice_total)
        },
        equipment: payment.equipment_name,
        provider: payment.provider_name
      }));

      return ResponseHandler.success(res, {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: payments.length
        }
      }, 'Historial de pagos obtenido exitosamente');

    } catch (error) {
      console.error('Error en getPaymentHistory:', error);
      return ResponseHandler.error(res, 'Error al obtener historial de pagos', 'GET_PAYMENT_HISTORY_ERROR', 500);
    }
  }
}

module.exports = new InvoicesController();
