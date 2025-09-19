/**
 * Domain Entity: Invoice
 * Represents an invoice in the system for rentals and services
 */
class Invoice {
  constructor({
    invoiceId,
    invoiceNumber,
    clientCompanyId,
    providerCompanyId,
    rentalId,
    serviceRequestId,
    invoiceDate,
    dueDate,
    status = 'PENDING', // PENDING, PAID, OVERDUE, CANCELLED
    totalAmount,
    paidAmount = 0,
    currency = 'CLP',
    taxAmount,
    discountAmount = 0,
    description,
    lineItems = [],
    paymentMethod,
    paymentDate,
    notes,
    attachments,
    createdAt,
    updatedAt
  }) {
    this.invoiceId = invoiceId;
    this.invoiceNumber = invoiceNumber;
    this.clientCompanyId = clientCompanyId;
    this.providerCompanyId = providerCompanyId;
    this.rentalId = rentalId;
    this.serviceRequestId = serviceRequestId;
    this.invoiceDate = invoiceDate;
    this.dueDate = dueDate;
    this.status = status;
    this.totalAmount = totalAmount;
    this.paidAmount = paidAmount;
    this.currency = currency;
    this.taxAmount = taxAmount;
    this.discountAmount = discountAmount;
    this.description = description;
    this.lineItems = lineItems;
    this.paymentMethod = paymentMethod;
    this.paymentDate = paymentDate;
    this.notes = notes;
    this.attachments = attachments;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Business rules
  isPending() {
    return this.status === 'PENDING';
  }

  isPaid() {
    return this.status === 'PAID';
  }

  isOverdue() {
    return this.status === 'OVERDUE' || (this.isPending() && new Date(this.dueDate) < new Date());
  }

  isCancelled() {
    return this.status === 'CANCELLED';
  }

  isPartiallyPaid() {
    return this.paidAmount > 0 && this.paidAmount < this.totalAmount;
  }

  getRemainingAmount() {
    return this.totalAmount - this.paidAmount;
  }

  getNetAmount() {
    return this.totalAmount - this.taxAmount - this.discountAmount;
  }

  getDaysOverdue() {
    if (!this.isOverdue()) return 0;
    const diffTime = new Date() - new Date(this.dueDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  canBePaid() {
    return this.isPending() && !this.isCancelled();
  }

  canBeCancelled() {
    return this.isPending() && this.paidAmount === 0;
  }

  recordPayment(amount, paymentMethod, paymentDate = new Date()) {
    if (!this.canBePaid()) {
      throw new Error('Invoice cannot be paid in current state');
    }

    if (amount <= 0 || amount > this.getRemainingAmount()) {
      throw new Error('Invalid payment amount');
    }

    this.paidAmount += amount;
    this.paymentMethod = paymentMethod;
    this.paymentDate = paymentDate;

    if (this.paidAmount >= this.totalAmount) {
      this.status = 'PAID';
    }

    this.updatedAt = new Date();
  }

  markAsOverdue() {
    if (this.isPending() && new Date(this.dueDate) < new Date()) {
      this.status = 'OVERDUE';
      this.updatedAt = new Date();
    }
  }

  cancel() {
    if (!this.canBeCancelled()) {
      throw new Error('Invoice cannot be cancelled');
    }
    this.status = 'CANCELLED';
    this.updatedAt = new Date();
  }

  addLineItem(lineItem) {
    this.lineItems.push(lineItem);
    this.recalculateTotal();
  }

  removeLineItem(lineItemId) {
    this.lineItems = this.lineItems.filter(item => item.id !== lineItemId);
    this.recalculateTotal();
  }

  recalculateTotal() {
    const subtotal = this.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    this.totalAmount = subtotal + this.taxAmount - this.discountAmount;
    this.updatedAt = new Date();
  }

  belongsToClient(clientCompanyId) {
    return this.clientCompanyId === clientCompanyId;
  }

  belongsToProvider(providerCompanyId) {
    return this.providerCompanyId === providerCompanyId;
  }

  isForRental(rentalId) {
    return this.rentalId === rentalId;
  }

  isForService(serviceRequestId) {
    return this.serviceRequestId === serviceRequestId;
  }
}

module.exports = Invoice;
