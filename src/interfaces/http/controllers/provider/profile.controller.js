/**
 * Controller: Provider Profile Management  
 * Handles PROVIDER profile operations
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProviderProfileController {
  constructor(container) {
    this.container = container;
    this.profileUseCase = container.resolve('providerProfileUseCase');
    this.ResponseDTO = container.resolve('ProviderProfileResponseDTO');
    this.logger = container.resolve('logger');
  }

  /**
   * Get complete provider profile
   * GET /api/provider/profile
   */
  async getProfile(req, res) {
    try {
      const providerId = req.user.companyId;
      const userId = req.user.userId;

      const profileData = await this.profileUseCase.getProviderProfile(providerId, userId);
      const formattedResult = this.ResponseDTO.formatProfileDetails(profileData);

      return ResponseHandler.success(res, formattedResult, 'Perfil del proveedor obtenido exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.getProfile error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Update provider profile
   * PUT /api/provider/profile
   */
  async updateProfile(req, res) {
    try {
      const providerId = req.user.companyId;
      const userId = req.user.userId;
      const {
        // Company data
        companyName,
        companyDescription,
        companyPhone,
        companyEmail,
        companyWebsite,
        companyAddress,
        companyCity,
        companyState,
        companyCountry,
        companyPostalCode,
        // Service areas
        serviceRadius,
        serviceAreas = [],
        specializations = [],
        // Business data
        businessHours = {},
        emergencyAvailable = false,
        emergencyHours = {},
        // User data
        firstName,
        lastName,
        email,
        phone,
        position,
        department
      } = req.body;

      const updateData = {
        company: {
          ...(companyName && { name: companyName.trim() }),
          ...(companyDescription !== undefined && { description: companyDescription.trim() }),
          ...(companyPhone && { phone: companyPhone.trim() }),
          ...(companyEmail && { email: companyEmail.trim() }),
          ...(companyWebsite !== undefined && { website: companyWebsite.trim() }),
          ...(companyAddress !== undefined && { address: companyAddress.trim() }),
          ...(companyCity !== undefined && { city: companyCity.trim() }),
          ...(companyState !== undefined && { state: companyState.trim() }),
          ...(companyCountry !== undefined && { country: companyCountry.trim() }),
          ...(companyPostalCode !== undefined && { postalCode: companyPostalCode.trim() }),
          ...(serviceRadius && { serviceRadius: parseFloat(serviceRadius) }),
          ...(serviceAreas.length && { serviceAreas }),
          ...(specializations.length && { specializations }),
          ...(Object.keys(businessHours).length && { businessHours }),
          ...(emergencyAvailable !== undefined && { emergencyAvailable }),
          ...(Object.keys(emergencyHours).length && { emergencyHours })
        },
        user: {
          ...(firstName && { firstName: firstName.trim() }),
          ...(lastName && { lastName: lastName.trim() }),
          ...(email && { email: email.trim() }),
          ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
          ...(position !== undefined && { position: position ? position.trim() : null }),
          ...(department !== undefined && { department: department ? department.trim() : null })
        },
        updatedBy: userId
      };

      const result = await this.profileUseCase.updateProviderProfile(providerId, userId, updateData);
      const formattedResult = this.ResponseDTO.formatProfileDetails(result);

      return ResponseHandler.success(res, formattedResult, 'Perfil actualizado exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.updateProfile error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ProviderProfileController;
