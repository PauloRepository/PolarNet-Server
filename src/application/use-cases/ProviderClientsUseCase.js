/**
 * Use Case: Provider Clients Management
 * Handles client operations for provider companies
 */
class ProviderClientsUseCase {
  constructor(
    companyRepository,
    activeRentalRepository,
    serviceRequestRepository,
    invoiceRepository,
    userRepository
  ) {
    this.companyRepository = companyRepository;
    this.activeRentalRepository = activeRentalRepository;
    this.serviceRequestRepository = serviceRequestRepository;
    this.invoiceRepository = invoiceRepository;
    this.userRepository = userRepository;
  }

  /**
   * Get clients list for provider
   * @param {number} providerCompanyId - Provider company ID
   * @param {Object} filters - Search and filter options
   * @returns {Promise<Object>} Clients list with pagination
   */
  async getClientsList(providerCompanyId, filters = {}) {
    try {
      if (!providerCompanyId) {
        throw new Error('Provider company ID is required');
      }

      // Get client companies that have active or past rentals with this provider
      const clients = await this.activeRentalRepository.getClientCompaniesByProvider(providerCompanyId, filters);
      
      // Enrich each client with additional metrics
      const enrichedClients = await Promise.all(
        clients.data.map(async (client) => {
          const [
            rentalStats,
            serviceStats,
            paymentStats
          ] = await Promise.all([
            this.activeRentalRepository.getClientStatisticsByProvider(client.companyId, providerCompanyId),
            this.serviceRequestRepository.getClientStatisticsByProvider(client.companyId, providerCompanyId),
            this.invoiceRepository.getClientPaymentStatsByProvider(client.companyId, providerCompanyId)
          ]);

          return {
            ...client,
            rentals: rentalStats,
            services: serviceStats,
            payments: paymentStats
          };
        })
      );

      return {
        data: enrichedClients,
        pagination: clients.pagination
      };
    } catch (error) {
      console.error('Error in ProviderClientsUseCase.getClientsList:', error);
      throw new Error(`Failed to get clients list: ${error.message}`);
    }
  }

  /**
   * Get client details for provider
   * @param {number} clientCompanyId - Client company ID
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Client details
   */
  async getClientDetails(clientCompanyId, providerCompanyId) {
    try {
      if (!clientCompanyId || !providerCompanyId) {
        throw new Error('Client and Provider company IDs are required');
      }

      // Verify relationship exists
      const hasRelationship = await this.activeRentalRepository.hasProviderClientRelationship(
        providerCompanyId, 
        clientCompanyId
      );

      if (!hasRelationship) {
        throw new Error('No business relationship found with this client');
      }

      // Get client company details
      const clientCompany = await this.companyRepository.findById(clientCompanyId);
      
      if (!clientCompany) {
        throw new Error('Client company not found');
      }

      // Get comprehensive data in parallel
      const [
        rentalHistory,
        activeRentals,
        serviceHistory,
        invoiceHistory,
        clientUsers,
        clientLocations
      ] = await Promise.all([
        this.activeRentalRepository.getClientRentalHistory(clientCompanyId, providerCompanyId),
        this.activeRentalRepository.getActiveRentalsByClient(clientCompanyId, providerCompanyId),
        this.serviceRequestRepository.getClientServiceHistory(clientCompanyId, providerCompanyId),
        this.invoiceRepository.getClientInvoiceHistory(clientCompanyId, providerCompanyId),
        this.userRepository.findByCompany(clientCompanyId),
        this.companyRepository.getCompanyLocations(clientCompanyId)
      ]);

      return {
        company: clientCompany,
        rentals: {
          active: activeRentals,
          history: rentalHistory
        },
        services: serviceHistory,
        invoices: invoiceHistory,
        users: clientUsers,
        locations: clientLocations
      };
    } catch (error) {
      console.error('Error in ProviderClientsUseCase.getClientDetails:', error);
      throw new Error(`Failed to get client details: ${error.message}`);
    }
  }

  /**
   * Get client analytics for provider
   * @param {number} clientCompanyId - Client company ID
   * @param {number} providerCompanyId - Provider company ID
   * @returns {Promise<Object>} Client analytics
   */
  async getClientAnalytics(clientCompanyId, providerCompanyId) {
    try {
      if (!clientCompanyId || !providerCompanyId) {
        throw new Error('Client and Provider company IDs are required');
      }

      const [
        revenueAnalytics,
        rentalAnalytics,
        serviceAnalytics,
        paymentAnalytics
      ] = await Promise.all([
        this.invoiceRepository.getClientRevenueAnalytics(clientCompanyId, providerCompanyId),
        this.activeRentalRepository.getClientRentalAnalytics(clientCompanyId, providerCompanyId),
        this.serviceRequestRepository.getClientServiceAnalytics(clientCompanyId, providerCompanyId),
        this.invoiceRepository.getClientPaymentAnalytics(clientCompanyId, providerCompanyId)
      ]);

      return {
        revenue: revenueAnalytics,
        rentals: rentalAnalytics,
        services: serviceAnalytics,
        payments: paymentAnalytics
      };
    } catch (error) {
      console.error('Error in ProviderClientsUseCase.getClientAnalytics:', error);
      throw new Error(`Failed to get client analytics: ${error.message}`);
    }
  }
}

module.exports = ProviderClientsUseCase;
