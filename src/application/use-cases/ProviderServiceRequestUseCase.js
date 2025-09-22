/**
 * Use Case: Provider Service Request Management
 * Gestiona las solicitudes de servicio para PROVIDER
 */
class ProviderServiceRequestUseCase {
  constructor(serviceRequestRepository, equipmentRepository, clientRepository, userRepository, notificationService) {
    this.serviceRequestRepository = serviceRequestRepository;
    this.equipmentRepository = equipmentRepository;
    this.clientRepository = clientRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }

  /**
   * Obtener lista de solicitudes de servicio con filtros
   * @param {string} providerId - ID del proveedor
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Object} Lista de solicitudes con paginación
   */
  async getServiceRequests(providerId, filters) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '',
        priority = '',
        issueType = '',
        technicianId = '',
        clientId = '',
        equipmentId = '',
        dateFrom = '',
        dateTo = '',
        sortBy = 'requestDate',
        sortOrder = 'desc'
      } = filters;

      // Construir condiciones de filtro
      const whereConditions = [`sr.provider_company_id = ?`];
      const params = [providerId];

      if (search) {
        whereConditions.push(`(
          sr.title ILIKE ? OR 
          sr.description ILIKE ? OR 
          e.name ILIKE ? OR
          c.name ILIKE ?
        )`);
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (status) {
        whereConditions.push('sr.status = ?');
        params.push(status);
      }

      if (priority) {
        whereConditions.push('sr.priority = ?');
        params.push(priority);
      }

      if (issueType) {
        whereConditions.push('sr.issue_type = ?');
        params.push(issueType);
      }

      if (technicianId) {
        whereConditions.push('sr.assigned_technician_id = ?');
        params.push(technicianId);
      }

      if (clientId) {
        whereConditions.push('sr.client_company_id = ?');
        params.push(clientId);
      }

      if (equipmentId) {
        whereConditions.push('sr.equipment_id = ?');
        params.push(equipmentId);
      }

      if (dateFrom) {
        whereConditions.push('sr.request_date >= ?');
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('sr.request_date <= ?');
        params.push(dateTo);
      }

      const whereClause = whereConditions.join(' AND ');
      const orderClause = `ORDER BY sr.${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}`;

      // Consulta principal con JOIN para obtener datos relacionados
      const query = `
        SELECT 
          sr.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number,
          u.first_name || ' ' || u.last_name as technician_name,
          u.email as technician_email,
          u.phone as technician_phone,
          c.name as client_company_name,
          c.contact_person as contact_person,
          c.contact_email,
          c.contact_phone,
          loc.name as location_name,
          loc.address as location_address
        FROM service_requests sr
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN users u ON sr.assigned_technician_id = u.user_id
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN locations loc ON sr.location_id = loc.location_id
        WHERE ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const offset = (page - 1) * limit;
      params.push(limit, offset);

      const serviceRequests = await this.serviceRequestRepository.executeQuery(query, params);

      // Consulta para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM service_requests sr
        WHERE ${whereClause}
      `;

      const countParams = params.slice(0, -2); // Remover limit y offset
      const countResult = await this.serviceRequestRepository.executeQuery(countQuery, countParams);
      const total = parseInt(countResult[0]?.total || 0);

      return {
        data: serviceRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.getServiceRequests:', error);
      throw new Error('Error al obtener las solicitudes de servicio');
    }
  }

  /**
   * Obtener detalles completos de una solicitud de servicio
   * @param {string} providerId - ID del proveedor
   * @param {string} serviceRequestId - ID de la solicitud
   * @returns {Object} Datos completos de la solicitud
   */
  async getServiceRequestDetails(providerId, serviceRequestId) {
    try {
      // Verificar que la solicitud pertenece al proveedor
      const serviceRequest = await this.serviceRequestRepository.findByIdAndProvider(serviceRequestId, providerId);
      
      if (!serviceRequest) {
        throw new Error('Solicitud de servicio no encontrada');
      }

      // Obtener datos del equipo
      let equipment = null;
      if (serviceRequest.equipmentId) {
        equipment = await this.equipmentRepository.findById(serviceRequest.equipmentId);
      }

      // Obtener datos del técnico asignado
      let technician = null;
      if (serviceRequest.assignedTechnicianId) {
        technician = await this.userRepository.findById(serviceRequest.assignedTechnicianId);
      }

      // Obtener datos del cliente
      const client = await this.clientRepository.findById(serviceRequest.clientCompanyId);

      // Obtener registros de trabajo
      const workLogs = await this.serviceRequestRepository.getServiceRequestWorkLogs(serviceRequestId);

      // Obtener partes utilizadas
      const parts = await this.serviceRequestRepository.getServiceRequestParts(serviceRequestId);

      // Obtener fotos
      const photos = await this.serviceRequestRepository.getServiceRequestPhotos(serviceRequestId);

      // Obtener comunicaciones
      const communications = await this.serviceRequestRepository.getServiceRequestCommunications(serviceRequestId);

      return {
        serviceRequest,
        equipment,
        technician,
        client,
        workLogs,
        parts,
        photos,
        communications
      };
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.getServiceRequestDetails:', error);
      throw new Error(error.message || 'Error al obtener los detalles de la solicitud');
    }
  }

  /**
   * Asignar técnico a solicitud de servicio
   * @param {string} providerId - ID del proveedor
   * @param {string} serviceRequestId - ID de la solicitud
   * @param {Object} assignmentData - Datos de asignación
   * @returns {Object} Solicitud actualizada
   */
  async assignTechnician(providerId, serviceRequestId, assignmentData) {
    try {
      const { technicianId, assignedBy, notes = '', estimatedArrival } = assignmentData;

      // Verificar que la solicitud pertenece al proveedor
      const serviceRequest = await this.serviceRequestRepository.findByIdAndProvider(serviceRequestId, providerId);
      
      if (!serviceRequest) {
        throw new Error('Solicitud de servicio no encontrada');
      }

      if (serviceRequest.status === 'COMPLETED' || serviceRequest.status === 'CANCELLED') {
        throw new Error('No se puede asignar técnico a una solicitud completada o cancelada');
      }

      // Verificar que el técnico pertenece al proveedor
      const technician = await this.userRepository.findByIdAndCompany(technicianId, providerId);
      if (!technician) {
        throw new Error('Técnico no encontrado');
      }

      const assignmentTime = new Date().toISOString();

      const updateData = {
        assignedTechnicianId: technicianId,
        assignedDate: assignmentTime,
        assignedBy,
        assignmentNotes: notes,
        estimatedArrival,
        status: serviceRequest.status === 'OPEN' ? 'ASSIGNED' : serviceRequest.status,
        updatedAt: assignmentTime
      };

      await this.serviceRequestRepository.update(serviceRequestId, updateData);

      // Crear registro de comunicación
      await this.serviceRequestRepository.createCommunication({
        serviceRequestId,
        type: 'assignment',
        direction: 'internal',
        subject: 'Técnico asignado',
        message: `Técnico ${technician.firstName} ${technician.lastName} asignado. ${notes}`,
        timestamp: assignmentTime,
        fromUserId: assignedBy,
        toUserId: technicianId
      });

      // Enviar notificación al técnico
      if (this.notificationService) {
        await this.notificationService.sendTechnicianAssignment(technicianId, {
          serviceRequestId,
          title: serviceRequest.title,
          clientName: serviceRequest.clientCompanyName,
          priority: serviceRequest.priority,
          estimatedArrival
        });
      }

      return await this.getServiceRequestDetails(providerId, serviceRequestId);
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.assignTechnician:', error);
      throw new Error(error.message || 'Error al asignar técnico');
    }
  }

  /**
   * Actualizar estado de solicitud de servicio
   * @param {string} providerId - ID del proveedor
   * @param {string} serviceRequestId - ID de la solicitud
   * @param {Object} statusData - Datos de actualización de estado
   * @returns {Object} Solicitud actualizada
   */
  async updateStatus(providerId, serviceRequestId, statusData) {
    try {
      const { status, notes = '', updatedBy, estimatedCompletion } = statusData;

      // Verificar que la solicitud pertenece al proveedor
      const serviceRequest = await this.serviceRequestRepository.findByIdAndProvider(serviceRequestId, providerId);
      
      if (!serviceRequest) {
        throw new Error('Solicitud de servicio no encontrada');
      }

      const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new Error('Estado no válido');
      }

      // Validar transiciones de estado
      if (!this.isValidStatusTransition(serviceRequest.status, status)) {
        throw new Error(`No se puede cambiar de ${serviceRequest.status} a ${status}`);
      }

      const updateTime = new Date().toISOString();

      const updateData = {
        status,
        updatedAt: updateTime,
        updatedBy
      };

      // Agregar campos específicos según el estado
      switch (status) {
        case 'IN_PROGRESS':
          updateData.startDate = updateData.startDate || updateTime;
          break;
        case 'COMPLETED':
          updateData.completionDate = updateTime;
          break;
        case 'CANCELLED':
          updateData.cancelledDate = updateTime;
          updateData.cancellationReason = notes;
          break;
      }

      if (estimatedCompletion) {
        updateData.estimatedCompletion = estimatedCompletion;
      }

      await this.serviceRequestRepository.update(serviceRequestId, updateData);

      // Crear registro de comunicación
      await this.serviceRequestRepository.createCommunication({
        serviceRequestId,
        type: 'status_update',
        direction: 'internal',
        subject: `Estado actualizado a ${status}`,
        message: `Estado cambiado de ${serviceRequest.status} a ${status}. ${notes}`,
        timestamp: updateTime,
        fromUserId: updatedBy
      });

      // Enviar notificaciones según el estado
      if (this.notificationService) {
        await this.notificationService.sendStatusUpdate(serviceRequest.clientCompanyId, {
          serviceRequestId,
          oldStatus: serviceRequest.status,
          newStatus: status,
          title: serviceRequest.title,
          notes
        });
      }

      return await this.getServiceRequestDetails(providerId, serviceRequestId);
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.updateStatus:', error);
      throw new Error(error.message || 'Error al actualizar el estado');
    }
  }

  /**
   * Completar solicitud de servicio
   * @param {string} providerId - ID del proveedor
   * @param {string} serviceRequestId - ID de la solicitud
   * @param {Object} completionData - Datos de finalización
   * @returns {Object} Solicitud completada
   */
  async completeServiceRequest(providerId, serviceRequestId, completionData) {
    try {
      const {
        workPerformed,
        rootCause = '',
        solution = '',
        preventiveActions = '',
        finalCost = 0,
        laborCost = 0,
        partsCost = 0,
        transportCost = 0,
        completedBy,
        followUpRequired = false,
        clientNotified = true,
        completionNotes = ''
      } = completionData;

      const serviceRequest = await this.serviceRequestRepository.findByIdAndProvider(serviceRequestId, providerId);
      
      if (!serviceRequest) {
        throw new Error('Solicitud de servicio no encontrada');
      }

      if (serviceRequest.status === 'COMPLETED') {
        throw new Error('La solicitud ya está completada');
      }

      if (serviceRequest.status === 'CANCELLED') {
        throw new Error('No se puede completar una solicitud cancelada');
      }

      if (!workPerformed || workPerformed.trim().length === 0) {
        throw new Error('Debe especificar el trabajo realizado');
      }

      const completionTime = new Date().toISOString();

      const updateData = {
        status: 'COMPLETED',
        completionDate: completionTime,
        completedBy,
        workPerformed,
        rootCause,
        solution,
        preventiveActions,
        finalCost: parseFloat(finalCost),
        laborCost: parseFloat(laborCost),
        partsCost: parseFloat(partsCost),
        transportCost: parseFloat(transportCost),
        followUpRequired,
        completionNotes,
        updatedAt: completionTime
      };

      await this.serviceRequestRepository.update(serviceRequestId, updateData);

      // Crear registro final de trabajo
      await this.serviceRequestRepository.createWorkLog({
        serviceRequestId,
        activity: 'SERVICE_COMPLETED',
        description: `Servicio completado. ${completionNotes}`,
        timestamp: completionTime,
        technicianId: completedBy,
        duration: 0,
        status: 'PRODUCTIVE'
      });

      // Notificar al cliente si está habilitado
      if (clientNotified && this.notificationService) {
        await this.notificationService.sendServiceCompletion(serviceRequest.clientCompanyId, {
          serviceRequestId,
          title: serviceRequest.title,
          workPerformed,
          finalCost: parseFloat(finalCost),
          followUpRequired
        });
      }

      // Actualizar historial del equipo si aplica
      if (serviceRequest.equipmentId) {
        await this.equipmentRepository.addServiceRecord(serviceRequest.equipmentId, {
          serviceRequestId,
          serviceDate: completionTime,
          workPerformed,
          cost: parseFloat(finalCost),
          technicianId: completedBy
        });
      }

      return await this.getServiceRequestDetails(providerId, serviceRequestId);
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.completeServiceRequest:', error);
      throw new Error(error.message || 'Error al completar la solicitud de servicio');
    }
  }

  /**
   * Obtener estadísticas de solicitudes de servicio
   * @param {string} providerId - ID del proveedor
   * @param {Object} filters - Filtros para estadísticas
   * @returns {Object} Estadísticas de solicitudes
   */
  async getServiceRequestStatistics(providerId, filters) {
    try {
      const { period = '12months', technicianId = '', clientId = '', issueType = '' } = filters;

      // Calcular fechas del período
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '12months':
        default:
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Construir condiciones
      const whereConditions = [`sr.provider_company_id = ?`];
      const params = [providerId];

      if (technicianId) {
        whereConditions.push('sr.assigned_technician_id = ?');
        params.push(technicianId);
      }

      if (clientId) {
        whereConditions.push('sr.client_company_id = ?');
        params.push(clientId);
      }

      if (issueType) {
        whereConditions.push('sr.issue_type = ?');
        params.push(issueType);
      }

      whereConditions.push('sr.request_date >= ?');
      params.push(startDate.toISOString());

      const whereClause = whereConditions.join(' AND ');

      // Consulta de estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN sr.status = 'OPEN' THEN 1 END) as open_requests,
          COUNT(CASE WHEN sr.status = 'IN_PROGRESS' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN sr.status = 'CANCELLED' THEN 1 END) as cancelled_requests,
          AVG(CASE WHEN sr.assigned_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sr.assigned_date - sr.request_date))/3600 END) as average_response_time,
          AVG(CASE WHEN sr.completion_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sr.completion_date - sr.request_date))/3600 END) as average_resolution_time,
          AVG(CASE WHEN sr.status = 'COMPLETED' THEN sr.final_cost END) as average_cost_per_service,
          SUM(CASE WHEN sr.status = 'COMPLETED' THEN sr.final_cost ELSE 0 END) as total_service_costs,
          AVG(CASE WHEN sr.status = 'COMPLETED' AND sr.client_rating IS NOT NULL THEN sr.client_rating END) as client_satisfaction,
          COUNT(CASE WHEN sr.status = 'COMPLETED' AND sr.follow_up_required = false THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END), 0) as first_time_fix_rate
        FROM service_requests sr
        WHERE ${whereClause}
      `;

      const stats = await this.serviceRequestRepository.executeQuery(statsQuery, params);

      // Estadísticas por tipo de problema
      const issueTypeStatsQuery = `
        SELECT 
          sr.issue_type,
          COUNT(*) as count,
          AVG(CASE WHEN sr.status = 'COMPLETED' THEN sr.final_cost END) as avg_cost,
          AVG(CASE WHEN sr.completion_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sr.completion_date - sr.request_date))/3600 END) as avg_resolution_time
        FROM service_requests sr
        WHERE ${whereClause}
        GROUP BY sr.issue_type
        ORDER BY count DESC
      `;

      const issueTypeStats = await this.serviceRequestRepository.executeQuery(issueTypeStatsQuery, params);

      // Estadísticas por prioridad
      const priorityStatsQuery = `
        SELECT 
          sr.priority,
          COUNT(*) as count,
          AVG(CASE WHEN sr.assigned_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (sr.assigned_date - sr.request_date))/3600 END) as avg_response_time
        FROM service_requests sr
        WHERE ${whereClause}
        GROUP BY sr.priority
        ORDER BY 
          CASE sr.priority 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            WHEN 'LOW' THEN 4 
          END
      `;

      const priorityStats = await this.serviceRequestRepository.executeQuery(priorityStatsQuery, params);

      // Tendencias mensuales
      const trendQuery = `
        SELECT 
          DATE_TRUNC('month', sr.request_date) as month,
          COUNT(*) as total,
          COUNT(CASE WHEN sr.status = 'COMPLETED' THEN 1 END) as completed,
          SUM(CASE WHEN sr.status = 'COMPLETED' THEN sr.final_cost ELSE 0 END) as revenue,
          AVG(CASE WHEN sr.status = 'COMPLETED' AND sr.client_rating IS NOT NULL THEN sr.client_rating END) as avg_rating
        FROM service_requests sr
        WHERE ${whereClause}
        GROUP BY DATE_TRUNC('month', sr.request_date)
        ORDER BY month DESC
        LIMIT 12
      `;

      const trends = await this.serviceRequestRepository.executeQuery(trendQuery, params);

      return {
        ...stats[0],
        issueTypeBreakdown: issueTypeStats,
        priorityBreakdown: priorityStats,
        monthlyTrends: trends,
        period,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.getServiceRequestStatistics:', error);
      throw new Error('Error al obtener las estadísticas de solicitudes de servicio');
    }
  }

  /**
   * Obtener solicitudes urgentes o vencidas
   * @param {string} providerId - ID del proveedor
   * @returns {Array} Solicitudes urgentes
   */
  async getUrgentServiceRequests(providerId) {
    try {
      const query = `
        SELECT 
          sr.*,
          e.name as equipment_name,
          c.name as client_company_name,
          u.first_name || ' ' || u.last_name as technician_name
        FROM service_requests sr
        LEFT JOIN equipments e ON sr.equipment_id = e.equipment_id
        LEFT JOIN companies c ON sr.client_company_id = c.company_id
        LEFT JOIN users u ON sr.assigned_technician_id = u.user_id
        WHERE sr.provider_company_id = ? 
        AND sr.status NOT IN ('COMPLETED', 'CANCELLED')
        AND (
          sr.priority IN ('HIGH', 'CRITICAL') OR
          (sr.request_date < NOW() - INTERVAL '24 hours' AND sr.status = 'OPEN') OR
          (sr.assigned_date < NOW() - INTERVAL '4 hours' AND sr.status = 'ASSIGNED')
        )
        ORDER BY 
          CASE sr.priority 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            WHEN 'LOW' THEN 4 
          END,
          sr.request_date ASC
      `;

      const urgentRequests = await this.serviceRequestRepository.executeQuery(query, [providerId]);

      return {
        data: urgentRequests,
        total: urgentRequests.length,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.getUrgentServiceRequests:', error);
      throw new Error('Error al obtener las solicitudes urgentes');
    }
  }

  // Métodos auxiliares

  /**
   * Mapear campos de ordenamiento
   * @param {string} sortBy - Campo de ordenamiento
   * @returns {string} Campo mapeado
   */
  mapSortField(sortBy) {
    const fieldMap = {
      'requestDate': 'request_date',
      'assignedDate': 'assigned_date',
      'completionDate': 'completion_date',
      'priority': 'priority',
      'status': 'status',
      'finalCost': 'final_cost'
    };

    return fieldMap[sortBy] || 'request_date';
  }

  /**
   * Validar transición de estado
   * @param {string} currentStatus - Estado actual
   * @param {string} newStatus - Nuevo estado
   * @returns {boolean} Es válida la transición
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'OPEN': ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
      'ASSIGNED': ['IN_PROGRESS', 'OPEN', 'CANCELLED'],
      'IN_PROGRESS': ['WAITING_PARTS', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED'],
      'WAITING_PARTS': ['IN_PROGRESS', 'CANCELLED'],
      'PENDING_APPROVAL': ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // No se puede cambiar desde completado
      'CANCELLED': [] // No se puede cambiar desde cancelado
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

module.exports = ProviderServiceRequestUseCase;
