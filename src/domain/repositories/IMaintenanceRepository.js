/**
 * Interface: Maintenance Repository
 * Defines contract for maintenance data persistence
 */
class IMaintenanceRepository {
  /**
   * Find maintenances with filters
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Object>}
   */
  async findByProvider(providerId, filters = {}) {
    throw new Error('Method findByProvider must be implemented');
  }

  /**
   * Find maintenance by ID
   * @param {number} maintenanceId - Maintenance ID
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object|null>}
   */
  async findById(maintenanceId, providerId) {
    throw new Error('Method findById must be implemented');
  }

  /**
   * Create new maintenance
   * @param {Object} maintenanceData - Maintenance data
   * @returns {Promise<Object>}
   */
  async create(maintenanceData) {
    throw new Error('Method create must be implemented');
  }

  /**
   * Update maintenance
   * @param {number} maintenanceId - Maintenance ID
   * @param {Object} updateData - Update data
   * @param {number} providerId - Provider company ID
   * @returns {Promise<Object>}
   */
  async update(maintenanceId, updateData, providerId) {
    throw new Error('Method update must be implemented');
  }

  /**
   * Delete maintenance
   * @param {number} maintenanceId - Maintenance ID
   * @param {number} providerId - Provider company ID
   * @returns {Promise<boolean>}
   */
  async delete(maintenanceId, providerId) {
    throw new Error('Method delete must be implemented');
  }

  /**
   * Get maintenance statistics
   * @param {number} providerId - Provider company ID
   * @param {Object} filters - Filters
   * @returns {Promise<Object>}
   */
  async getStatistics(providerId, filters = {}) {
    throw new Error('Method getStatistics must be implemented');
  }
}

module.exports = IMaintenanceRepository;
