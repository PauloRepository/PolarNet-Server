/**
 * Use Case: Actualizar Solicitud de Servicio
 */
class UpdateServiceRequestUseCase {
  constructor(serviceRequestRepository, userRepository) {
    this.serviceRequestRepository = serviceRequestRepository;
    this.userRepository = userRepository;
  }

  async execute(serviceRequestId, updateData, userContext) {
    try {
      // Validar usuario
      const user = await this.userRepository.findById(userContext.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Obtener solicitud existente
      const existingRequest = await this.serviceRequestRepository.findById(serviceRequestId);
      if (!existingRequest) {
        throw new Error('Service request not found');
      }

      // Verificar permisos
      const canUpdate = (user.role === 'admin') ||
        (user.role === 'provider' && existingRequest.providerCompanyId === user.companyId) ||
        (user.role === 'client' && existingRequest.clientCompanyId === user.companyId && existingRequest.status === 'PENDING');

      if (!canUpdate) {
        throw new Error('Not authorized to update this service request');
      }

      // Aplicar actualizaciones permitidas según el rol
      const allowedUpdates = this.getAllowedUpdates(user.role, existingRequest.status);
      const filteredUpdates = {};

      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updateData[key];
        }
      });

      // Actualizar la entidad
      Object.assign(existingRequest, filteredUpdates);

      // Validar transiciones de estado
      if (filteredUpdates.status) {
        this.validateStatusTransition(existingRequest.status, filteredUpdates.status, user.role);
      }

      // Validar la entidad actualizada
      existingRequest.validate();

      // Guardar cambios
      const updatedRequest = await this.serviceRequestRepository.save(existingRequest);

      return {
        success: true,
        data: updatedRequest,
        message: 'Service request updated successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update service request'
      };
    }
  }

  getAllowedUpdates(userRole, currentStatus) {
    const baseFields = ['title', 'description', 'priority', 'preferredDate', 'requirements'];
    
    if (userRole === 'admin') {
      return [...baseFields, 'status', 'assignedTo', 'estimatedCost', 'actualCost', 'internalNotes'];
    }
    
    if (userRole === 'provider') {
      const providerFields = [...baseFields, 'status', 'assignedTo', 'estimatedCost', 'actualCost', 'internalNotes', 'workNotes'];
      if (currentStatus === 'PENDING') {
        providerFields.push('estimatedStartDate', 'estimatedEndDate');
      }
      return providerFields;
    }
    
    if (userRole === 'client') {
      if (currentStatus === 'PENDING') {
        return [...baseFields, 'location'];
      }
      if (currentStatus === 'COMPLETED') {
        return ['satisfactionRating', 'feedback'];
      }
      return [];
    }

    return [];
  }

  validateStatusTransition(currentStatus, newStatus, userRole) {
    const validTransitions = {
      'PENDING': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'ON_HOLD', 'CANCELLED'],
      'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
      'COMPLETED': [], // No se puede cambiar desde completado
      'CANCELLED': [] // No se puede cambiar desde cancelado
    };

    // Solo proveedores y admins pueden cambiar la mayoría de estados
    if (userRole === 'client' && !['CANCELLED'].includes(newStatus)) {
      throw new Error('Clients can only cancel pending requests');
    }

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  async assignTechnician(serviceRequestId, technicianId, userContext) {
    try {
      const user = await this.userRepository.findById(userContext.userId);
      if (!user || (user.role !== 'provider' && user.role !== 'admin')) {
        throw new Error('Not authorized to assign technician');
      }

      const technician = await this.userRepository.findById(technicianId);
      if (!technician || technician.role !== 'technician') {
        throw new Error('Invalid technician');
      }

      const serviceRequest = await this.serviceRequestRepository.findById(serviceRequestId);
      if (!serviceRequest) {
        throw new Error('Service request not found');
      }

      if (user.role === 'provider' && serviceRequest.providerCompanyId !== user.companyId) {
        throw new Error('Not authorized to assign technician to this request');
      }

      serviceRequest.assignedTo = technicianId;
      if (serviceRequest.status === 'PENDING') {
        serviceRequest.status = 'IN_PROGRESS';
      }

      const updatedRequest = await this.serviceRequestRepository.save(serviceRequest);

      return {
        success: true,
        data: updatedRequest,
        message: 'Technician assigned successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to assign technician'
      };
    }
  }
}

module.exports = UpdateServiceRequestUseCase;
