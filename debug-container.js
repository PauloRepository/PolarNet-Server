/**
 * 🔍 DEBUG CONTAINER INJECTION - Verificar exactamente qué pasa con setContainer
 */

console.log('🔍 Debugging container injection...\n');

try {
  console.log('🏗️ PASO 1: Cargar DI Container');
  const { getContainer } = require('./src/infrastructure/config/index');
  const container = getContainer();
  console.log('✅ Container cargado:', !!container);
  console.log('Container type:', typeof container);
  console.log('');
  
  console.log('🎮 PASO 2: Cargar Dashboard Controller');
  const dashboardController = require('./src/interfaces/http/controllers/client/dashboard.controller');
  console.log('✅ Controller cargado');
  console.log('Controller type:', typeof dashboardController);
  console.log('Has setContainer method:', typeof dashboardController.setContainer === 'function');
  console.log('Initial container value:', dashboardController.container);
  console.log('');
  
  console.log('💉 PASO 3: Inyectar Container');
  console.log('Calling setContainer...');
  dashboardController.setContainer(container);
  console.log('✅ setContainer llamado');
  console.log('Container after injection:', !!dashboardController.container);
  console.log('');
  
  console.log('🧪 PASO 4: Verificar instancia');
  // Cargar el controller otra vez para ver si es la misma instancia
  const dashboardController2 = require('./src/interfaces/http/controllers/client/dashboard.controller');
  console.log('Same instance?', dashboardController === dashboardController2);
  console.log('Container in second reference:', !!dashboardController2.container);
  console.log('');
  
  console.log('📋 RESULTADO:');
  if (dashboardController.container) {
    console.log('✅ Container disponible en la instancia');
    
    // Probar resolución
    try {
      const logger = dashboardController.container.resolve('logger');
      console.log('✅ Logger se puede resolver');
    } catch (e) {
      console.log('❌ Error resolviendo logger:', e.message);
    }
    
    try {
      const useCase = dashboardController.container.resolve('getClientDashboard');
      console.log('✅ Use Case se puede resolver');
    } catch (e) {
      console.log('❌ Error resolviendo use case:', e.message);
    }
  } else {
    console.log('❌ Container NO disponible en la instancia');
  }
  
} catch (error) {
  console.error('❌ Error en debug:', error.message);
  console.error('Stack:', error.stack);
}
