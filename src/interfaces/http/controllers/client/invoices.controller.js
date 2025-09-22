const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class InvoicesController {
  constructor(container) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  // GET /api/client/invoices - Obtener facturas del cliente usando DDD
  async getInvoices(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        paymentStatus,
        dateFrom,
        dateTo,
        equipmentId,
        search 
      } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting client invoices', { 
        clientCompanyId, 
        page, 
        limit, 
        status, 
        paymentStatus 
      });

      // Get repository
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Build filters
      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        paymentStatus,
        equipmentId,
        search
      };

      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);

      // Get invoices
      const invoices = await invoiceRepository.findByClientCompany(clientCompanyId, filters);
      const totalInvoices = await invoiceRepository.countByClientCompany(clientCompanyId, filters);

      // Format response - simplified without entity methods that may not exist
      const formattedInvoices = invoices.map(invoice => {
        const isOverdue = invoice.status === 'PENDING' && invoice.dueDate && new Date(invoice.dueDate) < new Date();
        const remainingAmount = invoice.status === 'PAID' ? 0 : (invoice.totalAmount || 0);
        
        return {
          invoiceId: invoice.id ? invoice.id.toString() : null,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          status: invoice.status,
          amounts: {
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            totalAmount: invoice.totalAmount,
            remainingAmount: remainingAmount
          },
          paymentInfo: {
            paymentMethod: invoice.paymentMethod,
            paymentReference: invoice.paymentReference
          },
          isOverdue: isOverdue,
          rentalId: invoice.rentalId
        };
      });

      return ResponseHandler.success(res, {
        invoices: formattedInvoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalInvoices,
          totalPages: Math.ceil(totalInvoices / limit)
        }
      }, 'Invoices retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getInvoices', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/invoices/:id - Obtener detalles de factura usando DDD
  async getInvoiceDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params; // Changed from invoiceId to id

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting invoice details', { clientCompanyId, invoiceId: id });

      // Get repository
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Get invoice
      const invoice = await invoiceRepository.findById(id);
      if (!invoice) {
        return ResponseHandler.error(res, 'Invoice not found', 404);
      }

      // Verify belongs to client
      if (invoice.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to access this invoice', 403);
      }

      // Get payment history (simplified, may return empty array if method doesn't exist)
      let paymentHistory = [];
      try {
        paymentHistory = await invoiceRepository.getPaymentHistory(id);
      } catch (error) {
        this.logger?.warn('Payment history not available', { error: error.message });
      }

      // Calculate simple values
      const isOverdue = invoice.status === 'PENDING' && invoice.dueDate && new Date(invoice.dueDate) < new Date();
      const remainingAmount = invoice.status === 'PAID' ? 0 : (invoice.totalAmount || 0);

      const invoiceDetails = {
        invoiceId: invoice.id ? invoice.id.toString() : null,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        status: invoice.status,
        amounts: {
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          remainingAmount: remainingAmount
        },
        paymentInfo: {
          paymentMethod: invoice.paymentMethod,
          paymentReference: invoice.paymentReference
        },
        paymentHistory: paymentHistory.map(payment => ({
          paymentId: payment.id ? payment.id.toString() : payment.invoice_id?.toString(),
          amount: payment.amount || payment.total_amount,
          paymentDate: payment.payment_date || payment.paid_date,
          paymentMethod: payment.payment_method,
          reference: payment.reference || payment.payment_reference
        })),
        isOverdue: isOverdue,
        rentalId: invoice.rentalId,
        notes: invoice.notes,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      };

      return ResponseHandler.success(res, invoiceDetails, 'Invoice details retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getInvoiceDetails', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/invoices/:invoiceId/download - Descargar PDF de factura usando DDD
  async downloadInvoicePDF(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { invoiceId } = req.params;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Downloading invoice PDF', { clientCompanyId, invoiceId });

      // Get use case
      const generateInvoicePDFUseCase = this.container.resolve('generateInvoicePDF');

      // Generate and download PDF
      const pdfBuffer = await generateInvoicePDFUseCase.execute({
        invoiceId,
        clientCompanyId
      });

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF buffer
      res.send(pdfBuffer);

    } catch (error) {
      this.logger?.error('Error in downloadInvoicePDF', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // POST /api/client/invoices/:invoiceId/mark-paid - Marcar factura como pagada usando DDD
  async markInvoiceAsPaid(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { invoiceId } = req.params;
      const { 
        paymentAmount,
        paymentMethod,
        paymentReference,
        paymentDate,
        notes
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Marking invoice as paid', { 
        clientCompanyId, 
        invoiceId, 
        paymentAmount, 
        paymentMethod 
      });

      // Get use case
      const recordInvoicePaymentUseCase = this.container.resolve('recordInvoicePayment');

      // Record payment
      const payment = await recordInvoicePaymentUseCase.execute({
        invoiceId,
        clientCompanyId,
        paymentAmount: parseFloat(paymentAmount),
        paymentMethod,
        paymentReference,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes
      });

      return ResponseHandler.success(res, {
        paymentId: payment.id.toString(),
        invoiceId: payment.invoiceId.toString(),
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        invoiceStatus: payment.getInvoiceStatus()
      }, 'Payment recorded successfully', 201);

    } catch (error) {
      this.logger?.error('Error in markInvoiceAsPaid', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/invoices/summary - Obtener resumen de facturas usando DDD
  async getInvoicesSummary(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { period = '12' } = req.query; // months

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting invoices summary', { clientCompanyId, period });

      // Get repository
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Calculate date range
      const monthsBack = parseInt(period);
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - monthsBack);

      // Get summary statistics
      const summaryStats = await invoiceRepository.getClientSummary(clientCompanyId);

      // Get all client invoices for analysis
      const allInvoices = await invoiceRepository.findByClientCompany(clientCompanyId);
      
      // Calculate summary manually
      const totalInvoices = allInvoices.length;
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let overdueAmount = 0;
      
      const statusCounts = {};
      const overdueInvoices = [];
      
      allInvoices.forEach(invoice => {
        const amount = parseFloat(invoice.totalAmount) || 0;
        totalAmount += amount;
        
        statusCounts[invoice.status] = (statusCounts[invoice.status] || 0) + 1;
        
        if (invoice.status === 'PAID') {
          paidAmount += amount;
        } else if (invoice.status === 'PENDING') {
          pendingAmount += amount;
          
          // Check if overdue
          if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
            overdueAmount += amount;
            overdueInvoices.push(invoice);
          }
        }
      });

      const summary = {
        totals: {
          totalInvoices: totalInvoices,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          overdueAmount: overdueAmount,
          averageInvoiceAmount: totalInvoices > 0 ? totalAmount / totalInvoices : 0
        },
        distribution: {
          byStatus: Object.entries(statusCounts).map(([status, count]) => ({
            status: status,
            count: count,
            totalAmount: allInvoices.filter(inv => inv.status === status)
              .reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0),
            percentage: totalInvoices > 0 ? (count / totalInvoices) * 100 : 0
          }))
        },
        overdue: {
          count: overdueInvoices.length,
          totalAmount: overdueAmount,
          invoices: overdueInvoices.slice(0, 10).map(inv => ({
            invoiceId: inv.id ? inv.id.toString() : null,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.totalAmount,
            dueDate: inv.dueDate,
            daysOverdue: inv.dueDate ? Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)) : 0
          }))
        },
        recent: {
          recentInvoices: allInvoices.slice(0, 5).map(inv => ({
            invoiceId: inv.id ? inv.id.toString() : null,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.totalAmount,
            status: inv.status,
            issueDate: inv.invoiceDate,
            dueDate: inv.dueDate
          }))
        }
      };

      return ResponseHandler.success(res, summary, 'Invoices summary retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getInvoicesSummary', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/invoices/payment-history - Obtener historial de pagos usando DDD
  async getPaymentHistory(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20,
        dateFrom,
        dateTo,
        paymentMethod
      } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting payment history', { 
        clientCompanyId, 
        page, 
        limit,
        paymentMethod 
      });

      // Get repository
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Build filters
      const filters = {
        limit: parseInt(limit) || 20
      };

      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);

      // Get payment history
      const payments = await invoiceRepository.getClientPaymentHistory(clientCompanyId, filters);

      // Calculate summary
      const totalAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const averagePayment = payments.length > 0 ? totalAmount / payments.length : 0;

      const formattedPayments = payments.map(payment => ({
        paymentId: payment.invoice_id ? payment.invoice_id.toString() : null,
        invoiceId: payment.invoice_id ? payment.invoice_id.toString() : null,
        invoiceNumber: payment.invoice_number,
        amount: payment.amount || payment.total_amount,
        paymentDate: payment.payment_date || payment.paid_date,
        paymentMethod: payment.payment_method,
        reference: payment.reference || payment.payment_reference,
        issueDate: payment.issue_date,
        dueDate: payment.due_date,
        status: payment.status,
        equipmentInfo: payment.equipment_id ? {
          equipmentId: payment.equipment_id,
          serialNumber: payment.serial_number,
          type: payment.equipment_type,
          manufacturer: payment.manufacturer,
          model: payment.model
        } : null
      }));

      return ResponseHandler.success(res, {
        payments: formattedPayments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: payments.length,
          totalPages: Math.ceil(payments.length / parseInt(limit))
        },
        summary: {
          totalAmount: totalAmount,
          averagePayment: averagePayment,
          totalPayments: payments.length
        }
      }, 'Payment history retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getPaymentHistory', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/invoices/:id/pdf - Descargar PDF simplificado
  async downloadInvoicePDF(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Downloading invoice PDF', { clientCompanyId, invoiceId: id });

      // Mock PDF download (sin servicio PDF real)
      const mockPdfContent = `
      INVOICE PDF - MOCK
      ==================
      Invoice ID: ${id}
      Client Company: ${clientCompanyId}
      Generated: ${new Date().toISOString()}
      
      This is a mock PDF response.
      In production, this would generate a real PDF.
      `;

      // Set headers for text download (mock)
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.txt"`);
      
      // Send mock content
      return res.send(mockPdfContent);

    } catch (error) {
      this.logger?.error('Error in downloadInvoicePDF', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // POST /api/client/invoices/:id/mark-paid - Marcar como pagada (simplificado)
  async markInvoiceAsPaid(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;
      const { 
        paymentAmount,
        paymentMethod = 'TRANSFER',
        paymentReference,
        paymentDate,
        notes
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Marking invoice as paid', { clientCompanyId, invoiceId: id });

      // Get repository
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Get invoice first
      const invoice = await invoiceRepository.findById(id);
      if (!invoice) {
        return ResponseHandler.error(res, 'Invoice not found', 404);
      }

      // Verify belongs to client
      if (invoice.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to access this invoice', 403);
      }

      // Process payment
      const paymentData = {
        paidDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod,
        paymentReference: paymentReference || `PAY-${Date.now()}`
      };

      const updatedInvoice = await invoiceRepository.processPayment(id, paymentData);

      return ResponseHandler.success(res, {
        invoiceId: updatedInvoice.id ? updatedInvoice.id.toString() : id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        status: updatedInvoice.status,
        amount: updatedInvoice.totalAmount,
        paymentDate: updatedInvoice.paidDate,
        paymentMethod: updatedInvoice.paymentMethod,
        reference: updatedInvoice.paymentReference
      }, 'Payment recorded successfully', 200);

    } catch (error) {
      this.logger?.error('Error in markInvoiceAsPaid', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = InvoicesController;
