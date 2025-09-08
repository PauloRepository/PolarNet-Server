# POLARNET API - ENDPOINTS POR ROL

## 📋 TABLA DE PERMISOS Y ENDPOINTS

### 🔐 AUTENTICACIÓN (Común para ambos)
```
POST /api/auth/login          - Login de usuario
POST /api/auth/register       - Registro de usuario
GET  /api/auth/profile        - Perfil del usuario autenticado
GET  /api/auth/verify         - Verificar token válido
```

---

## 👤 CLIENTE (ROL: CLIENTE) - Solo Lectura + Solicitudes

### Dashboard
```
GET /api/client/dashboard                    - Panel principal con métricas completas
GET /api/client/dashboard/metrics           - Métricas generales (equipos, alertas, costos)
GET /api/client/dashboard/temperature       - Datos de temperatura para dashboard
GET /api/client/dashboard/energy            - Datos de energía para dashboard  
GET /api/client/dashboard/service-requests  - Solicitudes de servicio recientes
GET /api/client/dashboard/maintenances      - Próximos mantenimientos programados
```

### Equipos (Solo lectura + solicitar servicio)
```
GET  /api/client/equipments                           - Lista paginada de equipos con filtros
GET  /api/client/equipments/:id                       - Detalles completos de un equipo
GET  /api/client/equipments/:id/temperature-history   - Historial de temperaturas del equipo
POST /api/client/equipments/:id/service-request       - Solicitar servicio técnico para equipo
```

### Temperaturas (Solo lectura)
```
GET /api/client/temperatures/current    - Temperaturas actuales con estados y alertas
GET /api/client/temperatures/alerts     - Alertas críticas y de advertencia
GET /api/client/temperatures/history    - Historial completo con filtros y paginación
GET /api/client/temperatures/chart      - Datos optimizados para gráficos temporales
```

### Consumo Energético (Solo lectura)
```
GET /api/client/energy/current     - Consumo energético actual de todos los equipos
GET /api/client/energy/daily       - Consumo diario con tendencias y comparativas
GET /api/client/energy/monthly     - Análisis mensual con tendencias y proyecciones
GET /api/client/energy/efficiency  - Análisis de eficiencia con recomendaciones
GET /api/client/energy/chart       - Datos para visualizaciones y gráficos
```

### Solicitudes de Servicio (CRUD limitado)
```
GET    /api/client/service-requests              - Lista con filtros, paginación y estadísticas
POST   /api/client/service-requests              - Crear nueva solicitud de servicio
GET    /api/client/service-requests/statistics   - Estadísticas detalladas y tendencias
GET    /api/client/service-requests/:id          - Detalles completos con timeline
PUT    /api/client/service-requests/:id          - Actualizar (solo PENDIENTE/PROGRAMADO)
DELETE /api/client/service-requests/:id          - Cancelar solicitud con motivo
```

### Mantenimientos (Solo lectura)
```
GET /api/client/maintenances                     - Lista con filtros de estado y fecha
GET /api/client/maintenances/upcoming           - Próximos mantenimientos por urgencia
GET /api/client/maintenances/calendar           - Vista de calendario mensual
GET /api/client/maintenances/statistics         - Estadísticas y análisis de tendencias
GET /api/client/maintenances/:id                - Detalles con checklist y historial
GET /api/client/maintenances/history/:equipmentId - Historial completo por equipo
```

### Perfil y Configuración
```
GET /api/client/profile                    - Perfil completo (usuario + empresa + suscripción)
PUT /api/client/profile/user              - Actualizar datos personales del usuario
PUT /api/client/profile/company           - Actualizar información de la empresa
PUT /api/client/profile/password          - Cambiar contraseña con validaciones
GET /api/client/profile/subscription      - Detalles de suscripción y características
GET /api/client/profile/activity          - Registro de actividad del usuario
GET /api/client/profile/notifications     - Configuración de notificaciones
PUT /api/client/profile/notifications     - Actualizar preferencias de notificaciones
```

---

## 🏢 PROVEEDOR (ROL: PROVEEDOR) - Gestión Completa

### Dashboard
```
GET /api/provider/dashboard                    - Panel principal con métricas de proveedor
GET /api/provider/dashboard/metrics           - Métricas operacionales y KPIs
GET /api/provider/dashboard/service-requests  - Solicitudes asignadas por estado
GET /api/provider/dashboard/maintenances      - Mantenimientos programados y vencidos
GET /api/provider/dashboard/alerts            - Alertas críticas de todos los clientes
```

### Clientes Asignados (CRUD completo)
```
GET    /api/provider/clients                    - Lista de clientes asignados al proveedor
POST   /api/provider/clients                    - Crear nuevo cliente
GET    /api/provider/clients/:id                - Detalles completos del cliente
PUT    /api/provider/clients/:id                - Actualizar información del cliente
DELETE /api/provider/clients/:id                - Desactivar cliente
GET    /api/provider/clients/:id/statistics     - Estadísticas detalladas del cliente
GET    /api/provider/clients/:id/history        - Historial completo de servicios
```

### Equipos (CRUD completo)
```
GET    /api/provider/equipments              - Equipos bajo gestión con filtros avanzados
POST   /api/provider/equipments              - Registrar nuevo equipo para cliente
GET    /api/provider/equipments/:id          - Detalles técnicos completos
PUT    /api/provider/equipments/:id          - Actualizar especificaciones y estado
DELETE /api/provider/equipments/:id          - Dar de baja equipo
GET    /api/provider/equipments/statistics   - Estadísticas de equipos gestionados
GET    /api/provider/equipments/:id/readings - Todas las lecturas del equipo
POST   /api/provider/equipments/:id/readings - Registrar lectura manual
```

### Solicitudes de Servicio (Gestión completa)
```
GET    /api/provider/service-requests              - Todas las solicitudes asignadas
PUT    /api/provider/service-requests/:id          - Actualizar estado y asignar técnico
POST   /api/provider/service-requests/:id/assign   - Asignar técnico específico
POST   /api/provider/service-requests/:id/start    - Iniciar trabajo en campo
POST   /api/provider/service-requests/:id/complete - Completar con reporte detallado
GET    /api/provider/service-requests/statistics   - Métricas de desempeño
GET    /api/provider/service-requests/calendar     - Vista de calendario de servicios
```

### Mantenimientos (CRUD completo)
```
GET    /api/provider/maintenances                 - Mantenimientos programados y ejecutados
POST   /api/provider/maintenances                 - Programar mantenimiento preventivo
GET    /api/provider/maintenances/:id             - Detalles con checklist completo
PUT    /api/provider/maintenances/:id             - Actualizar programación y notas
DELETE /api/provider/maintenances/:id             - Cancelar mantenimiento programado
POST   /api/provider/maintenances/:id/complete    - Completar con checklist y evidencias
GET    /api/provider/maintenances/calendar        - Calendario completo de mantenimientos
GET    /api/provider/maintenances/statistics      - Estadísticas de eficiencia y costos
```

### Rentas y Contratos (CRUD completo)
```
GET    /api/provider/rentals                 - Contratos de renta activos e históricos
POST   /api/provider/rentals                 - Crear nuevo contrato de renta
GET    /api/provider/rentals/:id             - Detalles contractuales completos
PUT    /api/provider/rentals/:id             - Modificar términos del contrato
DELETE /api/provider/rentals/:id             - Terminar contrato de renta
POST   /api/provider/rentals/:id/extend      - Extender período de renta
GET    /api/provider/rentals/statistics      - Análisis de rentabilidad y ocupación
POST   /api/provider/rentals/:id/invoice     - Generar facturación del período
```

### Perfil Empresarial
```
GET /api/provider/profile            - Perfil completo del proveedor
PUT /api/provider/profile/user       - Actualizar datos del usuario técnico
GET /api/provider/profile/company    - Información de la empresa proveedora
PUT /api/provider/profile/company    - Actualizar datos corporativos
GET /api/provider/profile/team       - Equipo de técnicos y especialistas
POST /api/provider/profile/team      - Agregar nuevo técnico al equipo
PUT /api/provider/profile/team/:id   - Actualizar información del técnico
GET /api/provider/profile/statistics - Métricas de desempeño empresarial
```

---

## 🔍 ESTRUCTURA DE RESPUESTAS

### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Descripción de la operación exitosa",
  "data": {
    "items": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 250,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "statistics": {},
    "filters": {}
  }, 
  "timestamp": "2025-09-08T10:30:00.000Z"
}
```

### Respuesta de Error
```json
{
  "success": false,
  "message": "Descripción específica del error",
  "code": "ERROR_CODE_DESCRIPTIVO",
  "data": null,
  "timestamp": "2025-09-08T10:30:00.000Z"
}
```

### Códigos de Error Comunes
```
AUTHENTICATION_ERROR     - Token inválido o expirado
AUTHORIZATION_ERROR      - Permisos insuficientes para el recurso
VALIDATION_ERROR         - Datos de entrada inválidos
RESOURCE_NOT_FOUND       - Recurso solicitado no existe
COMPANY_ACCESS_ERROR     - Acceso denegado a datos de otra empresa
EQUIPMENT_NOT_FOUND      - Equipo no encontrado o no autorizado
SERVICE_REQUEST_ERROR    - Error en operación de solicitud
MAINTENANCE_ERROR        - Error en operación de mantenimiento
DATABASE_ERROR           - Error interno de base de datos
RATE_LIMIT_EXCEEDED      - Límite de peticiones excedido
```

---

## 🛡️ MIDDLEWARES DE SEGURIDAD

1. **Autenticación**: `authenticateToken` - Verificar JWT válido
2. **Autorización por Rol**: `requireCliente` o `requireProveedor`
3. **Validaciones**: Validaciones específicas por endpoint
4. **Rate Limiting**: Límites de peticiones por IP

---

## 📊 CONSULTAS SQL BASE POR TABLA

### Para CLIENTES (company_id del usuario)
```sql
-- Sus equipos
SELECT * FROM equipments WHERE company_id = $user_company_id

-- Sus solicitudes
SELECT * FROM service_requests sr 
JOIN equipments e ON sr.equipment_id = e.equipment_id 
WHERE e.company_id = $user_company_id

-- Sus mantenimientos
SELECT * FROM maintenances m 
JOIN equipments e ON m.equipment_id = e.equipment_id 
WHERE e.company_id = $user_company_id
```

### Para PROVEEDORES (user_id en relaciones)
```sql
-- Equipos bajo su gestión
SELECT * FROM equipments WHERE equipment_id IN (
  SELECT DISTINCT equipment_id FROM service_requests 
  WHERE provider_user_id IN (SELECT user_id FROM users WHERE company_id = $provider_company_id)
)

-- Solicitudes asignadas
SELECT * FROM service_requests 
WHERE provider_user_id IN (SELECT user_id FROM users WHERE company_id = $provider_company_id)

-- Mantenimientos asignados
SELECT * FROM maintenances 
WHERE technician_user_id IN (SELECT user_id FROM users WHERE company_id = $provider_company_id)
```

Esta estructura te permitirá adaptar el frontend exactamente a lo que puede hacer cada rol.

---

## 📱 EJEMPLOS DE USO PRÁCTICO

### Cliente: Dashboard Principal
```javascript
// Obtener datos completos del dashboard
GET /api/client/dashboard
// Respuesta: métricas, alertas, equipos críticos, próximos mantenimientos

// Datos específicos para gráficos
GET /api/client/dashboard/temperature
GET /api/client/dashboard/energy
```

### Cliente: Solicitar Servicio Técnico
```javascript
// 1. Ver equipos disponibles
GET /api/client/equipments

// 2. Solicitar servicio para equipo específico
POST /api/client/equipments/123/service-request
{
  "request_type": "REPARACION",
  "priority": "ALTA", 
  "description": "Equipo no enfría correctamente",
  "preferred_date": "2025-09-15"
}

// 3. Seguimiento de la solicitud
GET /api/client/service-requests/456
```

### Proveedor: Gestionar Solicitud
```javascript
// 1. Ver solicitudes asignadas
GET /api/provider/service-requests

// 2. Asignar técnico
POST /api/provider/service-requests/456/assign
{
  "technician_id": 789,
  "scheduled_date": "2025-09-15T10:00:00Z"
}

// 3. Completar servicio
POST /api/provider/service-requests/456/complete
{
  "completion_notes": "Reemplazado compresor defectuoso",
  "parts_used": ["Compresor XYZ-123"],
  "actual_cost": 450.00
}
```
