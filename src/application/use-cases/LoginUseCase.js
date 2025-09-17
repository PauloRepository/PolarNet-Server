/**
 * Login Use Case - DDD
 * Maneja el proceso de autenticación de usuarios
 */
class LoginUseCase {
  constructor(userRepository, authDomainService) {
    this.userRepository = userRepository;
    this.authDomainService = authDomainService;
  }

  async execute(credentials) {
    try {
      // 1. Validar credenciales usando domain service
      const validatedCredentials = this.authDomainService.validateLoginCredentials(
        credentials.username, 
        credentials.password
      );

      // 2. Buscar usuario por username (usando email como username)
      const user = await this.userRepository.findByEmail(validatedCredentials.username);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // 3. Verificar que el usuario esté activo
      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      // 4. Verificar contraseña
      const isValidPassword = await this.authDomainService.verifyPassword(
        validatedCredentials.password, 
        user.password
      );

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // 5. Actualizar último login
      await this.userRepository.updateLastLogin(user.userId);

      // 6. Generar token JWT
      const token = this.authDomainService.generateToken({
        userId: user.userId,
        role: user.role,
        companyId: user.companyId
      });

      // 7. Preparar respuesta (sin incluir contraseña)
      const userResponse = {
        userId: user.userId,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        companyId: user.companyId,
        lastLogin: new Date(),
        token: token
      };

      return {
        success: true,
        message: 'Login successful',
        data: userResponse
      };

    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }
}

module.exports = LoginUseCase;
