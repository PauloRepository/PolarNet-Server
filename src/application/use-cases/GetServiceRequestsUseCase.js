/**
 * Use Case: Obtener Solicitudes de Servicio
 */
class GetServiceRequestsUseCase {
  constructor(serviceRequestRepository, userRepository) {
    this.serviceRequestRepository = serviceRequestRepository;
    this.userRepository = userRepository;
  }

  async execute(filters = {}, userContext) {
    try {
      // Validar contexto del usuario
      const user = await this.userRepository.findById(userContext.userId);
      if (!user) {
        throw new Error('User not found');
      }

      let serviceRequests = [];

      // Aplicar filtros basados en el rol del usuario
      if (user.role === 'provider' || user.role === 'admin') {
        // Proveedor puede ver solicitudes dirigidas a su empresa
        serviceRequests = await this.serviceRequestRepository.findByProvider(
          user.companyId, 
          filters
        );
      } else if (user.role === 'client') {
        // Cliente puede ver solicitudes de su empresa
        serviceRequests = await this.serviceRequestRepository.findByClient(
          user.companyId, 
          filters
        );
      } else {
        throw new Error('Unauthorized access');
      }

      // Agregar información adicional si es necesario
      const enrichedRequests = await Promise.all(
        serviceRequests.map(async (request) => {
          const requestData = request.toJSON();
          
          // Agregar información del usuario que hizo la solicitud
          if (request.requestedBy) {
            const requestingUser = await this.userRepository.findById(request.requestedBy);
            requestData.requestingUser = requestingUser ? {
              name: requestingUser.name,
              email: requestingUser.email,
              position: requestingUser.position
            } : null;
          }

          return requestData;
        })
      );

      return {
        success: true,
        data: enrichedRequests,
        total: enrichedRequests.length,
        filters: filters
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve service requests'
      };
    }
  }

  async getById(serviceRequestId, userContext) {
    try {
      const user = await this.userRepository.findById(userContext.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const serviceRequest = await this.serviceRequestRepository.findById(serviceRequestId);
      if (!serviceRequest) {
        throw new Error('Service request not found');
      }

      // Verificar permisos de acceso
      const hasAccess = (user.role === 'admin') ||
        (user.role === 'provider' && serviceRequest.providerCompanyId === user.companyId) ||
        (user.role === 'client' && serviceRequest.clientCompanyId === user.companyId);

      if (!hasAccess) {
        throw new Error('Access denied');
      }

      return {
        success: true,
        data: serviceRequest
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUrgentRequests(providerCompanyId) {
    try {
      const urgentRequests = await this.serviceRequestRepository.findUrgentRequests(providerCompanyId);
      
      return {
        success: true,
        data: urgentRequests,
        count: urgentRequests.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve urgent service requests'
      };
    }
  }

  async getKPIs(companyId, period, userRole) {
    try {
      if (userRole !== 'provider' && userRole !== 'admin') {
        throw new Error('Unauthorized to view KPIs');
      }

      const kpis = await this.serviceRequestRepository.getKPIs(companyId, period);

      return {
        success: true,
        data: kpis
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve KPIs'
      };
    }
  }
}

module.exports = GetServiceRequestsUseCase;
