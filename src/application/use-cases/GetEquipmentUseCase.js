/**
 * Get Equipment Use Case
 * Caso de uso para obtener equipos con filtros y paginación
 */
class GetEquipmentUseCase {
  constructor(equipmentRepository, equipmentDomainService) {
    this.equipmentRepository = equipmentRepository;
    this.equipmentDomainService = equipmentDomainService;
  }

  /**
   * Ejecuta el caso de uso
   * @param {Object} request - { ownerCompanyId, filters, page, limit }
   * @returns {Promise<Object>}
   */
  async execute(request) {
    const { 
      ownerCompanyId, 
      filters = {}, 
      page = 1, 
      limit = 10,
      includeMetrics = false 
    } = request;

    try {
      // Validar parámetros
      if (!ownerCompanyId) {
        throw new Error('Owner company ID is required');
      }

      // Buscar equipos con paginación
      const result = await this.equipmentRepository.findWithPagination({
        ownerCompanyId,
        filters,
        page,
        limit
      });

      // Si se solicitan métricas, calcular información adicional
      if (includeMetrics) {
        result.equipment = await Promise.all(
          result.equipment.map(async (equipment) => {
            const currentValue = this.equipmentDomainService.calculateCurrentValue(equipment);
            const depreciation = this.equipmentDomainService.calculateDepreciation(equipment);
            const suggestedRate = await this.equipmentDomainService.calculateSuggestedRentalRate(equipment);
            
            return {
              ...equipment,
              metrics: {
                currentValue,
                depreciation: Math.round(depreciation * 100),
                suggestedRentalRate: suggestedRate
              }
            };
          })
        );
      }

      return {
        success: true,
        data: {
          equipment: result.equipment,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GetEquipmentUseCase;
