const ClientContractResponseDTO = require('../dto/ClientContractResponseDTO');

/**
 * Use Case: Client Contracts Management
 * Handles contract operations for client companies (active rentals)
 */
class ClientContractUseCase {
  constructor(
    activeRentalRepository,
    equipmentRepository,
    companyRepository,
    userRepository
  ) {
    this.activeRentalRepository = activeRentalRepository;
    this.equipmentRepository = equipmentRepository;
    this.companyRepository = companyRepository;
    this.userRepository = userRepository;
  }

  /**
   * Get contracts (active rentals) for client
   * @param {number} clientCompanyId - Client company ID
   * @param {Object} filters - Filtering options
   * @returns {Promise<Object>} Contracts list
   */
  async getContracts(clientCompanyId, filters = {}) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const {
        page = 1,
        limit = 20,
        status,
        equipmentType,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo
      } = filters;

      const queryFilters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        equipmentType,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo
      };

      const [contracts, totalCount] = await Promise.all([
        this.activeRentalRepository.findByClientCompany(clientCompanyId, queryFilters),
        this.activeRentalRepository.getClientContractCount(clientCompanyId, queryFilters)
      ]);

      return {
        success: true,
        data: {
          contracts: ClientContractResponseDTO.formatContractList(contracts),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getContracts:', error);
      throw new Error(`Failed to get contracts: ${error.message}`);
    }
  }

  /**
   * Get contract details by ID
   * @param {number} contractId - Contract (active rental) ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} Contract details
   */
  async getContractDetails(contractId, clientCompanyId) {
    try {
      if (!contractId || !clientCompanyId) {
        throw new Error('Contract ID and client company ID are required');
      }

      const contract = await this.activeRentalRepository.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Verify contract belongs to client company
      if (contract.clientCompanyId !== clientCompanyId) {
        throw new Error('Contract not found or access denied');
      }

      return {
        success: true,
        data: ClientContractResponseDTO.formatContractDetails(contract)
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getContractDetails:', error);
      throw new Error(`Failed to get contract details: ${error.message}`);
    }
  }

  /**
   * Get active contracts for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Active contracts
   */
  async getActiveContracts(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const activeContracts = await this.activeRentalRepository.findActiveByClient(clientCompanyId);

      return {
        success: true,
        data: ClientContractResponseDTO.formatContractList(activeContracts)
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getActiveContracts:', error);
      throw new Error(`Failed to get active contracts: ${error.message}`);
    }
  }

  /**
   * Get expiring contracts for client
   * @param {number} clientCompanyId - Client company ID
   * @param {number} daysAhead - Number of days ahead to check for expiration
   * @returns {Promise<Object>} Expiring contracts
   */
  async getExpiringContracts(clientCompanyId, daysAhead = 30) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const expiringContracts = await this.activeRentalRepository.findExpiringByClient(
        clientCompanyId, 
        daysAhead
      );

      return {
        success: true,
        data: ClientContractResponseDTO.formatContractList(expiringContracts)
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getExpiringContracts:', error);
      throw new Error(`Failed to get expiring contracts: ${error.message}`);
    }
  }

  /**
   * Get contract financial summary
   * @param {number} contractId - Contract ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} Financial summary
   */
  async getContractFinancialSummary(contractId, clientCompanyId) {
    try {
      if (!contractId || !clientCompanyId) {
        throw new Error('Contract ID and client company ID are required');
      }

      const contract = await this.activeRentalRepository.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Verify contract belongs to client company
      if (contract.clientCompanyId !== clientCompanyId) {
        throw new Error('Contract not found or access denied');
      }

      const financialSummary = await this.activeRentalRepository.getContractFinancialSummary(contractId);

      return {
        success: true,
        data: ClientContractResponseDTO.formatFinancialSummary(financialSummary)
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getContractFinancialSummary:', error);
      throw new Error(`Failed to get contract financial summary: ${error.message}`);
    }
  }

  /**
   * Get contract equipment history
   * @param {number} contractId - Contract ID
   * @param {number} clientCompanyId - Client company ID (for authorization)
   * @returns {Promise<Object>} Equipment history
   */
  async getContractEquipmentHistory(contractId, clientCompanyId) {
    try {
      if (!contractId || !clientCompanyId) {
        throw new Error('Contract ID and client company ID are required');
      }

      const contract = await this.activeRentalRepository.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Verify contract belongs to client company
      if (contract.clientCompanyId !== clientCompanyId) {
        throw new Error('Contract not found or access denied');
      }

      const equipmentHistory = await this.activeRentalRepository.getContractEquipmentHistory(contractId);

      return {
        success: true,
        data: ClientContractResponseDTO.formatEquipmentHistory(equipmentHistory)
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getContractEquipmentHistory:', error);
      throw new Error(`Failed to get contract equipment history: ${error.message}`);
    }
  }

  /**
   * Request contract modification
   * @param {number} contractId - Contract ID
   * @param {number} userId - User ID requesting modification
   * @param {Object} modificationData - Modification request data
   * @returns {Promise<Object>} Modification request result
   */
  async requestContractModification(contractId, userId, modificationData) {
    try {
      if (!contractId || !userId) {
        throw new Error('Contract ID and user ID are required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const contract = await this.activeRentalRepository.findById(contractId);
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Verify contract belongs to client company
      if (contract.clientCompanyId !== user.companyId) {
        throw new Error('Contract not found or access denied');
      }

      // Only active contracts can be modified
      if (contract.status !== 'ACTIVE') {
        throw new Error('Only active contracts can be modified');
      }

      const {
        modificationType,
        requestedEndDate,
        reason,
        additionalNotes
      } = modificationData;

      if (!modificationType || !reason) {
        throw new Error('Modification type and reason are required');
      }

      const modificationRequest = {
        contractId,
        requestedById: userId,
        modificationType,
        requestedEndDate,
        reason,
        additionalNotes,
        status: 'PENDING',
        requestDate: new Date()
      };

      // In a real implementation, this would create a modification request record
      // For now, we'll simulate the creation
      const result = await this.activeRentalRepository.createModificationRequest(modificationRequest);

      return {
        success: true,
        data: result,
        message: 'Contract modification request submitted successfully'
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.requestContractModification:', error);
      throw new Error(`Failed to request contract modification: ${error.message}`);
    }
  }

  /**
   * Get contract statistics for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Contract statistics
   */
  async getContractStatistics(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const statistics = await this.activeRentalRepository.getClientStatistics(clientCompanyId);

      return {
        success: true,
        data: ClientContractResponseDTO.formatStatistics(statistics)
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getContractStatistics:', error);
      throw new Error(`Failed to get contract statistics: ${error.message}`);
    }
  }

  /**
   * Get contracts by equipment type for client
   * @param {number} clientCompanyId - Client company ID
   * @returns {Promise<Object>} Contracts grouped by equipment type
   */
  async getContractsByEquipmentType(clientCompanyId) {
    try {
      if (!clientCompanyId) {
        throw new Error('Client company ID is required');
      }

      const contractsByType = await this.activeRentalRepository.getClientContractsByEquipmentType(clientCompanyId);

      return {
        success: true,
        data: contractsByType.map(typeGroup => ({
          equipmentType: typeGroup.equipmentType,
          contractCount: typeGroup.contractCount,
          totalValue: typeGroup.totalValue,
          contracts: ClientContractResponseDTO.formatContractList(typeGroup.contracts || [])
        }))
      };

    } catch (error) {
      console.error('Error in ClientContractUseCase.getContractsByEquipmentType:', error);
      throw new Error(`Failed to get contracts by equipment type: ${error.message}`);
    }
  }
}

module.exports = ClientContractUseCase;
