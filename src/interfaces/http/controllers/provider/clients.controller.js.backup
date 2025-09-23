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

      const result = await this.clientsUseCase.getClients(providerId, filters);
      const formattedResult = this.ResponseDTO.formatClientsList(result);

      return ResponseHandler.success(res, formattedResult, 'Clients retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClients error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get client details with relationship history
   * GET /api/provider/clients/:clientId
   */
  async getClientDetails(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const clientData = await this.clientsUseCase.getClientDetails(providerId, clientId);
      const formattedResult = this.ResponseDTO.formatClientDetails(clientData);

      return ResponseHandler.success(res, formattedResult, 'Client details retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClientDetails error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get client statistics and analytics
   * GET /api/provider/clients/statistics
   */
  async getClientStatistics(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        period = '12months',
        clientIds = '',
        businessType = ''
      } = req.query;

      const filters = {
        period,
        clientIds: clientIds ? clientIds.split(',') : [],
        businessType
      };

      const statistics = await this.clientsUseCase.getClientStatistics(providerId, filters);
      const formattedResult = this.ResponseDTO.formatClientStatistics(statistics);

      return ResponseHandler.success(res, formattedResult, 'Client statistics retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClientStatistics error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get client relationship timeline
   * GET /api/provider/clients/:clientId/timeline
   */
  async getClientTimeline(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;
      const {
        page = 1,
        limit = 50,
        eventType = '',
        dateFrom = '',
        dateTo = ''
      } = req.query;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        eventType,
        dateFrom,
        dateTo
      };

      const timeline = await this.clientsUseCase.getClientTimeline(providerId, clientId, filters);
      const formattedResult = this.ResponseDTO.formatClientTimeline(timeline);

      return ResponseHandler.success(res, formattedResult, 'Client timeline retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClientTimeline error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Update client relationship notes
   * PUT /api/provider/clients/:clientId/notes
   */
  async updateClientNotes(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;
      const { notes, isPrivate = false } = req.body;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      if (!notes || notes.trim().length === 0) {
        return ResponseHandler.error(res, 'Notes content is required', 400);
      }

      const noteData = {
        notes: notes.trim(),
        isPrivate: Boolean(isPrivate),
        updatedBy: req.user.userId
      };

      const result = await this.clientsUseCase.updateClientNotes(providerId, clientId, noteData);
      const formattedResult = this.ResponseDTO.formatClientNoteUpdate(result);

      return ResponseHandler.success(res, formattedResult, 'Client notes updated successfully');
    } catch (error) {
      console.error('ProviderClientsController.updateClientNotes error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get client contracts overview
   * GET /api/provider/clients/:clientId/contracts
   */
  async getClientContracts(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;
      const {
        status = '',
        includeCompleted = 'false'
      } = req.query;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const filters = {
        status,
        includeCompleted: includeCompleted === 'true'
      };

      const contracts = await this.clientsUseCase.getClientContracts(providerId, clientId, filters);
      const formattedResult = this.ResponseDTO.formatClientContracts(contracts);

      return ResponseHandler.success(res, formattedResult, 'Client contracts retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClientContracts error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Export client data
   * GET /api/provider/clients/:clientId/export
   */
  async exportClientData(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;
      const {
        format = 'pdf',
        includeFinancials = 'true',
        includeServices = 'true',
        dateRange = '12months'
      } = req.query;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const exportOptions = {
        format,
        includeFinancials: includeFinancials === 'true',
        includeServices: includeServices === 'true',
        dateRange
      };

      const exportData = await this.clientsUseCase.exportClientData(providerId, clientId, exportOptions);
      
      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="client-${clientId}-report.pdf"`);
        return res.send(exportData.fileBuffer);
      } else {
        const formattedResult = this.ResponseDTO.formatClientExport(exportData);
        return ResponseHandler.success(res, formattedResult, 'Client data exported successfully');
      }
    } catch (error) {
      console.error('ProviderClientsController.exportClientData error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Update client priority level
   * PUT /api/provider/clients/:clientId/priority
   */
  async updateClientPriority(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;
      const { priority, reason = '' } = req.body;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!priority || !validPriorities.includes(priority.toLowerCase())) {
        return ResponseHandler.error(res, 'Valid priority level is required (low, medium, high, critical)', 400);
      }

      const updateData = {
        priority: priority.toLowerCase(),
        reason: reason.trim(),
        updatedBy: req.user.userId
      };

      const result = await this.clientsUseCase.updateClientPriority(providerId, clientId, updateData);
      const formattedResult = this.ResponseDTO.formatClientPriorityUpdate(result);

      return ResponseHandler.success(res, formattedResult, 'Client priority updated successfully');
    } catch (error) {
      console.error('ProviderClientsController.updateClientPriority error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get client performance metrics
   * GET /api/provider/clients/:clientId/performance
   */
  async getClientPerformance(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;
      const {
        period = '12months',
        metrics = 'revenue,payments,services,satisfaction'
      } = req.query;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const options = {
        period,
        metrics: metrics.split(',').map(m => m.trim())
      };

      const performance = await this.clientsUseCase.getClientPerformance(providerId, clientId, options);
      const formattedResult = this.ResponseDTO.formatClientPerformance(performance);

      return ResponseHandler.success(res, formattedResult, 'Client performance metrics retrieved successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClientPerformance error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Generate client insights and recommendations
   * GET /api/provider/clients/:clientId/insights
   */
  async getClientInsights(req, res) {
    try {
      const providerId = req.user.companyId;
      const { clientId } = req.params;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const insights = await this.clientsUseCase.generateClientInsights(providerId, clientId);
      const formattedResult = this.ResponseDTO.formatClientInsights(insights);

      return ResponseHandler.success(res, formattedResult, 'Client insights generated successfully');
    } catch (error) {
      console.error('ProviderClientsController.getClientInsights error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Create new client
   * POST /api/provider/clients
   */
  async createClient(req, res) {
    try {
      const providerId = req.user.companyId;
      const clientData = req.body;

      // Validate required fields
      if (!clientData.name || !clientData.email) {
        return ResponseHandler.error(res, 'Client name and email are required', 400);
      }

      const newClient = await this.clientsUseCase.createClient(providerId, clientData);
      const formattedResult = this.ResponseDTO.formatClientDetails(newClient);

      return ResponseHandler.success(res, formattedResult, 'Client created successfully', 201);
    } catch (error) {
      console.error('ProviderClientsController.createClient error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Update client information
   * PUT /api/provider/clients/:id
   */
  async updateClient(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: clientId } = req.params;
      const updateData = req.body;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      const updatedClient = await this.clientsUseCase.updateClient(providerId, clientId, updateData);
      const formattedResult = this.ResponseDTO.formatClientDetails(updatedClient);

      return ResponseHandler.success(res, formattedResult, 'Client updated successfully');
    } catch (error) {
      console.error('ProviderClientsController.updateClient error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Delete client (soft delete)
   * DELETE /api/provider/clients/:id
   */
  async deleteClient(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: clientId } = req.params;

      if (!clientId) {
        return ResponseHandler.error(res, 'Client ID is required', 400);
      }

      await this.clientsUseCase.deleteClient(providerId, clientId);

      return ResponseHandler.success(res, { deleted: true }, 'Client deleted successfully');
    } catch (error) {
      console.error('ProviderClientsController.deleteClient error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // Legacy aliases for compatibility
  async index(req, res) { return this.getClients(req, res); }
  async show(req, res) { return this.getClientDetails(req, res); }
  async create(req, res) { return this.createClient(req, res); }
  async update(req, res) { return this.updateClient(req, res); }
  async destroy(req, res) { return this.deleteClient(req, res); }
}

module.exports = ProviderClientsController;
