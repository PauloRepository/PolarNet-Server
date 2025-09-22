/**
 * Controller: Provider Maintenances Management  
 * Handles PROVIDER maintenance operations using DDD architecture
 * Endpoints que corresponden a tabla maintenances: maintenance_id, equipment_id, technician_id, status, type, etc.
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderMaintenancesController {
  constructor(container) {
    this.container = container;
    this.maintenanceUseCase = container.resolve('providerMaintenanceUseCase');
    this.ResponseDTO = container.resolve('ProviderMaintenanceResponseDTO');
    this.logger = container.resolve('logger');
  }

  /**
   * Get maintenances list with filtering and search
   * GET /api/provider/maintenances
   */
  async getMaintenances(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '', // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED
        type = '', // PREVENTIVE, CORRECTIVE, EMERGENCY  
        category = '', // CLEANING, INSPECTION, REPAIR, REPLACEMENT
        priority = '',
        technicianId = '',
        equipmentId = '',
        clientId = '',
        dateFrom = '',
        dateTo = '',
        sortBy = 'scheduled_date',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: search.trim(),
        status,
        type,
        category,
        priority,
        technicianId,
        equipmentId,
        clientId,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      };

      const result = await this.maintenanceUseCase.getMaintenances(providerId, filters);
      const formattedResult = this.ResponseDTO.formatMaintenancesList(result);

      return ResponseHandler.success(res, formattedResult, 'Mantenimientos obtenidos exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.getMaintenances error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get maintenance details
   * GET /api/provider/maintenances/:id
   */
  async getMaintenanceById(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: maintenanceId } = req.params;

      if (!maintenanceId) {
        return ResponseHandler.error(res, 'ID de mantenimiento requerido', 400);
      }

      const maintenanceData = await this.maintenanceUseCase.getMaintenanceDetails(providerId, maintenanceId);
      const formattedResult = this.ResponseDTO.formatMaintenanceDetails(maintenanceData);

      return ResponseHandler.success(res, formattedResult, 'Detalles del mantenimiento obtenidos exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.getMaintenanceById error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Create new maintenance
   * POST /api/provider/maintenances  
   */
  async createMaintenance(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        title,
        description,
        type, // PREVENTIVE, CORRECTIVE, EMERGENCY
        category = 'INSPECTION', // CLEANING, INSPECTION, REPAIR, REPLACEMENT
        equipmentId,
        technicianId,
        clientCompanyId,
        scheduledDate,
        estimatedDurationHours,
        priority = 'MEDIUM',
        estimatedCost = 0,
        laborCost = 0,
        partsCost = 0,
        serviceRequestId = null,
        preMaintenanceChecklist = '',
        maintenanceSteps = '',
        postMaintenanceChecklist = '',
        safetyRequirements = '',
        requiredParts = '',
        requiredTools = ''
      } = req.body;

      // Basic validation según estructura BD
      if (!title || !type || !equipmentId || !scheduledDate) {
        return ResponseHandler.error(res, 'Título, tipo, equipo y fecha programada son requeridos', 400);
      }

      const maintenanceData = {
        title: title.trim(),
        description: description ? description.trim() : '',
        type,
        category,
        equipmentId: parseInt(equipmentId),
        technicianId: technicianId ? parseInt(technicianId) : null,
        clientCompanyId: clientCompanyId ? parseInt(clientCompanyId) : null,
        providerCompanyId: providerId,
        scheduledDate,
        estimatedDurationHours: estimatedDurationHours ? parseInt(estimatedDurationHours) : null,
        priority,
        estimatedCost: parseFloat(estimatedCost),
        laborCost: parseFloat(laborCost),
        partsCost: parseFloat(partsCost),
        serviceRequestId: serviceRequestId ? parseInt(serviceRequestId) : null,
        preMaintenanceChecklist: preMaintenanceChecklist.trim(),
        maintenanceSteps: maintenanceSteps.trim(),
        postMaintenanceChecklist: postMaintenanceChecklist.trim(),
        safetyRequirements: safetyRequirements.trim(),
        requiredParts: requiredParts.trim(),
        requiredTools: requiredTools.trim(),
        createdBy: req.user.userId
      };

      const result = await this.maintenanceUseCase.createMaintenance(providerId, maintenanceData);
      const formattedResult = this.ResponseDTO.formatMaintenanceDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Mantenimiento creado exitosamente', 201);
    } catch (error) {
      console.error('ProviderMaintenancesController.createMaintenance error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Update maintenance
   * PUT /api/provider/maintenances/:id
   */
  async updateMaintenance(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: maintenanceId } = req.params;
      const updateFields = req.body;

      if (!maintenanceId) {
        return ResponseHandler.error(res, 'ID de mantenimiento requerido', 400);
      }

      // Campos permitidos para actualización según BD
      const allowedFields = [
        'title', 'description', 'type', 'category', 'scheduledDate',
        'estimatedDurationHours', 'priority', 'technicianId', 'estimatedCost',
        'laborCost', 'partsCost', 'preMaintenanceChecklist', 'maintenanceSteps',
        'postMaintenanceChecklist', 'safetyRequirements', 'requiredParts', 'requiredTools'
      ];

      const updateData = {};
      allowedFields.forEach(field => {
        if (updateFields[field] !== undefined) {
          updateData[field] = updateFields[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return ResponseHandler.error(res, 'No hay datos para actualizar', 400);
      }

      updateData.updatedBy = req.user.userId;

      const result = await this.maintenanceUseCase.updateMaintenance(providerId, maintenanceId, updateData);
      const formattedResult = this.ResponseDTO.formatMaintenanceDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Mantenimiento actualizado exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.updateMaintenance error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Delete maintenance
   * DELETE /api/provider/maintenances/:id
   */
  async deleteMaintenance(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: maintenanceId } = req.params;

      if (!maintenanceId) {
        return ResponseHandler.error(res, 'ID de mantenimiento requerido', 400);
      }

      await this.maintenanceUseCase.deleteMaintenance(providerId, maintenanceId);

      return ResponseHandler.success(res, { deleted: true }, 'Mantenimiento eliminado exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.deleteMaintenance error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Start maintenance (cambiar status a IN_PROGRESS)
   * PUT /api/provider/maintenances/:id/start
   */
  async startMaintenance(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: maintenanceId } = req.params;
      const { 
        actualStartTime = new Date(),
        startNotes = ''
      } = req.body;

      if (!maintenanceId) {
        return ResponseHandler.error(res, 'ID de mantenimiento requerido', 400);
      }

      const startData = {
        actualStartTime: new Date(actualStartTime),
        startNotes: startNotes.trim(),
        startedBy: req.user.userId
      };

      const result = await this.maintenanceUseCase.startMaintenance(providerId, maintenanceId, startData);
      const formattedResult = this.ResponseDTO.formatMaintenanceDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Mantenimiento iniciado exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.startMaintenance error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Complete maintenance (cambiar status a COMPLETED)
   * PUT /api/provider/maintenances/:id/complete
   */
  async completeMaintenance(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: maintenanceId } = req.params;
      const {
        actualEndTime = new Date(),
        workPerformed,
        issuesFound = '',
        recommendedActions = '',
        partsUsed = '',
        actualCost = 0,
        actualLaborCost = 0,
        actualPartsCost = 0,
        nextScheduledDate = null,
        completionNotes = '',
        qualityChecked = false,
        clientSatisfaction = null
      } = req.body;

      if (!maintenanceId) {
        return ResponseHandler.error(res, 'ID de mantenimiento requerido', 400);
      }

      if (!workPerformed || workPerformed.trim().length === 0) {
        return ResponseHandler.error(res, 'Descripción del trabajo realizado es requerida', 400);
      }

      const completionData = {
        actualEndTime: new Date(actualEndTime),
        workPerformed: workPerformed.trim(),
        issuesFound: issuesFound.trim(),
        recommendedActions: recommendedActions.trim(),
        partsUsed: partsUsed.trim(),
        actualCost: parseFloat(actualCost),
        actualLaborCost: parseFloat(actualLaborCost),
        actualPartsCost: parseFloat(actualPartsCost),
        nextScheduledDate,
        completionNotes: completionNotes.trim(),
        qualityChecked,
        clientSatisfaction: clientSatisfaction ? parseInt(clientSatisfaction) : null,
        completedBy: req.user.userId
      };

      const result = await this.maintenanceUseCase.completeMaintenance(providerId, maintenanceId, completionData);
      const formattedResult = this.ResponseDTO.formatMaintenanceDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Mantenimiento completado exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.completeMaintenance error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get maintenance statistics
   * GET /api/provider/maintenances/statistics
   */
  async getStatistics(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        period = '12months',
        type = '',
        technicianId = '',
        equipmentType = ''
      } = req.query;

      const filters = {
        period,
        type,
        technicianId,
        equipmentType
      };

      const statistics = await this.maintenanceUseCase.getMaintenanceStatistics(providerId, filters);
      const formattedResult = this.ResponseDTO.formatMaintenanceStatistics(statistics);

      return ResponseHandler.success(res, formattedResult, 'Estadísticas de mantenimiento obtenidas exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.getStatistics error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Schedule automatic maintenances based on equipment maintenance intervals
   * POST /api/provider/maintenances/schedule-automatic
   */
  async scheduleAutomaticMaintenances(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        equipmentIds = [],
        maintenanceType = 'PREVENTIVE',
        intervalDays = 90,
        startDate,
        assignToTechnician = null
      } = req.body;

      if (!equipmentIds.length || !startDate) {
        return ResponseHandler.error(res, 'IDs de equipos y fecha de inicio son requeridos', 400);
      }

      const scheduleData = {
        equipmentIds: equipmentIds.map(id => parseInt(id)),
        maintenanceType,
        intervalDays: parseInt(intervalDays),
        startDate,
        assignToTechnician: assignToTechnician ? parseInt(assignToTechnician) : null,
        createdBy: req.user.userId
      };

      const result = await this.maintenanceUseCase.scheduleAutomaticMaintenances(providerId, scheduleData);
      const formattedResult = result.map(maintenance => this.ResponseDTO.formatMaintenanceSummary(maintenance));

      return ResponseHandler.success(res, { scheduled: formattedResult }, 'Mantenimientos automáticos programados exitosamente');
    } catch (error) {
      console.error('ProviderMaintenancesController.scheduleAutomaticMaintenances error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // Legacy method aliases for compatibility with existing routes
  async index(req, res) { return this.getMaintenances(req, res); }
  async show(req, res) { return this.getMaintenanceById(req, res); }
  async create(req, res) { return this.createMaintenance(req, res); }
  async update(req, res) { return this.updateMaintenance(req, res); }
  async destroy(req, res) { return this.deleteMaintenance(req, res); }
}

module.exports = ProviderMaintenancesController;
