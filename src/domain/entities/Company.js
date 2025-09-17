/**
 * Company Entity - Aggregate Root
 * Representa una empresa en el sistema (tanto proveedores como clientes)
 */
class Company {
  constructor({
    companyId,
    name,
    type, // 'PROVIDER' | 'CLIENT'
    email,
    phone,
    address,
    city,
    state,
    country,
    postalCode,
    contactPerson,
    website,
    description,
    status, // 'ACTIVE' | 'INACTIVE' | 'PENDING'
    createdAt,
    updatedAt
  }) {
    this.companyId = companyId;
    this.name = name;
    this.type = type;
    this.email = email;
    this.phone = phone;
    this.address = address;
    this.city = city;
    this.state = state;
    this.country = country;
    this.postalCode = postalCode;
    this.contactPerson = contactPerson;
    this.website = website;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Company name is required');
    }

    if (!this.type || !['PROVIDER', 'CLIENT'].includes(this.type)) {
      throw new Error('Company type must be PROVIDER or CLIENT');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      throw new Error('Valid email is required');
    }

    if (!this.status || !['ACTIVE', 'INACTIVE', 'PENDING'].includes(this.status)) {
      throw new Error('Invalid company status');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isProvider() {
    return this.type === 'PROVIDER';
  }

  isClient() {
    return this.type === 'CLIENT';
  }

  isActive() {
    return this.status === 'ACTIVE';
  }

  updateContactInfo({ email, phone, address, city, state, country, postalCode }) {
    if (email) this.email = email;
    if (phone) this.phone = phone;
    if (address) this.address = address;
    if (city) this.city = city;
    if (state) this.state = state;
    if (country) this.country = country;
    if (postalCode) this.postalCode = postalCode;
    
    this.updatedAt = new Date();
    this.validate();
  }

  deactivate() {
    this.status = 'INACTIVE';
    this.updatedAt = new Date();
  }

  activate() {
    this.status = 'ACTIVE';
    this.updatedAt = new Date();
  }
}

module.exports = Company;
