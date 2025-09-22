/**
 * Controller: Provider Service Requests Management  
 * Handles PROVIDER service request operations using DDD architecture
 * Endpoints que corresponden a tabla service_requests: service_request_id, client_company_id, provider_company_id, status, etc.
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
   * Assign technician to service request
   * PUT /api/provider/service-requests/:id/assign
   */
  async assignServiceRequest(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: serviceRequestId } = req.params;
      const {
        technicianId,
        priority,
        scheduledDate,
        estimatedResolutionTime,
        assignmentNotes = ''
      } = req.body;

      if (!serviceRequestId || !technicianId) {
        return ResponseHandler.error(res, 'ID de solicitud y ID de técnico son requeridos', 400);
      }

      const assignmentData = {
        technicianId: parseInt(technicianId),
        priority,
        scheduledDate,
        estimatedResolutionTime,
        assignmentNotes: assignmentNotes.trim(),
        assignedBy: req.user.userId
      };

      const result = await this.serviceRequestUseCase.assignServiceRequest(providerId, serviceRequestId, assignmentData);
      const formattedResult = this.ResponseDTO.formatServiceRequestDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Técnico asignado exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.assignServiceRequest error:', error);
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

  /**
   * Start service request work
   * PUT /api/provider/service-requests/:id/start
   */
  async startServiceRequest(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: serviceRequestId } = req.params;
      const {
        actualStartTime = new Date(),
        startNotes = '',
        estimatedCompletionTime
      } = req.body;

      if (!serviceRequestId) {
        return ResponseHandler.error(res, 'ID de solicitud requerido', 400);
      }

      const startData = {
        actualStartTime: new Date(actualStartTime),
        startNotes: startNotes.trim(),
        estimatedCompletionTime,
        startedBy: req.user.userId
      };

      const result = await this.serviceRequestUseCase.startServiceRequest(providerId, serviceRequestId, startData);
      const formattedResult = this.ResponseDTO.formatServiceRequestDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Solicitud de servicio iniciada exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.startServiceRequest error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Complete service request
   * PUT /api/provider/service-requests/:id/complete
   */
  async completeServiceRequest(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: serviceRequestId } = req.params;
      const {
        completionDate = new Date(),
        resolutionDescription,
        workPerformed,
        actualCost = 0,
        laborHours = 0,
        partsUsed = '',
        completionNotes = '',
        preventiveMeasures = '',
        followUpRequired = false,
        followUpDate = null,
        clientNotified = true,
        clientSatisfactionRating = null
      } = req.body;

      if (!serviceRequestId) {
        return ResponseHandler.error(res, 'ID de solicitud requerido', 400);
      }

      if (!resolutionDescription || resolutionDescription.trim().length === 0) {
        return ResponseHandler.error(res, 'Descripción de la resolución es requerida', 400);
      }

      const completionData = {
        completionDate: new Date(completionDate),
        resolutionDescription: resolutionDescription.trim(),
        workPerformed: workPerformed ? workPerformed.trim() : '',
        actualCost: parseFloat(actualCost),
        laborHours: parseFloat(laborHours),
        partsUsed: partsUsed.trim(),
        completionNotes: completionNotes.trim(),
        preventiveMeasures: preventiveMeasures.trim(),
        followUpRequired,
        followUpDate,
        clientNotified,
        clientSatisfactionRating: clientSatisfactionRating ? parseInt(clientSatisfactionRating) : null,
        completedBy: req.user.userId
      };

      const result = await this.serviceRequestUseCase.completeServiceRequest(providerId, serviceRequestId, completionData);
      const formattedResult = this.ResponseDTO.formatServiceRequestDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Solicitud de servicio completada exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.completeServiceRequest error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Add update/comment to service request
   * POST /api/provider/service-requests/:id/updates
   */
  async addUpdate(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: serviceRequestId } = req.params;
      const {
        updateType = 'PROGRESS', // PROGRESS, ISSUE, RESOLUTION, CLIENT_COMMUNICATION
        description,
        internalNotes = '',
        notifyClient = true,
        attachments = []
      } = req.body;

      if (!serviceRequestId || !description) {
        return ResponseHandler.error(res, 'ID de solicitud y descripción son requeridos', 400);
      }

      const updateData = {
        updateType,
        description: description.trim(),
        internalNotes: internalNotes.trim(),
        notifyClient,
        attachments,
        createdBy: req.user.userId
      };

      const result = await this.serviceRequestUseCase.addServiceRequestUpdate(providerId, serviceRequestId, updateData);
      const formattedResult = this.ResponseDTO.formatServiceRequestUpdate(result);

      return ResponseHandler.success(res, formattedResult, 'Actualización agregada exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.addUpdate error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get service request statistics
   * GET /api/provider/service-requests/statistics
   */
  async getStatistics(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        period = '12months',
        issueType = '',
        category = '',
        clientId = '',
        technicianId = ''
      } = req.query;

      const filters = {
        period,
        issueType,
        category,
        clientId,
        technicianId
      };

      const statistics = await this.serviceRequestUseCase.getServiceRequestStatistics(providerId, filters);
      const formattedResult = this.ResponseDTO.formatServiceRequestStatistics(statistics);

      return ResponseHandler.success(res, formattedResult, 'Estadísticas de solicitudes obtenidas exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.getStatistics error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get performance analytics for service requests
   * GET /api/provider/service-requests/analytics
   */
  async getAnalytics(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        period = '6months',
        groupBy = 'month',
        includeComparison = true,
        includeProjections = false
      } = req.query;

      const filters = {
        period,
        groupBy,
        includeComparison: includeComparison === 'true',
        includeProjections: includeProjections === 'true'
      };

      const analytics = await this.serviceRequestUseCase.getServiceRequestAnalytics(providerId, filters);
      const formattedResult = this.ResponseDTO.formatServiceRequestAnalytics(analytics);

      return ResponseHandler.success(res, formattedResult, 'Analíticas de rendimiento obtenidas exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.getAnalytics error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Bulk operations on service requests
   * PUT /api/provider/service-requests/bulk-update
   */
  async bulkUpdate(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        serviceRequestIds = [],
        action, // assign_technician, update_status, update_priority
        updateData = {}
      } = req.body;

      if (!serviceRequestIds.length || !action) {
        return ResponseHandler.error(res, 'IDs de solicitudes y acción son requeridos', 400);
      }

      const bulkData = {
        serviceRequestIds: serviceRequestIds.map(id => parseInt(id)),
        action,
        updateData: {
          ...updateData,
          updatedBy: req.user.userId
        }
      };

      const result = await this.serviceRequestUseCase.bulkUpdateServiceRequests(providerId, bulkData);
      const formattedResult = result.map(sr => this.ResponseDTO.formatServiceRequestSummary(sr));

      return ResponseHandler.success(res, { updated: formattedResult }, 'Solicitudes actualizadas exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.bulkUpdate error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get service request calendar view
   * GET /api/provider/service-requests/calendar
   */
  async getCalendar(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        month,
        year,
        technicianId = '',
        view = 'month' // month, week, day
      } = req.query;

      if (!month || !year) {
        return ResponseHandler.error(res, 'Mes y año son requeridos', 400);
      }

      const filters = {
        month: parseInt(month),
        year: parseInt(year),
        technicianId,
        view
      };

      const calendarData = await this.serviceRequestUseCase.getServiceRequestCalendar(providerId, filters);
      const formattedResult = this.ResponseDTO.formatServiceRequestCalendar(calendarData);

      return ResponseHandler.success(res, formattedResult, 'Calendario de solicitudes obtenido exitosamente');
    } catch (error) {
      console.error('ProviderServiceRequestsController.getCalendar error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // Legacy method aliases for compatibility with existing routes
  async index(req, res) { return this.getServiceRequests(req, res); }
  async show(req, res) { return this.getServiceRequestById(req, res); }
  async assign(req, res) { return this.assignServiceRequest(req, res); }
  async updateStatus(req, res) { return this.updateServiceRequestStatus(req, res); }
}

module.exports = ProviderServiceRequestsController;
