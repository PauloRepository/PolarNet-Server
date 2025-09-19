const ClientInvoiceResponseDTO = require('../dto/ClientInvoiceResponseDTO');

/**
 * Use Case: Client Invoices Management
 * Handles invoice operations for client companies
 */
class ClientInvoiceUseCase {
  constructor(
    invoiceRepository,
    activeRentalRepository,
    companyRepository,
    userRepository
  ) {
    this.invoiceRepository = invoiceRepository;
    this.activeRentalRepository = activeRentalRepository;
    this.companyRepository = companyRepository;
    this.userRepository = userRepository;
  }

  /**
   * Get invoices for client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Filtering options
   * @returns {Promise<Object>} Invoices list
   */
  async getInvoices(clientCompanyId, filters = {}) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const {
        page = 1,
        limit = 20,
        status,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        rentalId
      } = filters;

      const queryFilters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        rentalId
      };

      const [invoices, totalCount] = await Promise.all([
        this.invoiceRepository.findByClientCompany(clientCompanyId, queryFilters),
        this.invoiceRepository.getClientInvoiceCount(clientCompanyId, queryFilters)
      ]);

      return {
        success: true,
        data: {
          invoices: ClientInvoiceResponseDTO.formatInvoiceList(invoices),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getInvoices:', error);
      throw new Error(`Failed to get invoices: ${error.message}`);
    }
  }

  /**
   * Get invoice details by ID
   * @param {number} invoiceId - Invoice ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} Invoice details
   */
  async getInvoiceDetails(invoiceId, clientCompanyId) {
    try {
      if (!invoiceId || !clientCompanyId) {
        throw new Error('Invoice ID and client company ID are required');
      }

      const invoice = await this.invoiceRepository.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Verify invoice belongs to client company
      if (invoice.clientCompanyId !== clientCompanyId) {
        throw new Error('Invoice not found or access denied');
      }

      return {
        success: true,
        data: ClientInvoiceResponseDTO.formatInvoiceDetails(invoice)
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getInvoiceDetails:', error);
      throw new Error(`Failed to get invoice details: ${error.message}`);
    }
  }

  /**
   * Get pending invoices for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Pending invoices
   */
  async getPendingInvoices(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const pendingInvoices = await this.invoiceRepository.findPendingByClient(clientCompanyId);

      return {
        success: true,
        data: ClientInvoiceResponseDTO.formatInvoiceList(pendingInvoices)
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getPendingInvoices:', error);
      throw new Error(`Failed to get pending invoices: ${error.message}`);
    }
  }

  /**
   * Get overdue invoices for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Overdue invoices
   */
  async getOverdueInvoices(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const overdueInvoices = await this.invoiceRepository.findOverdueByClient(clientCompanyId);

      return {
        success: true,
        data: ClientInvoiceResponseDTO.formatInvoiceList(overdueInvoices)
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getOverdueInvoices:', error);
      throw new Error(`Failed to get overdue invoices: ${error.message}`);
    }
  }

  /**
   * Get invoice payment history
   * @param {number} invoiceId - Invoice ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} Payment history
   */
  async getInvoicePaymentHistory(invoiceId, clientCompanyId) {
    try {
      if (!invoiceId || !clientCompanyId) {
        throw new Error('Invoice ID and client company ID are required');
      }

      const invoice = await this.invoiceRepository.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Verify invoice belongs to client company
      if (invoice.clientCompanyId !== clientCompanyId) {
        throw new Error('Invoice not found or access denied');
      }

      const paymentHistory = await this.invoiceRepository.getInvoicePaymentHistory(invoiceId);

      return {
        success: true,
        data: ClientInvoiceResponseDTO.formatPaymentHistory(paymentHistory)
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getInvoicePaymentHistory:', error);
      throw new Error(`Failed to get invoice payment history: ${error.message}`);
    }
  }

  /**
   * Record payment for invoice
   * @param {number} invoiceId - Invoice ID
   * @param {number} userId - User ID recording payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment record result
   */
  async recordPayment(invoiceId, userId, paymentData) {
    try {
      if (!invoiceId || !userId) {
        throw new Error('Invoice ID and user ID are required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const invoice = await this.invoiceRepository.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Verify invoice belongs to client company
      if (invoice.clientCompanyId !== user.companyId) {
        throw new Error('Invoice not found or access denied');
      }

      // Can only record payment for pending invoices
      if (invoice.status !== 'PENDING') {
        throw new Error('Cannot record payment - invoice is not pending');
      }

      const {
        amount,
        paymentMethod,
        paymentDate,
        reference,
        notes
      } = paymentData;

      if (!amount || !paymentMethod) {
        throw new Error('Amount and payment method are required');
      }

      if (amount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      if (amount > invoice.totalAmount) {
        throw new Error('Payment amount cannot exceed invoice total');
      }

      const payment = {
        invoiceId,
        amount,
        paymentMethod,
        paymentDate: paymentDate || new Date(),
        reference,
        notes,
        recordedById: userId,
        recordedDate: new Date()
      };

      const result = await this.invoiceRepository.recordPayment(payment);

      return {
        success: true,
        data: result,
        message: 'Payment recorded successfully'
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.recordPayment:', error);
      throw new Error(`Failed to record payment: ${error.message}`);
    }
  }

  /**
   * Download invoice PDF
   * @param {number} invoiceId - Invoice ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} PDF download data
   */
  async downloadInvoicePDF(invoiceId, clientCompanyId) {
    try {
      if (!invoiceId || !clientCompanyId) {
        throw new Error('Invoice ID and client company ID are required');
      }

      const invoice = await this.invoiceRepository.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Verify invoice belongs to client company
      if (invoice.clientCompanyId !== clientCompanyId) {
        throw new Error('Invoice not found or access denied');
      }

      // Generate PDF data (this would typically involve a PDF generation service)
      const pdfData = await this.invoiceRepository.generateInvoicePDF(invoiceId);

      return {
        success: true,
        data: {
          filename: `invoice_${invoice.invoiceNumber}.pdf`,
          contentType: 'application/pdf',
          buffer: pdfData
        }
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.downloadInvoicePDF:', error);
      throw new Error(`Failed to download invoice PDF: ${error.message}`);
    }
  }

  /**
   * Get invoice statistics for client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Invoice statistics
   */
  async getInvoiceStatistics(clientCompanyId, filters = {}) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const statistics = await this.invoiceRepository.getClientStatistics(clientCompanyId, filters);

      return {
        success: true,
        data: ClientInvoiceResponseDTO.formatStatistics(statistics)
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getInvoiceStatistics:', error);
      throw new Error(`Failed to get invoice statistics: ${error.message}`);
    }
  }

  /**
   * Get monthly invoice summary for client
   * @param {number} clientCompanyId - Client company ID
   * @param {number} year - Year for summary
   * @returns {Promise<Object>} Monthly summary
   */
  async getMonthlyInvoiceSummary(clientCompanyId, year = new Date().getFullYear()) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const monthlySummary = await this.invoiceRepository.getClientMonthlySummary(clientCompanyId, year);

      return {
        success: true,
        data: ClientInvoiceResponseDTO.formatMonthlySummary(monthlySummary)
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getMonthlyInvoiceSummary:', error);
      throw new Error(`Failed to get monthly invoice summary: ${error.message}`);
    }
  }

  /**
   * Get recent invoices for client
   * @param {number} clientCompanyId - Client company ID
   * @param {number} limit - Number of recent invoices to return
   * @returns {Promise<Object>} Recent invoices
   */
  async getRecentInvoices(clientCompanyId, limit = 5) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const recentInvoices = await this.invoiceRepository.findByClientCompany(
        clientCompanyId, 
        { limit, orderBy: 'issueDate', orderDirection: 'DESC' }
      );

      return {
        success: true,
        data: ClientInvoiceResponseDTO.formatInvoiceList(recentInvoices)
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.getRecentInvoices:', error);
      throw new Error(`Failed to get recent invoices: ${error.message}`);
    }
  }

  /**
   * Request invoice correction
   * @param {number} invoiceId - Invoice ID
   * @param {number} userId - User ID requesting correction
   * @param {Object} correctionData - Correction request data
   * @returns {Promise<Object>} Correction request result
   */
  async requestInvoiceCorrection(invoiceId, userId, correctionData) {
    try {
      if (!invoiceId || !userId) {
        throw new Error('Invoice ID and user ID are required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const invoice = await this.invoiceRepository.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Verify invoice belongs to client company
      if (invoice.clientCompanyId !== user.companyId) {
        throw new Error('Invoice not found or access denied');
      }

      const {
        correctionType,
        description,
        expectedAmount,
        attachments
      } = correctionData;

      if (!correctionType || !description) {
        throw new Error('Correction type and description are required');
      }

      const correctionRequest = {
        invoiceId,
        requestedById: userId,
        correctionType,
        description,
        expectedAmount,
        attachments,
        status: 'PENDING',
        requestDate: new Date()
      };

      const result = await this.invoiceRepository.createCorrectionRequest(correctionRequest);

      return {
        success: true,
        data: result,
        message: 'Invoice correction request submitted successfully'
      };

    } catch (error) {
      console.error('Error in ClientInvoiceUseCase.requestInvoiceCorrection:', error);
      throw new Error(`Failed to request invoice correction: ${error.message}`);
    }
  }
}

module.exports = ClientInvoiceUseCase;
