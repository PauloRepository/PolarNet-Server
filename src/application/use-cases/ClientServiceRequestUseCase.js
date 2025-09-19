const ClientServiceRequestResponseDTO = require('../dto/ClientServiceRequestResponseDTO');

/**
 * Use Case: Client Service Requests Management
 * Handles service request operations for client companies
 */
class ClientServiceRequestUseCase {
  constructor(
    serviceRequestRepository,
    equipmentRepository,
    activeRentalRepository,
    userRepository
  ) {
    this.serviceRequestRepository = serviceRequestRepository;
    this.equipmentRepository = equipmentRepository;
    this.activeRentalRepository = activeRentalRepository;
    this.userRepository = userRepository;
  }

  /**
   * Get service requests for client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Filtering options
   * @returns {Promise<Object>} Service requests list
   */
  async getServiceRequests(clientCompanyId, filters = {}) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const {
        page = 1,
        limit = 20,
        status,
        priority,
        type,
        equipmentId,
        dateFrom,
        dateTo
      } = filters;

      const queryFilters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        priority,
        type,
        equipmentId,
        dateFrom,
        dateTo
      };

      const [serviceRequests, totalCount] = await Promise.all([
        this.serviceRequestRepository.findByClientCompany(clientCompanyId, queryFilters),
        this.serviceRequestRepository.getClientRequestCount(clientCompanyId, queryFilters)
      ]);

      return {
        success: true,
        data: {
          serviceRequests: ClientServiceRequestResponseDTO.formatServiceRequestList(serviceRequests),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      };

    } catch (error) {
      console.error('Error in ClientServiceRequestUseCase.getServiceRequests:', error);
      throw new Error(`Failed to get service requests: ${error.message}`);
    }
  }

  /**
   * Get service request details by ID
   * @param {number} serviceRequestId - Service request ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} Service request details
   */
  async getServiceRequestDetails(serviceRequestId, clientCompanyId) {
    try {
      if (!serviceRequestId || !clientCompanyId) {
        throw new Error('Service request ID and client company ID are required');
      }

      const serviceRequest = await this.serviceRequestRepository.findById(serviceRequestId);
      
      if (!serviceRequest) {
        throw new Error('Service request not found');
      }

      // Verify service request belongs to client company
      if (serviceRequest.clientCompanyId !== clientCompanyId) {
        throw new Error('Service request not found or access denied');
      }

      return {
        success: true,
        data: ClientServiceRequestResponseDTO.formatServiceRequestDetails(serviceRequest)
      };

    } catch (error) {
      console.error('Error in ClientServiceRequestUseCase.getServiceRequestDetails:', error);
      throw new Error(`Failed to get service request details: ${error.message}`);
    }
  }

  /**
   * Create new service request
   * @param {number} userId - User ID creating the request
   * @param {Object} requestData - Service request data
   * @returns {Promise<Object>} Created service request
   */
  async createServiceRequest(userId, requestData) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const {
        equipmentId,
        type,
        priority = 'MEDIUM',
        description,
        location,
        urgency = false
      } = requestData;

      if (!equipmentId || !type || !description) {
        throw new Error('Equipment ID, type, and description are required');
      }

      // Verify equipment belongs to client through active rental
      const activeRental = await this.activeRentalRepository.getActiveRentalByEquipment(equipmentId);
      
      if (!activeRental || activeRental.clientCompanyId !== user.companyId) {
        throw new Error('Equipment not found or access denied');
      }

      const equipment = await this.equipmentRepository.findById(equipmentId);
      
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      const serviceRequestData = {
        clientCompanyId: user.companyId,
        providerCompanyId: equipment.companyId,
        equipmentId,
        title: `${type} Request`, // Generate a title from type
        description,
        priority,
        status: 'PENDING',
        scheduledDate: null // Can be set later
      };

      const createdRequest = await this.serviceRequestRepository.create(serviceRequestData);

      return {
        success: true,
        data: ClientServiceRequestResponseDTO.formatServiceRequestDetails(createdRequest),
        message: 'Service request created successfully'
      };

    } catch (error) {
      console.error('Error in ClientServiceRequestUseCase.createServiceRequest:', error);
      throw new Error(`Failed to create service request: ${error.message}`);
    }
  }

  /**
   * Update service request (limited fields for clients)
   * @param {number} serviceRequestId - Service request ID
   * @param {number} userId - User ID updating the request
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated service request
   */
  async updateServiceRequest(serviceRequestId, userId, updateData) {
    try {
      if (!serviceRequestId || !userId) {
        throw new Error('Service request ID and user ID are required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const serviceRequest = await this.serviceRequestRepository.findById(serviceRequestId);
      
      if (!serviceRequest) {
        throw new Error('Service request not found');
      }

      // Verify service request belongs to client company
      if (serviceRequest.clientCompanyId !== user.companyId) {
        throw new Error('Service request not found or access denied');
      }

      // Clients can only update certain fields and only if status is PENDING
      if (serviceRequest.status !== 'PENDING') {
        throw new Error('Cannot update service request - status is not pending');
      }

      // Filter allowed fields for client update
      const allowedFields = ['description', 'location', 'priority', 'urgency'];
      const filteredUpdateData = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredUpdateData[field] = updateData[field];
        }
      });

      if (Object.keys(filteredUpdateData).length === 0) {
        throw new Error('No valid fields to update');
      }

      const updatedRequest = await this.serviceRequestRepository.update(serviceRequestId, filteredUpdateData);

      return {
        success: true,
        data: ClientServiceRequestResponseDTO.formatServiceRequestDetails(updatedRequest),
        message: 'Service request updated successfully'
      };

    } catch (error) {
      console.error('Error in ClientServiceRequestUseCase.updateServiceRequest:', error);
      throw new Error(`Failed to update service request: ${error.message}`);
    }
  }

  /**
   * Cancel service request
   * @param {number} serviceRequestId - Service request ID
   * @param {number} userId - User ID canceling the request
   * @returns {Promise<Object>} Success response
   */
  async cancelServiceRequest(serviceRequestId, userId) {
    try {
      if (!serviceRequestId || !userId) {
        throw new Error('Service request ID and user ID are required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const serviceRequest = await this.serviceRequestRepository.findById(serviceRequestId);
      
      if (!serviceRequest) {
        throw new Error('Service request not found');
      }

      // Verify service request belongs to client company
      if (serviceRequest.clientCompanyId !== user.companyId) {
        throw new Error('Service request not found or access denied');
      }

      // Can only cancel pending or in-progress requests
      if (!['PENDING', 'IN_PROGRESS'].includes(serviceRequest.status)) {
        throw new Error('Cannot cancel service request - invalid status');
      }

      const updatedRequest = await this.serviceRequestRepository.updateStatus(
        serviceRequestId, 
        'CANCELLED',
        `Cancelled by client: ${user.firstName} ${user.lastName}`
      );

      return {
        success: true,
        data: ClientServiceRequestResponseDTO.formatServiceRequestDetails(updatedRequest),
        message: 'Service request cancelled successfully'
      };

    } catch (error) {
      console.error('Error in ClientServiceRequestUseCase.cancelServiceRequest:', error);
      throw new Error(`Failed to cancel service request: ${error.message}`);
    }
  }

  /**
   * Get service request statistics for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Service request statistics
   */
  async getServiceRequestStatistics(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const statistics = await this.serviceRequestRepository.getClientStatistics(clientCompanyId);

      return {
        success: true,
        data: ClientServiceRequestResponseDTO.formatStatistics(statistics)
      };

    } catch (error) {
      console.error('Error in ClientServiceRequestUseCase.getServiceRequestStatistics:', error);
      throw new Error(`Failed to get service request statistics: ${error.message}`);
    }
  }

  /**
   * Get recent service requests for client
   * @param {number} clientCompanyId - Client company ID
   * @param {number} limit - Number of recent requests to return
   * @returns {Promise<Object>} Recent service requests
   */
  async getRecentServiceRequests(clientCompanyId, limit = 5) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const recentRequests = await this.serviceRequestRepository.findByClientCompany(
        clientCompanyId, 
        { limit, orderBy: 'requestDate', orderDirection: 'DESC' }
      );

      return {
        success: true,
        data: ClientServiceRequestResponseDTO.formatServiceRequestList(recentRequests)
      };

    } catch (error) {
      console.error('Error in ClientServiceRequestUseCase.getRecentServiceRequests:', error);
      throw new Error(`Failed to get recent service requests: ${error.message}`);
    }
  }
}

module.exports = ClientServiceRequestUseCase;
