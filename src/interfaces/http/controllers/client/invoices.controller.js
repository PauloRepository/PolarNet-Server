const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class InvoicesController {
  constructor() {
    this.container = null;
    this.logger = null;
  }

  // Inject DI container
  setContainer(container) {
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

      // Format response
      const formattedInvoices = invoices.map(invoice => ({
        invoiceId: invoice.id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        description: invoice.description,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        status: invoice.status,
        amounts: {
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.getRemainingAmount()
        },
        provider: invoice.getProviderInfo(),
        equipment: invoice.getEquipmentInfo(),
        rental: invoice.getRentalInfo(),
        paymentInfo: {
          paymentMethod: invoice.paymentMethod,
          paymentReference: invoice.paymentReference,
          paymentStatus: invoice.getPaymentStatus()
        },
        isOverdue: invoice.isOverdue(),
        daysOverdue: invoice.getDaysOverdue(),
        canBePaid: invoice.canBePaid(),
        downloadUrl: invoice.getDownloadUrl()
      }));

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

  // GET /api/client/invoices/:invoiceId - Obtener detalles de factura usando DDD
  async getInvoiceDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { invoiceId } = req.params;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting invoice details', { clientCompanyId, invoiceId });

      // Get repository
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Get invoice
      const invoice = await invoiceRepository.findById(invoiceId);
      if (!invoice) {
        return ResponseHandler.error(res, 'Invoice not found', 404);
      }

      // Verify belongs to client
      if (invoice.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to access this invoice', 403);
      }

      // Get invoice items
      const invoiceItems = await invoiceRepository.getInvoiceItems(invoiceId);

      // Get payment history
      const paymentHistory = await invoiceRepository.getPaymentHistory(invoiceId);

      // Get related documents
      const documents = await invoiceRepository.getInvoiceDocuments(invoiceId);

      const invoiceDetails = {
        invoiceId: invoice.id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        description: invoice.description,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        status: invoice.status,
        amounts: {
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          discountAmount: invoice.discountAmount,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.getRemainingAmount()
        },
        provider: invoice.getProviderInfo(),
        client: invoice.getClientInfo(),
        equipment: invoice.getEquipmentInfo(),
        rental: invoice.getRentalInfo(),
        paymentInfo: {
          paymentMethod: invoice.paymentMethod,
          paymentReference: invoice.paymentReference,
          paymentStatus: invoice.getPaymentStatus(),
          paymentTerms: invoice.paymentTerms
        },
        items: invoiceItems.map(item => ({
          itemId: item.id.toString(),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.getTotalPrice(),
          taxRate: item.taxRate,
          itemType: item.itemType
        })),
        paymentHistory: paymentHistory.map(payment => ({
          paymentId: payment.id.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          notes: payment.notes
        })),
        documents: documents.map(doc => ({
          documentId: doc.id.toString(),
          filename: doc.filename,
          documentType: doc.documentType,
          fileUrl: doc.fileUrl,
          uploadedAt: doc.uploadedAt
        })),
        timeline: invoice.getStatusTimeline(),
        isOverdue: invoice.isOverdue(),
        daysOverdue: invoice.getDaysOverdue(),
        canBePaid: invoice.canBePaid(),
        downloadUrl: invoice.getDownloadUrl(),
        notes: invoice.notes
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
      const summaryStats = await invoiceRepository.getClientSummary(clientCompanyId, {
        dateFrom
      });

      // Get invoices by status
      const invoicesByStatus = await invoiceRepository.getStatusDistribution(clientCompanyId, {
        dateFrom
      });

      // Get monthly trends
      const monthlyTrends = await invoiceRepository.getMonthlyTrends(clientCompanyId, {
        monthsBack
      });

      // Get overdue invoices
      const overdueInvoices = await invoiceRepository.findOverdueByClient(clientCompanyId);

      // Get upcoming payments
      const upcomingPayments = await invoiceRepository.getUpcomingPayments(clientCompanyId, {
        daysAhead: 30
      });

      const summary = {
        totals: {
          totalInvoices: summaryStats.total_invoices || 0,
          totalAmount: summaryStats.total_amount || 0,
          paidAmount: summaryStats.paid_amount || 0,
          pendingAmount: summaryStats.pending_amount || 0,
          overdueAmount: summaryStats.overdue_amount || 0,
          averageInvoiceAmount: summaryStats.avg_invoice_amount || 0
        },
        distribution: {
          byStatus: invoicesByStatus.map(item => ({
            status: item.status,
            count: parseInt(item.count),
            totalAmount: parseFloat(item.total_amount),
            percentage: parseFloat(item.percentage)
          }))
        },
        trends: {
          monthly: monthlyTrends.map(trend => ({
            month: trend.month,
            year: trend.year,
            invoiceCount: parseInt(trend.invoice_count),
            totalAmount: parseFloat(trend.total_amount),
            paidAmount: parseFloat(trend.paid_amount),
            pendingAmount: parseFloat(trend.pending_amount)
          }))
        },
        overdue: {
          count: overdueInvoices.length,
          totalAmount: overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
          invoices: overdueInvoices.slice(0, 10).map(inv => ({
            invoiceId: inv.id.toString(),
            invoiceNumber: inv.invoiceNumber,
            amount: inv.totalAmount,
            dueDate: inv.dueDate,
            daysOverdue: inv.getDaysOverdue()
          }))
        },
        upcoming: {
          count: upcomingPayments.length,
          totalAmount: upcomingPayments.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
          payments: upcomingPayments.slice(0, 10).map(inv => ({
            invoiceId: inv.id.toString(),
            invoiceNumber: inv.invoiceNumber,
            amount: inv.totalAmount,
            dueDate: inv.dueDate,
            daysUntilDue: Math.ceil((new Date(inv.dueDate) - new Date()) / (24 * 60 * 60 * 1000))
          }))
        },
        period: {
          months: monthsBack,
          from: dateFrom,
          to: new Date()
        }
      };

      return ResponseHandler.success(res, summary, 'Invoices summary retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getInvoicesSummary', error);
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
        page: parseInt(page),
        limit: parseInt(limit),
        paymentMethod
      };

      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);

      // Get payment history
      const payments = await invoiceRepository.getClientPaymentHistory(clientCompanyId, filters);
      const totalPayments = await invoiceRepository.countClientPayments(clientCompanyId, filters);

      // Get payment summary
      const paymentSummary = await invoiceRepository.getPaymentSummary(clientCompanyId, filters);

      const formattedPayments = payments.map(payment => ({
        paymentId: payment.id.toString(),
        invoiceId: payment.invoiceId.toString(),
        invoiceNumber: payment.getInvoiceNumber(),
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        notes: payment.notes,
        equipment: payment.getEquipmentInfo(),
        provider: payment.getProviderInfo()
      }));

      return ResponseHandler.success(res, {
        payments: formattedPayments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalPayments,
          totalPages: Math.ceil(totalPayments / limit)
        },
        summary: {
          totalAmount: paymentSummary.total_amount || 0,
          averagePayment: paymentSummary.avg_payment || 0,
          paymentsByMethod: paymentSummary.by_method || {}
        }
      }, 'Payment history retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getPaymentHistory', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = new InvoicesController();
