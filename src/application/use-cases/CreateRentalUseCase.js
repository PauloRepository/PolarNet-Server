/**
 * Create Rental Use Case
 * Caso de uso para crear un nuevo rental
 */
const Rental = require('../../domain/entities/Rental');

class CreateRentalUseCase {
  constructor(rentalRepository, equipmentRepository, equipmentDomainService) {
    this.rentalRepository = rentalRepository;
    this.equipmentRepository = equipmentRepository;
    this.equipmentDomainService = equipmentDomainService;
  }

  /**
   * Ejecuta el caso de uso
   * @param {Object} request - Datos del rental a crear
   * @returns {Promise<Object>}
   */
  async execute(request) {
    const {
      equipmentId,
      clientCompanyId,
      providerCompanyId,
      startDate,
      endDate,
      monthlyRate,
      securityDeposit = 0,
      paymentTerms,
      contractTerms,
      notes
    } = request;

    try {
      // Validar datos requeridos
      if (!equipmentId || !clientCompanyId || !providerCompanyId || 
          !startDate || !endDate || !monthlyRate) {
        throw new Error('Missing required rental data');
      }

      // Buscar el equipo
      const equipment = await this.equipmentRepository.findById(equipmentId);
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      // Verificar que el equipo pertenezca al proveedor
      if (equipment.ownerCompanyId !== providerCompanyId) {
        throw new Error('Equipment does not belong to the provider company');
      }

      // Verificar si el equipo puede ser rentado
      const canRentResult = await this.equipmentDomainService.canEquipmentBeRented(equipment);
      if (!canRentResult.canRent) {
        throw new Error(`Cannot rent equipment: ${canRentResult.reason}`);
      }

      // Crear la entidad Rental
      const rental = new Rental({
        equipmentId,
        clientCompanyId,
        providerCompanyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRate: parseFloat(monthlyRate),
        securityDeposit: parseFloat(securityDeposit),
        status: 'ACTIVE',
        paymentTerms,
        contractTerms,
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Guardar el rental
      const savedRental = await this.rentalRepository.save(rental);

      // Actualizar el estado del equipo a RENTED
      equipment.rent(clientCompanyId);
      await this.equipmentRepository.save(equipment);

      return {
        success: true,
        data: {
          rental: savedRental,
          message: 'Rental created successfully'
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

module.exports = CreateRentalUseCase;
