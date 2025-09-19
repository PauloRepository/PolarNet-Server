/**
 * Domain Entity: EquipmentLocation
 * Represents a location where equipment can be placed
 */
class EquipmentLocation {
  constructor({
    equipmentLocationId,
    name,
    description,
    address,
    city,
    state,
    postalCode,
    country = 'Chile',
    coordinates,
    contactPerson,
    contactPhone,
    contactEmail,
    facilityType, // WAREHOUSE, OFFICE, FACTORY, RETAIL, etc.
    capacity,
    isActive = true,
    createdAt,
    updatedAt
  }) {
    this.equipmentLocationId = equipmentLocationId;
    this.name = name;
    this.description = description;
    this.address = address;
    this.city = city;
    this.state = state;
    this.postalCode = postalCode;
    this.country = country;
    this.coordinates = coordinates; // { lat, lng }
    this.contactPerson = contactPerson;
    this.contactPhone = contactPhone;
    this.contactEmail = contactEmail;
    this.facilityType = facilityType;
    this.capacity = capacity;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Business rules
  canAccommodateEquipment() {
    return this.isActive && this.capacity > 0;
  }

  hasCapacityFor(equipmentCount) {
    return this.capacity >= equipmentCount;
  }

  getFullAddress() {
    return `${this.address}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  }

  updateContact(contactPerson, contactPhone, contactEmail) {
    this.contactPerson = contactPerson;
    this.contactPhone = contactPhone;
    this.contactEmail = contactEmail;
    this.updatedAt = new Date();
  }

  updateCapacity(newCapacity) {
    if (newCapacity < 0) {
      throw new Error('Capacity cannot be negative');
    }
    this.capacity = newCapacity;
    this.updatedAt = new Date();
  }

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate() {
    this.isActive = true;
    this.updatedAt = new Date();
  }
}

module.exports = EquipmentLocation;
