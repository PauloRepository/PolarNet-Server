const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ContractsController {
  constructor(container) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  // GET /api/client/contracts - Obtener contratos del cliente usando DDD
  async getContracts(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        equipmentType,
        dateFrom,
        dateTo
      } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting client contracts', { 
        clientCompanyId, 
        page, 
        limit, 
        status, 
        equipmentType 
      });

      // Get repository
      const activeRentalRepository = this.container.resolve('activeRentalRepository');

      // Build filters
      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        equipmentType
      };

      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);

      // Get contracts (active rentals)
      const contracts = await activeRentalRepository.findByClientCompany(clientCompanyId, filters);
      const totalContracts = await activeRentalRepository.countByClientCompany(clientCompanyId, filters);

      // Format response - simplified without methods that may not exist
      const formattedContracts = contracts.map(contract => ({
        contractId: contract.id ? contract.id.toString() : contract.rentalId?.toString(),
        rentalId: contract.rentalId ? contract.rentalId.toString() : null,
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate,
        monthlyRate: contract.monthlyRate,
        totalPaid: contract.totalPaid || 0,
        equipmentId: contract.equipmentId,
        clientCompanyId: contract.clientCompanyId,
        providerCompanyId: contract.providerCompanyId
      }));

      return ResponseHandler.success(res, {
        contracts: formattedContracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalContracts,
          totalPages: Math.ceil(totalContracts / limit)
        }
      }, 'Contracts retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getContracts', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/contracts/:contractId - Obtener detalles del contrato usando DDD
  async getContractDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { contractId } = req.params;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting contract details', { clientCompanyId, contractId });

      // Get repositories
      const activeRentalRepository = this.container.resolve('activeRentalRepository');
      const invoiceRepository = this.container.resolve('invoiceRepository');
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');

      // Get contract
      const contract = await activeRentalRepository.findById(contractId);
      if (!contract) {
        return ResponseHandler.error(res, 'Contract not found', 404);
      }

      // Verify belongs to client
      if (contract.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to access this contract', 403);
      }

      // Get related invoices
      const invoices = await invoiceRepository.findByRental(contract.rentalId, {
        limit: 50
      });

      // Get related service requests
      const serviceRequests = await serviceRequestRepository.findByEquipment(contract.equipmentId, {
        limit: 20
      });

      // Get payment history
      const paymentHistory = await invoiceRepository.getPaymentHistory(contract.rentalId);

      const contractDetails = {
        contractId: contract.id.toString(),
        rentalId: contract.rentalId.toString(),
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate,
        monthlyRate: contract.monthlyRate,
        securityDeposit: contract.securityDeposit,
        totalPaid: contract.totalPaid,
        equipment: contract.getEquipmentInfo(),
        provider: contract.getProviderInfo(),
        client: contract.getClientInfo(),
        location: contract.getLocationInfo(),
        terms: contract.getContractTerms(),
        financials: {
          totalValue: contract.getTotalContractValue(),
          monthsRemaining: contract.getMonthsRemaining(),
          daysUntilExpiry: contract.getDaysUntilExpiry(),
          nextPaymentDue: contract.getNextPaymentDue(),
          paymentStatus: contract.getPaymentStatus(),
          outstandingAmount: contract.getOutstandingAmount()
        },
        invoices: invoices.map(invoice => ({
          invoiceId: invoice.id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          status: invoice.status
        })),
        serviceRequests: serviceRequests.slice(0, 10).map(sr => ({
          serviceRequestId: sr.id.toString(),
          title: sr.title,
          type: sr.type,
          status: sr.status,
          requestDate: sr.createdAt,
          resolvedDate: sr.resolvedAt
        })),
        paymentHistory: paymentHistory.map(payment => ({
          paymentId: payment.id.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          method: payment.paymentMethod,
          reference: payment.reference,
          invoiceId: payment.invoiceId.toString()
        })),
        extensions: contract.getExtensionHistory(),
        canBeExtended: contract.canBeExtended(),
        isExpiringSoon: contract.isExpiringSoon(30)
      };

      return ResponseHandler.success(res, contractDetails, 'Contract details retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getContractDetails', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ContractsController;
