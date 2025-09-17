/**
 * Company Repository Interface
 * Define el contrato para la persistencia de empresas
 */
class ICompanyRepository {
  
  /**
   * Busca una empresa por su ID
   * @param {string} companyId 
   * @returns {Promise<Company|null>}
   */
  async findById(companyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresas por tipo
   * @param {string} type - 'PROVIDER' | 'CLIENT'
   * @returns {Promise<Company[]>}
   */
  async findByType(type) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresa por email
   * @param {string} email 
   * @returns {Promise<Company|null>}
   */
  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresa por tax ID
   * @param {string} taxId 
   * @returns {Promise<Company|null>}
   */
  async findByTaxId(taxId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresas activas
   * @param {string} type - Opcional: filtrar por tipo
   * @returns {Promise<Company[]>}
   */
  async findActiveCompanies(type = null) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca clientes de un proveedor
   * @param {string} providerCompanyId 
   * @returns {Promise<Company[]>}
   */
  async findClientsByProvider(providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresas por ubicación
   * @param {Object} location - { city, state, country }
   * @returns {Promise<Company[]>}
   */
  async findByLocation(location) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresas por especialización
   * @param {string} specialization 
   * @returns {Promise<Company[]>}
   */
  async findBySpecialization(specialization) {
    throw new Error('Method not implemented');
  }

  /**
   * Guarda una empresa (crear o actualizar)
   * @param {Company} company 
   * @returns {Promise<Company>}
   */
  async save(company) {
    throw new Error('Method not implemented');
  }

  /**
   * Elimina una empresa
   * @param {string} companyId 
   * @returns {Promise<boolean>}
   */
  async delete(companyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Cuenta empresas por criterios
   * @param {Object} criteria 
   * @returns {Promise<number>}
   */
  async count(criteria = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresas con paginación
   * @param {Object} params - { page, limit, filters }
   * @returns {Promise<{companies: Company[], total: number}>}
   */
  async findWithPagination(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresas por texto (nombre, descripción, etc.)
   * @param {string} searchText 
   * @param {string} type - Opcional: filtrar por tipo
   * @returns {Promise<Company[]>}
   */
  async searchByText(searchText, type = null) {
    throw new Error('Method not implemented');
  }

  /**
   * Activa una empresa
   * @param {string} companyId 
   * @returns {Promise<Company>}
   */
  async activate(companyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Desactiva una empresa
   * @param {string} companyId 
   * @returns {Promise<Company>}
   */
  async deactivate(companyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Actualiza información de contacto
   * @param {string} companyId 
   * @param {Object} contactInfo 
   * @returns {Promise<Company>}
   */
  async updateContactInfo(companyId, contactInfo) {
    throw new Error('Method not implemented');
  }

  /**
   * Obtiene estadísticas de la empresa
   * @param {string} companyId 
   * @returns {Promise<Object>}
   */
  async getCompanyStats(companyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Obtiene top empresas por revenue (para proveedores)
   * @param {number} limit 
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise<Array>}
   */
  async getTopCompaniesByRevenue(limit = 10, startDate, endDate) {
    throw new Error('Method not implemented');
  }

  /**
   * Verifica si una empresa existe
   * @param {string} companyId 
   * @returns {Promise<boolean>}
   */
  async exists(companyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca empresas que no han tenido actividad
   * @param {number} days - Días sin actividad
   * @returns {Promise<Company[]>}
   */
  async findInactiveCompanies(days = 90) {
    throw new Error('Method not implemented');
  }
}

module.exports = ICompanyRepository;
