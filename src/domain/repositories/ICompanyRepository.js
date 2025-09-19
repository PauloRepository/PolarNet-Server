/**
 * Repository Interface: Company
 * Defines the contract for company data persistence
 */
class ICompanyRepository {
  /**
   * Find company by ID
   * @param {number} id - Company ID
   * @returns {Promise<Company|null>}
   */
  async findById(id) {
    throw new Error('Method findById must be implemented');
  }

  /**
   * Find company by email
   * @param {string} email - Company email
   * @returns {Promise<Company|null>}
   */
  async findByEmail(email) {
    throw new Error('Method findByEmail must be implemented');
  }

  /**
   * Find companies by type
   * @param {string} type - Company type ('CLIENT' or 'PROVIDER')
   * @param {Object} filters - Additional filters
   * @returns {Promise<Company[]>}
   */
  async findByType(type, filters = {}) {
    throw new Error('Method findByType must be implemented');
  }

  /**
   * Get all active companies
   * @param {Object} filters - Filtering options
   * @returns {Promise<Company[]>}
   */
  async findActive(filters = {}) {
    throw new Error('Method findActive must be implemented');
  }

  /**
   * Create new company
   * @param {Object} companyData - Company data
   * @returns {Promise<Company>}
   */
  async create(companyData) {
    throw new Error('Method create must be implemented');
  }

  /**
   * Update company
   * @param {number} id - Company ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Company>}
   */
  async update(id, updateData) {
    throw new Error('Method update must be implemented');
  }

  /**
   * Delete company (soft delete)
   * @param {number} id - Company ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Method delete must be implemented');
  }

  /**
   * Get company statistics
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getStatistics(companyId) {
    throw new Error('Method getStatistics must be implemented');
  }

  /**
   * Search companies
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Company[]>}
   */
  async search(query, filters = {}) {
    throw new Error('Method search must be implemented');
  }

  /**
   * Get companies count by type
   * @param {string} type - Company type
   * @returns {Promise<number>}
   */
  async getCountByType(type) {
    throw new Error('Method getCountByType must be implemented');
  }

  /**
   * Get recently registered companies
   * @param {number} limit - Number of companies to return
   * @returns {Promise<Company[]>}
   */
  async getRecentlyRegistered(limit = 10) {
    throw new Error('Method getRecentlyRegistered must be implemented');
  }

  /**
   * Check if company email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - Company ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async emailExists(email, excludeId = null) {
    throw new Error('Method emailExists must be implemented');
  }

  /**
   * Get companies with pagination
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Companies with pagination info
   */
  async findWithPagination(options = {}) {
    throw new Error('Method findWithPagination must be implemented');
  }

  /**
   * Get company revenue summary (for providers)
   * @param {number} companyId - Provider company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>}
   */
  async getRevenueSummary(companyId, dateRange = {}) {
    throw new Error('Method getRevenueSummary must be implemented');
  }

  /**
   * Get company rental summary (for clients)
   * @param {number} companyId - Client company ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>}
   */
  async getRentalSummary(companyId, dateRange = {}) {
    throw new Error('Method getRentalSummary must be implemented');
  }

  /**
   * Get company activity summary
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>}
   */
  async getActivitySummary(companyId) {
    throw new Error('Method getActivitySummary must be implemented');
  }
}

module.exports = ICompanyRepository;