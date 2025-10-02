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

  // GET /api/client/contracts/:id - Obtener detalles del contrato usando DDD
  async getContractDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id: contractId } = req.params;

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

      // Debug log to see contract structure
      this.logger.info('Contract found:', { 
        contractId: contract.id,
        rentalId: contract.rentalId,
        keys: Object.keys(contract)
      });

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
        contractId: contractId, // Use the parameter directly
        rentalId: contractId, // Same as contractId since they're the same in this context
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate,
        monthlyRate: contract.monthlyRate,
        securityDeposit: contract.securityDeposit || 0,
        totalPaid: contract.totalAmount || 0,
        equipment: {
          equipmentId: contract.equipmentId,
          serialNumber: contract.equipmentSerialNumber,
          type: contract.equipmentType,
          model: contract.equipmentModel
        },
        provider: {
          providerCompanyId: contract.providerCompanyId,
          name: contract.providerCompanyName
        },
        client: {
          clientCompanyId: contract.clientCompanyId,
          name: contract.clientCompanyName
        },
        location: {
          address: 'Not available',
          city: 'Not available'
        },
        terms: {
          duration: 'Standard rental terms',
          conditions: 'Standard conditions apply'
        },
        financials: {
          totalValue: contract.totalAmount || 0,
          monthsRemaining: 0, // Calculate if needed
          daysUntilExpiry: 0, // Calculate if needed
          nextPaymentDue: null,
          paymentStatus: contract.status,
          outstandingAmount: 0
        },
        invoices: invoices.map(invoice => ({
          invoiceId: invoice.invoiceId ? invoice.invoiceId.toString() : null,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          status: invoice.status
        })),
        serviceRequests: serviceRequests.slice(0, 10).map(sr => ({
          serviceRequestId: sr.id ? sr.id.toString() : null,
          title: sr.title,
          type: sr.priority || 'MEDIUM',
          status: sr.status,
          requestDate: sr.createdAt,
          resolvedDate: sr.completedDate
        })),
        paymentHistory: paymentHistory.map(payment => ({
          paymentId: payment.invoice_id ? payment.invoice_id.toString() : null,
          amount: payment.total_amount,
          paymentDate: payment.paid_date,
          method: payment.payment_method || 'Unknown',
          reference: payment.invoice_number,
          invoiceId: payment.invoice_id ? payment.invoice_id.toString() : null
        })),
        extensions: [], // Not implemented yet
        canBeExtended: true, // Default value
        isExpiringSoon: false // Default value
      };

      return ResponseHandler.success(res, contractDetails, 'Contract details retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getContractDetails', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ContractsController;
