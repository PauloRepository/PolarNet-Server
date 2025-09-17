/**
 * Validate Token Use Case - DDD
 * Maneja la validación de tokens JWT y obtención de perfil
 */
class ValidateTokenUseCase {
  constructor(userRepository, authDomainService) {
    this.userRepository = userRepository;
    this.authDomainService = authDomainService;
  }

  async execute(token) {
    try {
      // 1. Verificar y decodificar token
      const decodedToken = this.authDomainService.verifyToken(token);

      // 2. Buscar usuario en base de datos
      const user = await this.userRepository.findById(decodedToken.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // 3. Verificar que el usuario siga activo
      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      // 4. Preparar respuesta del perfil (sin contraseña)
      const userProfile = {
        userId: user.userId,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        companyId: user.companyId,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        tokenInfo: {
          userId: decodedToken.userId,
          role: decodedToken.role,
          companyId: decodedToken.companyId,
          issuedAt: new Date(decodedToken.iat * 1000),
          expiresAt: new Date(decodedToken.exp * 1000)
        }
      };

      return {
        success: true,
        message: 'Token is valid',
        data: userProfile
      };

    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  async getProfile(userId) {
    try {
      // 1. Buscar usuario
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Verificar que esté activo
      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      // 3. Preparar perfil completo
      const profile = {
        userId: user.userId,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        companyId: user.companyId,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return {
        success: true,
        message: 'Profile retrieved successfully',
        data: profile
      };

    } catch (error) {
      throw new Error(`Get profile failed: ${error.message}`);
    }
  }
}

module.exports = ValidateTokenUseCase;
