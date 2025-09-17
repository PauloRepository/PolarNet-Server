/**
 * Equipment Repository Interface
 * Define el contrato para la persistencia de equipos
 */
class IEquipmentRepository {
  
  /**
   * Busca un equipo por su ID
   * @param {string} equipmentId 
   * @returns {Promise<Equipment|null>}
   */
  async findById(equipmentId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca equipos por compañía propietaria
   * @param {string} ownerCompanyId 
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Equipment[]>}
   */
  async findByOwnerCompany(ownerCompanyId, filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca equipos disponibles para renta
   * @param {Object} criteria - Criterios de búsqueda
   * @returns {Promise<Equipment[]>}
   */
  async findAvailableForRent(criteria = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca equipos por estado
   * @param {string} status 
   * @returns {Promise<Equipment[]>}
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca equipos que requieren mantenimiento
   * @param {string} ownerCompanyId 
   * @returns {Promise<Equipment[]>}
   */
  async findRequiringMaintenance(ownerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Guarda un equipo (crear o actualizar)
   * @param {Equipment} equipment 
   * @returns {Promise<Equipment>}
   */
  async save(equipment) {
    throw new Error('Method not implemented');
  }

  /**
   * Elimina un equipo
   * @param {string} equipmentId 
   * @returns {Promise<boolean>}
   */
  async delete(equipmentId) {
    throw new Error('Method not implemented');
  }

  /**
   * Cuenta equipos por criterios
   * @param {Object} criteria 
   * @returns {Promise<number>}
   */
  async count(criteria = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca equipos con paginación
   * @param {Object} params - { page, limit, filters }
   * @returns {Promise<{equipment: Equipment[], total: number}>}
   */
  async findWithPagination(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca equipos por tipo
   * @param {string} type 
   * @param {string} ownerCompanyId 
   * @returns {Promise<Equipment[]>}
   */
  async findByType(type, ownerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca equipos por fabricante
   * @param {string} manufacturer 
   * @param {string} ownerCompanyId 
   * @returns {Promise<Equipment[]>}
   */
  async findByManufacturer(manufacturer, ownerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Actualiza la ubicación de un equipo
   * @param {string} equipmentId 
   * @param {string} newLocation 
   * @returns {Promise<Equipment>}
   */
  async updateLocation(equipmentId, newLocation) {
    throw new Error('Method not implemented');
  }

  /**
   * Actualiza el estado de un equipo
   * @param {string} equipmentId 
   * @param {string} newStatus 
   * @returns {Promise<Equipment>}
   */
  async updateStatus(equipmentId, newStatus) {
    throw new Error('Method not implemented');
  }
}

module.exports = IEquipmentRepository;
