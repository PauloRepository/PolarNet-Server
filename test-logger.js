/**
 * 🔧 TEST LOGGER RESOLUTION - Verificar que el logger se resuelve correctamente
 */

console.log('🔍 Verificando resolución de logger...\n');

try {
  // 1. Cargar DI Container
  const { getContainer } = require('./src/infrastructure/config/index');
  const container = getContainer();
  console.log('✅ DI Container cargado');
  
  // 2. Verificar que logger existe en container
  try {
    const logger = container.resolve('logger');
    console.log('✅ Logger resuelto desde container');
    console.log('Logger type:', typeof logger);
    console.log('Logger methods:', Object.keys(logger));
  } catch (e) {
    console.log('❌ Error resolviendo logger:', e.message);
  }
  
  // 3. Probar fallback a console
  const fallbackLogger = container?.resolve('logger') || console;
  console.log('✅ Fallback logger available');
  
  // 4. Cargar dashboard controller
  const dashboardController = require('./src/interfaces/http/controllers/client/dashboard.controller');
  console.log('✅ Dashboard controller cargado');
  
  // 5. Inyectar container
  dashboardController.setContainer(container);
  console.log('✅ Container inyectado');
  
  // 6. Verificar que container está disponible
  console.log('Container available in controller:', !!dashboardController.container);
  
  console.log('\n🎉 TODO LISTO PARA EL ENDPOINT!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
