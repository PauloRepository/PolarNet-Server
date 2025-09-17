/**
 * Service Request Repository Interface
 * Define el contrato para la persistencia de solicitudes de servicio
 */
class IServiceRequestRepository {
  
  /**
   * Busca una solicitud de servicio por su ID
   * @param {string} serviceRequestId 
   * @returns {Promise<ServiceRequest|null>}
   */
  async findById(serviceRequestId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes de servicio por proveedor
   * @param {string} providerCompanyId 
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByProvider(providerCompanyId, filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes de servicio por cliente
   * @param {string} clientCompanyId 
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByClient(clientCompanyId, filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes de servicio por estado
   * @param {string|Array} status 
   * @param {string} providerCompanyId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByStatus(status, providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes de servicio por prioridad
   * @param {string} priority 
   * @param {string} providerCompanyId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByPriority(priority, providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes de servicio por técnico asignado
   * @param {string} technicianId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByTechnician(technicianId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes de servicio por equipo
   * @param {string} equipmentId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByEquipment(equipmentId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes por rango de fechas
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @param {string} providerCompanyId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findByDateRange(startDate, endDate, providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes urgentes (alta prioridad y críticas)
   * @param {string} providerCompanyId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findUrgentRequests(providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes vencidas
   * @param {string} providerCompanyId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findOverdueRequests(providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Guarda una solicitud de servicio (crear o actualizar)
   * @param {ServiceRequest} serviceRequest 
   * @returns {Promise<ServiceRequest>}
   */
  async save(serviceRequest) {
    throw new Error('Method not implemented');
  }

  /**
   * Elimina una solicitud de servicio
   * @param {string} serviceRequestId 
   * @returns {Promise<boolean>}
   */
  async delete(serviceRequestId) {
    throw new Error('Method not implemented');
  }

  /**
   * Cuenta solicitudes por criterios
   * @param {Object} criteria 
   * @returns {Promise<number>}
   */
  async count(criteria = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca con paginación
   * @param {Object} params - { page, limit, filters }
   * @returns {Promise<{serviceRequests: ServiceRequest[], total: number}>}
   */
  async findWithPagination(params) {
    throw new Error('Method not implemented');
  }

  /**
   * Obtiene estadísticas de solicitudes de servicio
   * @param {string} providerCompanyId 
   * @param {Object} period - { startDate, endDate }
   * @returns {Promise<Object>}
   */
  async getStats(providerCompanyId, period) {
    throw new Error('Method not implemented');
  }

  /**
   * Asigna técnico a una solicitud
   * @param {string} serviceRequestId 
   * @param {string} technicianId 
   * @returns {Promise<ServiceRequest>}
   */
  async assignTechnician(serviceRequestId, technicianId) {
    throw new Error('Method not implemented');
  }

  /**
   * Actualiza estado de una solicitud
   * @param {string} serviceRequestId 
   * @param {string} newStatus 
   * @returns {Promise<ServiceRequest>}
   */
  async updateStatus(serviceRequestId, newStatus) {
    throw new Error('Method not implemented');
  }

  /**
   * Busca solicitudes sin asignar
   * @param {string} providerCompanyId 
   * @returns {Promise<ServiceRequest[]>}
   */
  async findUnassignedRequests(providerCompanyId) {
    throw new Error('Method not implemented');
  }

  /**
   * Obtiene promedio de tiempo de resolución
   * @param {string} providerCompanyId 
   * @param {number} days - Días hacia atrás para calcular
   * @returns {Promise<number>}
   */
  async getAverageResolutionTime(providerCompanyId, days = 30) {
    throw new Error('Method not implemented');
  }
}

module.exports = IServiceRequestRepository;
