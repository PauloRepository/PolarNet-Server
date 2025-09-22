/**
 * Controller: Provider Profile Management  
 * Handles PROVIDER profile operations using DDD architecture
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

  /**
   * Get profile settings
   * GET /api/provider/profile/settings
   */
  async getSettings(req, res) {
    try {
      const providerId = req.user.companyId;
      const userId = req.user.userId;

      const settingsData = await this.profileUseCase.getProviderSettings(providerId, userId);
      const formattedResult = this.ResponseDTO.formatProfileSettings(settingsData);

      return ResponseHandler.success(res, formattedResult, 'Configuraciones obtenidas exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.getSettings error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Update profile settings
   * PUT /api/provider/profile/settings
   */
  async updateSettings(req, res) {
    try {
      const providerId = req.user.companyId;
      const userId = req.user.userId;
      const {
        // Notification settings
        emailNotifications = {},
        smsNotifications = {},
        pushNotifications = {},
        // System preferences
        language = 'es',
        timezone = 'America/Mexico_City',
        dateFormat = 'DD/MM/YYYY',
        timeFormat = '24h',
        currency = 'MXN',
        // Privacy settings
        profileVisibility = 'PUBLIC',
        contactInfoVisibility = 'CLIENTS_ONLY',
        // Business settings
        autoAcceptRequests = false,
        requireApprovalForExpensiveServices = true,
        defaultServiceRadius = 50,
        workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        workingHours = { start: '08:00', end: '18:00' }
      } = req.body;

      const settingsData = {
        notifications: {
          email: emailNotifications,
          sms: smsNotifications,
          push: pushNotifications
        },
        preferences: {
          language,
          timezone,
          dateFormat,
          timeFormat,
          currency
        },
        privacy: {
          profileVisibility,
          contactInfoVisibility
        },
        business: {
          autoAcceptRequests,
          requireApprovalForExpensiveServices,
          defaultServiceRadius: parseFloat(defaultServiceRadius),
          workingDays,
          workingHours
        },
        updatedBy: userId
      };

      const result = await this.profileUseCase.updateProviderSettings(providerId, userId, settingsData);
      const formattedResult = this.ResponseDTO.formatProfileSettings(result);

      return ResponseHandler.success(res, formattedResult, 'Configuraciones actualizadas exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.updateSettings error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Change password
   * PUT /api/provider/profile/password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const {
        currentPassword,
        newPassword,
        confirmPassword
      } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return ResponseHandler.error(res, 'Contraseña actual, nueva contraseña y confirmación son requeridas', 400);
      }

      if (newPassword !== confirmPassword) {
        return ResponseHandler.error(res, 'Las contraseñas no coinciden', 400);
      }

      if (newPassword.length < 8) {
        return ResponseHandler.error(res, 'La nueva contraseña debe tener al menos 8 caracteres', 400);
      }

      const passwordData = {
        currentPassword,
        newPassword
      };

      await this.profileUseCase.changePassword(userId, passwordData);

      return ResponseHandler.success(res, { changed: true }, 'Contraseña cambiada exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.changePassword error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get profile statistics and insights
   * GET /api/provider/profile/insights
   */
  async getInsights(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        period = '12months',
        includeComparison = true
      } = req.query;

      const filters = {
        period,
        includeComparison: includeComparison === 'true'
      };

      const insightsData = await this.profileUseCase.getProviderInsights(providerId, filters);
      const formattedResult = this.ResponseDTO.formatProfileInsights(insightsData);

      return ResponseHandler.success(res, formattedResult, 'Análisis del perfil obtenido exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.getInsights error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Add or update certification
   * POST /api/provider/profile/certifications
   */
  async addCertification(req, res) {
    try {
      const providerId = req.user.companyId;
      const userId = req.user.userId;
      const {
        certificationName,
        certificationBody,
        certificationNumber,
        issueDate,
        expiryDate,
        description = '',
        attachmentUrl = ''
      } = req.body;

      if (!certificationName || !certificationBody || !issueDate) {
        return ResponseHandler.error(res, 'Nombre, organismo emisor y fecha de emisión son requeridos', 400);
      }

      const certificationData = {
        certificationName: certificationName.trim(),
        certificationBody: certificationBody.trim(),
        certificationNumber: certificationNumber ? certificationNumber.trim() : null,
        issueDate,
        expiryDate,
        description: description.trim(),
        attachmentUrl: attachmentUrl.trim(),
        addedBy: userId
      };

      const result = await this.profileUseCase.addCertification(providerId, certificationData);
      const formattedResult = this.ResponseDTO.formatCertification(result);

      return ResponseHandler.success(res, formattedResult, 'Certificación agregada exitosamente', 201);
    } catch (error) {
      console.error('ProviderProfileController.addCertification error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Remove certification
   * DELETE /api/provider/profile/certifications/:id
   */
  async removeCertification(req, res) {
    try {
      const providerId = req.user.companyId;
      const { id: certificationId } = req.params;

      if (!certificationId) {
        return ResponseHandler.error(res, 'ID de certificación requerido', 400);
      }

      await this.profileUseCase.removeCertification(providerId, certificationId);

      return ResponseHandler.success(res, { deleted: true }, 'Certificación eliminada exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.removeCertification error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Get team members
   * GET /api/provider/profile/team
   */
  async getTeamMembers(req, res) {
    try {
      const providerId = req.user.companyId;
      const {
        page = 1,
        limit = 20,
        role = '',
        department = '',
        status = 'ACTIVE'
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        role,
        department,
        status
      };

      const teamData = await this.profileUseCase.getTeamMembers(providerId, filters);
      const formattedResult = this.ResponseDTO.formatTeamMembers(teamData);

      return ResponseHandler.success(res, formattedResult, 'Miembros del equipo obtenidos exitosamente');
    } catch (error) {
      console.error('ProviderProfileController.getTeamMembers error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  /**
   * Add team member
   * POST /api/provider/profile/team
   */
  async addTeamMember(req, res) {
    try {
      const providerId = req.user.companyId;
      const userId = req.user.userId;
      const {
        firstName,
        lastName,
        email,
        phone,
        role = 'TECHNICIAN',
        department,
        position,
        specializations = [],
        permissions = []
      } = req.body;

      if (!firstName || !lastName || !email) {
        return ResponseHandler.error(res, 'Nombre, apellido y email son requeridos', 400);
      }

      const memberData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : null,
        role,
        department: department ? department.trim() : null,
        position: position ? position.trim() : null,
        specializations,
        permissions,
        addedBy: userId
      };

      const result = await this.profileUseCase.addTeamMember(providerId, memberData);
      const formattedResult = this.ResponseDTO.formatTeamMember(result);

      return ResponseHandler.success(res, formattedResult, 'Miembro del equipo agregado exitosamente', 201);
    } catch (error) {
      console.error('ProviderProfileController.addTeamMember error:', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // Legacy method aliases for compatibility with existing routes
  async index(req, res) { return this.getProfile(req, res); }
  async update(req, res) { return this.updateProfile(req, res); }
}

module.exports = ProviderProfileController;
