/**
 * Interface: ActiveRental Repository
 * Defines the contract for active rental data persistence operations
 */
class IActiveRentalRepository {
  
  // Basic CRUD operations
  async findById(rentalId) {
    throw new Error('Method findById must be implemented');
  }

  async create(rental) {
    throw new Error('Method create must be implemented');
  }

  async update(rentalId, data) {
    throw new Error('Method update must be implemented');
  }

  async delete(rentalId) {
    throw new Error('Method delete must be implemented');
  }

  // Query operations
  async findActive() {
    throw new Error('Method findActive must be implemented');
  }

  async findExpired() {
    throw new Error('Method findExpired must be implemented');
  }

  async findNearExpiration(daysThreshold = 30) {
    throw new Error('Method findNearExpiration must be implemented');
  }

  async findByEquipment(equipmentId) {
    throw new Error('Method findByEquipment must be implemented');
  }

  // Client-specific operations
  async findByClient(clientCompanyId, filters = {}) {
    throw new Error('Method findByClient must be implemented');
  }

  async getClientRentalMetrics(clientCompanyId) {
    throw new Error('Method getClientRentalMetrics must be implemented');
  }

  async getClientActiveRentals(clientCompanyId) {
    throw new Error('Method getClientActiveRentals must be implemented');
  }

  async getClientRentalCosts(clientCompanyId, dateRange = {}) {
    throw new Error('Method getClientRentalCosts must be implemented');
  }

  // Provider-specific operations
  async findByProvider(providerCompanyId, filters = {}) {
    throw new Error('Method findByProvider must be implemented');
  }

  async getProviderRentalMetrics(providerCompanyId) {
    throw new Error('Method getProviderRentalMetrics must be implemented');
  }

  async getProviderRevenue(providerCompanyId, dateRange = {}) {
    throw new Error('Method getProviderRevenue must be implemented');
  }

  // Business operations
  async extend(rentalId, newEndDate) {
    throw new Error('Method extend must be implemented');
  }

  async terminate(rentalId) {
    throw new Error('Method terminate must be implemented');
  }

  async updateRate(rentalId, newRate) {
    throw new Error('Method updateRate must be implemented');
  }

  async getActiveRentalByEquipment(equipmentId) {
    throw new Error('Method getActiveRentalByEquipment must be implemented');
  }
}

module.exports = IActiveRentalRepository;
