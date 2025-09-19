/**
 * 🔍 TEST BIND CONTEXT - Verificar que el bind preserva el contexto de this
 */

(async () => {
  console.log('🔍 Testing bind context...\n');

  try {
    console.log('🏗️ PASO 1: Setup');
    const { getContainer } = require('./src/infrastructure/config/index');
    const container = getContainer();
    
    const dashboardController = require('./src/interfaces/http/controllers/client/dashboard.controller');
    dashboardController.setContainer(container);
    
    console.log('✅ Setup completo');
    console.log('Container in controller:', !!dashboardController.container);
    console.log('');
    
    console.log('🧪 PASO 2: Test método directo');
    console.log('this.container en método directo:', !!dashboardController.container);
    console.log('');
    
    console.log('🔗 PASO 3: Test método con bind');
    const boundMethod = dashboardController.getDashboardMetrics.bind(dashboardController);
    console.log('✅ Método bound creado');
    console.log('');
    
    console.log('🎯 PASO 4: Simular req/res');
    const mockReq = {
      user: {
        clientCompanyId: 1,
        userId: 1
      }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log('✅ Response:', code, data);
          return mockRes;
        }
      }),
      json: (data) => {
        console.log('✅ Response data:', data);
        return mockRes;
      }
    };
    
    console.log('🚀 EJECUTANDO método bound...');
    
    // Esto debería funcionar ahora
    await boundMethod(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
})();
