/**
 * Domain Entity: User
 * Represents a user in the system
 */
class User {
  constructor({
    id,
    companyId,
    firstName,
    lastName,
    email,
    password,
    phone,
    role, // 'ADMIN', 'CLIENT', 'PROVIDER'
    isActive = true,
    isAdmin = false,
    lastLogin,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.companyId = companyId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
    this.phone = phone;
    this.role = role;
    this.isActive = isActive;
    this.isAdmin = isAdmin;
    this.lastLogin = lastLogin;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Validate user data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.firstName || this.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (!this.lastName || this.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    if (!['ADMIN', 'CLIENT', 'PROVIDER'].includes(this.role)) {
      errors.push('Role must be ADMIN, CLIENT, or PROVIDER');
    }

    if (this.phone && !this.isValidPhone(this.phone)) {
      errors.push('Invalid phone number format');
    }

    if (!this.companyId && this.role !== 'ADMIN') {
      errors.push('Company ID is required for non-admin users');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get full name
   * @returns {string}
   */
  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Check if user is admin
   * @returns {boolean}
   */
  isAdminUser() {
    return this.role === 'ADMIN' || this.isAdmin;
  }

  /**
   * Check if user is client
   * @returns {boolean}
   */
  isClientUser() {
    return this.role === 'CLIENT';
  }

  /**
   * Check if user is provider
   * @returns {boolean}
   */
  isProviderUser() {
    return this.role === 'PROVIDER';
  }

  /**
   * Update user information
   * @param {Object} updateData - Data to update
   */
  update(updateData) {
    const allowedFields = ['firstName', 'lastName', 'email', 'phone'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        this[field] = updateData[field];
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin() {
    this.lastLogin = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Deactivate user
   */
  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * Activate user
   */
  activate() {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * Set admin privileges
   * @param {boolean} isAdmin - Admin status
   */
  setAdminPrivileges(isAdmin) {
    this.isAdmin = isAdmin;
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
   * Validate phone format
   * @param {string} phone - Phone to validate
   * @returns {boolean}
   */
  isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Check if user can access resource
   * @param {string} resourceType - Type of resource
   * @param {number} resourceCompanyId - Company ID of resource
   * @returns {boolean}
   */
  canAccessResource(resourceType, resourceCompanyId) {
    if (this.role === 'ADMIN') {
      return true;
    }

    return this.companyId === resourceCompanyId;
  }

  /**
   * Get user permissions based on role
   * @returns {Array} Array of permissions
   */
  getPermissions() {
    const basePermissions = ['read_profile', 'update_profile'];
    
    switch (this.role) {
      case 'ADMIN':
        return [...basePermissions, 'admin_all', 'manage_companies', 'manage_users'];
      
      case 'CLIENT':
        const clientPermissions = [
          ...basePermissions,
          'view_equipment',
          'create_service_request',
          'view_contracts',
          'view_invoices'
        ];
        
        if (this.isAdmin) {
          clientPermissions.push('manage_company_users', 'update_company_profile');
        }
        
        return clientPermissions;
      
      case 'PROVIDER':
        const providerPermissions = [
          ...basePermissions,
          'manage_equipment',
          'manage_service_requests',
          'manage_contracts',
          'manage_invoices'
        ];
        
        if (this.isAdmin) {
          providerPermissions.push('manage_company_users', 'update_company_profile');
        }
        
        return providerPermissions;
      
      default:
        return basePermissions;
    }
  }

  /**
   * Convert to plain object (excluding password)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      companyId: this.companyId,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      role: this.role,
      isActive: this.isActive,
      isAdmin: this.isAdmin,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to safe object for public API
   * @returns {Object}
   */
  toSafeJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      role: this.role,
      isActive: this.isActive
    };
  }
}

module.exports = User;