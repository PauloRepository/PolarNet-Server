-- ==============================
-- NUEVA ESTRUCTURA DE APIs POLARNET - MARKETPLACE MODEL
-- ==============================

-- =====================================
-- ENDPOINTS PARA PROVIDERS
-- =====================================

## 📊 DASHBOARD APIs
GET    /api/provider/dashboard                    # Dashboard principal con métricas
GET    /api/provider/dashboard/stats              # Estadísticas generales
GET    /api/provider/dashboard/recent-activity    # Actividad reciente
GET    /api/provider/dashboard/alerts             # Alertas críticas

## 🏢 COMPANY PROFILE APIs (NUEVO)
GET    /api/provider/company                      # Datos de la empresa proveedora
PUT    /api/provider/company                      # Actualizar datos de empresa
GET    /api/provider/company/locations            # Ubicaciones de la empresa
POST   /api/provider/company/locations            # Agregar nueva ubicación
PUT    /api/provider/company/locations/:id        # Actualizar ubicación
DELETE /api/provider/company/locations/:id        # Eliminar ubicación

## 👥 COMPANY USERS APIs (NUEVO)
GET    /api/provider/company/users                # Usuarios de la empresa
POST   /api/provider/company/users                # Agregar nuevo usuario
PUT    /api/provider/company/users/:id            # Actualizar usuario
DELETE /api/provider/company/users/:id            # Eliminar usuario
PUT    /api/provider/company/users/:id/activate   # Activar/desactivar usuario

## 👤 USER PROFILE APIs (MODIFICADO)
GET    /api/provider/profile                      # Perfil del usuario actual
PUT    /api/provider/profile                      # Actualizar perfil personal
PUT    /api/provider/profile/password             # Cambiar contraseña

## 🔧 EQUIPMENTS APIs (COMPLETAMENTE REESCRITO)
GET    /api/provider/equipments                   # Catálogo de equipos propios
POST   /api/provider/equipments                   # Agregar nuevo equipo
GET    /api/provider/equipments/:id               # Detalle de equipo específico
PUT    /api/provider/equipments/:id               # Actualizar equipo
DELETE /api/provider/equipments/:id               # Eliminar equipo
PUT    /api/provider/equipments/:id/status        # Cambiar estado (AVAILABLE, MAINTENANCE, etc.)
PUT    /api/provider/equipments/:id/pricing       # Actualizar precios
POST   /api/provider/equipments/:id/images        # Subir imágenes
DELETE /api/provider/equipments/:id/images/:imageId # Eliminar imagen
POST   /api/provider/equipments/:id/documents     # Subir documentos
GET    /api/provider/equipments/:id/readings      # Lecturas de sensores
POST   /api/provider/equipments/:id/readings      # Agregar lectura manual

## 📋 EQUIPMENT REQUESTS APIs (NUEVO - MARKETPLACE)
GET    /api/provider/equipment-requests           # Solicitudes de renta/compra recibidas
GET    /api/provider/equipment-requests/:id       # Detalle de solicitud
PUT    /api/provider/equipment-requests/:id/approve   # Aprobar solicitud
PUT    /api/provider/equipment-requests/:id/reject    # Rechazar solicitud
PUT    /api/provider/equipment-requests/:id/negotiate # Negociar términos

## 🏠 RENTALS APIs (COMPLETAMENTE REESCRITO)
GET    /api/provider/rentals                      # Contratos de renta activos
GET    /api/provider/rentals/:id                  # Detalle de contrato
PUT    /api/provider/rentals/:id                  # Actualizar contrato
POST   /api/provider/rentals/:id/terminate        # Terminar contrato
GET    /api/provider/rentals/payments             # Historial de pagos
POST   /api/provider/rentals/:id/invoice          # Generar factura

## 👥 CLIENTS APIs (COMPLETAMENTE REESCRITO)
GET    /api/provider/clients                      # Empresas cliente
GET    /api/provider/clients/:id                  # Detalle de empresa cliente
GET    /api/provider/clients/:id/users            # Usuarios de la empresa cliente
GET    /api/provider/clients/:id/locations        # Ubicaciones del cliente
GET    /api/provider/clients/:id/equipments       # Equipos rentados al cliente
GET    /api/provider/clients/:id/services         # Historial de servicios
GET    /api/provider/clients/:id/invoices         # Facturas del cliente

## 📋 SERVICE REQUESTS APIs (MODIFICADO)
GET    /api/provider/service-requests             # Solicitudes de servicio
POST   /api/provider/service-requests             # Crear nueva solicitud
GET    /api/provider/service-requests/:id         # Detalle de solicitud
PUT    /api/provider/service-requests/:id         # Actualizar solicitud
PUT    /api/provider/service-requests/:id/assign  # Asignar técnico
PUT    /api/provider/service-requests/:id/complete # Completar servicio
POST   /api/provider/service-requests/:id/photos  # Subir fotos del trabajo
GET    /api/provider/service-requests/stats       # Estadísticas de servicios

## 🔧 MAINTENANCES APIs (MODIFICADO)
GET    /api/provider/maintenances                 # Mantenimientos programados
POST   /api/provider/maintenances                 # Crear mantenimiento
GET    /api/provider/maintenances/:id             # Detalle de mantenimiento
PUT    /api/provider/maintenances/:id             # Actualizar mantenimiento
DELETE /api/provider/maintenances/:id             # Eliminar mantenimiento
PUT    /api/provider/maintenances/:id/start       # Iniciar mantenimiento
PUT    /api/provider/maintenances/:id/complete    # Completar mantenimiento
GET    /api/provider/maintenances/calendar        # Vista de calendario

## 💰 INVOICES APIs (NUEVO)
GET    /api/provider/invoices                     # Facturas emitidas
POST   /api/provider/invoices                     # Crear nueva factura
GET    /api/provider/invoices/:id                 # Detalle de factura
PUT    /api/provider/invoices/:id                 # Actualizar factura
POST   /api/provider/invoices/:id/send            # Enviar factura por email
PUT    /api/provider/invoices/:id/payment         # Registrar pago
GET    /api/provider/invoices/:id/pdf             # Descargar PDF

## 📊 ANALYTICS APIs (NUEVO)
GET    /api/provider/analytics/revenue            # Análisis de ingresos
GET    /api/provider/analytics/equipment          # Performance de equipos
GET    /api/provider/analytics/clients            # Análisis de clientes
GET    /api/provider/analytics/services           # Análisis de servicios

## 🔔 NOTIFICATIONS APIs (MODIFICADO)
GET    /api/provider/notifications                # Notificaciones
PUT    /api/provider/notifications/:id/read       # Marcar como leída
PUT    /api/provider/notifications/mark-all-read  # Marcar todas como leídas
DELETE /api/provider/notifications/:id            # Eliminar notificación

## 📋 SUBSCRIPTIONS APIs (NUEVO)
GET    /api/provider/subscription                 # Suscripción actual
GET    /api/provider/subscription/plans           # Planes disponibles
PUT    /api/provider/subscription/upgrade         # Cambiar plan
GET    /api/provider/subscription/usage           # Uso actual vs límites

-- =====================================
-- ENDPOINTS PARA CLIENTS (NUEVOS)
-- =====================================

## 📊 CLIENT DASHBOARD APIs
GET    /api/client/dashboard                      # Dashboard del cliente
GET    /api/client/dashboard/stats                # Estadísticas
GET    /api/client/dashboard/alerts               # Alertas de equipos

## 🏢 CLIENT COMPANY APIs
GET    /api/client/company                        # Datos de la empresa cliente
PUT    /api/client/company                        # Actualizar empresa
GET    /api/client/company/locations              # Ubicaciones
POST   /api/client/company/locations              # Agregar ubicación
PUT    /api/client/company/locations/:id          # Actualizar ubicación

## 👥 CLIENT USERS APIs
GET    /api/client/company/users                  # Usuarios de la empresa
POST   /api/client/company/users                  # Agregar usuario
PUT    /api/client/company/users/:id              # Actualizar usuario

## 🛒 MARKETPLACE APIs (NUEVOS)
GET    /api/client/marketplace/equipments         # Catálogo de equipos disponibles
GET    /api/client/marketplace/equipments/:id     # Detalle de equipo
POST   /api/client/marketplace/equipments/:id/request # Solicitar renta/compra
GET    /api/client/marketplace/providers          # Lista de proveedores
GET    /api/client/marketplace/providers/:id      # Detalle de proveedor

## 📋 CLIENT REQUESTS APIs
GET    /api/client/requests                       # Mis solicitudes
GET    /api/client/requests/:id                   # Detalle de solicitud
PUT    /api/client/requests/:id/cancel            # Cancelar solicitud
POST   /api/client/requests/:id/review            # Calificar servicio

## 🏠 CLIENT RENTALS APIs
GET    /api/client/rentals                        # Mis rentas activas
GET    /api/client/rentals/:id                    # Detalle de renta
GET    /api/client/rentals/:id/invoices           # Facturas de la renta

## 🔧 CLIENT EQUIPMENTS APIs
GET    /api/client/equipments                     # Equipos que tengo rentados
GET    /api/client/equipments/:id                 # Detalle de equipo rentado
GET    /api/client/equipments/:id/readings        # Lecturas del equipo
POST   /api/client/equipments/:id/service-request # Solicitar servicio

## 📋 CLIENT SERVICES APIs
GET    /api/client/services                       # Mis solicitudes de servicio
POST   /api/client/services                       # Nueva solicitud de servicio
GET    /api/client/services/:id                   # Detalle de servicio
POST   /api/client/services/:id/feedback          # Dar feedback

## 💰 CLIENT INVOICES APIs
GET    /api/client/invoices                       # Facturas recibidas
GET    /api/client/invoices/:id                   # Detalle de factura
GET    /api/client/invoices/:id/pdf               # Descargar PDF

-- =====================================
-- ENDPOINTS COMPARTIDOS/GENERALES
-- =====================================

## 🔐 AUTH APIs (MODIFICADO PARA EMPRESAS)
POST   /api/auth/register/company                 # Registro de empresa + usuario
POST   /api/auth/login                           # Login (sin cambios)
POST   /api/auth/logout                          # Logout (sin cambios)
POST   /api/auth/refresh                         # Refresh token (sin cambios)
POST   /api/auth/forgot-password                 # Recuperar contraseña (sin cambios)
POST   /api/auth/reset-password                  # Resetear contraseña (sin cambios)

## 📍 LOCATIONS APIs (NUEVO)
GET    /api/locations/search                     # Buscar ubicaciones
POST   /api/locations/validate                   # Validar dirección
GET    /api/locations/:id/nearby                 # Ubicaciones cercanas

## 📋 PLANS APIs (NUEVO)
GET    /api/plans                                # Planes disponibles
GET    /api/plans/:id                            # Detalle de plan

-- =====================================
-- ENDPOINTS QUE SE ELIMINAN
-- =====================================

❌ ELIMINADOS (ya no son necesarios):
- /api/provider/temperatures/*          # Ahora integrado en equipments
- /api/provider/energy/*                # Ahora integrado en equipments  
- /api/admin/*                          # Admin será módulo separado
- Cualquier endpoint que maneje usuarios individuales sin empresa

-- =====================================
-- ESTRUCTURA DE RESPUESTAS ESTÁNDAR
-- =====================================

## ✅ Respuesta Exitosa
{
  "success": true,
  "data": { ... },
  "mensajeAviso": "Operación exitosa",
  "timestamp": "2024-09-11T10:30:00Z"
}

## ❌ Respuesta de Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error",
    "details": { ... }
  },
  "timestamp": "2024-09-11T10:30:00Z"
}

## 📄 Respuesta con Paginación
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 48,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "mensajeAviso": "Datos obtenidos exitosamente"
}
