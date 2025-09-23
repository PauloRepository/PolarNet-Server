/**
 * Controller: Provider Rentals Management
 * Handles PROVIDER rental operations
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderRentalsController {
  constructor(container) {
    this.container = container;
    this.rentalsUseCase = container.resolve('providerRentalsUseCase');
    this.ResponseDTO = container.resolve('ProviderRentalResponseDTO');
    this.logger = container.resolve('logger');
  }

  /**
   * Get rentals list with search and filtering
   * GET /api/provider/rentals
   */
  async getRentals(req, res) {
    try {
      const providerId = req.user.companyId;
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        clientName: req.query.clientName,
        equipmentType: req.query.equipmentType,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await this.rentalsUseCase.getRentalsList(providerId, filters);

      return ResponseHandler.success(res, {
        message: 'Rentals retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get rentals');
    }
  }

  /**
   * Get rental details
   * GET /api/provider/rentals/:id
   */
  async getRentalById(req, res) {
    try {
      const { id } = req.params;
      const providerId = req.user.companyId;

      const rental = await this.rentalsUseCase.getRentalDetails(id, providerId);

      return ResponseHandler.success(res, {
        message: 'Rental details retrieved successfully',
        data: rental
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get rental details');
    }
  }

  /**
   * Create new rental
   * POST /api/provider/rentals
   */
  async createRental(req, res) {
    try {
      const providerId = req.user.companyId;
      const rentalData = req.body;

      const newRental = await this.rentalsUseCase.createRental(rentalData, providerId);

      return ResponseHandler.success(res, {
        message: 'Rental created successfully',
        data: newRental
      }, 201);
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to create rental');
    }
  }

  /**
   * Update rental status and information
   * PUT /api/provider/rentals/:id
   */
  async updateRentalStatus(req, res) {
    try {
      const { id } = req.params;
      const providerId = req.user.companyId;
      const updateData = req.body;

      const updatedRental = await this.rentalsUseCase.updateRental(id, updateData, providerId);

      return ResponseHandler.success(res, {
        message: 'Rental updated successfully',
        data: updatedRental
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to update rental');
    }
  }
}

module.exports = ProviderRentalsController;
