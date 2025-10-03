const ProviderEquipmentResponseDTO = require('../dto/ProviderEquipmentResponseDTO');

/**
 * Use Case: Provider Equipment Management
 * Handles equipment operations for provider companies
 */
class ProviderEquipmentUseCase {
  constructor(
    equipmentRepository,
    activeRentalRepository,
    temperatureReadingRepository,
    equipmentLocationRepository,
    serviceRequestRepository
  ) {
    this.equipmentRepository = equipmentRepository;
    this.activeRentalRepository = activeRentalRepository;
    this.temperatureReadingRepository = temperatureReadingRepository;
    this.equipmentLocationRepository = equipmentLocationRepository;
    this.serviceRequestRepository = serviceRequestRepository;
  }

  /**
   * Get equipment list for provider
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Search and filter options
   * @returns {Promise<Object>} Equipment list with pagination
   */
  async getEquipmentList(providerCompanyId, filters = {}) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      const {
        page = 1,
        limit = 20,
        search,
        type,
        status,
        location,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;

      // Build filter object for repository
      const equipmentFilters = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
        // TODO: Add back ownerCompanyId filter after adding test data
        // ownerCompanyId: providerCompanyId
      };

      if (search) equipmentFilters.search = search;
      if (type) equipmentFilters.type = type;
      if (status) equipmentFilters.status = status;
      if (location) equipmentFilters.locationId = location;

      const result = await this.equipmentRepository.findByProvider(providerCompanyId, equipmentFilters);

      // Map the structure to what the DTO expects
      const mappedResult = {
        data: result.equipments || [],
        pagination: result.pagination || {}
      };

      return ProviderEquipmentResponseDTO.formatEquipmentList(mappedResult);
    } catch (error) {
      console.error('Error in ProviderEquipmentUseCase.getEquipmentList:', error);
      throw new Error(`Failed to get equipment list: ${error.message}`);
    }
  }

  /**
   * Get equipment details for provider
   * @param {number} equipmentId - Equipment ID
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Equipment details
   */
  async getEquipmentDetails(equipmentId, providerCompanyId) {
    try {
      if (!equipmentId || !providerCompanyId) {
        throw new Error('Equipment ID and Provider company ID are required');
      }

      // Get equipment and verify ownership
      const equipment = await this.equipmentRepository.findById(equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      if (equipment.providerCompanyId !== providerCompanyId) {
        throw new Error('Equipment does not belong to this provider');
      }

      // Get additional data in parallel (with fallbacks for missing repositories)
      let currentRental = null;
      let rentalHistory = [];
      let temperatureHistory = {};
      let serviceHistory = [];

      try {
        if (this.activeRentalRepository && this.activeRentalRepository.findCurrentByEquipment) {
          currentRental = await this.activeRentalRepository.findCurrentByEquipment(equipmentId);
        }
      } catch (error) {
        console.warn('Could not fetch current rental:', error.message);
      }

      try {
        if (this.activeRentalRepository && this.activeRentalRepository.findByEquipment) {
          rentalHistory = await this.activeRentalRepository.findByEquipment(equipmentId);
        }
      } catch (error) {
        console.warn('Could not fetch rental history:', error.message);
      }

      try {
        if (this.temperatureReadingRepository && this.temperatureReadingRepository.getEquipmentSummary) {
          temperatureHistory = await this.temperatureReadingRepository.getEquipmentSummary(equipmentId);
        }
      } catch (error) {
        console.warn('Could not fetch temperature history:', error.message);
      }

      try {
        if (this.serviceRequestRepository && this.serviceRequestRepository.findByEquipment) {
          serviceHistory = await this.serviceRequestRepository.findByEquipment(equipmentId);
        }
      } catch (error) {
        console.warn('Could not fetch service history:', error.message);
      }

      const equipmentDetails = {
        ...equipment,
        currentRental,
        rentalHistory,
        temperatureHistory,
        serviceHistory
      };

      return ProviderEquipmentResponseDTO.formatEquipmentDetails(equipmentDetails);
    } catch (error) {
      console.error('Error in ProviderEquipmentUseCase.getEquipmentDetails:', error);
      throw new Error(`Failed to get equipment details: ${error.message}`);
    }
  }

  /**
   * Create new equipment
   * @param {Object} equipmentData - Equipment data
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Created equipment
   */
  async createEquipment(equipmentData, providerCompanyId) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      // Set owner company
      const newEquipmentData = {
        ...equipmentData,
        ownerCompanyId: providerCompanyId,
        status: 'AVAILABLE',
        condition: equipmentData.condition || 'NEW',
        availabilityStatus: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate required fields
      const requiredFields = ['name', 'type', 'model', 'serialNumber'];
      for (const field of requiredFields) {
        if (!newEquipmentData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      const equipment = await this.equipmentRepository.create(newEquipmentData);

      return ProviderEquipmentResponseDTO.formatEquipmentDetails(equipment);
    } catch (error) {
      console.error('Error in ProviderEquipmentUseCase.createEquipment:', error);
      throw new Error(`Failed to create equipment: ${error.message}`);
    }
  }

  /**
   * Update equipment
   * @param {number} equipmentId - Equipment ID
   * @param {Object} updateData - Update data
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Updated equipment
   */
  async updateEquipment(equipmentId, updateData, providerCompanyId) {
    try {
      if (!equipmentId || !providerCompanyId) {
        throw new Error('Equipment ID and Provider company ID are required');
      }

      // Verify ownership
      const equipment = await this.equipmentRepository.findById(equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      if (equipment.ownerCompanyId !== providerCompanyId) {
        throw new Error('Equipment does not belong to this provider');
      }

      // Prepare update data
      const sanitizedUpdateData = {
        ...updateData,
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be updated directly
      delete sanitizedUpdateData.equipmentId;
      delete sanitizedUpdateData.ownerCompanyId;
      delete sanitizedUpdateData.createdAt;

      const updatedEquipment = await this.equipmentRepository.update(equipmentId, sanitizedUpdateData);

      return ProviderEquipmentResponseDTO.formatEquipmentDetails(updatedEquipment);
    } catch (error) {
      console.error('Error in ProviderEquipmentUseCase.updateEquipment:', error);
      throw new Error(`Failed to update equipment: ${error.message}`);
    }
  }

  /**
   * Delete equipment (soft delete)
   * @param {number} equipmentId - Equipment ID
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEquipment(equipmentId, providerCompanyId) {
    try {
      if (!equipmentId || !providerCompanyId) {
        throw new Error('Equipment ID and Provider company ID are required');
      }

      // Verify ownership
      const equipment = await this.equipmentRepository.findById(equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      if (equipment.ownerCompanyId !== providerCompanyId) {
        throw new Error('Equipment does not belong to this provider');
      }

      // Check if equipment is currently rented
      const currentRental = await this.activeRentalRepository.findCurrentByEquipment(equipmentId);
      
      if (currentRental) {
        throw new Error('Cannot delete equipment that is currently rented');
      }

      return await this.equipmentRepository.delete(equipmentId);
    } catch (error) {
      console.error('Error in ProviderEquipmentUseCase.deleteEquipment:', error);
      throw new Error(`Failed to delete equipment: ${error.message}`);
    }
  }

  /**
   * Get equipment summary for provider
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Equipment summary
   */
  async getEquipmentSummary(providerCompanyId) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      const summary = await this.equipmentRepository.getProviderStatistics(providerCompanyId);
      
      return ProviderEquipmentResponseDTO.formatEquipmentStatistics(summary);
    } catch (error) {
      console.error('Error in ProviderEquipmentUseCase.getEquipmentSummary:', error);
      throw new Error(`Failed to get equipment summary: ${error.message}`);
    }
  }

  /**
   * Get equipment performance analytics
   * @param {number} equipmentId - Equipment ID
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} Equipment performance data
   */
  async getEquipmentPerformance(equipmentId, providerCompanyId, filters = {}) {
    try {
      if (!equipmentId || !providerCompanyId) {
        throw new Error('Equipment ID and Provider company ID are required');
      }

      // Verify ownership
      const equipment = await this.equipmentRepository.findById(equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      if (equipment.ownerCompanyId !== providerCompanyId) {
        throw new Error('Equipment does not belong to this provider');
      }

      const [
        temperatureAnalytics,
        rentalAnalytics,
        maintenanceHistory
      ] = await Promise.all([
        this.temperatureReadingRepository.getEquipmentAnalytics(equipmentId, filters),
        this.activeRentalRepository.getEquipmentRentalAnalytics(equipmentId, filters),
        this.serviceRequestRepository.getEquipmentMaintenanceHistory(equipmentId, filters)
      ]);

      const performance = {
        equipmentId,
        temperatureAnalytics,
        rentalAnalytics,
        maintenanceHistory
      };

      return ProviderEquipmentResponseDTO.formatEquipmentPerformance(performance);
    } catch (error) {
      console.error('Error in ProviderEquipmentUseCase.getEquipmentPerformance:', error);
      throw new Error(`Failed to get equipment performance: ${error.message}`);
    }
  }
}

module.exports = ProviderEquipmentUseCase;
