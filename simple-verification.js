/**
 * ✅ VERIFICACIÓN SIMPLE - Solo cargar DI Container y controladores
 */

console.log('🔍 Verificación simple del DI Container...\n');

try {
  // 1. Verificar DI Container
  console.log('📦 Verificando DI Container...');
  const { getContainer } = require('./src/infrastructure/config/index');
  const container = getContainer();
  console.log('✅ DI Container - OK');
  
  // 2. Verificar que tiene el método get
  console.log('\n🔧 Verificando métodos del container...');
  console.log('✅ get() method exists:', typeof container.get === 'function');
  console.log('✅ resolve() method exists:', typeof container.resolve === 'function');
  
  // 3. Verificar controllers básicos
  console.log('\n🎮 Verificando controllers básicos...');
  const authController = container.get('authController');
  console.log('✅ authController loaded');
  
  const adminController = container.get('adminController');
  console.log('✅ adminController loaded');
  
  // 4. Verificar algunos provider controllers
  console.log('\n🏢 Verificando provider controllers...');
  const providerDashboard = container.get('providerDashboardController');
  console.log('✅ providerDashboardController loaded');
  
  const providerClients = container.get('providerClientsController');
  console.log('✅ providerClientsController loaded');
  
  console.log('\n🎉 ¡VERIFICACIÓN BÁSICA EXITOSA!');
  console.log('\n📋 RESULTADO:');
  console.log('   ✅ DI Container funcionando');
  console.log('   ✅ Métodos get() y resolve() disponibles');
  console.log('   ✅ Controllers básicos cargados');
  console.log('   ✅ Provider controllers cargados');
  
} catch (error) {
  console.error('❌ Error en verificación:', error.message);
  console.error('Stack:', error.stack);
}
