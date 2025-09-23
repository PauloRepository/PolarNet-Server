const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ServiceRequestsController {
  constructor(container) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  // GET /api/client/service-requests - Obtener solicitudes de servicio usando DDD
  async getServiceRequests(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        priority,
        equipmentId,
        dateFrom,
        dateTo,
        search 
      } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting service requests', { 
        clientCompanyId, 
        page, 
        limit, 
        status, 
        priority, 
        equipmentId 
      });

      // Get use case
      const clientServiceRequestUseCase = this.container.resolve('createServiceRequest'); // Same use case handles both operations

      // Build filters
      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        priority,
        equipmentId,
        search
      };

      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);

      // Get service requests using use case
      const result = await clientServiceRequestUseCase.getServiceRequests(clientCompanyId, filters);

      return ResponseHandler.success(res, result.data, 'Service requests retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getServiceRequests', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // POST /api/client/service-requests - Crear solicitud de servicio usando DDD
  async createServiceRequest(req, res) {
    try {
      const { userId, clientCompanyId } = req.user;
      const { 
        equipmentId,
        type,
        title,
        description,
        priority = 'MEDIUM',
        scheduledDate,
        preferredTime,
        specialInstructions
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Creating service request', { 
        userId,
        clientCompanyId, 
        equipmentId, 
        type, 
        title, 
        priority 
      });

      // Get use case
      const createServiceRequestUseCase = this.container.resolve('createServiceRequest');

      // Create service request using use case
      const serviceRequestData = {
        equipmentId,
        type: type || 'MAINTENANCE', // Default type if not provided
        priority,
        description: description || title, // Use title as description if description not provided
        location: specialInstructions, // Map special instructions to location
        urgency: priority === 'HIGH' || priority === 'URGENT'
      };

      const result = await createServiceRequestUseCase.createServiceRequest(userId, serviceRequestData);

      return ResponseHandler.success(res, result.data, result.message, 201);

    } catch (error) {
      this.logger?.error('Error in createServiceRequest', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/service-requests/:requestId - Obtener detalles de solicitud usando DDD
  async getServiceRequestDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting service request details', { clientCompanyId, requestId: id });

      // Get use case
      const clientServiceRequestUseCase = this.container.resolve('createServiceRequest');

      // Get service request details using use case
      const result = await clientServiceRequestUseCase.getServiceRequestDetails(id, clientCompanyId);

      return ResponseHandler.success(res, result.data, 'Service request details retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getServiceRequestDetails', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ServiceRequestsController;
