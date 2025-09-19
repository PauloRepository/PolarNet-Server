/**
 * Interface: EquipmentLocation Repository
 * Defines the contract for equipment location data persistence operations
 */
class IEquipmentLocationRepository {
  
  // Basic CRUD operations
  async findById(equipmentLocationId) {
    throw new Error('Method findById must be implemented');
  }

  async create(equipmentLocation) {
    throw new Error('Method create must be implemented');
  }

  async update(equipmentLocationId, data) {
    throw new Error('Method update must be implemented');
  }

  async delete(equipmentLocationId) {
    throw new Error('Method delete must be implemented');
  }

  // Query operations
  async findAll() {
    throw new Error('Method findAll must be implemented');
  }

  async findActive() {
    throw new Error('Method findActive must be implemented');
  }

  async findByFacilityType(facilityType) {
    throw new Error('Method findByFacilityType must be implemented');
  }

  async findByCity(city) {
    throw new Error('Method findByCity must be implemented');
  }

  async findByState(state) {
    throw new Error('Method findByState must be implemented');
  }

  async findNearby(coordinates, radiusKm) {
    throw new Error('Method findNearby must be implemented');
  }

  // Capacity operations
  async findWithAvailableCapacity() {
    throw new Error('Method findWithAvailableCapacity must be implemented');
  }

  async getLocationCapacity(equipmentLocationId) {
    throw new Error('Method getLocationCapacity must be implemented');
  }

  async getLocationUtilization(equipmentLocationId) {
    throw new Error('Method getLocationUtilization must be implemented');
  }

  // Equipment operations
  async getEquipmentCount(equipmentLocationId) {
    throw new Error('Method getEquipmentCount must be implemented');
  }

  async getEquipmentByLocation(equipmentLocationId) {
    throw new Error('Method getEquipmentByLocation must be implemented');
  }

  // Client-specific operations
  async getClientLocations(clientCompanyId) {
    throw new Error('Method getClientLocations must be implemented');
  }

  async getClientLocationStats(clientCompanyId) {
    throw new Error('Method getClientLocationStats must be implemented');
  }

  async getClientEquipmentByLocation(clientCompanyId) {
    throw new Error('Method getClientEquipmentByLocation must be implemented');
  }

  // Business operations
  async updateCapacity(equipmentLocationId, newCapacity) {
    throw new Error('Method updateCapacity must be implemented');
  }

  async updateContact(equipmentLocationId, contactInfo) {
    throw new Error('Method updateContact must be implemented');
  }

  async activate(equipmentLocationId) {
    throw new Error('Method activate must be implemented');
  }

  async deactivate(equipmentLocationId) {
    throw new Error('Method deactivate must be implemented');
  }

  // Search operations
  async search(searchTerm) {
    throw new Error('Method search must be implemented');
  }

  async findByName(name) {
    throw new Error('Method findByName must be implemented');
  }
}

module.exports = IEquipmentLocationRepository;
