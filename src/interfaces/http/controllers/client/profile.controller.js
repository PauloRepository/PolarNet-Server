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
}

module.exports = ProfileController;
