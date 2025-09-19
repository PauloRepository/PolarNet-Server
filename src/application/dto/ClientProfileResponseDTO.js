/**
 * DTO: Client Profile Response
 * Structures profile data for CLIENT responses
 */
class ClientProfileResponseDTO {
  
  /**
   * Format company profile response
   * @param {Object} company - Raw company data
   * @param {Object} stats - Company statistics
   * @returns {Object} Formatted profile response
   */
  static formatCompanyProfile(company, stats = {}) {
    return {
      company: {
        companyId: company.companyId.toString(),
        basicInfo: {
          name: company.name,
          taxId: company.taxId,
          businessType: company.businessType,
          description: company.description
        },
        contact: {
          email: company.email,
          phone: company.phone,
          website: company.website
        },
        address: {
          street: company.address,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
          country: company.country
        },
        branding: {
          logoUrl: company.logoUrl
        },
        status: {
          isActive: company.isActive,
          type: company.type,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt
        }
      },
      statistics: {
        users: {
          total: parseInt(stats.totalUsers || 0),
          active: parseInt(stats.activeUsers || 0)
        },
        locations: {
          total: parseInt(stats.totalLocations || 0),
          active: parseInt(stats.activeLocations || 0)
        },
        rentals: {
          active: parseInt(stats.activeRentals || 0),
          total: parseInt(stats.totalRentals || 0)
        },
        financial: {
          monthlySpending: parseFloat(stats.monthlySpending || 0),
          totalSpent: parseFloat(stats.totalSpent || 0),
          pendingInvoices: parseInt(stats.pendingInvoices || 0)
        }
      }
    };
  }

  /**
   * Format user profile response
   * @param {Object} user - Raw user data
   * @returns {Object} Formatted user profile
   */
  static formatUserProfile(user) {
    return {
      user: {
        userId: user.userId.toString(),
        basicInfo: {
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone
        },
        role: {
          type: user.role,
          permissions: this.getRolePermissions(user.role)
        },
        company: {
          companyId: user.companyId.toString(),
          companyName: user.companyName
        },
        status: {
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    };
  }

  /**
   * Format profile update request validation
   * @param {Object} data - Update data to validate
   * @returns {Object} Validation result
   */
  static validateProfileUpdate(data) {
    const errors = [];
    const validatedData = {};

    // Validate company fields
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length < 2) {
        errors.push('Company name must be at least 2 characters');
      } else {
        validatedData.name = data.name.trim();
      }
    }

    if (data.email !== undefined) {
      if (!this.isValidEmail(data.email)) {
        errors.push('Invalid email format');
      } else {
        validatedData.email = data.email.toLowerCase();
      }
    }

    if (data.phone !== undefined) {
      if (!this.isValidPhone(data.phone)) {
        errors.push('Invalid phone format');
      } else {
        validatedData.phone = data.phone;
      }
    }

    if (data.website !== undefined) {
      if (data.website && !this.isValidUrl(data.website)) {
        errors.push('Invalid website URL');
      } else {
        validatedData.website = data.website;
      }
    }

    if (data.address !== undefined) {
      validatedData.address = data.address;
    }

    if (data.city !== undefined) {
      validatedData.city = data.city;
    }

    if (data.state !== undefined) {
      validatedData.state = data.state;
    }

    if (data.postalCode !== undefined) {
      validatedData.postalCode = data.postalCode;
    }

    if (data.description !== undefined) {
      validatedData.description = data.description;
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData
    };
  }

  /**
   * Format user update request validation
   * @param {Object} data - User update data to validate
   * @returns {Object} Validation result
   */
  static validateUserUpdate(data) {
    const errors = [];
    const validatedData = {};

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
      } else {
        validatedData.name = data.name.trim();
      }
    }

    if (data.email !== undefined) {
      if (!this.isValidEmail(data.email)) {
        errors.push('Invalid email format');
      } else {
        validatedData.email = data.email.toLowerCase();
      }
    }

    if (data.phone !== undefined) {
      if (!this.isValidPhone(data.phone)) {
        errors.push('Invalid phone format');
      } else {
        validatedData.phone = data.phone;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData
    };
  }

  // Helper methods
  static getRolePermissions(role) {
    const permissions = {
      'CLIENT': [
        'view_dashboard',
        'view_equipments',
        'view_contracts',
        'view_invoices',
        'create_service_requests',
        'update_profile'
      ],
      'ADMIN': [
        'view_dashboard',
        'view_equipments',
        'view_contracts',
        'view_invoices',
        'create_service_requests',
        'update_profile',
        'manage_users',
        'manage_company'
      ]
    };

    return permissions[role] || permissions['CLIENT'];
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone) {
    // Chilean phone format validation (example)
    const phoneRegex = /^(\+56)?[0-9]{8,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = ClientProfileResponseDTO;
