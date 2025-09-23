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
          c.contact_email as client_contact_email
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

  // Private helper methods

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
