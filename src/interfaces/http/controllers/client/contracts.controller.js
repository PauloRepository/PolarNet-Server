const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ContractsController {
  constructor() {
    this.container = null;
    this.logger = null;
  }

  // Inject DI container
  setContainer(container) {
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

  // GET /api/client/contracts/:id/documents - Obtener documentos del contrato usando DDD
  async getContractDocuments(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params; // Changed from contractId to id

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting contract documents', { clientCompanyId, contractId: id });

      // Get repository
      const activeRentalRepository = this.container.resolve('activeRentalRepository');

      // Get contract and verify ownership
      const contract = await activeRentalRepository.findById(id);
      if (!contract) {
        return ResponseHandler.error(res, 'Contract not found', 404);
      }

      if (contract.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to access this contract', 403);
      }

      // Mock documents response (since we don't have a documents table implemented yet)
      const mockDocuments = [
        {
          documentId: "1",
          filename: "contrato_rental_" + contract.id + ".pdf",
          type: "contract",
          description: "Contrato principal de renta",
          fileUrl: "/api/documents/contracts/" + contract.id + "/contract.pdf",
          fileSize: 245760,
          uploadedAt: contract.createdAt,
          uploadedBy: "Sistema",
          isSignatureRequired: true,
          isSigned: true,
          signedAt: contract.createdAt,
          signedBy: "Cliente"
        },
        {
          documentId: "2",
          filename: "terminos_condiciones_" + contract.id + ".pdf",
          type: "terms",
          description: "Términos y condiciones",
          fileUrl: "/api/documents/contracts/" + contract.id + "/terms.pdf",
          fileSize: 156432,
          uploadedAt: contract.createdAt,
          uploadedBy: "Sistema",
          isSignatureRequired: false,
          isSigned: false,
          signedAt: null,
          signedBy: null
        }
      ];

      // Group documents by type
      const documentsByType = mockDocuments.reduce((acc, doc) => {
        const type = doc.type || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(doc);
        return acc;
      }, {});

      return ResponseHandler.success(res, {
        documents: mockDocuments,
        documentsByType,
        summary: {
          totalDocuments: mockDocuments.length,
          signedDocuments: mockDocuments.filter(doc => doc.isSigned).length,
          pendingSignatures: mockDocuments.filter(doc => doc.isSignatureRequired && !doc.isSigned).length
        }
      }, 'Contract documents retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getContractDocuments', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/contracts/summary - Obtener resumen de contratos usando DDD
  async getContractsSummary(req, res) {
    try {
      const { clientCompanyId } = req.user;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting contracts summary', { clientCompanyId });

      // Get repository
      const activeRentalRepository = this.container.resolve('activeRentalRepository');

      // Get all client contracts
      const allContracts = await activeRentalRepository.findByClientCompany(clientCompanyId);
      
      // Get summary statistics
      const summaryStats = await activeRentalRepository.getClientSummary(clientCompanyId);

      // Calculate summary metrics manually
      const statusCounts = {};
      let totalMonthlyPayment = 0;
      
      allContracts.forEach(contract => {
        statusCounts[contract.status] = (statusCounts[contract.status] || 0) + 1;
        if (contract.status === 'ACTIVE') {
          totalMonthlyPayment += (contract.monthlyRate || 0);
        }
      });

      const summary = {
        totalContracts: allContracts.length,
        activeContracts: statusCounts['ACTIVE'] || 0,
        expiredContracts: statusCounts['EXPIRED'] || 0,
        cancelledContracts: statusCounts['CANCELLED'] || 0,
        totalMonthlyPayment: totalMonthlyPayment,
        totalPaid: summaryStats.total_paid || 0,
        contractsByStatus: statusCounts,
        averageMonthlyRate: allContracts.length > 0 ? totalMonthlyPayment / Math.max(statusCounts['ACTIVE'] || 1, 1) : 0
      };

      return ResponseHandler.success(res, summary, 'Contracts summary retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getContractsSummary', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/contracts/:id - Obtener detalles del contrato usando DDD
  async getContractDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params; // Changed from contractId to id

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting contract details', { clientCompanyId, contractId: id });

      // Get repository
      const activeRentalRepository = this.container.resolve('activeRentalRepository');

      // Get contract
      const contract = await activeRentalRepository.findById(id);
      if (!contract) {
        return ResponseHandler.error(res, 'Contract not found', 404);
      }

      // Verify belongs to client
      if (contract.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to access this contract', 403);
      }

      // Format response
      const contractDetails = {
        contractId: contract.id ? contract.id.toString() : null,
        rentalId: contract.rentalId ? contract.rentalId.toString() : null,
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate,
        monthlyRate: contract.monthlyRate,
        totalPaid: contract.totalPaid || 0,
        equipmentId: contract.equipmentId,
        clientCompanyId: contract.clientCompanyId,
        providerCompanyId: contract.providerCompanyId,
        securityDeposit: contract.securityDeposit,
        renewalTerms: contract.renewalTerms,
        specialConditions: contract.specialConditions,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      };

      return ResponseHandler.success(res, contractDetails, 'Contract details retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getContractDetails', { error: error.message });
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // PUT /api/client/contracts/:id/extend - Solicitar extensión de contrato usando DDD
  async requestContractExtension(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id } = req.params; // Changed from contractId to id
      const { 
        extensionMonths = 12,
        proposedRate,
        reason = 'Extension request from client',
        requestedStartDate
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Requesting contract extension', { 
        clientCompanyId, 
        contractId: id, 
        extensionMonths, 
        proposedRate 
      });

      // Get repository
      const activeRentalRepository = this.container.resolve('activeRentalRepository');

      // Get contract and verify ownership
      const contract = await activeRentalRepository.findById(id);
      if (!contract) {
        return ResponseHandler.error(res, 'Contract not found', 404);
      }

      if (contract.clientCompanyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Unauthorized to access this contract', 403);
      }

      // Validate extension parameters
      if (!extensionMonths || extensionMonths < 1 || extensionMonths > 60) {
        return ResponseHandler.error(res, 'Extension months must be between 1 and 60', 400);
      }

      // Validate contract can be extended
      if (contract.status !== 'ACTIVE') {
        return ResponseHandler.error(res, 'Only active contracts can be extended', 400);
      }

      // Calculate new end date
      const currentEndDate = new Date(contract.endDate);
      const proposedEndDate = new Date(currentEndDate);
      proposedEndDate.setMonth(proposedEndDate.getMonth() + parseInt(extensionMonths));

      // Log para debug
      this.logger.info('Date calculation debug', {
        originalEndDate: contract.endDate,
        currentEndDate: currentEndDate.toISOString(),
        extensionMonths: parseInt(extensionMonths),
        proposedEndDate: proposedEndDate.toISOString()
      });

      // Use existing rate if no new rate proposed
      const finalRate = proposedRate ? parseFloat(proposedRate) : contract.monthlyRate;

      // OPCIÓN A: AUTOMÁTICAMENTE APROBAR Y EXTENDER EL CONTRATO
      try {
        // Update the contract directly (auto-approve the extension)
        const updateQuery = `
          UPDATE active_rentals 
          SET end_date = $1, 
              monthly_rate = $2,
              updated_at = NOW()
          WHERE rental_id = $3 AND client_company_id = $4
          RETURNING *
        `;

        const db = this.container.resolve('database');
        
        // Log para debug de la query
        this.logger.info('Executing update query', {
          newEndDate: proposedEndDate.toISOString().split('T')[0], // Solo fecha YYYY-MM-DD
          newRate: finalRate,
          rentalId: id,
          clientCompanyId: clientCompanyId
        });
        
        const updateResult = await db.query(updateQuery, [
          proposedEndDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
          finalRate,
          id,
          clientCompanyId
        ]);

        if (updateResult.rows.length === 0) {
          return ResponseHandler.error(res, 'Failed to extend contract', 500);
        }

        const updatedContract = updateResult.rows[0];

        const extensionResponse = {
          extensionRequestId: "ext_" + id + "_" + Date.now(),
          contractId: id,
          extensionMonths: parseInt(extensionMonths),
          proposedRate: finalRate,
          reason: reason,
          status: "APPROVED_AUTO", // Auto-approved
          requestedAt: new Date(),
          approvedAt: new Date(),
          proposedEndDate: proposedEndDate,
          currentEndDate: currentEndDate,
          newEndDate: proposedEndDate,
          estimatedTotalCost: finalRate * parseInt(extensionMonths),
          message: "Contract extended successfully"
        };

        return ResponseHandler.success(res, extensionResponse, 'Contract extended successfully', 200);

      } catch (dbError) {
        this.logger?.error('Database error extending contract', { error: dbError.message });
        return ResponseHandler.error(res, 'Failed to extend contract in database', 500);
      }

    } catch (error) {
      this.logger?.error('Error in requestContractExtension', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = new ContractsController();
