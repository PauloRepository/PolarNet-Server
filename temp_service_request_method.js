  async getServiceRequests(providerId, filters) {
    try {
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      // Use the existing repository method
      const result = await this.serviceRequestRepository.findByProvider(providerId, filters);
      
      return {
        serviceRequests: result.serviceRequests || result.data || [],
        pagination: result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      };
    } catch (error) {
      console.error('Error in ProviderServiceRequestUseCase.getServiceRequests:', error);
      throw new Error(`Failed to get service requests: ${error.message}`);
    }
  }