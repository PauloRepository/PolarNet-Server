/**
 * Provider Dashboard Use Case
 * Caso de uso para obtener métricas del dashboard del proveedor
 */
class GetProviderDashboardUseCase {
  constructor(
    rentalRepository, 
    equipmentRepository, 
    serviceRequestRepository,
    invoiceRepository,
    companyRepository
  ) {
    this.rentalRepository = rentalRepository;
    this.equipmentRepository = equipmentRepository;
    this.serviceRequestRepository = serviceRequestRepository;
    this.invoiceRepository = invoiceRepository;
    this.companyRepository = companyRepository;
  }

  /**
   * Ejecuta el caso de uso para obtener métricas del dashboard
   * @param {Object} request - { providerCompanyId }
   * @returns {Promise<Object>}
   */
  async execute(request) {
    const { providerCompanyId } = request;

    try {
      // Validar parámetros
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      // Ejecutar consultas en paralelo
      const [
        metrics,
        revenueByMonth,
        equipmentTypes,
        serviceStatus,
        topClients
      ] = await Promise.all([
        this.getMainMetrics(providerCompanyId),
        this.getRevenueByMonth(providerCompanyId),
        this.getEquipmentTypeDistribution(providerCompanyId),
        this.getServiceRequestStatus(providerCompanyId),
        this.getTopClients(providerCompanyId)
      ]);

      return {
        success: true,
        data: {
          metrics,
          revenueByMonth,
          equipmentTypes,
          serviceStatus,
          topClients
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMainMetrics(providerCompanyId) {
    const activeRentals = await this.rentalRepository.findActiveRentals(providerCompanyId);
    const totalEquipments = await this.equipmentRepository.count({ ownerCompanyId: providerCompanyId });
    const pendingServices = await this.serviceRequestRepository.count({ 
      providerCompanyId, 
      status: ['OPEN', 'IN_PROGRESS'] 
    });
    const urgentRequests = await this.serviceRequestRepository.count({ 
      providerCompanyId, 
      status: ['OPEN', 'IN_PROGRESS'], 
      priority: 'HIGH' 
    });

    // Calcular clientes únicos y revenue mensual
    const uniqueClients = new Set(activeRentals.map(rental => rental.clientCompanyId));
    const monthlyRevenue = activeRentals.reduce((sum, rental) => sum + rental.monthlyRate, 0);

    return {
      totalClients: uniqueClients.size,
      activeRentals: activeRentals.length,
      totalEquipments,
      pendingServices,
      monthlyRevenue,
      urgentRequests
    };
  }

  async getRevenueByMonth(providerCompanyId) {
    // Obtener ingresos de los últimos 6 meses
    return await this.invoiceRepository.getMonthlyRevenue(providerCompanyId, 6);
  }

  async getEquipmentTypeDistribution(providerCompanyId) {
    const activeRentals = await this.rentalRepository.findActiveRentals(providerCompanyId);
    const equipmentIds = activeRentals.map(rental => rental.equipmentId);
    
    if (equipmentIds.length === 0) {
      return [];
    }

    const equipments = await Promise.all(
      equipmentIds.map(id => this.equipmentRepository.findById(id))
    );

    // Agrupar por tipo
    const typeCount = equipments.reduce((acc, equipment) => {
      if (equipment) {
        acc[equipment.type] = (acc[equipment.type] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getServiceRequestStatus(providerCompanyId) {
    // Obtener servicios de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const serviceRequests = await this.serviceRequestRepository.findByDateRange(
      thirtyDaysAgo, 
      new Date(), 
      providerCompanyId
    );

    // Agrupar por estado
    const statusCount = serviceRequests.reduce((acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([status, count]) => ({ status, count }));
  }

  async getTopClients(providerCompanyId) {
    // Obtener top 5 clientes por facturación de últimos 12 meses
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    return await this.invoiceRepository.getTopClientsByRevenue(
      providerCompanyId, 
      twelveMonthsAgo, 
      new Date(), 
      5
    );
  }
}

module.exports = GetProviderDashboardUseCase;
