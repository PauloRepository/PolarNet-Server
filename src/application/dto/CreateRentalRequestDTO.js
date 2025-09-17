/**
 * Create Rental Request DTO
 * Objeto de transferencia de datos para crear rentals
 */
class CreateRentalRequestDTO {
  constructor(data) {
    this.equipmentId = data.equipmentId;
    this.clientCompanyId = data.clientCompanyId;
    this.providerCompanyId = data.providerCompanyId;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.monthlyRate = data.monthlyRate;
    this.securityDeposit = data.securityDeposit || 0;
    this.paymentTerms = data.paymentTerms;
    this.contractTerms = data.contractTerms;
    this.notes = data.notes;

    this.validate();
  }

  validate() {
    const errors = [];

    if (!this.equipmentId) {
      errors.push('Equipment ID is required');
    }

    if (!this.clientCompanyId) {
      errors.push('Client company ID is required');
    }

    if (!this.providerCompanyId) {
      errors.push('Provider company ID is required');
    }

    if (!this.startDate) {
      errors.push('Start date is required');
    }

    if (!this.endDate) {
      errors.push('End date is required');
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      
      if (start >= end) {
        errors.push('Start date must be before end date');
      }

      if (start < new Date()) {
        errors.push('Start date cannot be in the past');
      }
    }

    if (!this.monthlyRate || this.monthlyRate <= 0) {
      errors.push('Monthly rate must be greater than zero');
    }

    if (this.securityDeposit < 0) {
      errors.push('Security deposit cannot be negative');
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }
  }

  static fromHttpRequest(body) {
    return new CreateRentalRequestDTO(body);
  }
}

module.exports = CreateRentalRequestDTO;
