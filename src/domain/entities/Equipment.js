/**
 * Equipment Entity - Aggregate Root
 * Representa un equipo industrial en el sistema
 */
class Equipment {
  constructor({
    equipmentId,
    name,
    type,
    manufacturer,
    model,
    serialNumber,
    technicalSpecs,
    installationDate,
    warrantyExpiry,
    status, // 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
    condition, // 'NEW' | 'GOOD' | 'FAIR' | 'POOR'
    location,
    ownerCompanyId,
    currentClientId,
    purchasePrice,
    rentalRate,
    createdAt,
    updatedAt
  }) {
    this.equipmentId = equipmentId;
    this.name = name;
    this.type = type;
    this.manufacturer = manufacturer;
    this.model = model;
    this.serialNumber = serialNumber;
    this.technicalSpecs = technicalSpecs;
    this.installationDate = installationDate;
    this.warrantyExpiry = warrantyExpiry;
    this.status = status;
    this.condition = condition;
    this.location = location;
    this.ownerCompanyId = ownerCompanyId;
    this.currentClientId = currentClientId;
    this.purchasePrice = purchasePrice;
    this.rentalRate = rentalRate;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Equipment name is required');
    }

    if (!this.type || this.type.trim().length === 0) {
      throw new Error('Equipment type is required');
    }

    if (!this.manufacturer || this.manufacturer.trim().length === 0) {
      throw new Error('Equipment manufacturer is required');
    }

    if (!this.status || !['AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'].includes(this.status)) {
      throw new Error('Invalid equipment status');
    }

    if (!this.condition || !['NEW', 'GOOD', 'FAIR', 'POOR'].includes(this.condition)) {
      throw new Error('Invalid equipment condition');
    }

    if (!this.ownerCompanyId) {
      throw new Error('Owner company ID is required');
    }

    if (this.rentalRate && this.rentalRate < 0) {
      throw new Error('Rental rate cannot be negative');
    }
  }

  isAvailable() {
    return this.status === 'AVAILABLE';
  }

  isRented() {
    return this.status === 'RENTED';
  }

  isInMaintenance() {
    return this.status === 'MAINTENANCE';
  }

  isOutOfService() {
    return this.status === 'OUT_OF_SERVICE';
  }

  isUnderWarranty() {
    if (!this.warrantyExpiry) return false;
    return new Date() < new Date(this.warrantyExpiry);
  }

  rent(clientId) {
    if (!this.isAvailable()) {
      throw new Error('Equipment is not available for rent');
    }
    
    this.status = 'RENTED';
    this.currentClientId = clientId;
    this.updatedAt = new Date();
  }

  returnFromRental() {
    if (!this.isRented()) {
      throw new Error('Equipment is not currently rented');
    }
    
    this.status = 'AVAILABLE';
    this.currentClientId = null;
    this.updatedAt = new Date();
  }

  sendToMaintenance() {
    this.status = 'MAINTENANCE';
    this.updatedAt = new Date();
  }

  returnFromMaintenance() {
    if (!this.isInMaintenance()) {
      throw new Error('Equipment is not in maintenance');
    }
    
    this.status = 'AVAILABLE';
    this.updatedAt = new Date();
  }

  markOutOfService() {
    this.status = 'OUT_OF_SERVICE';
    this.updatedAt = new Date();
  }

  updateCondition(newCondition) {
    if (!['NEW', 'GOOD', 'FAIR', 'POOR'].includes(newCondition)) {
      throw new Error('Invalid equipment condition');
    }
    
    this.condition = newCondition;
    this.updatedAt = new Date();
  }

  updateRentalRate(newRate) {
    if (newRate < 0) {
      throw new Error('Rental rate cannot be negative');
    }
    
    this.rentalRate = newRate;
    this.updatedAt = new Date();
  }

  updateLocation(newLocation) {
    this.location = newLocation;
    this.updatedAt = new Date();
  }

  updateTechnicalSpecs(newSpecs) {
    this.technicalSpecs = { ...this.technicalSpecs, ...newSpecs };
    this.updatedAt = new Date();
  }
}

module.exports = Equipment;
