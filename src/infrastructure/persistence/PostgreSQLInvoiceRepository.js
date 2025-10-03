const IInvoiceRepository = require('../../domain/repositories/IInvoiceRepository');

/**
 * PostgreSQL Implementation: Invoice Repository (Simplified)
 * Handles invoice data persistence using PostgreSQL
 */
class PostgreSQLInvoiceRepository extends IInvoiceRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find invoices by provider
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByProvider(providerId, filters = {}) {
    try {
      const { page = 1, limit = 20, status = '', dateFrom = '', dateTo = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE i.provider_company_id = $1';
      let queryParams = [providerId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND i.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (dateFrom) {
        whereClause += ` AND i.created_at >= $${++paramCount}`;
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND i.created_at <= $${++paramCount}`;
        queryParams.push(dateTo);
      }

      const query = `
        SELECT 
          i.*,
          c.name as client_company_name,
          COUNT(*) OVER() as total_count
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return {
        invoices: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findByProvider:', error);
      throw new Error(`Failed to find invoices: ${error.message}`);
    }
  }

  /**
   * Find invoice by ID
   * @param {number} invoiceId - Invoice ID
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object|null>}
   */
  async findById(invoiceId, providerId) {
    try {
      const query = `
        SELECT 
          i.*,
          c.name as client_company_name,
          c.email as client_contact_email
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        WHERE i.invoice_id = $1 AND i.provider_company_id = $2
      `;
      
      const result = await this.db.query(query, [invoiceId, providerId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findById:', error);
      throw new Error(`Failed to find invoice by ID: ${error.message}`);
    }
  }

  /**
   * Find invoice by ID for client
   * @param {number} invoiceId - Invoice ID
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object|null>}
   */
  async findByIdForClient(invoiceId, clientCompanyId) {
    try {
      const query = `
        SELECT 
          i.*,
          p.name as provider_company_name,
          p.email as provider_contact_email,
          c.name as client_company_name
        FROM invoices i
        LEFT JOIN companies p ON i.provider_company_id = p.company_id
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        WHERE i.invoice_id = $1 AND i.client_company_id = $2
      `;
      
      const result = await this.db.query(query, [invoiceId, clientCompanyId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findByIdForClient:', error);
      throw new Error(`Failed to find invoice by ID for client: ${error.message}`);
    }
  }

  /**
   * Create new invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>}
   */
  async create(invoiceData) {
    try {
      const query = `
        INSERT INTO invoices (
          provider_company_id, client_company_id, invoice_number, 
          subtotal, tax_amount, total_amount, status, due_date, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        invoiceData.providerCompanyId,
        invoiceData.clientCompanyId,
        invoiceData.invoiceNumber,
        invoiceData.subtotal,
        invoiceData.taxAmount || 0,
        invoiceData.totalAmount,
        invoiceData.status || 'PENDING',
        invoiceData.dueDate,
        invoiceData.description || ''
      ];
      
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.create:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Update invoice
   * @param {number} invoiceId - Invoice ID
   * @param {Object} updateData - Update data
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object>}
   */
  async update(invoiceId, updateData, providerId) {
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 3}`)
        .join(', ');
      
      const query = `
        UPDATE invoices 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id = $1 AND provider_company_id = $2
        RETURNING *
      `;
      
      const values = [invoiceId, providerId, ...Object.values(updateData)];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.update:', error);
      throw new Error(`Failed to update invoice: ${error.message}`);
    }
  }

  /**
   * Delete invoice
   * @param {number} invoiceId - Invoice ID
   * @param {number} providerId - Provider company ID
   * @returns {Promise<boolean>}
   */
  async delete(invoiceId, providerId) {
    try {
      const query = `
        DELETE FROM invoices 
        WHERE invoice_id = $1 AND provider_company_id = $2
        RETURNING invoice_id
      `;
      
      const result = await this.db.query(query, [invoiceId, providerId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.delete:', error);
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }

  /**
   * Get provider revenue statistics (for dashboard)
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(providerId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END), 0) as paid_revenue,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN total_amount ELSE 0 END), 0) as pending_revenue
        FROM invoices 
        WHERE provider_company_id = $1
      `;
      
      const result = await this.db.query(query, [providerId]);
      
      return {
        totalInvoices: parseInt(result.rows[0].total_invoices) || 0,
        pendingCount: parseInt(result.rows[0].pending_count) || 0,
        paidCount: parseInt(result.rows[0].paid_count) || 0,
        overdueCount: parseInt(result.rows[0].overdue_count) || 0,
        totalRevenue: parseFloat(result.rows[0].total_revenue) || 0,
        paidRevenue: parseFloat(result.rows[0].paid_revenue) || 0,
        pendingRevenue: parseFloat(result.rows[0].pending_revenue) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getProviderStatistics:', error);
      throw new Error(`Failed to get invoice statistics: ${error.message}`);
    }
  }

  /**
   * Get monthly revenue (for dashboard charts)
   * @param {number} providerId - Provider company ID
   * @param {number} months - Number of months back
   * @returns {Promise<Array>}
   */
  async getMonthlyRevenue(providerId, months = 12) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(*) as invoice_count
        FROM invoices 
        WHERE provider_company_id = $1 
          AND created_at >= CURRENT_DATE - INTERVAL '${months} months'
          AND status = 'PAID'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `;
      
      const result = await this.db.query(query, [providerId]);
      
      return result.rows.map(row => ({
        month: row.month,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        invoiceCount: parseInt(row.invoice_count) || 0
      }));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getMonthlyRevenue:', error);
      throw new Error(`Failed to get monthly revenue: ${error.message}`);
    }
  }

  /**
   * Find invoices by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      const { page = 1, limit = 20, status = '', paymentStatus = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE i.client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND i.status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (paymentStatus) {
        whereClause += ` AND i.payment_status = $${++paramCount}`;
        queryParams.push(paymentStatus);
      }

      const query = `
        SELECT 
          i.*,
          p.name as provider_company_name,
          COUNT(*) OVER() as total_count
        FROM invoices i
        LEFT JOIN companies p ON i.provider_company_id = p.company_id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      queryParams.push(limit, offset);
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findByClientCompany:', error);
      throw new Error(`Failed to find invoices by client: ${error.message}`);
    }
  }

  /**
   * Count invoices by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<number>}
   */
  async countByClientCompany(clientCompanyId, filters = {}) {
    try {
      const { status = '', paymentStatus = '' } = filters;
      
      let whereClause = 'WHERE client_company_id = $1';
      let queryParams = [clientCompanyId];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND status = $${++paramCount}`;
        queryParams.push(status);
      }

      if (paymentStatus) {
        whereClause += ` AND payment_status = $${++paramCount}`;
        queryParams.push(paymentStatus);
      }

      const query = `
        SELECT COUNT(*) as total
        FROM invoices 
        ${whereClause}
      `;
      
      const result = await this.db.query(query, queryParams);
      return parseInt(result.rows[0].total) || 0;
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.countByClientCompany:', error);
      throw new Error(`Failed to count invoices by client: ${error.message}`);
    }
  }

  /**
   * Get client statistics (for dashboard)
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientStatistics(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_invoices,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN total_amount END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'PAID' THEN total_amount END), 0) as total_paid
        FROM invoices 
        WHERE client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      
      return {
        totalInvoices: parseInt(result.rows[0].total_invoices) || 0,
        pendingInvoices: parseInt(result.rows[0].pending_invoices) || 0,
        paidInvoices: parseInt(result.rows[0].paid_invoices) || 0,
        overdueInvoices: parseInt(result.rows[0].overdue_invoices) || 0,
        pendingAmount: parseFloat(result.rows[0].pending_amount) || 0,
        totalPaid: parseFloat(result.rows[0].total_paid) || 0
      };
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getClientStatistics:', error);
      throw new Error(`Failed to get client invoice statistics: ${error.message}`);
    }
  }

  /**
   * Find invoices by rental
   * @param {number} rentalId - Rental ID
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>}
   */
  async findByRental(rentalId, filters = {}) {
    try {
      const { limit = 50 } = filters;
      
      const query = `
        SELECT i.*, 
               p.name as provider_company_name,
               c.name as client_company_name
        FROM invoices i
        LEFT JOIN companies p ON i.provider_company_id = p.company_id
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        WHERE i.rental_id = $1
        ORDER BY i.issue_date DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [rentalId, limit]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findByRental:', error);
      throw new Error(`Failed to find invoices by rental: ${error.message}`);
    }
  }

  /**
   * Get payment history for a rental
   * @param {number} rentalId - Rental ID
   * @returns {Promise<Array>}
   */
  async getPaymentHistory(rentalId) {
    try {
      const query = `
        SELECT 
          i.invoice_id,
          i.invoice_number,
          i.issue_date,
          i.due_date,
          i.total_amount,
          i.paid_amount,
          i.paid_date,
          i.status,
          i.payment_method
        FROM invoices i
        WHERE i.rental_id = $1 AND i.status = 'PAID'
        ORDER BY i.paid_date DESC
      `;
      
      const result = await this.db.query(query, [rentalId]);
      return result.rows;
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getPaymentHistory:', error);
      throw new Error(`Failed to get payment history: ${error.message}`);
    }
  }

  /**
   * Get recent payments for provider (for dashboard activities)
   * @param {number} providerCompanyId - Provider company ID
   * @param {number} limit - Maximum number of payments to return
   * @returns {Promise<Array>}
   */
  async getRecentPaymentsByProvider(providerCompanyId, limit = 10) {
    try {
      const query = `
        SELECT 
          i.*,
          c.name as client_company_name
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        WHERE i.provider_company_id = $1
          AND i.status = 'PAID'
          AND i.paid_date IS NOT NULL
        ORDER BY i.paid_date DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [providerCompanyId, limit]);
      
      return result.rows.map(row => ({
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        clientCompanyName: row.client_company_name,
        totalAmount: parseFloat(row.total_amount || 0),
        paidDate: row.paid_date,
        status: row.status
      }));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getRecentPaymentsByProvider:', error);
      // Return empty array on error
      return [];
    }
  }

  // Private helper methods

  /**
   * Map database row to entity
   * @param {Object} row - Database row
   * @returns {Object} Mapped entity
   */
  mapRowToEntity(row) {
    return {
      invoiceId: row.invoice_id,
      providerCompanyId: row.provider_company_id,
      providerCompanyName: row.provider_company_name,
      clientCompanyId: row.client_company_id,
      clientCompanyName: row.client_company_name,
      rentalId: row.rental_id,
      invoiceNumber: row.invoice_number,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      subtotal: parseFloat(row.subtotal) || 0,
      taxAmount: parseFloat(row.tax_amount) || 0,
      totalAmount: parseFloat(row.total_amount) || 0,
      paidAmount: parseFloat(row.paid_amount) || 0,
      paidDate: row.paid_date,
      status: row.status,
      paymentMethod: row.payment_method,
      description: row.description,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Convert camelCase to snake_case
   * @param {string} str - String in camelCase
   * @returns {string} String in snake_case
   */
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = PostgreSQLInvoiceRepository;
