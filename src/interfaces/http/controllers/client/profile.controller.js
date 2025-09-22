const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProfileController {
  constructor(container) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  // GET /api/client/profile - Obtener perfil del cliente usando DDD
  async getProfile(req, res) {
    try {
      const { clientCompanyId, id: userId } = req.user;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting client profile', { clientCompanyId, userId });

      // Get repositories
      const userRepository = this.container.resolve('userRepository');
      const companyRepository = this.container.resolve('companyRepository');

      // Get user and company info
      const user = await userRepository.findById(userId);
      const company = await companyRepository.findById(clientCompanyId);

      if (!user || !company) {
        return ResponseHandler.error(res, 'Profile not found', 404);
      }

      const profile = {
        user: {
          userId: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
          status: user.status,
          preferences: user.preferences || {}
        },
        company: {
          companyId: company.id.toString(),
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          taxId: company.taxId,
          contactPerson: company.contactPerson,
          website: company.website,
          industry: company.industry,
          description: company.description,
          logo: company.logo,
          status: company.status,
          registrationDate: company.createdAt
        }
      };

      return ResponseHandler.success(res, profile, 'Profile retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getProfile', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // PUT /api/client/profile - Actualizar perfil usando DDD
  async updateProfile(req, res) {
    try {
      const { clientCompanyId, id: userId } = req.user;
      const {
        userUpdates = {},
        companyUpdates = {}
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Updating client profile', { clientCompanyId, userId });

      // Get repositories
      const userRepository = this.container.resolve('userRepository');
      const companyRepository = this.container.resolve('companyRepository');

      let updatedUser = null;
      let updatedCompany = null;

      // Update user if user updates provided
      if (Object.keys(userUpdates).length > 0) {
        updatedUser = await userRepository.update(userId, userUpdates);
      }

      // Update company if company updates provided
      if (Object.keys(companyUpdates).length > 0) {
        updatedCompany = await companyRepository.update(clientCompanyId, companyUpdates);
      }

      // Get fresh data
      const user = updatedUser || await userRepository.findById(userId);
      const company = updatedCompany || await companyRepository.findById(clientCompanyId);

      const updatedProfile = {
        user: {
          userId: user.id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          preferences: user.preferences || {}
        },
        company: {
          companyId: company.id.toString(),
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          contactPerson: company.contactPerson,
          website: company.website,
          industry: company.industry,
          description: company.description,
          logo: company.logo
        }
      };

      return ResponseHandler.success(res, updatedProfile, 'Profile updated successfully');

    } catch (error) {
      this.logger?.error('Error in updateProfile', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/profile/locations - Obtener ubicaciones usando DDD
  async getLocations(req, res) {
    try {
      const { clientCompanyId } = req.user;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting client locations', { clientCompanyId });

      // Get repository
      const equipmentLocationRepository = this.container.resolve('equipmentLocationRepository');

      // Get locations for client company
      const locations = await equipmentLocationRepository.findByCompany(clientCompanyId);

      const formattedLocations = locations.map(location => ({
        locationId: location.id.toString(),
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country,
        contactPerson: location.contactPerson,
        phone: location.phone,
        email: location.email,
        operatingHours: location.operatingHours,
        specialInstructions: location.specialInstructions,
        isActive: location.isActive,
        equipmentCount: location.getEquipmentCount(),
        coordinates: location.coordinates,
        createdAt: location.createdAt
      }));

      return ResponseHandler.success(res, {
        locations: formattedLocations,
        total: formattedLocations.length
      }, 'Locations retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getLocations', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // POST /api/client/profile/locations - Crear ubicación usando DDD
  async createLocation(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const {
        name,
        address,
        city,
        state,
        postalCode,
        country,
        contactPerson,
        phone,
        email,
        operatingHours,
        specialInstructions,
        coordinates
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Creating location', { clientCompanyId, name });

      // Get use case
      const createLocationUseCase = this.container.resolve('createEquipmentLocation');

      // Create location
      const location = await createLocationUseCase.execute({
        companyId: clientCompanyId,
        name,
        address,
        city,
        state,
        postalCode,
        country,
        contactPerson,
        phone,
        email,
        operatingHours,
        specialInstructions,
        coordinates
      });

      return ResponseHandler.success(res, {
        locationId: location.id.toString(),
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country,
        contactPerson: location.contactPerson,
        phone: location.phone,
        email: location.email,
        isActive: location.isActive,
        createdAt: location.createdAt
      }, 'Location created successfully', 201);

    } catch (error) {
      this.logger?.error('Error in createLocation', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // PUT /api/client/profile/locations/:locationId - Actualizar ubicación usando DDD
  async updateLocation(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { locationId } = req.params;
      const updateData = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Updating location', { clientCompanyId, locationId });

      // Get repository
      const equipmentLocationRepository = this.container.resolve('equipmentLocationRepository');

      // Verify location belongs to client
      const location = await equipmentLocationRepository.findById(locationId);
      if (!location || location.companyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Location not found', 404);
      }

      // Update location
      const updatedLocation = await equipmentLocationRepository.update(locationId, updateData);

      return ResponseHandler.success(res, {
        locationId: updatedLocation.id.toString(),
        name: updatedLocation.name,
        address: updatedLocation.address,
        city: updatedLocation.city,
        state: updatedLocation.state,
        contactPerson: updatedLocation.contactPerson,
        phone: updatedLocation.phone,
        email: updatedLocation.email,
        isActive: updatedLocation.isActive,
        updatedAt: updatedLocation.updatedAt
      }, 'Location updated successfully');

    } catch (error) {
      this.logger?.error('Error in updateLocation', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // DELETE /api/client/profile/locations/:locationId - Eliminar ubicación usando DDD
  async deleteLocation(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { locationId } = req.params;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Deleting location', { clientCompanyId, locationId });

      // Get repositories
      const equipmentLocationRepository = this.container.resolve('equipmentLocationRepository');
      const equipmentRepository = this.container.resolve('equipmentRepository');

      // Verify location belongs to client
      const location = await equipmentLocationRepository.findById(locationId);
      if (!location || location.companyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'Location not found', 404);
      }

      // Check if location has active equipment
      const equipmentCount = await equipmentRepository.countByLocation(locationId);
      if (equipmentCount > 0) {
        return ResponseHandler.error(res, 'Cannot delete location with active equipment', 400);
      }

      // Soft delete location
      await equipmentLocationRepository.softDelete(locationId);

      return ResponseHandler.success(res, {
        locationId: locationId,
        deleted: true,
        deletedAt: new Date()
      }, 'Location deleted successfully');

    } catch (error) {
      this.logger?.error('Error in deleteLocation', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/profile/users - Obtener usuarios de la empresa usando DDD
  async getUsers(req, res) {
    try {
      const { clientCompanyId } = req.user;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting company users', { clientCompanyId });

      // Get repository
      const userRepository = this.container.resolve('userRepository');

      // Get company users
      const users = await userRepository.findByCompany(clientCompanyId);

      const formattedUsers = users.map(user => ({
        userId: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        avatar: user.avatar,
        permissions: user.permissions || []
      }));

      return ResponseHandler.success(res, {
        users: formattedUsers,
        total: formattedUsers.length
      }, 'Company users retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getUsers', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // POST /api/client/profile/users/invite - Invitar usuario usando DDD
  async inviteUser(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const {
        email,
        name,
        role = 'USER',
        permissions = []
      } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Inviting user', { clientCompanyId, email, role });

      // Get use case
      const inviteUserUseCase = this.container.resolve('inviteCompanyUser');

      // Invite user
      const invitation = await inviteUserUseCase.execute({
        companyId: clientCompanyId,
        email,
        name,
        role,
        permissions,
        invitedBy: req.user.id
      });

      return ResponseHandler.success(res, {
        invitationId: invitation.id.toString(),
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        status: invitation.status,
        invitedAt: invitation.invitedAt,
        expiresAt: invitation.expiresAt
      }, 'User invitation sent successfully', 201);

    } catch (error) {
      this.logger?.error('Error in inviteUser', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // PUT /api/client/profile/users/:userId/status - Actualizar estado de usuario usando DDD
  async updateUserStatus(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { userId } = req.params;
      const { status, role, permissions } = req.body;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Updating user status', { clientCompanyId, userId, status });

      // Get repository
      const userRepository = this.container.resolve('userRepository');

      // Verify user belongs to company
      const user = await userRepository.findById(userId);
      if (!user || user.companyId !== clientCompanyId) {
        return ResponseHandler.error(res, 'User not found', 404);
      }

      // Update user
      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (role !== undefined) updateData.role = role;
      if (permissions !== undefined) updateData.permissions = permissions;

      const updatedUser = await userRepository.update(userId, updateData);

      return ResponseHandler.success(res, {
        userId: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        status: updatedUser.status,
        role: updatedUser.role,
        permissions: updatedUser.permissions,
        updatedAt: updatedUser.updatedAt
      }, 'User status updated successfully');

    } catch (error) {
      this.logger?.error('Error in updateUserStatus', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/profile/activity - Obtener actividad de la empresa usando DDD
  async getCompanyActivity(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 50,
        dateFrom,
        dateTo,
        activityType
      } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting company activity', { clientCompanyId, page, limit });

      // Get repositories
      const userRepository = this.container.resolve('userRepository');
      const serviceRequestRepository = this.container.resolve('serviceRequestRepository');
      const invoiceRepository = this.container.resolve('invoiceRepository');

      // Build filters
      const filters = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);

      const activities = [];

      // Get user activities
      if (!activityType || activityType === 'user') {
        const userActivities = await userRepository.getCompanyActivity(clientCompanyId, filters);
        userActivities.forEach(activity => {
          activities.push({
            type: 'user_activity',
            id: activity.id.toString(),
            description: activity.description,
            userId: activity.userId.toString(),
            userName: activity.userName,
            timestamp: activity.timestamp,
            details: activity.details
          });
        });
      }

      // Get service request activities
      if (!activityType || activityType === 'service_request') {
        const serviceActivities = await serviceRequestRepository.getCompanyActivity(clientCompanyId, filters);
        serviceActivities.forEach(activity => {
          activities.push({
            type: 'service_request',
            id: activity.id.toString(),
            description: activity.description,
            serviceRequestId: activity.serviceRequestId.toString(),
            status: activity.status,
            timestamp: activity.timestamp,
            details: activity.details
          });
        });
      }

      // Get invoice activities
      if (!activityType || activityType === 'invoice') {
        const invoiceActivities = await invoiceRepository.getCompanyActivity(clientCompanyId, filters);
        invoiceActivities.forEach(activity => {
          activities.push({
            type: 'invoice',
            id: activity.id.toString(),
            description: activity.description,
            invoiceId: activity.invoiceId.toString(),
            amount: activity.amount,
            timestamp: activity.timestamp,
            details: activity.details
          });
        });
      }

      // Sort by timestamp (most recent first)
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return ResponseHandler.success(res, {
        activities: sortedActivities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activities.length,
          totalPages: Math.ceil(activities.length / limit)
        }
      }, 'Company activity retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getCompanyActivity', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ProfileController;
