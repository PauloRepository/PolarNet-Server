/**
 * Register Use Case - DDD
 * Maneja el proceso de registro de usuarios
 */
class RegisterUseCase {
  constructor(userRepository, companyRepository, authDomainService) {
    this.userRepository = userRepository;
    this.companyRepository = companyRepository;
    this.authDomainService = authDomainService;
  }

  async execute(userData) {
    try {
      // 1. Validar datos usando domain service
      const validatedData = this.authDomainService.validateRegistrationData(userData);

      // 2. Verificar que el email no esté en uso
      const existingUser = await this.userRepository.findByEmail(validatedData.email);
      if (existingUser) {
        throw new Error('Email is already registered');
      }

      // 3. Verificar que la compañía existe (si se especifica)
      if (validatedData.companyId) {
        const company = await this.companyRepository.findById(validatedData.companyId);
        if (!company) {
          throw new Error('Company not found');
        }

        // Verificar que el tipo de compañía coincida con el rol
        if (validatedData.role === 'PROVIDER' && company.type !== 'PROVIDER') {
          throw new Error('Cannot assign PROVIDER role to CLIENT company');
        }
        if (validatedData.role === 'CLIENT' && company.type !== 'CLIENT') {
          throw new Error('Cannot assign CLIENT role to PROVIDER company');
        }
      }

      // 4. Hash de la contraseña
      const hashedPassword = await this.authDomainService.hashPassword(validatedData.password);

      // 5. Crear nueva instancia de User
      const User = require('../../domain/entities/User');
      const newUser = new User({
        name: validatedData.name,
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email,
        phone: userData.phone || null,
        role: validatedData.role,
        companyId: validatedData.companyId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 6. Guardar usuario en repositorio
      const savedUser = await this.userRepository.save(newUser);

      // 7. Generar token para login automático
      const token = this.authDomainService.generateToken({
        userId: savedUser.userId,
        role: savedUser.role,
        companyId: savedUser.companyId
      });

      // 8. Preparar respuesta (sin incluir contraseña)
      const userResponse = {
        userId: savedUser.userId,
        name: savedUser.name,
        username: savedUser.username,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        companyId: savedUser.companyId,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        token: token
      };

      return {
        success: true,
        message: 'User registered successfully',
        data: userResponse
      };

    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
}

module.exports = RegisterUseCase;
