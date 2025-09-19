const ClientEquipmentResponseDTO = require('../dto/ClientEquipmentResponseDTO');

/**
 * Use Case: Get Client Equipment
 * Handles equipment data retrieval for client companies
 */
class GetClientEquipmentUseCase {
  constructor(
    equipmentRepository,
    activeRentalRepository,
    temperatureReadingRepository
  ) {
    this.equipmentRepository = equipmentRepository;
    this.activeRentalRepository = activeRentalRepository;
    this.temperatureReadingRepository = temperatureReadingRepository;
  }

  /**
   * Get equipment list for client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Filtering options
   * @returns {Promise<Object>} Equipment list
   */
  async getEquipments(clientCompanyId, filters = {}) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const {
        page = 1,
        limit = 20,
        type,
        locationId,
        status,
        search
      } = filters;

      // Build query filters
      const queryFilters = {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        locationId,
        status,
        search
      };

      const [equipments, totalCount] = await Promise.all([
        this.equipmentRepository.findRentedByClient(clientCompanyId, queryFilters),
        this.equipmentRepository.getClientEquipmentCount(clientCompanyId)
      ]);

      return {
        success: true,
        data: {
          equipments: ClientEquipmentResponseDTO.formatEquipmentList(equipments),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      };

    } catch (error) {
      console.error('Error in GetClientEquipmentUseCase.getEquipments:', error);
      throw new Error(`Failed to get equipments: ${error.message}`);
    }
  }

  /**
   * Get equipment details by ID
   * @param {number} equipmentId - Equipment ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} Equipment details
   */
  async getEquipmentDetails(equipmentId, clientCompanyId) {
    try {
      if (!equipmentId || !clientCompanyId) {
        throw new Error('Equipment ID and client company ID are required');
      }

      // Verify equipment belongs to client through active rental
      const activeRental = await this.activeRentalRepository.getActiveRentalByEquipment(equipmentId);
      
      if (!activeRental || activeRental.clientCompanyId !== clientCompanyId) {
        throw new Error('Equipment not found or access denied');
      }

      const equipment = await this.equipmentRepository.findById(equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      return {
        success: true,
        data: ClientEquipmentResponseDTO.formatEquipmentDetails(equipment)
      };

    } catch (error) {
      console.error('Error in GetClientEquipmentUseCase.getEquipmentDetails:', error);
      throw new Error(`Failed to get equipment details: ${error.message}`);
    }
  }

  /**
   * Get temperature readings for equipment
   * @param {number} equipmentId - Equipment ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Temperature readings
   */
  async getEquipmentTemperatureReadings(equipmentId, clientCompanyId, filters = {}) {
    try {
      if (!equipmentId || !clientCompanyId) {
        throw new Error('Equipment ID and client company ID are required');
      }

      // Verify access
      const activeRental = await this.activeRentalRepository.getActiveRentalByEquipment(equipmentId);
      
      if (!activeRental || activeRental.clientCompanyId !== clientCompanyId) {
        throw new Error('Equipment not found or access denied');
      }

      const readings = await this.temperatureReadingRepository.findByEquipment(equipmentId, filters);

      return {
        success: true,
        data: ClientEquipmentResponseDTO.formatTemperatureReadings(readings)
      };

    } catch (error) {
      console.error('Error in GetClientEquipmentUseCase.getEquipmentTemperatureReadings:', error);
      throw new Error(`Failed to get temperature readings: ${error.message}`);
    }
  }

  /**
   * Get equipment statistics for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Equipment statistics
   */
  async getEquipmentStatistics(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const [
        equipmentMetrics,
        temperatureAlerts,
        locationStats
      ] = await Promise.all([
        this.equipmentRepository.getClientEquipmentMetrics(clientCompanyId),
        this.temperatureReadingRepository.getClientTemperatureAlerts(clientCompanyId),
        this.equipmentRepository.getClientEquipmentByLocation(clientCompanyId)
      ]);

      const combinedStats = {
        ...equipmentMetrics,
        alerts: temperatureAlerts,
        byLocation: locationStats
      };

      return {
        success: true,
        data: ClientEquipmentResponseDTO.formatEquipmentStatistics(combinedStats)
      };

    } catch (error) {
      console.error('Error in GetClientEquipmentUseCase.getEquipmentStatistics:', error);
      throw new Error(`Failed to get equipment statistics: ${error.message}`);
    }
  }

  /**
   * Get equipment by location for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Equipment grouped by location
   */
  async getEquipmentByLocation(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const equipmentByLocation = await this.equipmentRepository.getClientEquipmentByLocation(clientCompanyId);

      return {
        success: true,
        data: equipmentByLocation.map(location => ({
          locationId: location.locationId,
          locationName: location.locationName,
          equipmentCount: location.equipmentCount,
          equipments: ClientEquipmentResponseDTO.formatEquipmentList(location.equipments || [])
        }))
      };

    } catch (error) {
      console.error('Error in GetClientEquipmentUseCase.getEquipmentByLocation:', error);
      throw new Error(`Failed to get equipment by location: ${error.message}`);
    }
  }

  /**
   * Get equipment needing maintenance for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Equipment needing maintenance
   */
  async getEquipmentNeedingMaintenance(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const equipments = await this.equipmentRepository.findRentedByClient(clientCompanyId, {
        needsMaintenance: true
      });

      return {
        success: true,
        data: ClientEquipmentResponseDTO.formatEquipmentList(equipments)
      };

    } catch (error) {
      console.error('Error in GetClientEquipmentUseCase.getEquipmentNeedingMaintenance:', error);
      throw new Error(`Failed to get equipment needing maintenance: ${error.message}`);
    }
  }
}

module.exports = GetClientEquipmentUseCase;
