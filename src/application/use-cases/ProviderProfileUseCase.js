/**
 * Use Case: Provider Profile Management
 * Gestiona el perfil y configuración de PROVIDER
 */
class ProviderProfileUseCase {
  constructor(userRepository, companyRepository, settingsRepository, statisticsRepository, fileUploadService) {
    this.userRepository = userRepository;
    this.companyRepository = companyRepository;
    this.settingsRepository = settingsRepository;
    this.statisticsRepository = statisticsRepository;
    this.fileUploadService = fileUploadService;
  }

  /**
   * Obtener perfil completo del provider
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la compañía
   * @returns {Object} Datos completos del perfil
   */
  async getProfile(userId, companyId) {
    try {
      // Obtener datos del usuario
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Obtener datos de la compañía
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new Error('Compañía no encontrada');
      }

      // Obtener configuraciones
      let settings = {};
      if (this.settingsRepository) {
        try {
          settings = await this.settingsRepository.getProviderSettings(companyId);
        } catch (error) {
          console.warn('Warning: Could not fetch provider settings:', error.message);
          settings = {}; // Default empty settings
        }
      } else {
        console.warn('Warning: settingsRepository not available, using default settings');
        settings = {
          // Default settings structure
          operatingHours: {},
          serviceRadius: 50,
          emergencyService: false,
          autoAcceptOrders: false,
          minimumOrderValue: 0,
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          marketingEmails: false,
          reportFrequency: 'monthly',
          defaultHourlyRate: 0,
          emergencyRateMultiplier: 1.5,
          minimumCalloutFee: 0,
          travelRatePerKm: 0,
          requirePhotoEvidence: false,
          customerApprovalRequired: true,
          qualityChecklistRequired: false,
          followUpPeriod: 7
        };
      }

      // Obtener estadísticas
      let statistics = {};
      if (this.statisticsRepository) {
        try {
          statistics = await this.statisticsRepository.getProviderStatistics(companyId);
        } catch (error) {
          console.warn('Warning: Could not fetch provider statistics:', error.message);
          statistics = {}; // Default empty statistics
        }
      } else {
        console.warn('Warning: statisticsRepository not available, using default statistics');
        statistics = {
          // Default statistics structure
          totalServiceRequests: 0,
          completedServiceRequests: 0,
          pendingServiceRequests: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalClients: 0,
          activeContracts: 0,
          equipmentManaged: 0,
          responseTime: {
            average: 0,
            target: 24
          },
          completionRate: 0,
          customerSatisfaction: 0
        };
      }

      // Obtener certificaciones
      let certifications = [];
      try {
        if (this.companyRepository.getCertifications) {
          certifications = await this.companyRepository.getCertifications(companyId);
        } else {
          console.warn('Warning: getCertifications method not available in companyRepository');
          certifications = [];
        }
      } catch (error) {
        console.warn('Warning: Could not fetch certifications:', error.message);
        certifications = [];
      }

      // Obtener miembros del equipo
      let team = [];
      try {
        if (this.userRepository.getTeamMembers) {
          team = await this.userRepository.getTeamMembers(companyId);
        } else {
          console.warn('Warning: getTeamMembers method not available in userRepository');
          team = [];
        }
      } catch (error) {
        console.warn('Warning: Could not fetch team members:', error.message);
        team = [];
      }

      return {
        user,
        company,
        settings,
        statistics,
        certifications,
        team
      };
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.getProfile:', error);
      throw new Error(error.message || 'Error al obtener el perfil');
    }
  }

  /**
   * Actualizar información del usuario
   * @param {string} userId - ID del usuario
   * @param {Object} userData - Datos del usuario a actualizar
   * @returns {Object} Usuario actualizado
   */
  async updateUser(userId, userData) {
    try {
      const {
        firstName,
        lastName,
        phone,
        position,
        language,
        timezone,
        dateFormat,
        notificationPreferences,
        updatedBy
      } = userData;

      // Validar datos
      if (firstName && firstName.trim().length < 2) {
        throw new Error('El nombre debe tener al menos 2 caracteres');
      }

      if (lastName && lastName.trim().length < 2) {
        throw new Error('El apellido debe tener al menos 2 caracteres');
      }

      if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
        throw new Error('Formato de teléfono no válido');
      }

      // Preparar datos de actualización
      const updateData = {
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(position && { position: position.trim() }),
        ...(language && { language }),
        ...(timezone && { timezone }),
        ...(dateFormat && { dateFormat }),
        ...(notificationPreferences && { notificationPreferences }),
        updatedAt: new Date().toISOString(),
        updatedBy
      };

      await this.userRepository.update(userId, updateData);
      
      return await this.userRepository.findById(userId);
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.updateUser:', error);
      throw new Error(error.message || 'Error al actualizar el usuario');
    }
  }

  /**
   * Actualizar información de la compañía
   * @param {string} companyId - ID de la compañía
   * @param {Object} companyData - Datos de la compañía a actualizar
   * @returns {Object} Compañía actualizada
   */
  async updateCompany(companyId, companyData) {
    try {
      const {
        name,
        description,
        phone,
        website,
        address,
        city,
        state,
        postalCode,
        businessType,
        industry,
        employeeCount,
        serviceArea,
        bankAccount,
        taxNumber,
        billingAddress,
        paymentTerms,
        slogan,
        primaryColor,
        secondaryColor,
        updatedBy
      } = companyData;

      // Validaciones
      if (name && name.trim().length < 3) {
        throw new Error('El nombre de la compañía debe tener al menos 3 caracteres');
      }

      if (website && !this.isValidUrl(website)) {
        throw new Error('URL del sitio web no válida');
      }

      if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
        throw new Error('Formato de teléfono no válido');
      }

      // Preparar datos de actualización
      const updateData = {
        ...(name && { name: name.trim() }),
        ...(description && { description: description.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(website && { website: website.trim() }),
        ...(address && { address: address.trim() }),
        ...(city && { city: city.trim() }),
        ...(state && { state: state.trim() }),
        ...(postalCode && { postalCode: postalCode.trim() }),
        ...(businessType && { businessType }),
        ...(industry && { industry }),
        ...(employeeCount && { employeeCount: parseInt(employeeCount) }),
        ...(serviceArea && { serviceArea }),
        ...(bankAccount && { bankAccount: bankAccount.trim() }),
        ...(taxNumber && { taxNumber: taxNumber.trim() }),
        ...(billingAddress && { billingAddress: billingAddress.trim() }),
        ...(paymentTerms && { paymentTerms }),
        ...(slogan && { slogan: slogan.trim() }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        updatedAt: new Date().toISOString(),
        updatedBy
      };

      await this.companyRepository.update(companyId, updateData);
      
      return await this.companyRepository.findById(companyId);
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.updateCompany:', error);
      throw new Error(error.message || 'Error al actualizar la compañía');
    }
  }

  /**
   * Actualizar configuraciones del provider
   * @param {string} companyId - ID de la compañía
   * @param {Object} settingsData - Configuraciones a actualizar
   * @returns {Object} Configuraciones actualizadas
   */
  async updateSettings(companyId, settingsData) {
    try {
      const {
        operatingHours,
        serviceRadius,
        emergencyService,
        autoAcceptOrders,
        minimumOrderValue,
        emailNotifications,
        smsNotifications,
        pushNotifications,
        marketingEmails,
        reportFrequency,
        defaultHourlyRate,
        emergencyRateMultiplier,
        minimumCalloutFee,
        travelRatePerKm,
        requirePhotoEvidence,
        customerApprovalRequired,
        qualityChecklistRequired,
        followUpPeriod,
        updatedBy
      } = settingsData;

      // Validaciones
      if (serviceRadius && (serviceRadius < 1 || serviceRadius > 500)) {
        throw new Error('El radio de servicio debe estar entre 1 y 500 km');
      }

      if (minimumOrderValue && minimumOrderValue < 0) {
        throw new Error('El valor mínimo de orden no puede ser negativo');
      }

      if (defaultHourlyRate && defaultHourlyRate < 0) {
        throw new Error('La tarifa por hora no puede ser negativa');
      }

      // Preparar datos de configuración
      const settings = {
        ...(operatingHours && { operatingHours }),
        ...(serviceRadius !== undefined && { serviceRadius: parseInt(serviceRadius) }),
        ...(emergencyService !== undefined && { emergencyService: Boolean(emergencyService) }),
        ...(autoAcceptOrders !== undefined && { autoAcceptOrders: Boolean(autoAcceptOrders) }),
        ...(minimumOrderValue !== undefined && { minimumOrderValue: parseFloat(minimumOrderValue) }),
        ...(emailNotifications !== undefined && { emailNotifications: Boolean(emailNotifications) }),
        ...(smsNotifications !== undefined && { smsNotifications: Boolean(smsNotifications) }),
        ...(pushNotifications !== undefined && { pushNotifications: Boolean(pushNotifications) }),
        ...(marketingEmails !== undefined && { marketingEmails: Boolean(marketingEmails) }),
        ...(reportFrequency && { reportFrequency }),
        ...(defaultHourlyRate !== undefined && { defaultHourlyRate: parseFloat(defaultHourlyRate) }),
        ...(emergencyRateMultiplier !== undefined && { emergencyRateMultiplier: parseFloat(emergencyRateMultiplier) }),
        ...(minimumCalloutFee !== undefined && { minimumCalloutFee: parseFloat(minimumCalloutFee) }),
        ...(travelRatePerKm !== undefined && { travelRatePerKm: parseFloat(travelRatePerKm) }),
        ...(requirePhotoEvidence !== undefined && { requirePhotoEvidence: Boolean(requirePhotoEvidence) }),
        ...(customerApprovalRequired !== undefined && { customerApprovalRequired: Boolean(customerApprovalRequired) }),
        ...(qualityChecklistRequired !== undefined && { qualityChecklistRequired: Boolean(qualityChecklistRequired) }),
        ...(followUpPeriod !== undefined && { followUpPeriod: parseInt(followUpPeriod) }),
        updatedAt: new Date().toISOString(),
        updatedBy
      };

      if (!this.settingsRepository) {
        throw new Error('Settings repository not available. Cannot update settings.');
      }

      await this.settingsRepository.updateProviderSettings(companyId, settings);
      
      return await this.settingsRepository.getProviderSettings(companyId);
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.updateSettings:', error);
      throw new Error(error.message || 'Error al actualizar las configuraciones');
    }
  }

  /**
   * Actualizar perfil completo (usuario y compañía)
   * @param {string} userId - ID del usuario
   * @param {string} companyId - ID de la compañía
   * @param {Object} updateData - Datos de actualización con campos de usuario y compañía
   * @returns {Object} Perfil actualizado completo
   */
  async updateProfile(userId, companyId, updateData) {
    try {
      const { user: userData = {}, company: companyData = {} } = updateData;

      // Actualizar datos del usuario si se proporcionaron
      if (Object.keys(userData).length > 0) {
        await this.updateUser(userId, userData);
      }

      // Actualizar datos de la compañía si se proporcionaron  
      if (Object.keys(companyData).length > 0) {
        await this.updateCompany(companyId, companyData);
      }

      // Obtener el perfil actualizado completo
      return await this.getProfile(userId, companyId);
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.updateProfile:', error);
      throw new Error(error.message || 'Error al actualizar el perfil');
    }
  }

  /**
   * Cambiar contraseña del usuario
   * @param {string} userId - ID del usuario
   * @param {Object} passwordData - Datos de la contraseña
   * @returns {boolean} Éxito de la operación
   */
  async changePassword(userId, passwordData) {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      // Validaciones
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Todos los campos de contraseña son requeridos');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('La nueva contraseña y la confirmación no coinciden');
      }

      if (newPassword.length < 8) {
        throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new Error('La nueva contraseña debe contener al menos una letra minúscula, una mayúscula y un número');
      }

      // Verificar contraseña actual
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const isCurrentPasswordValid = await this.userRepository.verifyPassword(userId, currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('La contraseña actual es incorrecta');
      }

      // Actualizar contraseña
      await this.userRepository.updatePassword(userId, newPassword);

      return true;
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.changePassword:', error);
      throw new Error(error.message || 'Error al cambiar la contraseña');
    }
  }

  /**
   * Subir logo de la compañía
   * @param {string} companyId - ID de la compañía
   * @param {Object} file - Archivo de imagen
   * @returns {Object} URL del logo subido
   */
  async uploadLogo(companyId, file) {
    try {
      // Validar archivo
      if (!file) {
        throw new Error('No se proporcionó archivo');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('Tipo de archivo no válido. Solo se permiten JPEG, PNG y GIF');
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande. Máximo 5MB');
      }

      if (!this.fileUploadService) {
        throw new Error('File upload service not available. Cannot upload logo.');
      }

      // Subir archivo
      const uploadResult = await this.fileUploadService.uploadCompanyLogo(companyId, file);

      // Actualizar URL del logo en la compañía
      await this.companyRepository.update(companyId, {
        logoUrl: uploadResult.url,
        updatedAt: new Date().toISOString()
      });

      return {
        url: uploadResult.url,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.uploadLogo:', error);
      throw new Error(error.message || 'Error al subir el logo');
    }
  }

  /**
   * Agregar certificación
   * @param {string} companyId - ID de la compañía
   * @param {Object} certificationData - Datos de la certificación
   * @returns {Object} Certificación agregada
   */
  async addCertification(companyId, certificationData) {
    try {
      const {
        name,
        issuer,
        number,
        type,
        level,
        issueDate,
        expiryDate,
        verificationUrl,
        attachments = [],
        addedBy
      } = certificationData;

      // Validaciones
      if (!name || name.trim().length < 3) {
        throw new Error('El nombre de la certificación debe tener al menos 3 caracteres');
      }

      if (!issuer || issuer.trim().length < 3) {
        throw new Error('El emisor debe tener al menos 3 caracteres');
      }

      if (expiryDate && new Date(expiryDate) <= new Date(issueDate)) {
        throw new Error('La fecha de vencimiento debe ser posterior a la fecha de emisión');
      }

      // Crear certificación
      const certification = {
        companyId,
        name: name.trim(),
        issuer: issuer.trim(),
        number: number ? number.trim() : null,
        type,
        level,
        issueDate,
        expiryDate,
        verificationUrl: verificationUrl ? verificationUrl.trim() : null,
        attachments,
        status: 'active',
        addedBy,
        createdAt: new Date().toISOString()
      };

      const certificationId = await this.companyRepository.addCertification(certification);
      
      return await this.companyRepository.getCertificationById(certificationId);
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.addCertification:', error);
      throw new Error(error.message || 'Error al agregar la certificación');
    }
  }

  /**
   * Obtener estadísticas del perfil
   * @param {string} companyId - ID de la compañía
   * @param {Object} options - Opciones para las estadísticas
   * @returns {Object} Estadísticas del perfil
   */
  async getProfileStatistics(companyId, options = {}) {
    try {
      const { period = '12months', includeTeam = true } = options;

      // Estadísticas principales
      const statistics = await this.statisticsRepository.getProviderStatistics(companyId, { period });

      // Estadísticas del equipo si se solicita
      let teamStatistics = null;
      if (includeTeam) {
        teamStatistics = await this.statisticsRepository.getTeamStatistics(companyId, { period });
      }

      // Calcular métricas adicionales
      const additionalMetrics = await this.calculateAdditionalMetrics(companyId, period);

      return {
        ...statistics,
        teamStatistics,
        ...additionalMetrics,
        period,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.getProfileStatistics:', error);
      throw new Error('Error al obtener las estadísticas del perfil');
    }
  }

  // Métodos auxiliares

  /**
   * Validar URL
   * @param {string} url - URL a validar
   * @returns {boolean} Es válida la URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calcular métricas adicionales
   * @param {string} companyId - ID de la compañía
   * @param {string} period - Período de cálculo
   * @returns {Object} Métricas adicionales
   */
  async calculateAdditionalMetrics(companyId, period) {
    try {
      // Métricas de eficiencia
      const efficiency = await this.statisticsRepository.getEfficiencyMetrics(companyId, period);

      // Métricas de calidad
      const quality = await this.statisticsRepository.getQualityMetrics(companyId, period);

      // Métricas de crecimiento
      const growth = await this.statisticsRepository.getGrowthMetrics(companyId, period);

      return {
        efficiency,
        quality,
        growth
      };
    } catch (error) {
      console.error('Error calculating additional metrics:', error);
      return {
        efficiency: {},
        quality: {},
        growth: {}
      };
    }
  }

  /**
   * Validar configuraciones de horarios
   * @param {Object} operatingHours - Horarios de operación
   * @returns {boolean} Son válidos los horarios
   */
  validateOperatingHours(operatingHours) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      const schedule = operatingHours[day];
      if (!schedule) continue;

      if (!schedule.closed && (!schedule.open || !schedule.close)) {
        throw new Error(`Horarios incompletos para ${day}`);
      }

      if (!schedule.closed && schedule.open >= schedule.close) {
        throw new Error(`Horario de apertura debe ser anterior al de cierre para ${day}`);
      }
    }

    return true;
  }

  /**
   * Generar reporte de perfil
   * @param {string} companyId - ID de la compañía
   * @param {Object} options - Opciones del reporte
   * @returns {Object} Datos del reporte
   */
  async generateProfileReport(companyId, options = {}) {
    try {
      const { format = 'json', includeTeam = true, period = '12months' } = options;

      // Obtener datos completos del perfil
      const profile = await this.getProfile(null, companyId);
      
      // Obtener estadísticas detalladas
      const statistics = await this.getProfileStatistics(companyId, { period, includeTeam });

      const reportData = {
        profile,
        statistics,
        generatedAt: new Date().toISOString(),
        period,
        format
      };

      if (format === 'pdf') {
        // Generar PDF si el servicio está disponible
        if (this.fileUploadService?.generatePDF) {
          return await this.fileUploadService.generatePDF(reportData, 'provider-profile');
        }
      }

      return reportData;
    } catch (error) {
      console.error('Error in ProviderProfileUseCase.generateProfileReport:', error);
      throw new Error('Error al generar el reporte del perfil');
    }
  }
}

module.exports = ProviderProfileUseCase;
