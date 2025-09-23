/**
 * Controller: Provider Service Requests Management  
 * Handles PROVIDER service request operations
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderServiceRequestsController {
  constructor(container) {
    this.container = container;
    this.serviceRequestUseCase = container.resolve('providerServiceRequestUseCase');
    this.ResponseDTO = container.resolve('ProviderServiceRequestResponseDTO');
    this.logger = container.resolve('logger');
  }

  /**
   * Get service requests list with filtering and search
   * GET /api/provider/service-requests
   */
  async getServiceRequests(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '', // OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, CLOSED
        priority = '', // LOW, MEDIUM, HIGH, CRITICAL
        issueType = '', // ELECTRICAL, COOLING, MECHANICAL, INSTALLATION, etc.
        category = '', // REPAIR, MAINTENANCE, INSTALLATION, CONSULTATION
        clientId = '',
        technicianId = '',
        equipmentId = '',
        dateFrom = '',
        dateTo = '',
        sortBy = 'request_date',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: search.trim(),
        status,
        priority,
        issueType,
        category,
        clientId,
        technicianId,
        equipmentId,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      };

      const result = await this.serviceRequestUseCase.getServiceRequests(providerId, filters);
      const formattedResult = this.ResponseDTO.formatServiceRequestsList(result);

      return ResponseHandler.success(res, formattedResult, 'Solicitudes de servicio obtenidas exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.getServiceRequests error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get service request details
   * GET /api/provider/service-requests/:id
   */
  async getServiceRequestById(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: serviceRequestId } = req.params;

      if (!serviceRequestId) {
        return ResponseHandler.error(res, 'ID de solicitud requerido', 400);
      }

      const serviceRequestData = await this.serviceRequestUseCase.getServiceRequestDetails(providerId, serviceRequestId);
      const formattedResult = this.ResponseDTO.formatServiceRequestDetails(serviceRequestData);

      return ResponseHandler.success(res, formattedResult, 'Detalles de la solicitud obtenidos exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.getServiceRequestById error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Update service request status
   * PUT /api/provider/service-requests/:id/status
   */
  async updateServiceRequestStatus(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: serviceRequestId } = req.params;
      const {
        status, // OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, CLOSED
        statusNotes = '',
        estimatedCost,
        estimatedCompletionDate
      } = req.body;

      if (!serviceRequestId || !status) {
        return ResponseHandler.error(res, 'ID de solicitud y estado son requeridos', 400);
      }

      const updateData = {
        status,
        statusNotes: statusNotes.trim(),
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        estimatedCompletionDate,
        updatedBy: req.user.userId
      };

      const result = await this.serviceRequestUseCase.updateServiceRequestStatus(providerId, serviceRequestId, updateData);
      const formattedResult = this.ResponseDTO.formatServiceRequestDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Estado de solicitud actualizado exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.updateServiceRequestStatus error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ProviderServiceRequestsController;
