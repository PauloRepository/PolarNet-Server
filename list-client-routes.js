/**
 * 📋 LISTADO DE TODAS LAS RUTAS CLIENT DISPONIBLES
 */

console.log('🛤️ RUTAS CLIENT DISPONIBLES:\n');

console.log('🏠 DASHBOARD:');
console.log('GET /api/client/dashboard                    → Métricas principales');
console.log('GET /api/client/dashboard/activities         → Actividades recientes');
console.log('GET /api/client/dashboard/alerts             → Alertas del sistema');
console.log('GET /api/client/dashboard/energy-summary     → Resumen energético');
console.log('');

console.log('🔧 EQUIPMENTS:');
console.log('GET /api/client/equipments                   → Lista de equipos');
console.log('GET /api/client/equipments/summary           → Resumen equipos');
console.log('GET /api/client/equipments/:id               → Detalles de equipo');
console.log('GET /api/client/equipments/:id/readings      → Lecturas en tiempo real');
console.log('GET /api/client/equipments/:id/history       → Historial del equipo');
console.log('POST /api/client/equipments/request-new      → Solicitar nuevo equipo');
console.log('');

console.log('🛠️ SERVICE REQUESTS:');
console.log('GET /api/client/service-requests             → Lista solicitudes');
console.log('POST /api/client/service-requests            → Crear solicitud');
console.log('GET /api/client/service-requests/:id         → Detalles solicitud');
console.log('PUT /api/client/service-requests/:id         → Actualizar solicitud');
console.log('DELETE /api/client/service-requests/:id      → Cancelar solicitud');
console.log('GET /api/client/service-requests/stats       → Estadísticas');
console.log('');

console.log('📄 CONTRACTS:');
console.log('GET /api/client/contracts                    → Lista contratos');
console.log('GET /api/client/contracts/summary            → Resumen contratos');
console.log('GET /api/client/contracts/:id                → Detalles contrato');
console.log('GET /api/client/contracts/:id/documents      → Documentos contrato');
console.log('PUT /api/client/contracts/:id/extend         → Extender contrato');
console.log('');

console.log('💰 INVOICES:');
console.log('GET /api/client/invoices                     → Lista facturas');
console.log('GET /api/client/invoices/summary             → Resumen facturas');
console.log('GET /api/client/invoices/payment-history     → Historial pagos');
console.log('GET /api/client/invoices/:id                 → Detalles factura');
console.log('GET /api/client/invoices/:id/pdf             → Descargar PDF');
console.log('POST /api/client/invoices/:id/mark-paid      → Marcar como pagada');
console.log('');

console.log('🏢 PROFILE:');
console.log('GET /api/client/profile                      → Perfil empresa');
console.log('PUT /api/client/profile                      → Actualizar perfil');
console.log('GET /api/client/profile/locations            → Ubicaciones');
console.log('POST /api/client/profile/locations           → Crear ubicación');
console.log('PUT /api/client/profile/locations/:id        → Actualizar ubicación');
console.log('DELETE /api/client/profile/locations/:id     → Eliminar ubicación');
console.log('GET /api/client/profile/users                → Usuarios equipo');
console.log('POST /api/client/profile/users               → Invitar usuario');
console.log('PUT /api/client/profile/users/:id/status     → Cambiar estado usuario');
console.log('GET /api/client/profile/activity             → Actividad empresarial');
console.log('');

console.log('🎯 PRUEBAS RECOMENDADAS CON TU TOKEN:');
console.log('');
console.log('1. GET http://localhost:3200/api/client/dashboard');
console.log('2. GET http://localhost:3200/api/client/equipments');
console.log('3. GET http://localhost:3200/api/client/profile');
console.log('4. GET http://localhost:3200/api/client/contracts');
console.log('5. GET http://localhost:3200/api/client/invoices');
console.log('');
console.log('🔑 Usa tu token JWT en el header:');
console.log('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
console.log('');
console.log('❌ RUTA QUE NO EXISTE:');
console.log('/api/client/dashboard/metrics  ← Esta NO existe');
console.log('✅ RUTA CORRECTA:');
console.log('/api/client/dashboard           ← Esta SÍ existe');
