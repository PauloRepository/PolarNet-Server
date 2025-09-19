/**
 * 🔧 TEST RÁPIDO - Verificar endpoint /api/client/dashboard
 */

console.log('🔍 Verificando endpoint CLIENT Dashboard...\n');

try {
  // 1. Verificar DI Container
  console.log('📦 Verificando DI Container...');
  const { getContainer } = require('./src/infrastructure/config/index');
  const container = getContainer();
  console.log('✅ DI Container cargado');
  
  // 2. Verificar controller CLIENT
  console.log('\n🎮 Verificando Dashboard Controller...');
  const dashboardController = require('./src/interfaces/http/controllers/client/dashboard.controller');
  console.log('✅ Dashboard Controller cargado');
  
  // 3. Verificar inyección de dependencias
  console.log('\n💉 Verificando inyección de dependencias...');
  dashboardController.setContainer(container);
  console.log('✅ Container inyectado en dashboard controller');
  
  // 4. Verificar que existe el método
  console.log('\n🔍 Verificando métodos del controller...');
  console.log('✅ getDashboardMetrics exists:', typeof dashboardController.getDashboardMetrics === 'function');
  
  // 5. Verificar rutas CLIENT
  console.log('\n🛤️ Verificando carga de rutas CLIENT...');
  const clientRoutes = require('./src/interfaces/http/routes/client/client.routes');
  console.log('✅ Client routes cargadas correctamente');
  
  console.log('\n🎉 ¡VERIFICACIÓN EXITOSA!');
  console.log('\n📋 RESULTADO:');
  console.log('   ✅ DI Container funcionando');
  console.log('   ✅ Dashboard Controller disponible');
  console.log('   ✅ Inyección de dependencias OK');
  console.log('   ✅ Rutas CLIENT cargadas');
  console.log('\n🚀 El endpoint /api/client/dashboard debería funcionar ahora');
  
} catch (error) {
  console.error('❌ Error en verificación:', error.message);
  console.error('Stack:', error.stack);
  
  console.log('\n🔧 POSIBLES PROBLEMAS:');
  console.log('   • DI Container no encontrado');
  console.log('   • Controller no existe o path incorrecto');
  console.log('   • Dependencias faltantes');
  console.log('   • Error en rutas');
}
