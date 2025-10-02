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
          invoiceId: invoice.invoiceId ? invoice.invoiceId.toString() : null,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
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
      const invoice = await invoiceRepository.findByIdForClient(id, clientCompanyId);
      if (!invoice) {
        return ResponseHandler.error(res, 'Invoice not found', 404);
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
        invoiceId: invoice.invoiceId ? invoice.invoiceId.toString() : null,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
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

  // GET /api/client/invoices/:id/pdf - Descargar PDF de factura usando DDD
  async downloadInvoicePDF(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Downloading invoice PDF', { clientCompanyId, invoiceId: id });

      // Get services
      const invoiceRepository = this.container.resolve('invoiceRepository');
      const pdfService = this.container.resolve('generateInvoicePDF');

      // Get invoice first
      const invoice = await invoiceRepository.findByIdForClient(id, clientCompanyId);
      if (!invoice) {
        return ResponseHandler.error(res, 'Invoice not found', 404);
      }

      // Generate PDF
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

      // Get file name
      const fileName = pdfService.getInvoiceFileName(invoice);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF buffer
      res.send(pdfBuffer);

    } catch (error) {
      this.logger?.error('Error in downloadInvoicePDF', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = InvoicesController;
