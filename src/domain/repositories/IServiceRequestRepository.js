/**
 * Repository Interface: Service Request
 * Defines the contract for service request data persistence
 */
class IServiceRequestRepository {
  /**
   * Find service request by ID
   * @param {number} id - Service request ID
   * @returns {Promise<ServiceRequest|null>}
   */
  async findById(id) {
    throw new Error('Method findById must be implemented');
  }

  /**
   * Find service requests by client company
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByClientCompany(clientCompanyId, filters = {}) {
    throw new Error('Method findByClientCompany must be implemented');
  }

  /**
   * Find service requests by provider company
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByProviderCompany(providerCompanyId, filters = {}) {
    throw new Error('Method findByProviderCompany must be implemented');
  }

  /**
   * Find service requests by equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByEquipment(equipmentId, filters = {}) {
    throw new Error('Method findByEquipment must be implemented');
  }

  /**
   * Find service requests by status
   * @param {string} status - Request status
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByStatus(status, filters = {}) {
    throw new Error('Method findByStatus must be implemented');
  }

  /**
   * Find pending service requests
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @returns {Promise<ServiceRequest[]>}
   */
  async findPending(companyId, companyType) {
    throw new Error('Method findPending must be implemented');
  }

  /**
   * Find urgent service requests
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @returns {Promise<ServiceRequest[]>}
   */
  async findUrgent(companyId, companyType) {
    throw new Error('Method findUrgent must be implemented');
  }

  /**
   * Create new service request
   * @param {Object} requestData - Service request data
   * @returns {Promise<ServiceRequest>}
   */
  async create(requestData) {
    throw new Error('Method create must be implemented');
  }

  /**
   * Update service request
   * @param {number} id - Service request ID
   * @param {Object} updateData - Update data
   * @returns {Promise<ServiceRequest>}
   */
  async update(id, updateData) {
    throw new Error('Method update must be implemented');
  }

  /**
   * Update service request status
   * @param {number} id - Service request ID
   * @param {string} status - New status
   * @param {string} notes - Status change notes
   * @returns {Promise<ServiceRequest>}
   */
  async updateStatus(id, status, notes = '') {
    throw new Error('Method updateStatus must be implemented');
  }

  /**
   * Assign technician to service request
   * @param {number} id - Service request ID
   * @param {number} technicianId - Technician user ID
   * @returns {Promise<ServiceRequest>}
   */
  async assignTechnician(id, technicianId) {
    throw new Error('Method assignTechnician must be implemented');
  }

  /**
   * Add work log to service request
   * @param {number} requestId - Service request ID
   * @param {Object} workLogData - Work log data
   * @returns {Promise<Object>}
   */
  async addWorkLog(requestId, workLogData) {
    throw new Error('Method addWorkLog must be implemented');
  }

  /**
   * Get service request work logs
   * @param {number} requestId - Service request ID
   * @returns {Promise<Object[]>}
   */
  async getWorkLogs(requestId) {
    throw new Error('Method getWorkLogs must be implemented');
  }

  /**
   * Delete service request (soft delete)
   * @param {number} id - Service request ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Method delete must be implemented');
  }

  /**
   * Get client statistics
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>}
   */
  async getClientStatistics(clientCompanyId) {
    throw new Error('Method getClientStatistics must be implemented');
  }

  /**
   * Get provider statistics
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>}
   */
  async getProviderStatistics(providerCompanyId) {
    throw new Error('Method getProviderStatistics must be implemented');
  }

  /**
   * Get client request count
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async getClientRequestCount(clientCompanyId, filters = {}) {
    throw new Error('Method getClientRequestCount must be implemented');
  }

  /**
   * Get provider request count
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<number>}
   */
  async getProviderRequestCount(providerCompanyId, filters = {}) {
    throw new Error('Method getProviderRequestCount must be implemented');
  }

  /**
   * Search service requests
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<ServiceRequest[]>}
   */
  async search(query, filters = {}) {
    throw new Error('Method search must be implemented');
  }

  /**
   * Get service requests count by status
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @returns {Promise<Object>}
   */
  async getCountByStatus(companyId, companyType) {
    throw new Error('Method getCountByStatus must be implemented');
  }

  /**
   * Get service requests count by priority
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @returns {Promise<Object>}
   */
  async getCountByPriority(companyId, companyType) {
    throw new Error('Method getCountByPriority must be implemented');
  }

  /**
   * Get service requests count by type
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @returns {Promise<Object>}
   */
  async getCountByType(companyId, companyType) {
    throw new Error('Method getCountByType must be implemented');
  }

  /**
   * Get average resolution time
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>}
   */
  async getAverageResolutionTime(companyId, companyType, dateRange = {}) {
    throw new Error('Method getAverageResolutionTime must be implemented');
  }

  /**
   * Get technician performance metrics
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object[]>}
   */
  async getTechnicianPerformance(providerCompanyId, dateRange = {}) {
    throw new Error('Method getTechnicianPerformance must be implemented');
  }

  /**
   * Get service request trends
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object[]>}
   */
  async getRequestTrends(companyId, companyType, dateRange = {}) {
    throw new Error('Method getRequestTrends must be implemented');
  }

  /**
   * Get equipment failure analysis
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object[]>}
   */
  async getEquipmentFailureAnalysis(companyId, companyType, dateRange = {}) {
    throw new Error('Method getEquipmentFailureAnalysis must be implemented');
  }

  /**
   * Get service requests with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Service requests with pagination info
   */
  async findWithPagination(options = {}) {
    throw new Error('Method findWithPagination must be implemented');
  }

  /**
   * Get overdue service requests
   * @param {number} companyId - Company ID
   * @param {string} companyType - 'CLIENT' or 'PROVIDER'
   * @returns {Promise<ServiceRequest[]>}
   */
  async findOverdue(companyId, companyType) {
    throw new Error('Method findOverdue must be implemented');
  }
}

module.exports = IServiceRequestRepository;