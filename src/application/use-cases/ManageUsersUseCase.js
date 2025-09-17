/**
 * Use Case: Gestión de Usuarios
 */
class ManageUsersUseCase {
  constructor(userRepository, companyRepository) {
    this.userRepository = userRepository;
    this.companyRepository = companyRepository;
  }

  async createUser(userData, creatorContext) {
    try {
      // Validar permisos del creador
      const creator = await this.userRepository.findById(creatorContext.userId);
      if (!creator || (creator.role !== 'admin' && creator.role !== 'provider')) {
        throw new Error('Not authorized to create users');
      }

      // Validar que el email no exista
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Validar que la empresa existe
      const company = await this.companyRepository.findById(userData.companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Validar permisos para crear en la empresa
      if (creator.role === 'provider' && creator.companyId !== userData.companyId) {
        throw new Error('Not authorized to create users for this company');
      }

      // Crear entidad User
      const User = require('../../domain/entities/User');
      const bcrypt = require('bcrypt');
      
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        name: userData.name,
        email: userData.email,
        passwordHash: hashedPassword,
        role: userData.role,
        phone: userData.phone,
        position: userData.position,
        department: userData.department,
        companyId: userData.companyId,
        specialties: userData.specialties,
        skills: userData.skills,
        experienceYears: userData.experienceYears,
        status: 'active'
      });

      // Validar la entidad
      user.validate();

      // Guardar en el repositorio
      const savedUser = await this.userRepository.save(user);

      // No devolver la contraseña
      const userResponse = savedUser.toJSON();
      delete userResponse.passwordHash;

      return {
        success: true,
        data: userResponse,
        message: 'User created successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create user'
      };
    }
  }

  async updateUser(userId, updateData, updaterContext) {
    try {
      const updater = await this.userRepository.findById(updaterContext.userId);
      if (!updater) {
        throw new Error('Updater not found');
      }

      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Validar permisos
      const canUpdate = (updater.role === 'admin') ||
        (updater.role === 'provider' && updater.companyId === existingUser.companyId) ||
        (updater.userId === userId); // Usuario puede actualizar su propio perfil

      if (!canUpdate) {
        throw new Error('Not authorized to update this user');
      }

      // Aplicar actualizaciones permitidas
      const allowedUpdates = this.getAllowedUpdates(updater.role, updater.userId === userId);
      const filteredUpdates = {};

      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updateData[key];
        }
      });

      // Validar email único si se está cambiando
      if (filteredUpdates.email && filteredUpdates.email !== existingUser.email) {
        const emailExists = await this.userRepository.existsByEmail(filteredUpdates.email, userId);
        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // Actualizar la entidad
      Object.assign(existingUser, filteredUpdates);
      existingUser.validate();

      // Guardar cambios
      const updatedUser = await this.userRepository.save(existingUser);
      
      const userResponse = updatedUser.toJSON();
      delete userResponse.passwordHash;

      return {
        success: true,
        data: userResponse,
        message: 'User updated successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update user'
      };
    }
  }

  async getUsersByCompany(companyId, filters, requesterContext) {
    try {
      const requester = await this.userRepository.findById(requesterContext.userId);
      if (!requester) {
        throw new Error('Requester not found');
      }

      // Validar permisos
      const canView = (requester.role === 'admin') ||
        (requester.companyId === companyId);

      if (!canView) {
        throw new Error('Not authorized to view users for this company');
      }

      const users = await this.userRepository.findByCompany(companyId, filters);
      
      // Remover contraseñas de la respuesta
      const usersResponse = users.map(user => {
        const userData = user.toJSON();
        delete userData.passwordHash;
        return userData;
      });

      return {
        success: true,
        data: usersResponse,
        total: usersResponse.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve users'
      };
    }
  }

  async getTechnicians(providerCompanyId, filters, requesterContext) {
    try {
      const requester = await this.userRepository.findById(requesterContext.userId);
      if (!requester || requester.companyId !== providerCompanyId) {
        throw new Error('Not authorized');
      }

      const technicians = await this.userRepository.findTechnicians(providerCompanyId, filters);
      
      const techniciansResponse = technicians.map(tech => {
        const techData = tech.toJSON();
        delete techData.passwordHash;
        return techData;
      });

      return {
        success: true,
        data: techniciansResponse,
        total: techniciansResponse.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve technicians'
      };
    }
  }

  async changePassword(userId, oldPassword, newPassword, requesterContext) {
    try {
      const requester = await this.userRepository.findById(requesterContext.userId);
      if (!requester) {
        throw new Error('Requester not found');
      }

      // Solo el usuario mismo o un admin pueden cambiar la contraseña
      if (requester.userId !== userId && requester.role !== 'admin') {
        throw new Error('Not authorized to change password');
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verificar contraseña actual (excepto para admins)
      if (requester.role !== 'admin') {
        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isValidPassword) {
          throw new Error('Current password is incorrect');
        }
      }

      // Hash nueva contraseña
      const bcrypt = require('bcrypt');
      const newHashedPassword = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      const success = await this.userRepository.updatePassword(userId, newHashedPassword);
      
      if (!success) {
        throw new Error('Failed to update password');
      }

      return {
        success: true,
        message: 'Password updated successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to change password'
      };
    }
  }

  async deactivateUser(userId, requesterContext) {
    try {
      const requester = await this.userRepository.findById(requesterContext.userId);
      if (!requester || requester.role !== 'admin') {
        throw new Error('Not authorized to deactivate users');
      }

      const user = await this.userRepository.deactivate(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userResponse = user.toJSON();
      delete userResponse.passwordHash;

      return {
        success: true,
        data: userResponse,
        message: 'User deactivated successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to deactivate user'
      };
    }
  }

  getAllowedUpdates(requesterRole, isSelfUpdate) {
    const baseFields = ['name', 'phone', 'profileImage', 'notificationPreferences', 'timezone', 'language'];
    
    if (requesterRole === 'admin') {
      return [...baseFields, 'email', 'role', 'position', 'department', 'specialties', 'skills', 'experienceYears', 'status'];
    }
    
    if (requesterRole === 'provider') {
      return [...baseFields, 'position', 'department', 'specialties', 'skills', 'experienceYears'];
    }
    
    if (isSelfUpdate) {
      return baseFields;
    }

    return [];
  }
}

module.exports = ManageUsersUseCase;
