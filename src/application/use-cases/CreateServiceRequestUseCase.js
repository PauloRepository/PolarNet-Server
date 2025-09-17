/**
 * Use Case: Crear Solicitud de Servicio
 */
class CreateServiceRequestUseCase {
  constructor(serviceRequestRepository, companyRepository, userRepository) {
    this.serviceRequestRepository = serviceRequestRepository;
    this.companyRepository = companyRepository;
    this.userRepository = userRepository;
  }

  async execute(serviceRequestData) {
    try {
      // Validar que la empresa cliente existe
      const clientCompany = await this.companyRepository.findById(serviceRequestData.clientCompanyId);
      if (!clientCompany) {
        throw new Error('Client company not found');
      }

      // Validar que la empresa proveedora existe
      const providerCompany = await this.companyRepository.findById(serviceRequestData.providerCompanyId);
      if (!providerCompany) {
        throw new Error('Provider company not found');
      }

      // Validar que el usuario que crea la solicitud existe
      const requestingUser = await this.userRepository.findById(serviceRequestData.requestedBy);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Crear entidad ServiceRequest
      const ServiceRequest = require('../../domain/entities/ServiceRequest');
      const serviceRequest = new ServiceRequest({
        title: serviceRequestData.title,
        description: serviceRequestData.description,
        category: serviceRequestData.category,
        priority: serviceRequestData.priority || 'MEDIUM',
        status: 'PENDING',
        requestedBy: serviceRequestData.requestedBy,
        clientCompanyId: serviceRequestData.clientCompanyId,
        providerCompanyId: serviceRequestData.providerCompanyId,
        equipmentId: serviceRequestData.equipmentId,
        location: serviceRequestData.location,
        preferredDate: serviceRequestData.preferredDate,
        estimatedCost: serviceRequestData.estimatedCost,
        attachments: serviceRequestData.attachments,
        requirements: serviceRequestData.requirements
      });

      // Validar la entidad
      serviceRequest.validate();

      // Guardar en el repositorio
      const savedServiceRequest = await this.serviceRequestRepository.save(serviceRequest);

      return {
        success: true,
        data: savedServiceRequest,
        message: 'Service request created successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create service request'
      };
    }
  }
}

module.exports = CreateServiceRequestUseCase;
