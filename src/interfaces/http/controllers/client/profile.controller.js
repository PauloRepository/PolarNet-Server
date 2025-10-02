const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ProfileController {
  constructor(container) {
    this.container = container;
    this.logger = container.resolve('logger');
  }

  // GET /api/client/profile - Obtener perfil del cliente usando DDD
  async getProfile(req, res) {
    try {
      const { clientCompanyId, userId } = req.user;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting client profile', { 
        clientCompanyId, 
        userId, 
        userFromToken: req.user 
      });

      // Get repositories
      const userRepository = this.container.resolve('userRepository');
      const companyRepository = this.container.resolve('companyRepository');

      // Get user and company info with simple approach
      let user, company;
      
      try {
        user = await userRepository.findById(userId);
        this.logger.info('User data from repository:', user);
      } catch (error) {
        this.logger.error('Error finding user:', error);
        user = null;
      }

      try {
        company = await companyRepository.findById(clientCompanyId);
        this.logger.info('Company data from repository:', company);
      } catch (error) {
        this.logger.error('Error finding company:', error);
        company = null;
      }

      // Create profile with actual data (no defaults)
      const profile = {
        user: {
          userId: user?.user_id ? user.user_id.toString() : null,
          name: user?.name || null,
          username: user?.username || null,
          email: user?.email || null,
          role: user?.role || null,
          phone: user?.phone || null,
          lastLogin: user?.last_login || null,
          status: user?.is_active !== undefined ? (user.is_active ? 'active' : 'inactive') : null,
          createdAt: user?.created_at || null,
          updatedAt: user?.updated_at || null
        },
        company: {
          companyId: company?.company_id ? company.company_id.toString() : null,
          name: company?.name || null,
          type: company?.type || null,
          email: company?.email || null,
          phone: company?.phone || null,
          address: company?.address || null,
          city: company?.city || null,
          state: company?.state || null,
          postalCode: company?.postal_code || null,
          country: company?.country || null,
          taxId: company?.tax_id || null,
          website: company?.website || null,
          description: company?.description || null,
          businessType: company?.business_type || null,
          specialization: company?.specialization || null,
          logoUrl: company?.logo_url || null,
          status: company?.is_active !== undefined ? (company.is_active ? 'active' : 'inactive') : null,
          createdAt: company?.created_at || null,
          updatedAt: company?.updated_at || null
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
      const { clientCompanyId, userId } = req.user;
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

      // For now, return basic location data - this endpoint may not have proper data yet
      // In a real implementation, this would fetch actual equipment locations from the database
      const mockLocations = [
        {
          locationId: "1",
          name: "Sede Principal",
          address: "Av. Ejemplo 123",
          city: "Lima",
          state: "Lima",
          postalCode: "15001",
          country: "Perú",
          contactPerson: "Juan Pérez",
          phone: "+51 1 234-5678",
          email: "contacto@empresa.com",
          operatingHours: "Lunes a Viernes 8:00 - 18:00",
          specialInstructions: "Acceso por la puerta principal",
          isActive: true,
          equipmentCount: 5,
          coordinates: {
            lat: -12.046374,
            lng: -77.042793
          },
          createdAt: new Date().toISOString()
        }
      ];

      return ResponseHandler.success(res, {
        locations: mockLocations,
        total: mockLocations.length
      }, 'Locations retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getLocations', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }
}

module.exports = ProfileController;
