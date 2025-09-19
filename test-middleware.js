/**
 * 🔍 TEST AUTH MIDDLEWARE - Simular exactamente el middleware
 */

console.log('🔐 Simulando Auth Middleware...\n');

// Cargar variables de entorno
require('dotenv').config();

const jwt = require('jsonwebtoken');

// Tu token actual
const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJDTElFTlQiLCJjb21wYW55SWQiOjEsImlhdCI6MTc1ODIyNTQ0MywiZXhwIjoxNzU4ODMwMjQzfQ.LBUtG1tfKfH6dFLAIB0mMhVgz_xx5182iPQ8gMUOvcQ';

try {
  console.log('🔍 Verificando Authorization Header...');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Header incorrecto');
    process.exit(1);
  }
  console.log('✅ Header correcto');
  
  const token = authHeader.split(' ')[1];
  console.log('🎫 Token extraído:', token.substring(0, 50) + '...');
  
  console.log('\n🔑 Variables de entorno:');
  console.log('JWT_SECRET desde .env:', process.env.JWT_SECRET);
  
  // Simular exactamente el middleware
  const secret = process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui_cambialo_en_produccion';
  console.log('Secret usado:', secret);
  
  console.log('\n🔐 Verificando token...');
  const decoded = jwt.verify(token, secret);
  
  // Simular el req.user que se crea
  const reqUser = {
    userId: decoded.userId,
    role: decoded.role,
    companyId: decoded.companyId,
    clientCompanyId: decoded.role === 'CLIENT' ? decoded.companyId : null,
    providerCompanyId: decoded.role === 'PROVIDER' ? decoded.companyId : null
  };
  
  console.log('✅ TOKEN VÁLIDO!');
  console.log('\n👤 req.user creado:');
  console.log(JSON.stringify(reqUser, null, 2));
  
  console.log('\n🎉 EL MIDDLEWARE DEBERÍA FUNCIONAR CORRECTAMENTE');
  
} catch (error) {
  console.error('❌ Error en middleware simulation:', error.message);
  console.log('\n🔧 Verificar:');
  console.log('1. Variables de entorno cargadas');
  console.log('2. JWT_SECRET correcto');
  console.log('3. Token no expirado');
}
