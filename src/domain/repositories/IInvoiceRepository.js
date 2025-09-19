/**
 * Interface: Invoice Repository
 * Defines the contract for invoice data persistence operations
 */
class IInvoiceRepository {
  
  // Basic CRUD operations
  async findById(invoiceId) {
    throw new Error('Method findById must be implemented');
  }

  async create(invoice) {
    throw new Error('Method create must be implemented');
  }

  async update(invoiceId, data) {
    throw new Error('Method update must be implemented');
  }

  async delete(invoiceId) {
    throw new Error('Method delete must be implemented');
  }

  // Query operations
  async findByStatus(status) {
    throw new Error('Method findByStatus must be implemented');
  }

  async findOverdue() {
    throw new Error('Method findOverdue must be implemented');
  }

  async findPending() {
    throw new Error('Method findPending must be implemented');
  }

  async findByDateRange(startDate, endDate) {
    throw new Error('Method findByDateRange must be implemented');
  }

  async findByInvoiceNumber(invoiceNumber) {
    throw new Error('Method findByInvoiceNumber must be implemented');
  }

  // Client-specific operations
  async findByClient(clientCompanyId, filters = {}) {
    throw new Error('Method findByClient must be implemented');
  }

  async getClientInvoiceMetrics(clientCompanyId) {
    throw new Error('Method getClientInvoiceMetrics must be implemented');
  }

  async getClientOverdueInvoices(clientCompanyId) {
    throw new Error('Method getClientOverdueInvoices must be implemented');
  }

  async getClientPendingInvoices(clientCompanyId) {
    throw new Error('Method getClientPendingInvoices must be implemented');
  }

  async getClientInvoicesByRental(clientCompanyId, rentalId) {
    throw new Error('Method getClientInvoicesByRental must be implemented');
  }

  async getClientTotalDebt(clientCompanyId) {
    throw new Error('Method getClientTotalDebt must be implemented');
  }

  // Provider-specific operations
  async findByProvider(providerCompanyId, filters = {}) {
    throw new Error('Method findByProvider must be implemented');
  }

  async getProviderInvoiceMetrics(providerCompanyId) {
    throw new Error('Method getProviderInvoiceMetrics must be implemented');
  }

  async getProviderRevenue(providerCompanyId, dateRange = {}) {
    throw new Error('Method getProviderRevenue must be implemented');
  }

  // Business operations
  async recordPayment(invoiceId, amount, paymentMethod, paymentDate) {
    throw new Error('Method recordPayment must be implemented');
  }

  async markAsOverdue(invoiceId) {
    throw new Error('Method markAsOverdue must be implemented');
  }

  async cancel(invoiceId) {
    throw new Error('Method cancel must be implemented');
  }

  async generateInvoiceNumber() {
    throw new Error('Method generateInvoiceNumber must be implemented');
  }

  // Related entity operations
  async findByRental(rentalId) {
    throw new Error('Method findByRental must be implemented');
  }

  async findByServiceRequest(serviceRequestId) {
    throw new Error('Method findByServiceRequest must be implemented');
  }
}

module.exports = IInvoiceRepository;
