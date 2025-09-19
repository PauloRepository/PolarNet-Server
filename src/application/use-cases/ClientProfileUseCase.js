const ClientProfileResponseDTO = require('../dto/ClientProfileResponseDTO');

/**
 * Use Case: Client Profile Management
 * Handles profile data retrieval and updates for client companies
 */
class ClientProfileUseCase {
  constructor(userRepository, companyRepository) {
    this.userRepository = userRepository;
    this.companyRepository = companyRepository;
  }

  /**
   * Get client profile information
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Profile information
   */
  async getProfile(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const company = await this.companyRepository.findById(user.companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      const profileData = {
        user,
        company
      };

      return {
        success: true,
        data: ClientProfileResponseDTO.formatProfile(profileData)
      };

    } catch (error) {
      console.error('Error in ClientProfileUseCase.getProfile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Update user profile information
   * @param {number} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateUserProfile(userId, userData) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      // Validate and filter allowed fields for user update
      const allowedFields = ['firstName', 'lastName', 'email', 'phone'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (userData[field] !== undefined) {
          updateData[field] = userData[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Check if email already exists (if being updated)
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(updateData.email);
        if (existingUser) {
          throw new Error('Email already exists');
        }
      }

      const updatedUser = await this.userRepository.update(userId, updateData);
      
      // Get company info for complete profile
      const company = await this.companyRepository.findById(updatedUser.companyId);

      const profileData = {
        user: updatedUser,
        company
      };

      return {
        success: true,
        data: ClientProfileResponseDTO.formatProfile(profileData),
        message: 'Profile updated successfully'
      };

    } catch (error) {
      console.error('Error in ClientProfileUseCase.updateUserProfile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Update company profile information
   * @param {number} userId - User ID (must be admin of company)
   * @param {Object} companyData - Company data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateCompanyProfile(userId, companyData) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      // Check if user has permission to update company
      if (!user.isAdmin) {
        throw new Error('Access denied - admin privileges required');
      }

      const company = await this.companyRepository.findById(user.companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      // Validate and filter allowed fields for company update
      const allowedFields = ['name', 'address', 'phone', 'email', 'contactPerson'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (companyData[field] !== undefined) {
          updateData[field] = companyData[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid fields to update');
      }

      const updatedCompany = await this.companyRepository.update(user.companyId, updateData);

      const profileData = {
        user,
        company: updatedCompany
      };

      return {
        success: true,
        data: ClientProfileResponseDTO.formatProfile(profileData),
        message: 'Company profile updated successfully'
      };

    } catch (error) {
      console.error('Error in ClientProfileUseCase.updateCompanyProfile:', error);
      throw new Error(`Failed to update company profile: ${error.message}`);
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {Object} passwordData - Password change data
   * @returns {Promise<Object>} Success response
   */
  async changePassword(userId, passwordData) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { currentPassword, newPassword } = passwordData;

      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.userRepository.verifyPassword(userId, currentPassword);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await this.userRepository.updatePassword(userId, newPassword);

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Error in ClientProfileUseCase.changePassword:', error);
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  /**
   * Get profile activity summary
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Activity summary
   */
  async getProfileActivity(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Access denied - not a client user');
      }

      const activitySummary = await this.userRepository.getActivitySummary(userId);

      return {
        success: true,
        data: ClientProfileResponseDTO.formatActivitySummary(activitySummary)
      };

    } catch (error) {
      console.error('Error in ClientProfileUseCase.getProfileActivity:', error);
      throw new Error(`Failed to get profile activity: ${error.message}`);
    }
  }

  /**
   * Get company users (for admin users)
   * @param {number} userId - Admin user ID
   * @returns {Promise<Object>} Company users list
   */
  async getCompanyUsers(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'CLIENT' || !user.isAdmin) {
        throw new Error('Access denied - admin privileges required');
      }

      const companyUsers = await this.userRepository.findByCompanyId(user.companyId);

      return {
        success: true,
        data: ClientProfileResponseDTO.formatUsersList(companyUsers)
      };

    } catch (error) {
      console.error('Error in ClientProfileUseCase.getCompanyUsers:', error);
      throw new Error(`Failed to get company users: ${error.message}`);
    }
  }
}

module.exports = ClientProfileUseCase;
