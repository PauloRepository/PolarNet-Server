const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ServiceRequestsController {
  constructor() {
    this.container = null;
    this.logger = null;
  }

  // Inject DI container
  setContainer(container) {
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

  // PUT /api/client/service-requests/:id - Actualizar solicitud usando DDD
  async updateServiceRequest(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params; // Changed from requestId to id to match route
      const { 
        title,
        description,
        priority,
        scheduledDate,
        preferredTime,
        specialInstructions
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Updating service request', { clientCompanyId, requestId: id });

      // Get repository
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');

      // Get service request
      const serviceRequest = await serviceRequestRepository.findById(id);
      if (!serviceRequest) {
        return ResponseHandler.error(res, 'Service request not found', 404);
      }

      // Verify belongs to client
      if (serviceRequest.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to update this service request', 403);
      }

      // Check if request can be updated (simple status check instead of method)
      if (serviceRequest.status === 'COMPLETED' || serviceRequest.status === 'CANCELLED') {
        return ResponseHandler.error(res, 'Service request cannot be updated in current status', 400);
      }

      // Update fields
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate);

      const updatedServiceRequest = await serviceRequestRepository.update(id, updateData);

      return ResponseHandler.success(res, {
        serviceRequestId: updatedServiceRequest && updatedServiceRequest.id != null ? updatedServiceRequest.id.toString() : null,
        title: updatedServiceRequest.title,
        description: updatedServiceRequest.description,
        priority: updatedServiceRequest.priority,
        status: updatedServiceRequest.status,
        scheduledDate: updatedServiceRequest.scheduledDate,
        updatedAt: updatedServiceRequest.updatedAt
      }, 'Service request updated successfully');

    } catch (error) {
      this.logger?.error('Error in updateServiceRequest', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // DELETE /api/client/service-requests/:id - Cancelar solicitud usando DDD
  async cancelServiceRequest(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params; // Changed from requestId to id
      const { reason } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Cancelling service request', { clientCompanyId, requestId: id, reason });

      // Get repository directly since we may not have the cancel use case
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');

      // Get service request
      const serviceRequest = await serviceRequestRepository.findById(id);
      if (!serviceRequest) {
        return ResponseHandler.error(res, 'Service request not found', 404);
      }

      // Verify belongs to client
      if (serviceRequest.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to cancel this service request', 403);
      }

      // Check if request can be cancelled
      if (serviceRequest.status === 'COMPLETED' || serviceRequest.status === 'CANCELLED') {
        return ResponseHandler.error(res, 'Service request cannot be cancelled in current status', 400);
      }

      // Cancel the request
      const updateData = {
        status: 'CANCELLED'
        // Removed notes since the column doesn't exist
      };

      const cancelledRequest = await serviceRequestRepository.update(id, updateData);

      return ResponseHandler.success(res, {
        serviceRequestId: cancelledRequest && cancelledRequest.id != null ? cancelledRequest.id.toString() : null,
        status: cancelledRequest.status,
        cancelledAt: new Date(),
        cancelReason: reason || 'Cancelled by client'
      }, 'Service request cancelled successfully');

    } catch (error) {
      this.logger?.error('Error in cancelServiceRequest', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/service-requests/stats - Obtener estadísticas usando DDD
  async getServiceRequestsStats(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { period = '30' } = req.query; // days

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting service requests stats', { clientCompanyId, period });

      // Get repository
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');

      // Get basic statistics
      const stats = await serviceRequestRepository.getClientStatistics(clientCompanyId);

      // Simple count by status using findByClientCompany
      const allRequests = await serviceRequestRepository.findByClientCompany(clientCompanyId, {});
      
      // Calculate distributions manually
      const statusCounts = {};
      const priorityCounts = {};
      
      allRequests.forEach(request => {
        // Count by status
        statusCounts[request.status] = (statusCounts[request.status] || 0) + 1;
        // Count by priority
        priorityCounts[request.priority] = (priorityCounts[request.priority] || 0) + 1;
      });

      const statistics = {
        summary: {
          totalRequests: parseInt(stats.total_requests) || 0,
          pendingRequests: parseInt(stats.pending_requests) || 0,
          inProgressRequests: parseInt(stats.in_progress_requests) || 0,
          completedRequests: parseInt(stats.completed_requests) || 0,
          highPriorityOpen: parseInt(stats.high_priority_open) || 0,
          averageResolutionHours: parseFloat(stats.avg_resolution_hours) || 0
        },
        distribution: {
          byStatus: Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count: parseInt(count),
            percentage: ((count / allRequests.length) * 100).toFixed(1)
          })),
          byPriority: Object.entries(priorityCounts).map(([priority, count]) => ({
            priority,
            count: parseInt(count),
            percentage: ((count / allRequests.length) * 100).toFixed(1)
          }))
        },
        period: `Last ${period} days`
      };

      return ResponseHandler.success(res, statistics, 'Service request statistics retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getServiceRequestsStats', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = new ServiceRequestsController();
