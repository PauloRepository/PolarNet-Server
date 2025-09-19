/**
 * Interface: User Repository
 * Defines the contract for user data persistence operations
 */
class IUserRepository {
  
  // Basic CRUD operations
  async findById(userId) {
    throw new Error('Method findById must be implemented');
  }

  async create(user) {
    throw new Error('Method create must be implemented');
  }

  async update(userId, data) {
    throw new Error('Method update must be implemented');
  }

  async delete(userId) {
    throw new Error('Method delete must be implemented');
  }

  // Authentication operations
  async findByUsername(username) {
    throw new Error('Method findByUsername must be implemented');
  }

  async findByEmail(email) {
    throw new Error('Method findByEmail must be implemented');
  }

  async updatePassword(userId, hashedPassword) {
    throw new Error('Method updatePassword must be implemented');
  }

  async recordLogin(userId) {
    throw new Error('Method recordLogin must be implemented');
  }

  // Query operations
  async findByCompany(companyId) {
    throw new Error('Method findByCompany must be implemented');
  }

  async findByRole(role) {
    throw new Error('Method findByRole must be implemented');
  }

  async findActiveUsers() {
    throw new Error('Method findActiveUsers must be implemented');
  }

  async findClientUsers(clientCompanyId) {
    throw new Error('Method findClientUsers must be implemented');
  }

  async findProviderUsers(providerCompanyId) {
    throw new Error('Method findProviderUsers must be implemented');
  }

  // Business operations
  async getUserProfile(userId) {
    throw new Error('Method getUserProfile must be implemented');
  }

  async updateProfile(userId, profileData) {
    throw new Error('Method updateProfile must be implemented');
  }

  async activate(userId) {
    throw new Error('Method activate must be implemented');
  }

  async deactivate(userId) {
    throw new Error('Method deactivate must be implemented');
  }
}

module.exports = IUserRepository;
