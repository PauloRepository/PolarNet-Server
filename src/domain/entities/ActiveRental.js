/**
 * Domain Entity: ActiveRental
 * Represents an active rental contract between a client and provider
 */
class ActiveRental {
  constructor({
    rentalId,
    equipmentId,
    clientCompanyId,
    providerCompanyId,
    startDate,
    endDate,
    monthlyRate,
    currency = 'CLP',
    securityDeposit,
    status = 'ACTIVE', // ACTIVE, EXPIRED, TERMINATED
    renewalTerms,
    specialConditions,
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
    this.currency = currency;
    this.securityDeposit = securityDeposit;
    this.status = status;
    this.renewalTerms = renewalTerms;
    this.specialConditions = specialConditions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Business rules
  isActive() {
    return this.status === 'ACTIVE' && !this.isExpired();
  }

  isExpired() {
    return new Date(this.endDate) < new Date();
  }

  isNearExpiration(daysThreshold = 30) {
    const daysUntilExpiration = Math.ceil((new Date(this.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= daysThreshold && daysUntilExpiration > 0;
  }

  getTotalCost() {
    const months = this.getRentalDurationInMonths();
    return this.monthlyRate * months;
  }

  getRentalDurationInMonths() {
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 30); // Approximate months
  }

  extend(newEndDate) {
    if (new Date(newEndDate) <= new Date(this.endDate)) {
      throw new Error('New end date must be after current end date');
    }
    this.endDate = newEndDate;
    this.updatedAt = new Date();
  }

  terminate() {
    this.status = 'TERMINATED';
    this.endDate = new Date();
    this.updatedAt = new Date();
  }

  updateRate(newRate) {
    if (newRate <= 0) {
      throw new Error('Rate must be positive');
    }
    this.monthlyRate = newRate;
    this.updatedAt = new Date();
  }

  belongsToClient(clientCompanyId) {
    return this.clientCompanyId === clientCompanyId;
  }

  belongsToProvider(providerCompanyId) {
    return this.providerCompanyId === providerCompanyId;
  }
}

module.exports = ActiveRental;
