/**
 * Rental Repository Interface
 * Define el contrato para la persistencia de rentals
 */
class IRentalRepository {
  
  /**
   * Busca un rental por su ID
   * @param {string} rentalId 
   * @returns {Promise<Rental|null>}
   */
  async findById(rentalId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals por compañía proveedora
   * @param {string} providerCompanyId 
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Rental[]>}
   */
  async findByProvider(providerCompanyId, filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals por compañía cliente
   * @param {string} clientCompanyId 
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Rental[]>}
   */
  async findByClient(clientCompanyId, filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals por equipo
   * @param {string} equipmentId 
   * @returns {Promise<Rental[]>}
   */
  async findByEquipment(equipmentId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals activos
   * @param {string} providerCompanyId 
   * @returns {Promise<Rental[]>}
   */
  async findActiveRentals(providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals que expiran pronto
   * @param {string} providerCompanyId 
   * @param {number} daysAhead - Días en el futuro
   * @returns {Promise<Rental[]>}
   */
  async findExpiringRentals(providerCompanyId, daysAhead = 30) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals por estado
   * @param {string} status 
   * @param {string} providerCompanyId 
   * @returns {Promise<Rental[]>}
   */
  async findByStatus(status, providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Guarda un rental (crear o actualizar)
   * @param {Rental} rental 
   * @returns {Promise<Rental>}
   */
  async save(rental) {
    throw new Error('Method not implemented');
  }

  /**
   * Elimina un rental
   * @param {string} rentalId 
   * @returns {Promise<boolean>}
   */
  async delete(rentalId) {
    throw new Error('Method not implemented');
  }

  /**
   * Calcula estadísticas de ingresos
   * @param {string} providerCompanyId 
   * @param {Object} period - { startDate, endDate }
   * @returns {Promise<Object>}
   */
  async getRevenueStats(providerCompanyId, period) {
    throw new Error('Method not implemented');
  }

  /**
   * Obtiene métricas de rentabilidad
   * @param {string} providerCompanyId 
   * @param {number} months - Meses hacia atrás
   * @returns {Promise<Object>}
   */
  async getProfitabilityMetrics(providerCompanyId, months = 12) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals con paginación
   * @param {Object} params - { page, limit, filters }
   * @returns {Promise<{rentals: Rental[], total: number}>}
   */
  async findWithPagination(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Cuenta rentals por criterios
   * @param {Object} criteria 
   * @returns {Promise<number>}
   */
  async count(criteria = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca rentals por rango de fechas
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @param {string} providerCompanyId 
   * @returns {Promise<Rental[]>}
   */
  async findByDateRange(startDate, endDate, providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Obtiene ingresos mensuales
   * @param {string} providerCompanyId 
   * @param {number} months - Número de meses atrás
   * @returns {Promise<Array>}
   */
  async getMonthlyRevenue(providerCompanyId, months = 12) {
    throw new Error('Method not implemented');
  }

  /**
   * Encuentra el rental activo para un equipo
   * @param {string} equipmentId 
   * @returns {Promise<Rental|null>}
   */
  async findActiveRentalByEquipment(equipmentId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IRentalRepository;
