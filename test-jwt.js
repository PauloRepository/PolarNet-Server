/**
 * 🔍 TEST JWT TOKEN - Verificar que el token se puede decodificar
 */

console.log('🔐 Verificando token JWT...\n');

const jwt = require('jsonwebtoken');

// Tu token actual
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJDTElFTlQiLCJjb21wYW55SWQiOjEsImlhdCI6MTc1ODIyNTQ0MywiZXhwIjoxNzU4ODMwMjQzfQ.LBUtG1tfKfH6dFLAIB0mMhVgz_xx5182iPQ8gMUOvcQ';

try {
  // Intentar decodificar sin verificar la firma primero
  const decoded = jwt.decode(token);
  console.log('📋 Contenido del token (sin verificar):');
  console.log(JSON.stringify(decoded, null, 2));
  console.log('');
  
  // Verificar expiración
  const now = Math.floor(Date.now() / 1000);
  console.log('⏰ Verificación de expiración:');
  console.log('Tiempo actual:', now);
  console.log('Token expira:', decoded.exp);
  console.log('¿Expirado?:', now > decoded.exp ? '❌ SÍ' : '✅ NO');
  console.log('');
  
  // Intentar decodificar con las posibles claves
  const possibleSecrets = [
    'tu_jwt_secret_muy_seguro_aqui_cambialo_en_produccion',  // Del .env
    'polarnet-jwt-secret-key',           // Default del código
    process.env.JWT_SECRET,              // Desde variable de entorno
    'default-secret',                    // Otra posibilidad
    'jwt-secret'                        // Otra posibilidad común
  ];
  
  console.log('🔑 Probando claves JWT:');
  
  for (const secret of possibleSecrets) {
    if (!secret) continue;
    
    try {
      const verified = jwt.verify(token, secret);
      console.log(`✅ ÉXITO con clave: "${secret}"`);
      console.log('Usuario decodificado:', {
        userId: verified.userId,
        role: verified.role,
        companyId: verified.companyId
      });
      process.exit(0);
    } catch (e) {
      console.log(`❌ Falló con clave: "${secret}" - ${e.message}`);
    }
  }
  
  console.log('\n🚨 PROBLEMA: Ninguna clave JWT funcionó');
  console.log('💡 SOLUCIÓN: Verificar qué JWT_SECRET se usó para generar el token');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
