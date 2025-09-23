/**
 * Controller: Provider Equipment Management
 * Handles PROVIDER equipment operations
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderEquipmentsController {
  constructor(container) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  /**
   * Get equipment list with filtering
   * GET /api/provider/equipments
   */
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

  /**
   * Get equipment details by ID
   * GET /api/provider/equipments/:id
   */
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

  /**
   * Update equipment information
   * PUT /api/provider/equipments/:id
   */
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
}

module.exports = ProviderEquipmentsController;
