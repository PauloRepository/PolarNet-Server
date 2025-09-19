const IInvoiceRepository = require('../../domain/repositories/IInvoiceRepository');
const Invoice = require('../../domain/entities/Invoice');

/**
 * PostgreSQL Implementation: Invoice Repository
 * Implements invoice and billing data persistence using PostgreSQL
 */
class PostgreSQLInvoiceRepository extends IInvoiceRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Find invoice by ID
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<Invoice|null>}
   */
  async findById(invoiceId) {
    try {
      const query = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.invoice_id = $1
      `;
      
      const result = await this.db.query(query, [invoiceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findById:', error);
      throw new Error(`Failed to find invoice by ID: ${error.message}`);
    }
  }

  /**
   * Find invoice by number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise<Invoice|null>}
   */
  async findByNumber(invoiceNumber) {
    try {
      const query = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.invoice_number = $1
      `;
      
      const result = await this.db.query(query, [invoiceNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findByNumber:', error);
      throw new Error(`Failed to find invoice by number: ${error.message}`);
    }
  }

  /**
   * Find invoices by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Invoice[]>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    try {
      let query = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.client_company_id = $1
      `;
      
      const params = [clientCompanyId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND i.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND i.issue_date >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND i.issue_date <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      if (filters.dueDateFrom) {
        paramCount++;
        query += ` AND i.due_date >= $${paramCount}`;
        params.push(filters.dueDateFrom);
      }

      if (filters.dueDateTo) {
        paramCount++;
        query += ` AND i.due_date <= $${paramCount}`;
        params.push(filters.dueDateTo);
      }

      if (filters.minAmount) {
        paramCount++;
        query += ` AND i.total_amount >= $${paramCount}`;
        params.push(filters.minAmount);
      }

      if (filters.maxAmount) {
        paramCount++;
        query += ` AND i.total_amount <= $${paramCount}`;
        params.push(filters.maxAmount);
      }

      query += ` ORDER BY i.issue_date DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findByClientCompany:', error);
      throw new Error(`Failed to find invoices by client company: ${error.message}`);
    }
  }

  /**
   * Find pending invoices for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Invoice[]>}
   */
  async findPendingByClient(clientCompanyId) {
    try {
      const query = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.client_company_id = $1 
          AND i.status = 'PENDING'
         
        ORDER BY i.due_date ASC
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findPendingByClient:', error);
      throw new Error(`Failed to find pending invoices: ${error.message}`);
    }
  }

  /**
   * Find overdue invoices for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Invoice[]>}
   */
  async findOverdueByClient(clientCompanyId) {
    try {
      const query = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.client_company_id = $1 
          AND i.status = 'PENDING'
          AND i.due_date < CURRENT_DATE
         
        ORDER BY i.due_date ASC
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findOverdueByClient:', error);
      throw new Error(`Failed to find overdue invoices: ${error.message}`);
    }
  }

  /**
   * Find invoices by rental
   * @param {number} rentalId - Rental ID
   * @returns {Promise<Invoice[]>}
   */
  async findByRental(rentalId) {
    try {
      const query = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.rental_id = $1
        ORDER BY i.issue_date DESC
      `;
      
      const result = await this.db.query(query, [rentalId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findByRental:', error);
      throw new Error(`Failed to find invoices by rental: ${error.message}`);
    }
  }

  /**
   * Get client payment summary
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientPaymentSummary(clientCompanyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN 1 END) as overdue_invoices,
          SUM(total_amount) as total_billed,
          SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN status = 'PENDING' THEN total_amount ELSE 0 END) as total_pending,
          SUM(CASE WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN total_amount ELSE 0 END) as total_overdue,
          AVG(CASE WHEN status = 'PAID' AND paid_date IS NOT NULL AND issue_date IS NOT NULL 
              THEN (paid_date::date - issue_date::date) END) as avg_payment_days
        FROM invoices
        WHERE client_company_id = $1
      `;
      
      const result = await this.db.query(query, [clientCompanyId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getClientPaymentSummary:', error);
      throw new Error(`Failed to get client payment summary: ${error.message}`);
    }
  }

  /**
   * Get recent payments for client
   * @param {number} clientCompanyId - Client company ID
   * @param {number} limit - Number of recent payments
   * @returns {Promise<Invoice[]>}
   */
  async getRecentPayments(clientCompanyId, limit = 10) {
    try {
      const query = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE i.client_company_id = $1 
          AND i.status = 'PAID'
         
        ORDER BY i.paid_date DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [clientCompanyId, limit]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getRecentPayments:', error);
      throw new Error(`Failed to get recent payments: ${error.message}`);
    }
  }

  /**
   * Create new invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Invoice>}
   */
  async create(invoiceData) {
    try {
      const query = `
        INSERT INTO invoices (
          invoice_number, client_company_id, rental_id, issue_date, due_date,
          subtotal, tax_amount, total_amount, currency, status, payment_method,
          line_items, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
  ) RETURNING invoice_id
      `;
      
      const now = new Date();
      const params = [
        invoiceData.invoiceNumber,
        invoiceData.clientCompanyId,
        invoiceData.rentalId,
        invoiceData.invoiceDate,
        invoiceData.dueDate,
        invoiceData.subtotal,
        invoiceData.taxAmount || 0,
        invoiceData.totalAmount,
        invoiceData.currency || 'CLP',
        invoiceData.status || 'PENDING',
        invoiceData.paymentMethod,
        JSON.stringify(invoiceData.lineItems || []),
        invoiceData.notes,
        invoiceData.createdAt || now,
        now
      ];

  const result = await this.db.query(query, params);
  return await this.findById(result.rows[0].invoice_id);
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.create:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Update invoice
   * @param {number} invoiceId - Invoice ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Invoice>}
   */
  async update(invoiceId, updateData) {
    try {
      const allowedFields = [
        'due_date', 'subtotal', 'tax_amount', 'total_amount', 'status',
        'payment_method', 'line_items', 'notes', 'paid_date', 'payment_reference'
      ];
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      // Build dynamic update query
      allowedFields.forEach(field => {
        const camelField = this.snakeToCamel(field);
        if (updateData[camelField] !== undefined) {
          paramCount++;
          if (field === 'line_items' && typeof updateData[camelField] === 'object') {
            updateFields.push(`${field} = $${paramCount}`);
            params.push(JSON.stringify(updateData[camelField]));
          } else {
            updateFields.push(`${field} = $${paramCount}`);
            params.push(updateData[camelField]);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      // Add invoice ID parameter
      paramCount++;
      params.push(invoiceId);

      const query = `
        UPDATE invoices 
        SET ${updateFields.join(', ')}
        WHERE invoice_id = $${paramCount}
        RETURNING invoice_id
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      return await this.findById(result.rows[0].invoice_id);
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.update:', error);
      throw new Error(`Failed to update invoice: ${error.message}`);
    }
  }

  /**
   * Delete invoice (soft delete)
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<boolean>}
   */
  async delete(invoiceId) {
    try {
      const query = `
        UPDATE invoices 
        SET deleted_at = $1, status = 'CANCELLED'
  WHERE invoice_id = $2
  RETURNING invoice_id
      `;

  const result = await this.db.query(query, [new Date(), invoiceId]);
  return result.rows.length > 0;
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.delete:', error);
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }

  /**
   * Process payment
   * @param {number} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Invoice>}
   */
  async processPayment(invoiceId, paymentData) {
    try {
      const query = `
        UPDATE invoices 
        SET status = 'PAID',
            paid_date = $1,
            payment_method = $2,
            payment_reference = $3,
            updated_at = $4
  WHERE invoice_id = $5
  RETURNING invoice_id
      `;

      const result = await this.db.query(query, [
        paymentData.paidDate || new Date(),
        paymentData.paymentMethod,
        paymentData.paymentReference,
        new Date(),
        invoiceId
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      return await this.findById(result.rows[0].invoice_id);
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.processPayment:', error);
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  /**
   * Create correction invoice
   * @param {number} originalInvoiceId - Original invoice ID
   * @param {Object} correctionData - Correction data
   * @returns {Promise<Invoice>}
   */
  async createCorrection(originalInvoiceId, correctionData) {
    try {
      // Get original invoice
      const originalInvoice = await this.findById(originalInvoiceId);
      if (!originalInvoice) {
        throw new Error('Original invoice not found');
      }

      // Generate correction invoice number
      const correctionNumber = `${originalInvoice.invoiceNumber}-C${Date.now()}`;

      const correctionInvoice = {
        invoiceNumber: correctionNumber,
        clientCompanyId: originalInvoice.clientCompanyId,
        rentalId: originalInvoice.rentalId,
        invoiceDate: new Date(),
        dueDate: correctionData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        subtotal: correctionData.subtotal,
        taxAmount: correctionData.taxAmount,
        totalAmount: correctionData.totalAmount,
        currency: originalInvoice.currency,
        status: 'PENDING',
        lineItems: correctionData.lineItems,
        notes: `Correction for invoice ${originalInvoice.invoiceNumber}. ${correctionData.notes || ''}`
      };

      return await this.create(correctionInvoice);
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.createCorrection:', error);
      throw new Error(`Failed to create correction invoice: ${error.message}`);
    }
  }

  /**
   * Generate invoice number
   * @param {string} prefix - Invoice number prefix
   * @returns {Promise<string>} Generated invoice number
   */
  async generateInvoiceNumber(prefix = 'INV') {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM invoices
        WHERE invoice_number LIKE $1
          AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      `;
      
      const yearPrefix = `${prefix}-${new Date().getFullYear()}-%`;
      const result = await this.db.query(query, [yearPrefix]);
      
      const count = parseInt(result.rows[0].count) + 1;
      const paddedCount = count.toString().padStart(6, '0');
      
      return `${prefix}-${new Date().getFullYear()}-${paddedCount}`;
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.generateInvoiceNumber:', error);
      throw new Error(`Failed to generate invoice number: ${error.message}`);
    }
  }

  /**
   * Get invoice analytics
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async getInvoiceAnalytics(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_invoices,
          SUM(total_amount) as total_amount,
          AVG(total_amount) as avg_amount,
          COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN 1 END) as overdue_count,
          SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as paid_amount,
          SUM(CASE WHEN status = 'PENDING' THEN total_amount ELSE 0 END) as pending_amount,
          SUM(CASE WHEN status = 'PENDING' AND due_date < CURRENT_DATE THEN total_amount ELSE 0 END) as overdue_amount
        FROM invoices
        
      `;
      
      const params = [];
      let paramCount = 0;

      if (filters.clientCompanyId) {
        paramCount++;
        query += ` AND client_company_id = $${paramCount}`;
        params.push(filters.clientCompanyId);
      }

      if (filters.dateFrom) {
        paramCount++;
        query += ` AND issue_date >= $${paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        query += ` AND issue_date <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.getInvoiceAnalytics:', error);
      throw new Error(`Failed to get invoice analytics: ${error.message}`);
    }
  }

  /**
   * Get invoices with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Invoices with pagination info
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        clientCompanyId,
        status,
        sortBy = 'issue_date',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      const params = [];
      let paramCount = 0;

      if (clientCompanyId) {
        paramCount++;
        whereConditions.push(`i.client_company_id = $${paramCount}`);
        params.push(clientCompanyId);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`i.status = $${paramCount}`);
        params.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM invoices i
        WHERE ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get invoices
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      
      const dataQuery = `
        SELECT i.*,
               c.name as client_company_name, c.type as client_company_type,
               c.tax_id as client_tax_id, c.address as client_address,
               ar.rental_id, ar.equipment_id, ar.monthly_rate,
               e.serial_number, e.type as equipment_type, e.manufacturer, e.model
        FROM invoices i
        LEFT JOIN companies c ON i.client_company_id = c.company_id
        LEFT JOIN active_rentals ar ON i.rental_id = ar.rental_id
        LEFT JOIN equipments e ON ar.equipment_id = e.equipment_id
        WHERE ${whereClause}
        ORDER BY i.${sortBy} ${sortOrder}
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;
      
      params.push(limit, offset);
      const dataResult = await this.db.query(dataQuery, params);

      return {
        data: dataResult.rows.map(row => this.mapRowToEntity(row)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in PostgreSQLInvoiceRepository.findWithPagination:', error);
      throw new Error(`Failed to get invoices with pagination: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Convert snake_case to camelCase
   * @param {string} str - String in snake_case
   * @returns {string} String in camelCase
   */
  snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Map database row to Invoice entity
   * @param {Object} row - Database row
   * @returns {Invoice} Invoice entity
   */
  mapRowToEntity(row) {
    return new Invoice({
      id: row.invoice_id,
      invoiceNumber: row.invoice_number,
      clientCompanyId: row.client_company_id,
      rentalId: row.rental_id,
      invoiceDate: row.issue_date,
      dueDate: row.due_date,
      subtotal: row.subtotal,
      taxAmount: row.tax_amount,
      totalAmount: row.total_amount,
      currency: row.currency,
      status: row.status,
      paymentMethod: row.payment_method,
      lineItems: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
      notes: row.notes,
      paidDate: row.paid_date,
      paymentReference: row.payment_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

module.exports = PostgreSQLInvoiceRepository;

