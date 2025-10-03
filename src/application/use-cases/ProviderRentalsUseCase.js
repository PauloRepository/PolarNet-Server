/**
 * Use Case: Provider Rentals Management
 * Handles rental operations for provider companies
 */
class ProviderRentalsUseCase {
  constructor(
    activeRentalRepository,
    equipmentRepository,
    companyRepository,
    invoiceRepository,
    serviceRequestRepository
  ) {
    this.activeRentalRepository = activeRentalRepository;
    this.equipmentRepository = equipmentRepository;
    this.companyRepository = companyRepository;
    this.invoiceRepository = invoiceRepository;
    this.serviceRequestRepository = serviceRequestRepository;
  }

  /**
   * Get rentals list for provider
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Search and filter options
   * @returns {Promise<Object>} Rentals list with pagination
   */
  async getRentalsList(providerCompanyId, filters = {}) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      const {
        page = 1,
        limit = 20,
        status,
        clientName,
        equipmentType,
        sortBy = 'start_date',
        sortOrder = 'DESC'
      } = filters;

      const rentalFilters = {
        providerId: providerCompanyId, // Cambiar el nombre del parámetro
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      if (status) rentalFilters.status = status;
      if (clientName) rentalFilters.clientName = clientName;
      if (equipmentType) rentalFilters.equipmentType = equipmentType;

      const result = await this.activeRentalRepository.findWithPagination(rentalFilters);

      return result;
    } catch (error) {
      console.error('Error in ProviderRentalsUseCase.getRentalsList:', error);
      throw new Error(`Failed to get rentals list: ${error.message}`);
    }
  }

  /**
   * Get rental details for provider
   * @param {number} rentalId - Rental ID
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Rental details
   */
  async getRentalDetails(rentalId, providerCompanyId) {
    try {
      if (!rentalId || !providerCompanyId) {
        throw new Error('Rental ID and Provider company ID are required');
      }

      // Get rental and verify ownership
      const rental = await this.activeRentalRepository.findById(rentalId);
      
      if (!rental) {
        throw new Error('Rental not found');
      }

      if (rental.providerCompanyId !== providerCompanyId) {
        throw new Error('Rental does not belong to this provider');
      }

      // Get additional data in parallel
      const [
        equipment,
        clientCompany,
        invoices,
        serviceRequests,
        paymentHistory
      ] = await Promise.all([
        this.equipmentRepository.findById(rental.equipmentId),
        this.companyRepository.findById(rental.clientCompanyId),
        this.invoiceRepository.findByRental(rentalId),
        this.serviceRequestRepository.findByRental(rentalId),
        this.invoiceRepository.getPaymentHistory(rentalId)
      ]);

      return {
        rental,
        equipment,
        client: clientCompany,
        invoices,
        serviceRequests,
        paymentHistory
      };
    } catch (error) {
      console.error('Error in ProviderRentalsUseCase.getRentalDetails:', error);
      throw new Error(`Failed to get rental details: ${error.message}`);
    }
  }

  /**
   * Create new rental
   * @param {Object} rentalData - Rental data
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Created rental
   */
  async createRental(rentalData, providerCompanyId) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      // Verify equipment ownership
      const equipment = await this.equipmentRepository.findById(rentalData.equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      if (equipment.ownerCompanyId !== providerCompanyId) {
        throw new Error('Equipment does not belong to this provider');
      }

      if (equipment.status !== 'AVAILABLE') {
        throw new Error('Equipment is not available for rental');
      }

      // Verify client company exists
      const clientCompany = await this.companyRepository.findById(rentalData.clientCompanyId);
      
      if (!clientCompany || clientCompany.type !== 'CLIENT') {
        throw new Error('Invalid client company');
      }

      // Create rental
      const newRentalData = {
        ...rentalData,
        providerCompanyId,
        status: 'ACTIVE',
        paymentStatus: 'CURRENT',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const rental = await this.activeRentalRepository.create(newRentalData);

      // Update equipment status
      await this.equipmentRepository.update(rentalData.equipmentId, {
        status: 'RENTED',
        availabilityStatus: 'UNAVAILABLE'
      });

      return rental;
    } catch (error) {
      console.error('Error in ProviderRentalsUseCase.createRental:', error);
      throw new Error(`Failed to create rental: ${error.message}`);
    }
  }

  /**
   * Update rental
   * @param {number} rentalId - Rental ID
   * @param {Object} updateData - Update data
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Updated rental
   */
  async updateRental(rentalId, updateData, providerCompanyId) {
    try {
      if (!rentalId || !providerCompanyId) {
        throw new Error('Rental ID and Provider company ID are required');
      }

      // Verify ownership
      const rental = await this.activeRentalRepository.findById(rentalId);
      
      if (!rental) {
        throw new Error('Rental not found');
      }

      if (rental.providerCompanyId !== providerCompanyId) {
        throw new Error('Rental does not belong to this provider');
      }

      // Prepare update data
      const sanitizedUpdateData = {
        ...updateData,
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be updated directly
      delete sanitizedUpdateData.rentalId;
      delete sanitizedUpdateData.providerCompanyId;
      delete sanitizedUpdateData.clientCompanyId;
      delete sanitizedUpdateData.equipmentId;
      delete sanitizedUpdateData.createdAt;

      const updatedRental = await this.activeRentalRepository.update(rentalId, sanitizedUpdateData);

      return updatedRental;
    } catch (error) {
      console.error('Error in ProviderRentalsUseCase.updateRental:', error);
      throw new Error(`Failed to update rental: ${error.message}`);
    }
  }

  /**
   * Terminate rental
   * @param {number} rentalId - Rental ID
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} terminationData - Termination details
   * @returns {Promise<Object>} Terminated rental
   */
  async terminateRental(rentalId, providerCompanyId, terminationData = {}) {
    try {
      if (!rentalId || !providerCompanyId) {
        throw new Error('Rental ID and Provider company ID are required');
      }

      // Verify ownership
      const rental = await this.activeRentalRepository.findById(rentalId);
      
      if (!rental) {
        throw new Error('Rental not found');
      }

      if (rental.providerCompanyId !== providerCompanyId) {
        throw new Error('Rental does not belong to this provider');
      }

      if (rental.status !== 'ACTIVE') {
        throw new Error('Only active rentals can be terminated');
      }

      // Update rental status
      const updateData = {
        status: 'COMPLETED',
        actualEndDate: terminationData.terminationDate || new Date(),
        returnNotes: terminationData.returnNotes,
        updatedAt: new Date()
      };

      const updatedRental = await this.activeRentalRepository.update(rentalId, updateData);

      // Update equipment status
      await this.equipmentRepository.update(rental.equipmentId, {
        status: 'AVAILABLE',
        availabilityStatus: 'AVAILABLE'
      });

      return updatedRental;
    } catch (error) {
      console.error('Error in ProviderRentalsUseCase.terminateRental:', error);
      throw new Error(`Failed to terminate rental: ${error.message}`);
    }
  }

  /**
   * Get rental statistics for provider
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Rental statistics
   */
  async getRentalStatistics(providerCompanyId) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      const statistics = await this.activeRentalRepository.getProviderStatistics(providerCompanyId);
      
      return statistics;
    } catch (error) {
      console.error('Error in ProviderRentalsUseCase.getRentalStatistics:', error);
      throw new Error(`Failed to get rental statistics: ${error.message}`);
    }
  }
}

module.exports = ProviderRentalsUseCase;
