/**
 * Domain Entity: Equipment
 * Represents equipment managed by providers and rented by clients
 */
class Equipment {
  constructor({
    id,
    companyId, // Provider company ID
    serialNumber,
    type, // e.g., 'REFRIGERATOR', 'FREEZER', 'DISPLAY_CASE'
    brand,
    model,
    capacity,
    status = 'AVAILABLE', // 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'
    acquisitionDate,
    warrantyExpiry,
    lastMaintenanceDate,
    nextMaintenanceDate,
    isActive = true,
    specifications = {},
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.companyId = companyId;
    this.serialNumber = serialNumber;
    this.type = type;
    this.brand = brand;
    this.model = model;
    this.capacity = capacity;
    this.status = status;
    this.acquisitionDate = acquisitionDate;
    this.warrantyExpiry = warrantyExpiry;
    this.lastMaintenanceDate = lastMaintenanceDate;
    this.nextMaintenanceDate = nextMaintenanceDate;
    this.isActive = isActive;
    this.specifications = specifications;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Validate equipment data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.companyId) {
      errors.push('Company ID is required');
    }

    if (!this.serialNumber || this.serialNumber.trim().length < 3) {
      errors.push('Serial number must be at least 3 characters');
    }

    if (!this.type || this.type.trim().length < 2) {
      errors.push('Equipment type is required');
    }

    if (!this.brand || this.brand.trim().length < 2) {
      errors.push('Brand is required');
    }

    if (!this.model || this.model.trim().length < 2) {
      errors.push('Model is required');
    }

    if (!['AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'].includes(this.status)) {
      errors.push('Invalid equipment status');
    }

    if (this.capacity && (isNaN(this.capacity) || this.capacity <= 0)) {
      errors.push('Capacity must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if equipment is available for rental
   * @returns {boolean}
   */
  isAvailable() {
    return this.status === 'AVAILABLE' && this.isActive;
  }

  /**
   * Check if equipment is currently rented
   * @returns {boolean}
   */
  isRented() {
    return this.status === 'RENTED';
  }

  /**
   * Check if equipment is under maintenance
   * @returns {boolean}
   */
  isUnderMaintenance() {
    return this.status === 'MAINTENANCE';
  }

  /**
   * Check if equipment is out of service
   * @returns {boolean}
   */
  isOutOfService() {
    return this.status === 'OUT_OF_SERVICE';
  }

  /**
   * Check if equipment needs maintenance
   * @returns {boolean}
   */
  needsMaintenance() {
    if (!this.nextMaintenanceDate) return false;
    
    const now = new Date();
    const maintenanceDate = new Date(this.nextMaintenanceDate);
    const warningPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    return (maintenanceDate - now) <= warningPeriod;
  }

  /**
   * Check if warranty is expired
   * @returns {boolean}
   */
  isWarrantyExpired() {
    if (!this.warrantyExpiry) return false;
    return new Date() > new Date(this.warrantyExpiry);
  }

  /**
   * Update equipment status
   * @param {string} newStatus - New status
   * @param {string} reason - Reason for status change
   */
  updateStatus(newStatus, reason = '') {
    const validStatuses = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid equipment status');
    }

    this.status = newStatus;
    this.updatedAt = new Date();
  }

  /**
   * Mark equipment as rented
   */
  markAsRented() {
    if (!this.isAvailable()) {
      throw new Error('Equipment is not available for rental');
    }
    this.updateStatus('RENTED');
  }

  /**
   * Mark equipment as available (return from rental)
   */
  markAsAvailable() {
    this.updateStatus('AVAILABLE');
  }

  /**
   * Mark equipment for maintenance
   */
  markForMaintenance() {
    this.updateStatus('MAINTENANCE');
  }

  /**
   * Complete maintenance
   * @param {Date} maintenanceDate - Date maintenance was completed
   * @param {Date} nextMaintenanceDate - Next scheduled maintenance date
   */
  completeMaintenance(maintenanceDate, nextMaintenanceDate) {
    this.lastMaintenanceDate = maintenanceDate || new Date();
    this.nextMaintenanceDate = nextMaintenanceDate;
    this.updateStatus('AVAILABLE');
  }

  /**
   * Update equipment information
   * @param {Object} updateData - Data to update
   */
  update(updateData) {
    const allowedFields = [
      'type', 'brand', 'model', 'capacity', 'warrantyExpiry',
      'nextMaintenanceDate', 'specifications'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        this[field] = updateData[field];
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Deactivate equipment
   */
  deactivate() {
    this.isActive = false;
    this.status = 'OUT_OF_SERVICE';
    this.updatedAt = new Date();
  }

  /**
   * Activate equipment
   */
  activate() {
    this.isActive = true;
    if (this.status === 'OUT_OF_SERVICE') {
      this.status = 'AVAILABLE';
    }
    this.updatedAt = new Date();
  }

  /**
   * Get equipment age in days
   * @returns {number}
   */
  getAgeInDays() {
    if (!this.acquisitionDate) return 0;
    
    const now = new Date();
    const acquisition = new Date(this.acquisitionDate);
    const diffTime = Math.abs(now - acquisition);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days until next maintenance
   * @returns {number|null}
   */
  getDaysUntilMaintenance() {
    if (!this.nextMaintenanceDate) return null;
    
    const now = new Date();
    const maintenanceDate = new Date(this.nextMaintenanceDate);
    const diffTime = maintenanceDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get equipment display name
   * @returns {string}
   */
  getDisplayName() {
    return `${this.brand} ${this.model} (${this.serialNumber})`;
  }

  /**
   * Add or update specification
   * @param {string} key - Specification key
   * @param {any} value - Specification value
   */
  setSpecification(key, value) {
    if (!this.specifications) {
      this.specifications = {};
    }
    this.specifications[key] = value;
    this.updatedAt = new Date();
  }

  /**
   * Get specification value
   * @param {string} key - Specification key
   * @returns {any}
   */
  getSpecification(key) {
    return this.specifications ? this.specifications[key] : undefined;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      companyId: this.companyId,
      serialNumber: this.serialNumber,
      type: this.type,
      brand: this.brand,
      model: this.model,
      capacity: this.capacity,
      status: this.status,
      acquisitionDate: this.acquisitionDate,
      warrantyExpiry: this.warrantyExpiry,
      lastMaintenanceDate: this.lastMaintenanceDate,
      nextMaintenanceDate: this.nextMaintenanceDate,
      isActive: this.isActive,
      specifications: this.specifications,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Helper: get rental information if attached (controllers expect these)
  getRentalInfo() {
    return this.rentalInfo || null;
  }

  // Helper: get location information if attached
  getLocationInfo() {
    return this.locationInfo || null;
  }

  // Helper: get provider/company info if attached
  getProviderInfo() {
    return this.providerInfo || null;
  }

  // Helper: next maintenance date accessor
  getNextMaintenanceDate() {
    return this.nextMaintenanceDate || null;
  }

  // compatibility accessor used in controllers (technicalSpecs vs specifications)
  get technicalSpecs() {
    return this.specifications;
  }
}

module.exports = Equipment;