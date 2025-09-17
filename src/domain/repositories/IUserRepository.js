/**
 * User Repository Interface - DDD
 * Interface que define las operaciones del repositorio de usuarios
 */

class IUserRepository {
  async save(user) {
    throw new Error('Method save must be implemented');
  }

  async findById(id) {
    throw new Error('Method findById must be implemented');
  }

  async findByEmail(email) {
    throw new Error('Method findByEmail must be implemented');
  }

  async findByCompany(companyId, filters = {}) {
    throw new Error('Method findByCompany must be implemented');
  }

  async findByRole(role, filters = {}) {
    throw new Error('Method findByRole must be implemented');
  }

  async findTechnicians(providerCompanyId) {
    throw new Error('Method findTechnicians must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete must be implemented');
  }

  async updateLastLogin(userId) {
    throw new Error('Method updateLastLogin must be implemented');
  }

  async validateCredentials(email, password) {
    throw new Error('Method validateCredentials must be implemented');
  }
}

module.exports = IUserRepository;
