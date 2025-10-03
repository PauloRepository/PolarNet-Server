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
      
      // For now, return the basic data without complex enrichment
      // TODO: Add enrichment with rental stats, service stats, payment stats later
      return {
        data: clients.data.map(client => ({
          ...client,
          rentals: {
            total: client.totalRentals || 0,
            active: client.activeRentals || 0,
            firstDate: client.firstRentalDate,
            lastDate: client.lastRentalDate
          },
          services: {
            total: 0,
            pending: 0,
            completed: 0
          },
          payments: {
            totalAmount: 0,
            pendingAmount: 0,
            paidAmount: 0,
            status: 'current'
          }
        })),
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

      // Get basic data for now - TODO: Add more comprehensive data later
      const [
        activeRentals,
        users
      ] = await Promise.all([
        this.activeRentalRepository.findByProviderAndClient(providerCompanyId, clientCompanyId),
        this.userRepository.findByCompany(clientCompanyId, { limit: 10 })
      ]);

      return {
        company: {
          companyId: clientCompany.company_id,
          id: clientCompany.company_id,
          name: clientCompany.name,
          email: clientCompany.email,
          phone: clientCompany.phone,
          address: clientCompany.address,
          type: clientCompany.type,
          businessType: clientCompany.business_type,
          isActive: clientCompany.is_active
        },
        rentals: {
          active: activeRentals || [],
          history: [] // TODO: Implement rental history
        },
        services: [], // Array vacio por ahora - TODO: Implement service history
        invoices: [], // Array vacio por ahora - TODO: Implement invoice history  
        users: users.users || [],
        locations: [], // TODO: Implement locations
        metrics: {
          relationshipDuration: 'Unknown',
          totalBusiness: 0,
          averageRating: null,
          lastActivity: null
        }
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
