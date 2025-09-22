/**
 * Controller: Provider Rentals Management
 * Handles PROVIDER rental operations using DDD architecture
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
  async getRentalDetails(req, res) {
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
   * Update rental
   * PUT /api/provider/rentals/:id
   */
  async updateRental(req, res) {
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

  /**
   * Terminate rental
   * POST /api/provider/rentals/:id/terminate
   */
  async terminateRental(req, res) {
    try {
      const { id } = req.params;
      const providerId = req.user.companyId;
      const terminationData = req.body;

      const result = await this.rentalsUseCase.terminateRental(id, providerId, terminationData);

      return ResponseHandler.success(res, {
        message: 'Rental terminated successfully',
        data: result
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to terminate rental');
    }
  }

  /**
   * Get rental statistics
   * GET /api/provider/rentals/statistics
   */
  async getRentalStatistics(req, res) {
    try {
      const providerId = req.user.companyId;

      const statistics = await this.rentalsUseCase.getRentalStatistics(providerId);

      return ResponseHandler.success(res, {
        message: 'Rental statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get rental statistics');
    }
  }

  /**
   * Delete rental (soft delete)
   * DELETE /api/provider/rentals/:id
   */
  async deleteRental(req, res) {
    try {
      // This would typically be a soft delete or archive operation
      // For now, we'll use terminate rental as the delete operation
      const { id } = req.params;
      const providerId = req.user.companyId;

      const result = await this.rentalsUseCase.terminateRental(id, providerId, {
        reason: 'Deleted by provider',
        terminatedAt: new Date()
      });

      return ResponseHandler.success(res, {
        message: 'Rental deleted successfully',
        data: result
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to delete rental');
    }
  }

  /**
   * Get rental requests (pending/new rentals)
   * GET /api/provider/rental-requests
   */
  async getRentalRequests(req, res) {
    try {
      const providerId = req.user.companyId;
      const filters = {
        ...req.query,
        status: 'pending' // Only pending rental requests
      };

      const result = await this.rentalsUseCase.getRentalsList(providerId, filters);

      return ResponseHandler.success(res, {
        message: 'Rental requests retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get rental requests');
    }
  }

  /**
   * Get revenue statistics
   * GET /api/provider/rentals/revenue-stats
   */
  async getRevenueStats(req, res) {
    try {
      const providerId = req.user.companyId;
      const { period = 'monthly' } = req.query;

      const statistics = await this.rentalsUseCase.getRentalStatistics(providerId);
      
      // Extract revenue specific stats
      const revenueStats = {
        totalRevenue: statistics.general?.monthly_revenue || 0,
        averageRevenue: statistics.general?.avg_monthly_rate || 0,
        monthlyTrend: statistics.monthly_trend || [],
        revenueByEquipment: statistics.by_equipment_type || []
      };

      return ResponseHandler.success(res, {
        message: 'Revenue statistics retrieved successfully',
        data: revenueStats
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get revenue statistics');
    }
  }

  /**
   * Get rental renewals
   * GET /api/provider/rentals/renewals
   */
  async getRenewals(req, res) {
    try {
      const providerId = req.user.companyId;
      const filters = {
        ...req.query,
        // Filter for rentals that are near expiration or eligible for renewal
        nearExpiration: true
      };

      const result = await this.rentalsUseCase.getRentalsList(providerId, filters);

      return ResponseHandler.success(res, {
        message: 'Rental renewals retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get rental renewals');
    }
  }

  /**
   * Get profitability analysis
   * GET /api/provider/rentals/profitability
   */
  async getProfitability(req, res) {
    try {
      const providerId = req.user.companyId;

      const statistics = await this.rentalsUseCase.getRentalStatistics(providerId);
      
      // Calculate profitability metrics
      const profitability = {
        totalRentals: statistics.general?.total_rentals || 0,
        activeRentals: statistics.general?.active_rentals || 0,
        monthlyRevenue: statistics.general?.monthly_revenue || 0,
        averageRentalValue: statistics.general?.avg_monthly_rate || 0,
        profitabilityByEquipment: statistics.by_equipment_type || [],
        profitMargin: 0.65, // Example fixed margin
        monthlyTrend: statistics.monthly_trend || []
      };

      return ResponseHandler.success(res, {
        message: 'Profitability analysis retrieved successfully',
        data: profitability
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get profitability analysis');
    }
  }

  /**
   * Get rental payment history
   * GET /api/provider/rentals/:id/payments
   */
  async getRentalPayments(req, res) {
    try {
      const { id } = req.params;
      const providerId = req.user.companyId;

      // First verify rental belongs to provider
      const rental = await this.rentalsUseCase.getRentalDetails(id, providerId);
      
      if (!rental) {
        return ResponseHandler.error(res, 'Rental not found', 404);
      }

      // Get payment history (using invoice repository through use case)
      const paymentHistory = rental.invoices || [];

      return ResponseHandler.success(res, {
        message: 'Rental payments retrieved successfully',
        data: paymentHistory
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message || 'Failed to get rental payments');
    }
  }

  // Legacy aliases for compatibility
  async index(req, res) { return this.getRentals(req, res); }
  async show(req, res) { return this.getRentalDetails(req, res); }
  async create(req, res) { return this.createRental(req, res); }
  async update(req, res) { return this.updateRental(req, res); }
  async destroy(req, res) { return this.deleteRental(req, res); }
}

module.exports = ProviderRentalsController;
