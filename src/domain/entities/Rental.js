/**
 * Rental Entity - Aggregate Root
 * Representa un contrato de renta de equipo
 */
class Rental {
  constructor({
    rentalId,
    equipmentId,
    clientCompanyId,
    providerCompanyId,
    startDate,
    endDate,
    monthlyRate,
    securityDeposit,
    status, // 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'EXPIRED'
    paymentTerms,
    contractTerms,
    notes,
    createdAt,
    updatedAt
  }) {
    this.rentalId = rentalId;
    this.equipmentId = equipmentId;
    this.clientCompanyId = clientCompanyId;
    this.providerCompanyId = providerCompanyId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.monthlyRate = monthlyRate;
    this.securityDeposit = securityDeposit;
    this.status = status;
    this.paymentTerms = paymentTerms;
    this.contractTerms = contractTerms;
    this.notes = notes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.equipmentId) {
      throw new Error('Equipment ID is required');
    }

    if (!this.clientCompanyId) {
      throw new Error('Client company ID is required');
    }

    if (!this.providerCompanyId) {
      throw new Error('Provider company ID is required');
    }

    if (!this.startDate) {
      throw new Error('Start date is required');
    }

    if (!this.endDate) {
      throw new Error('End date is required');
    }

    if (new Date(this.startDate) >= new Date(this.endDate)) {
      throw new Error('Start date must be before end date');
    }

    if (!this.monthlyRate || this.monthlyRate <= 0) {
      throw new Error('Monthly rate must be greater than zero');
    }

    if (!this.status || !['ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED'].includes(this.status)) {
      throw new Error('Invalid rental status');
    }
  }

  isActive() {
    return this.status === 'ACTIVE';
  }

  isCompleted() {
    return this.status === 'COMPLETED';
  }

  isTerminated() {
    return this.status === 'TERMINATED';
  }

  isExpired() {
    return this.status === 'EXPIRED';
  }

  hasExpired() {
    return new Date() > new Date(this.endDate);
  }

  daysUntilExpiry() {
    const today = new Date();
    const endDate = new Date(this.endDate);
    const diffTime = endDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateTotalRevenue() {
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth());
    
    return this.monthlyRate * Math.max(1, monthsDiff);
  }

  calculateActualRevenue() {
    const startDate = new Date(this.startDate);
    const today = new Date();
    const endDate = this.isActive() ? 
      (today < new Date(this.endDate) ? today : new Date(this.endDate)) : 
      new Date(this.endDate);
    
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth());
    
    return this.monthlyRate * Math.max(1, monthsDiff);
  }

  extendRental(newEndDate) {
    if (!this.isActive()) {
      throw new Error('Cannot extend a rental that is not active');
    }

    if (new Date(newEndDate) <= new Date(this.endDate)) {
      throw new Error('New end date must be after current end date');
    }

    this.endDate = newEndDate;
    this.updatedAt = new Date();
  }

  terminate(reason) {
    if (!this.isActive()) {
      throw new Error('Cannot terminate a rental that is not active');
    }

    this.status = 'TERMINATED';
    this.notes = this.notes ? `${this.notes}\nTerminated: ${reason}` : `Terminated: ${reason}`;
    this.updatedAt = new Date();
  }

  complete() {
    if (!this.isActive()) {
      throw new Error('Cannot complete a rental that is not active');
    }

    this.status = 'COMPLETED';
    this.updatedAt = new Date();
  }

  markExpired() {
    if (!this.hasExpired()) {
      throw new Error('Rental has not expired yet');
    }

    this.status = 'EXPIRED';
    this.updatedAt = new Date();
  }

  updatePaymentTerms(newTerms) {
    this.paymentTerms = newTerms;
    this.updatedAt = new Date();
  }

  updateMonthlyRate(newRate) {
    if (newRate <= 0) {
      throw new Error('Monthly rate must be greater than zero');
    }

    this.monthlyRate = newRate;
    this.updatedAt = new Date();
  }

  addNote(note) {
    this.notes = this.notes ? `${this.notes}\n${note}` : note;
    this.updatedAt = new Date();
  }
}

module.exports = Rental;
