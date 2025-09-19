/**
 * 🎯 GUÍA COMPLETA PARA PROBAR LOS ENDPOINTS DE CLIENT
 * Este script te da todos los tokens y comandos necesarios
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./src/infrastructure/database');
require('dotenv').config();

async function generarTokensYGuias() {
  try {
    console.log('🔐 GENERANDO TOKENS PARA TODOS LOS CLIENTES\n');

    // Obtener todos los usuarios CLIENT
    const result = await db.query(`
      SELECT u.user_id, u.name, u.username, u.role, u.company_id, c.name as company_name
      FROM users u
      JOIN companies c ON u.company_id = c.company_id
      WHERE u.role = 'CLIENT'
      ORDER BY u.user_id
    `);

    const secret = process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui_cambialo_en_produccion';
    
    console.log('👥 USUARIOS CLIENTE DISPONIBLES:\n');
    
    const tokens = [];
    for (const user of result.rows) {
      const token = jwt.sign({
        userId: user.user_id,
        role: user.role,
        companyId: user.company_id
      }, secret, { expiresIn: '7d' });
      
      tokens.push({
        user,
        token
      });
      
      console.log(`👤 ${user.name}`);
      console.log(`   📧 Usuario: ${user.username}`);
      console.log(`   🏢 Empresa: ${user.company_name} (ID: ${user.company_id})`);
      console.log(`   🎫 Token: ${token}`);
      console.log('');
    }

    // Mostrar qué equipos tiene cada cliente
    console.log('📦 EQUIPOS POR CLIENTE:\n');
    
    for (const { user } of tokens) {
      const equipos = await db.query(`
        SELECT e.equipment_id, e.name, e.type, e.serial_number
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
      `, [user.company_id]);
      
      console.log(`🏢 ${user.company_name}:`);
      if (equipos.rows.length > 0) {
        equipos.rows.forEach(eq => {
          console.log(`   ✅ Equipo ${eq.equipment_id}: ${eq.name} (${eq.type}) - ${eq.serial_number}`);
        });
      } else {
        console.log(`   ❌ No tiene equipos rentados`);
      }
      console.log('');
    }

    // Generar comandos de prueba
    console.log('🧪 COMANDOS PARA PROBAR:\n');
    
    for (const { user, token } of tokens) {
      console.log(`🏢 PROBANDO CON: ${user.company_name} (${user.name})`);
      console.log('');
      
      console.log('📋 1. Listar equipos:');
      console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/equipments`);
      console.log('');
      
      console.log('🏠 2. Ver dashboard:');
      console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/dashboard`);
      console.log('');
      
      console.log('👤 3. Ver perfil:');
      console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/profile`);
      console.log('');
      
      // Obtener un equipo específico para este cliente
      const equipo = await db.query(`
        SELECT e.equipment_id
        FROM equipments e
        INNER JOIN active_rentals ar ON e.equipment_id = ar.equipment_id
        WHERE ar.client_company_id = $1 AND ar.status = 'ACTIVE'
        LIMIT 1
      `, [user.company_id]);
      
      if (equipo.rows.length > 0) {
        const equipoId = equipo.rows[0].equipment_id;
        console.log(`🔍 4. Ver detalles del equipo ${equipoId}:`);
        console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/equipments/${equipoId}`);
        console.log('');
        
        console.log(`🌡️ 5. Ver lecturas de temperatura del equipo ${equipoId}:`);
        console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/equipments/${equipoId}/readings`);
        console.log('');
      }
      
      console.log('🛠️ 6. Ver solicitudes de servicio:');
      console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/service-requests`);
      console.log('');
      
      console.log('📈 7. Ver temperaturas:');
      console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/temperatures`);
      console.log('');
      
      console.log('⚙️ 8. Ver mantenimientos:');
      console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/client/maintenances`);
      console.log('');
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    }
    
    console.log('💡 TIPS PARA PROBAR:');
    console.log('');
    console.log('✅ DEBERÍAN FUNCIONAR:');
    console.log('   - Todos los endpoints básicos (equipments, dashboard, profile)');
    console.log('   - Los detalles de equipos que SÍ pertenecen al cliente');
    console.log('   - Las lecturas de temperatura de sus equipos');
    console.log('');
    console.log('❌ DEBERÍAN DAR ERROR 403/404:');
    console.log('   - Intentar acceder a equipos de otros clientes');
    console.log('   - Usar tokens de PROVIDER en endpoints de CLIENT');
    console.log('');
    console.log('🔧 SI ALGO NO FUNCIONA:');
    console.log('   1. Verificar que el servidor esté corriendo');
    console.log('   2. Verificar que la autenticación esté funcionando');
    console.log('   3. Revisar los logs del servidor');
    console.log('   4. Verificar que el endpoint esté bien registrado');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

generarTokensYGuias();
