/**
 * ContactInfo Value Object
 * Representa información de contacto con validaciones
 */
class ContactInfo {
  constructor({ email, phone, address, city, state, country, postalCode }) {
    this.email = email;
    this.phone = phone;
    this.address = address;
    this.city = city;
    this.state = state;
    this.country = country;
    this.postalCode = postalCode;

    this.validate();
  }

  validate() {
    if (this.email && !this.isValidEmail(this.email)) {
      throw new Error('Invalid email format');
    }

    if (this.phone && !this.isValidPhone(this.phone)) {
      throw new Error('Invalid phone format');
    }

    if (this.postalCode && !this.isValidPostalCode(this.postalCode)) {
      throw new Error('Invalid postal code format');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    // Acepta varios formatos de teléfono
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  isValidPostalCode(postalCode) {
    // Básico: al menos 3 caracteres alfanuméricos
    const postalRegex = /^[A-Za-z0-9]{3,10}$/;
    return postalRegex.test(postalCode.replace(/[\s\-]/g, ''));
  }

  getFormattedAddress() {
    const parts = [
      this.address,
      this.city,
      this.state,
      this.country,
      this.postalCode
    ].filter(part => part && part.trim().length > 0);

    return parts.join(', ');
  }

  equals(other) {
    return other instanceof ContactInfo &&
           this.email === other.email &&
           this.phone === other.phone &&
           this.address === other.address &&
           this.city === other.city &&
           this.state === other.state &&
           this.country === other.country &&
           this.postalCode === other.postalCode;
  }

  clone() {
    return new ContactInfo({
      email: this.email,
      phone: this.phone,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      postalCode: this.postalCode
    });
  }

  update(newContactInfo) {
    return new ContactInfo({
      email: newContactInfo.email || this.email,
      phone: newContactInfo.phone || this.phone,
      address: newContactInfo.address || this.address,
      city: newContactInfo.city || this.city,
      state: newContactInfo.state || this.state,
      country: newContactInfo.country || this.country,
      postalCode: newContactInfo.postalCode || this.postalCode
    });
  }

  toJSON() {
    return {
      email: this.email,
      phone: this.phone,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      postalCode: this.postalCode
    };
  }
}

module.exports = ContactInfo;
