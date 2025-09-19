/**
 * 🔧 SCRIPT PARA PROBAR LOS ENDPOINTS DE CLIENTE
 * Este script te ayudará a probar con las credenciales correctas
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('🔐 GENERANDO TOKEN PARA CLIENTE CORRECTO\n');

// Datos del cliente que SÍ tiene equipos rentados
const clientUser = {
  userId: 1,           // Usuario de SuperMercado Los Andes
  role: 'CLIENT',
  companyId: 1         // Empresa SuperMercado Los Andes (que SÍ tiene el equipo 4)
};

const secret = process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui_cambialo_en_produccion';
const token = jwt.sign(clientUser, secret, { expiresIn: '7d' });

console.log('👤 DATOS DEL CLIENTE:');
console.log(`   Usuario ID: ${clientUser.userId}`);
console.log(`   Rol: ${clientUser.role}`);
console.log(`   Empresa ID: ${clientUser.companyId} (SuperMercado Los Andes)`);
console.log('');

console.log('🎫 TOKEN GENERADO:');
console.log(token);
console.log('');

console.log('🧪 COMANDOS PARA PROBAR:');
console.log('');

console.log('📋 1. LISTAR EQUIPOS DEL CLIENTE:');
console.log('curl -H "Authorization: Bearer ' + token + '" http://localhost:3000/api/client/equipments');
console.log('');

console.log('🔍 2. VER DETALLES DEL EQUIPO 4:');
console.log('curl -H "Authorization: Bearer ' + token + '" http://localhost:3000/api/client/equipments/4');
console.log('');

console.log('🌡️ 3. VER LECTURAS DE TEMPERATURA DEL EQUIPO 4:');
console.log('curl -H "Authorization: Bearer ' + token + '" http://localhost:3000/api/client/equipments/4/readings');
console.log('');

console.log('✅ AHORA DEBERÍAN FUNCIONAR TODOS LOS ENDPOINTS!');
console.log('');

console.log('💡 EXPLICACIÓN:');
console.log('   - El usuario ID 1 pertenece a la empresa SuperMercado Los Andes (ID: 1)');
console.log('   - Esta empresa tiene rentado el equipo ID 4');
console.log('   - Por eso PUEDE ver el equipo y sus detalles');
console.log('');

console.log('❌ ANTES ESTABAS PROBANDO CON:');
console.log('   - Empresa ID 2 (FrioTech) que es PROVIDER, no CLIENT');
console.log('   - O con un cliente que no tiene equipos rentados');
