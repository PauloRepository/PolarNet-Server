/**
 * Controller: Provider Clients Management
 * Handles PROVIDER client relationship operations
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderClientsController {
  constructor(container) {
    this.container = container;
    this.clientsUseCase = container.resolve('providerClientsUseCase');
    this.ResponseDTO = container.resolve('ProviderClientResponseDTO');
    this.logger = container.resolve('logger');
  }

  /**
   * Get clients list with search and filtering
   * GET /api/provider/clients
   */
  async getClients(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '',
        businessType = '',
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: search.trim(),
        status,
        businessType,
        sortBy,
        sortOrder
      };

      const result = await this.clientsUseCase.getClientsList(providerId, filters);
      const formattedResult = this.ResponseDTO.formatClientsList(result);

      return ResponseHandler.success(res, formattedResult, 'Clients retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClients error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get client details with relationship history
   * GET /api/provider/clients/:id
   */
  async getClientDetails(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: clientId } = req.params;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const clientData = await this.clientsUseCase.getClientDetails(clientId, providerId);
      const formattedResult = this.ResponseDTO.formatClientDetails(clientData);

      return ResponseHandler.success(res, formattedResult, 'Client details retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClientDetails error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ProviderClientsController;
