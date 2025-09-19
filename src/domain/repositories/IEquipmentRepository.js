/**
 * Repository Interface: Equipment
 * Defines the contract for equipment data persistence
 */
class IEquipmentRepository {
  /**
   * Find equipment by ID
   * @param {number} id - Equipment ID
   * @returns {Promise<Equipment|null>}
   */
  async findById(id) {
    throw new Error('Method findById must be implemented');
  }

  /**
   * Find equipment by serial number
   * @param {string} serialNumber - Equipment serial number
   * @returns {Promise<Equipment|null>}
   */
  async findBySerialNumber(serialNumber) {
    throw new Error('Method findBySerialNumber must be implemented');
  }

  /**
   * Find equipment by provider company
   * @param {number} companyId - Provider company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findByProvider(companyId, filters = {}) {
    throw new Error('Method findByProvider must be implemented');
  }

  /**
   * Find equipment rented by client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findRentedByClient(clientCompanyId, filters = {}) {
    throw new Error('Method findRentedByClient must be implemented');
  }

  /**
   * Find available equipment
   * @param {Object} filters - Filtering options
   * @returns {Promise<Equipment[]>}
   */
  async findAvailable(filters = {}) {
    throw new Error('Method findAvailable must be implemented');
  }

  /**
   * Find equipment by status
   * @param {string} status - Equipment status
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findByStatus(status, filters = {}) {
    throw new Error('Method findByStatus must be implemented');
  }

  /**
   * Find equipment by type
   * @param {string} type - Equipment type
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async findByType(type, filters = {}) {
    throw new Error('Method findByType must be implemented');
  }

  /**
   * Create new equipment
   * @param {Object} equipmentData - Equipment data
   * @returns {Promise<Equipment>}
   */
  async create(equipmentData) {
    throw new Error('Method create must be implemented');
  }

  /**
   * Update equipment
   * @param {number} id - Equipment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Equipment>}
   */
  async update(id, updateData) {
    throw new Error('Method update must be implemented');
  }

  /**
   * Delete equipment (soft delete)
   * @param {number} id - Equipment ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Method delete must be implemented');
  }

  /**
   * Update equipment status
   * @param {number} id - Equipment ID
   * @param {string} status - New status
   * @returns {Promise<Equipment>}
   */
  async updateStatus(id, status) {
    throw new Error('Method updateStatus must be implemented');
  }

  /**
   * Find equipment needing maintenance
   * @param {number} companyId - Provider company ID
   * @returns {Promise<Equipment[]>}
   */
  async findNeedingMaintenance(companyId) {
    throw new Error('Method findNeedingMaintenance must be implemented');
  }

  /**
   * Get equipment statistics for provider
   * @param {number} companyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(companyId) {
    throw new Error('Method getProviderStatistics must be implemented');
  }

  /**
   * Get client equipment metrics
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientEquipmentMetrics(clientCompanyId) {
    throw new Error('Method getClientEquipmentMetrics must be implemented');
  }

  /**
   * Get client equipment count
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<number>}
   */
  async getClientEquipmentCount(clientCompanyId) {
    throw new Error('Method getClientEquipmentCount must be implemented');
  }

  /**
   * Get client equipment by location
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object[]>}
   */
  async getClientEquipmentByLocation(clientCompanyId) {
    throw new Error('Method getClientEquipmentByLocation must be implemented');
  }

  /**
   * Search equipment
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Equipment[]>}
   */
  async search(query, filters = {}) {
    throw new Error('Method search must be implemented');
  }

  /**
   * Get equipment count by status
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getCountByStatus(companyId) {
    throw new Error('Method getCountByStatus must be implemented');
  }

  /**
   * Get equipment count by type
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getCountByType(companyId) {
    throw new Error('Method getCountByType must be implemented');
  }

  /**
   * Get equipment utilization metrics
   * @param {number} companyId - Provider company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>}
   */
  async getUtilizationMetrics(companyId, dateRange = {}) {
    throw new Error('Method getUtilizationMetrics must be implemented');
  }

  /**
   * Get equipment maintenance history
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object[]>}
   */
  async getMaintenanceHistory(equipmentId) {
    throw new Error('Method getMaintenanceHistory must be implemented');
  }

  /**
   * Get equipment rental history
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object[]>}
   */
  async getRentalHistory(equipmentId) {
    throw new Error('Method getRentalHistory must be implemented');
  }

  /**
   * Check if serial number exists
   * @param {string} serialNumber - Serial number to check
   * @param {number} excludeId - Equipment ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async serialNumberExists(serialNumber, excludeId = null) {
    throw new Error('Method serialNumberExists must be implemented');
  }

  /**
   * Get equipment with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Equipment with pagination info
   */
  async findWithPagination(options = {}) {
    throw new Error('Method findWithPagination must be implemented');
  }

  /**
   * Get revenue by equipment
   * @param {number} companyId - Provider company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object[]>}
   */
  async getRevenueByEquipment(companyId, dateRange = {}) {
    throw new Error('Method getRevenueByEquipment must be implemented');
  }
}

module.exports = IEquipmentRepository;