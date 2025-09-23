const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderEquipmentsController {
  constructor(container) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  // GET /api/provider/equipments - Lista de equipos del proveedor
  async getEquipments(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const filters = req.query;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get use case from container
      const equipmentUseCase = this.container.resolve('providerEquipmentUseCase');
      
      // Execute use case
      const equipmentsData = await equipmentUseCase.getEquipmentList(providerCompanyId, filters);

      return ResponseHandler.success(res, equipmentsData, 'Equipment list retrieved successfully');
    } catch (error) {
      console.error('Error in ProviderEquipmentsController.getEquipments:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/provider/equipments/summary - Resumen de equipos del proveedor
  async getEquipmentsSummary(req, res) {
    try {
      const { providerCompanyId } = req.user;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get use case from container
      const equipmentUseCase = this.container.resolve('providerEquipmentUseCase');
      
      // Execute use case
      const summaryData = await equipmentUseCase.getEquipmentSummary(providerCompanyId);

      return ResponseHandler.success(res, summaryData, 'Equipment summary retrieved successfully');
    } catch (error) {
      console.error('Error in ProviderEquipmentsController.getEquipmentsSummary:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/provider/equipments/:id - Detalles de equipo específico
  async getEquipmentById(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get use case from container
      const equipmentUseCase = this.container.resolve('providerEquipmentUseCase');
      
      // Execute use case
      const equipmentData = await equipmentUseCase.getEquipmentDetails(parseInt(id), providerCompanyId);

      return ResponseHandler.success(res, equipmentData, 'Equipment details retrieved successfully');
    } catch (error) {
      console.error('Error in ProviderEquipmentsController.getEquipmentById:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // POST /api/provider/equipments - Crear nuevo equipo
  async createEquipment(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const equipmentData = req.body;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get use case from container
      const equipmentUseCase = this.container.resolve('providerEquipmentUseCase');
      
      // Execute use case
      const newEquipment = await equipmentUseCase.createEquipment(equipmentData, providerCompanyId);

      return ResponseHandler.success(res, newEquipment, 'Equipment created successfully', 201);
    } catch (error) {
      console.error('Error in ProviderEquipmentsController.createEquipment:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // PUT /api/provider/equipments/:id - Actualizar equipo
  async updateEquipment(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const updateData = req.body;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get use case from container
      const equipmentUseCase = this.container.resolve('providerEquipmentUseCase');
      
      // Execute use case
      const updatedEquipment = await equipmentUseCase.updateEquipment(parseInt(id), updateData, providerCompanyId);

      return ResponseHandler.success(res, updatedEquipment, 'Equipment updated successfully');
    } catch (error) {
      console.error('Error in ProviderEquipmentsController.updateEquipment:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // DELETE /api/provider/equipments/:id - Eliminar equipo
  async deleteEquipment(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get use case from container
      const equipmentUseCase = this.container.resolve('providerEquipmentUseCase');
      
      // Execute use case
      const deleted = await equipmentUseCase.deleteEquipment(parseInt(id), providerCompanyId);

      if (deleted) {
        return ResponseHandler.success(res, { deleted: true }, 'Equipment deleted successfully');
      } else {
        return ResponseHandler.error(res, 'Failed to delete equipment', 500);
      }
    } catch (error) {
      console.error('Error in ProviderEquipmentsController.deleteEquipment:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/provider/equipments/:id/performance - Analíticas de rendimiento del equipo
  async getEquipmentPerformance(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const filters = req.query;

      // Lazy load container if not available
      if (!this.container) {
        console.warn('Container not injected, loading dynamically...');
        const { getContainer } = require('../../../../infrastructure/config/index');
        this.container = getContainer();
      }

      // Get use case from container
      const equipmentUseCase = this.container.resolve('providerEquipmentUseCase');
      
      // Execute use case
      const performanceData = await equipmentUseCase.getEquipmentPerformance(parseInt(id), providerCompanyId, filters);

      return ResponseHandler.success(res, performanceData, 'Equipment performance data retrieved successfully');
    } catch (error) {
      console.error('Error in ProviderEquipmentsController.getEquipmentPerformance:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // Legacy method names for backward compatibility
  async index(req, res) {
    return this.getEquipments(req, res);
  }

  async show(req, res) {
    return this.getEquipmentById(req, res);
  }

  async create(req, res) {
    return this.createEquipment(req, res);
  }

  async update(req, res) {
    return this.updateEquipment(req, res);
  }

  async destroy(req, res) {
    return this.deleteEquipment(req, res);
  }
}

module.exports = ProviderEquipmentsController;
