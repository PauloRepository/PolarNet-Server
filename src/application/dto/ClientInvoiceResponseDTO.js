/**
 * DTO: Client Invoice Response
 * Structures invoice data for CLIENT responses
 */
class ClientInvoiceResponseDTO {
  
  /**
   * Format invoice list response
   * @param {Array} invoices - Raw invoice data
   * @returns {Array} Formatted invoice list
   */
  static formatInvoiceList(invoices) {
    return invoices.map(invoice => ({
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      basicInfo: {
        description: invoice.description,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        status: invoice.status
      },
      provider: {
        companyId: invoice.providerCompanyId,
        companyName: invoice.providerCompanyName
      },
      related: {
        rentalId: invoice.rentalId,
        serviceRequestId: invoice.serviceRequestId,
        equipmentName: invoice.equipmentName
      },
      financial: {
        totalAmount: parseFloat(invoice.totalAmount),
        paidAmount: parseFloat(invoice.paidAmount || 0),
        remainingAmount: parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0),
        currency: invoice.currency || 'CLP',
        taxAmount: parseFloat(invoice.taxAmount || 0),
        discountAmount: parseFloat(invoice.discountAmount || 0)
      },
      status: {
        isPaid: invoice.status === 'PAID',
        isPending: invoice.status === 'PENDING',
        isOverdue: this.isOverdue(invoice.dueDate, invoice.status),
        isPartiallyPaid: this.isPartiallyPaid(invoice.totalAmount, invoice.paidAmount),
        daysOverdue: this.calculateDaysOverdue(invoice.dueDate, invoice.status)
      },
      payment: {
        method: invoice.paymentMethod,
        date: invoice.paymentDate
      },
      metadata: {
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      }
    }));
  }

  /**
   * Format single invoice details
   * @param {Object} invoice - Raw invoice data
   * @returns {Object} Formatted invoice details
   */
  static formatInvoiceDetails(invoice) {
    return {
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      basicInfo: {
        description: invoice.description,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        notes: invoice.notes
      },
      provider: {
        companyId: invoice.providerCompanyId,
        companyInfo: {
          name: invoice.providerCompanyName,
          email: invoice.providerEmail,
          phone: invoice.providerPhone,
          address: invoice.providerAddress,
          taxId: invoice.providerTaxId
        }
      },
      client: {
        companyId: invoice.clientCompanyId,
        companyInfo: {
          name: invoice.clientCompanyName,
          email: invoice.clientEmail,
          address: invoice.clientAddress,
          taxId: invoice.clientTaxId
        }
      },
      related: {
        rental: invoice.rentalId ? {
          id: invoice.rentalId,
          equipmentName: invoice.equipmentName,
          startDate: invoice.rentalStartDate,
          endDate: invoice.rentalEndDate,
          monthlyRate: parseFloat(invoice.monthlyRate || 0)
        } : null,
        serviceRequest: invoice.serviceRequestId ? {
          id: invoice.serviceRequestId,
          title: invoice.serviceRequestTitle,
          type: invoice.serviceRequestType,
          completedAt: invoice.serviceCompletedAt
        } : null
      },
      financial: {
        subtotal: this.calculateSubtotal(invoice),
        taxAmount: parseFloat(invoice.taxAmount || 0),
        discountAmount: parseFloat(invoice.discountAmount || 0),
        totalAmount: parseFloat(invoice.totalAmount),
        paidAmount: parseFloat(invoice.paidAmount || 0),
        remainingAmount: parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0),
        currency: invoice.currency || 'CLP'
      },
      lineItems: invoice.lineItems ? JSON.parse(invoice.lineItems).map(item => ({
        id: item.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice)
      })) : [],
      status: {
        isPaid: invoice.status === 'PAID',
        isPending: invoice.status === 'PENDING',
        isOverdue: this.isOverdue(invoice.dueDate, invoice.status),
        isCancelled: invoice.status === 'CANCELLED',
        isPartiallyPaid: this.isPartiallyPaid(invoice.totalAmount, invoice.paidAmount),
        canBePaid: this.canBePaid(invoice.status),
        canBeCancelled: this.canBeCancelled(invoice.status, invoice.paidAmount),
        daysOverdue: this.calculateDaysOverdue(invoice.dueDate, invoice.status)
      },
      payment: {
        method: invoice.paymentMethod,
        date: invoice.paymentDate,
        history: invoice.paymentHistory ? JSON.parse(invoice.paymentHistory) : []
      },
      attachments: invoice.attachments ? JSON.parse(invoice.attachments) : [],
      metadata: {
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      }
    };
  }

  /**
   * Format payment record validation
   * @param {Object} data - Payment data to validate
   * @param {number} remainingAmount - Remaining amount on invoice
   * @returns {Object} Validation result
   */
  static validatePaymentData(data, remainingAmount) {
    const errors = [];
    const validatedData = {};

    if (!data.amount) {
      errors.push('Payment amount is required');
    } else {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push('Payment amount must be a positive number');
      } else if (amount > remainingAmount) {
        errors.push('Payment amount cannot exceed remaining balance');
      } else {
        validatedData.amount = amount;
      }
    }

    if (!data.paymentMethod) {
      errors.push('Payment method is required');
    } else if (!this.isValidPaymentMethod(data.paymentMethod)) {
      errors.push('Invalid payment method');
    } else {
      validatedData.paymentMethod = data.paymentMethod;
    }

    if (data.paymentDate) {
      const paymentDate = new Date(data.paymentDate);
      if (isNaN(paymentDate.getTime())) {
        errors.push('Invalid payment date format');
      } else {
        validatedData.paymentDate = paymentDate;
      }
    } else {
      validatedData.paymentDate = new Date();
    }

    if (data.reference) {
      validatedData.reference = data.reference.trim();
    }

    if (data.notes) {
      validatedData.notes = data.notes.trim();
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData
    };
  }

  /**
   * Format invoice statistics
   * @param {Object} stats - Raw statistics data
   * @returns {Object} Formatted statistics
   */
  static formatInvoiceStatistics(stats) {
    return {
      total: parseInt(stats.total || 0),
      byStatus: {
        pending: parseInt(stats.pending || 0),
        paid: parseInt(stats.paid || 0),
        overdue: parseInt(stats.overdue || 0),
        cancelled: parseInt(stats.cancelled || 0),
        partiallyPaid: parseInt(stats.partiallyPaid || 0)
      },
      financial: {
        totalAmount: parseFloat(stats.totalAmount || 0),
        paidAmount: parseFloat(stats.paidAmount || 0),
        pendingAmount: parseFloat(stats.pendingAmount || 0),
        overdueAmount: parseFloat(stats.overdueAmount || 0),
        averageInvoiceAmount: parseFloat(stats.averageInvoiceAmount || 0)
      },
      aging: {
        current: parseFloat(stats.current || 0),        // 0-30 days
        days30: parseFloat(stats.days30 || 0),          // 31-60 days
        days60: parseFloat(stats.days60 || 0),          // 61-90 days
        days90Plus: parseFloat(stats.days90Plus || 0)   // 90+ days
      },
      trends: {
        thisMonth: parseFloat(stats.thisMonth || 0),
        lastMonth: parseFloat(stats.lastMonth || 0),
        growthPercentage: this.calculateGrowthPercentage(stats.thisMonth, stats.lastMonth)
      }
    };
  }

  // Helper methods
  static isOverdue(dueDate, status) {
    if (!dueDate || status === 'PAID' || status === 'CANCELLED') {
      return false;
    }
    return new Date(dueDate) < new Date();
  }

  static isPartiallyPaid(totalAmount, paidAmount) {
    const total = parseFloat(totalAmount);
    const paid = parseFloat(paidAmount || 0);
    return paid > 0 && paid < total;
  }

  static calculateDaysOverdue(dueDate, status) {
    if (!this.isOverdue(dueDate, status)) return 0;
    const diffTime = new Date() - new Date(dueDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static calculateSubtotal(invoice) {
    return parseFloat(invoice.totalAmount) - parseFloat(invoice.taxAmount || 0) + parseFloat(invoice.discountAmount || 0);
  }

  static canBePaid(status) {
    return ['PENDING', 'OVERDUE'].includes(status);
  }

  static canBeCancelled(status, paidAmount) {
    return status === 'PENDING' && parseFloat(paidAmount || 0) === 0;
  }

  static isValidPaymentMethod(method) {
    const validMethods = ['CASH', 'TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE'];
    return validMethods.includes(method);
  }

  static calculateGrowthPercentage(current, previous) {
    const curr = parseFloat(current || 0);
    const prev = parseFloat(previous || 0);
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev * 100).toFixed(2);
  }
}

module.exports = ClientInvoiceResponseDTO;
