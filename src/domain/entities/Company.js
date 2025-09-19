/**
 * Domain Entity: Company
 * Represents a company in the system (CLIENT or PROVIDER)
 */
class Company {
  constructor({
    id,
    name,
    type, // 'CLIENT' or 'PROVIDER'
    address,
    phone,
    email,
    contactPerson,
    taxId,
    isActive = true,
    registrationDate,
    updatedAt
  }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.address = address;
    this.phone = phone;
    this.email = email;
    this.contactPerson = contactPerson;
    this.taxId = taxId;
    this.isActive = isActive;
    this.registrationDate = registrationDate || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Validate company data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Company name must be at least 2 characters');
    }

    if (!['CLIENT', 'PROVIDER'].includes(this.type)) {
      errors.push('Company type must be CLIENT or PROVIDER');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    if (!this.phone || this.phone.trim().length < 10) {
      errors.push('Valid phone number is required');
    }

    if (!this.contactPerson || this.contactPerson.trim().length < 2) {
      errors.push('Contact person is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if company is a client
   * @returns {boolean}
   */
  isClient() {
    return this.type === 'CLIENT';
  }

  /**
   * Check if company is a provider
   * @returns {boolean}
   */
  isProvider() {
    return this.type === 'PROVIDER';
  }

  /**
   * Update company information
   * @param {Object} updateData - Data to update
   */
  update(updateData) {
    const allowedFields = ['name', 'address', 'phone', 'email', 'contactPerson'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        this[field] = updateData[field];
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Deactivate company
   */
  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * Activate company
   */
  activate() {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get company age in days
   * @returns {number}
   */
  getAgeInDays() {
    const now = new Date();
    const diffTime = Math.abs(now - this.registrationDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      address: this.address,
      phone: this.phone,
      email: this.email,
      contactPerson: this.contactPerson,
      taxId: this.taxId,
      isActive: this.isActive,
      registrationDate: this.registrationDate,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Company;