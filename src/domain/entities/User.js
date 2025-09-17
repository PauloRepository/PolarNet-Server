/**
 * User Entity
 * Representa un usuario del sistema
 */
class User {
  constructor({
    userId,
    name,
    username,
    password,
    email,
    phone,
    role, // 'ADMIN' | 'PROVIDER' | 'CLIENT'
    companyId,
    isActive,
    lastLogin,
    createdAt,
    updatedAt
  }) {
    this.userId = userId;
    this.name = name;
    this.username = username;
    this.password = password;
    this.email = email;
    this.phone = phone;
    this.role = role;
    this.companyId = companyId;
    this.isActive = isActive;
    this.lastLogin = lastLogin;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('User name is required');
    }

    if (!this.username || this.username.trim().length === 0) {
      throw new Error('Username is required');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      throw new Error('Valid email is required');
    }

    if (!this.role || !['ADMIN', 'PROVIDER', 'CLIENT'].includes(this.role)) {
      throw new Error('Invalid user role');
    }

    if (!this.companyId) {
      throw new Error('Company ID is required');
    }

    if (this.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isAdmin() {
    return this.role === 'ADMIN';
  }

  isProvider() {
    return this.role === 'PROVIDER';
  }

  isClient() {
    return this.role === 'CLIENT';
  }

  isActiveUser() {
    return this.isActive === true;
  }

  activate() {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  updateProfile({ name, email, phone }) {
    if (name) {
      if (name.trim().length === 0) {
        throw new Error('Name cannot be empty');
      }
      this.name = name.trim();
    }

    if (email) {
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }
      this.email = email.toLowerCase();
    }

    if (phone) {
      this.phone = phone;
    }

    this.updatedAt = new Date();
  }

  changePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    this.password = newPassword; // En la implementación real esto debe ser hasheado
    this.updatedAt = new Date();
  }

  updateLastLogin() {
    this.lastLogin = new Date();
    this.updatedAt = new Date();
  }

  changeRole(newRole) {
    if (!['ADMIN', 'PROVIDER', 'CLIENT'].includes(newRole)) {
      throw new Error('Invalid role');
    }

    this.role = newRole;
    this.updatedAt = new Date();
  }

  hasPermission(permission) {
    // Define permissions based on role
    const permissions = {
      'ADMIN': [
        'manage_users',
        'manage_companies',
        'view_all_data',
        'system_admin'
      ],
      'PROVIDER': [
        'manage_equipments',
        'manage_rentals',
        'manage_maintenances',
        'view_client_data',
        'manage_service_requests'
      ],
      'CLIENT': [
        'view_own_equipments',
        'create_service_requests',
        'view_own_contracts',
        'view_own_invoices'
      ]
    };

    return permissions[this.role]?.includes(permission) || false;
  }

  canAccessCompany(companyId) {
    // Admins can access any company
    if (this.isAdmin()) {
      return true;
    }

    // Regular users can only access their own company
    return this.companyId === companyId;
  }

  canManageUser(targetUserId, targetUserCompanyId) {
    // Admins can manage any user
    if (this.isAdmin()) {
      return true;
    }

    // Users cannot manage themselves for certain operations
    if (this.userId === targetUserId) {
      return false;
    }

    // Providers can manage users in their company
    if (this.isProvider() && this.companyId === targetUserCompanyId) {
      return true;
    }

    return false;
  }

  getDisplayName() {
    return this.name || this.username;
  }

  getInitials() {
    const names = this.name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return this.name.charAt(0).toUpperCase();
  }

  isDormant() {
    if (!this.lastLogin) {
      return true;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return new Date(this.lastLogin) < thirtyDaysAgo;
  }

  toSafeObject() {
    // Return user object without sensitive information
    const { password, ...safeUser } = this;
    return safeUser;
  }
}

module.exports = User;
