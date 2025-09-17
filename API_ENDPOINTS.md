# 🚀 PolarNet API Documentation

## � Overview
REST API para el sistema PolarNet con arquitectura DDD y roles diferenciados:
- **PROVIDER**: Empresas que alquilan equipos de refrigeración
- **CLIENT**: Empresas que rentan equipos
- **ADMIN**: Administradores del sistema

**Base URL**: `http://localhost:3200/api`

---

## 🔐 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "PROVIDER",
      "companyId": 1
    }
  }
}
```

---

## 🏢 PROVIDER ENDPOINTS

### 📊 Dashboard
```http
GET /api/provider/dashboard               # Métricas principales
GET /api/provider/dashboard/activities    # Actividades recientes
GET /api/provider/dashboard/alerts        # Alertas críticas
GET /api/provider/dashboard/performance   # Métricas de rendimiento
```

### � Clients Management
```http
GET /api/provider/clients                 # Lista de clientes
GET /api/provider/clients/:id             # Detalle de cliente
GET /api/provider/clients/:id/analytics   # Analytics del cliente
POST /api/provider/clients/:id/notes      # Agregar notas
```

### 🔧 Equipment Management
```http
GET /api/provider/equipments              # Catálogo de equipos
POST /api/provider/equipments             # Crear equipo
GET /api/provider/equipments/:id          # Detalle de equipo
PUT /api/provider/equipments/:id          # Actualizar equipo
DELETE /api/provider/equipments/:id       # Eliminar equipo
GET /api/provider/equipments/:id/readings # Lecturas de sensores
```

### 🏠 Rentals Management
```http
GET /api/provider/rentals                 # Contratos activos
POST /api/provider/rentals                # Crear contrato
GET /api/provider/rentals/:id             # Detalle de contrato
PUT /api/provider/rentals/:id             # Actualizar contrato
PUT /api/provider/rentals/:id/terminate   # Terminar contrato
```

### �️ Service Requests
```http
GET /api/provider/service-requests        # Solicitudes de servicio
GET /api/provider/service-requests/:id    # Detalle de solicitud
PUT /api/provider/service-requests/:id/assign   # Asignar técnico
PUT /api/provider/service-requests/:id/status   # Actualizar estado
PUT /api/provider/service-requests/:id/complete # Completar servicio
```

### 🔧 Maintenance
```http
GET /api/provider/maintenances            # Mantenimientos programados
POST /api/provider/maintenances           # Crear mantenimiento
GET /api/provider/maintenances/:id        # Detalle
PUT /api/provider/maintenances/:id        # Actualizar
GET /api/provider/maintenances/calendar   # Vista calendario
```

### 💰 Invoicing
```http
GET /api/provider/invoices                # Facturas emitidas
POST /api/provider/invoices               # Crear factura
GET /api/provider/invoices/:id            # Detalle de factura
PUT /api/provider/invoices/:id/send       # Enviar por email
GET /api/provider/invoices/:id/pdf        # Descargar PDF
```

### 👤 Profile & Company
```http
GET /api/provider/profile                 # Perfil completo
PUT /api/provider/profile/user            # Actualizar usuario
PUT /api/provider/profile/company         # Actualizar empresa
GET /api/provider/company/locations       # Ubicaciones
POST /api/provider/company/locations      # Crear ubicación
```

---

## � CLIENT ENDPOINTS

### 📊 Dashboard
```http
GET /api/client/dashboard                 # Dashboard del cliente
GET /api/client/dashboard/activities      # Actividades recientes
GET /api/client/dashboard/alerts          # Alertas de equipos
GET /api/client/dashboard/energy-summary  # Resumen energético
```

### � My Equipment
```http
GET /api/client/equipments                # Equipos rentados
GET /api/client/equipments/summary        # Resumen de equipos
GET /api/client/equipments/:id            # Detalle de equipo
GET /api/client/equipments/:id/readings   # Lecturas en tiempo real
GET /api/client/equipments/:id/history    # Historial de lecturas
```

### �️ Service Requests
```http
GET /api/client/service-requests          # Mis solicitudes
POST /api/client/service-requests         # Nueva solicitud
GET /api/client/service-requests/:id      # Detalle
PUT /api/client/service-requests/:id      # Actualizar
DELETE /api/client/service-requests/:id   # Cancelar
```

### 📄 Contracts
```http
GET /api/client/contracts                 # Mis contratos
GET /api/client/contracts/summary         # Resumen financiero
GET /api/client/contracts/:id             # Detalle de contrato
GET /api/client/contracts/:id/documents   # Documentos
PUT /api/client/contracts/:id/extend      # Solicitar extensión
```

### � Invoices & Payments
```http
GET /api/client/invoices                  # Mis facturas
GET /api/client/invoices/summary          # Resumen de gastos
GET /api/client/invoices/:id              # Detalle de factura
GET /api/client/invoices/:id/pdf          # Descargar PDF
POST /api/client/invoices/:id/mark-paid   # Registrar pago
```

### 🛒 Marketplace
```http
GET /api/client/marketplace/equipments    # Buscar equipos disponibles
GET /api/client/marketplace/providers     # Proveedores certificados
POST /api/client/marketplace/quotes       # Solicitar cotización
GET /api/client/marketplace/quotes        # Mis cotizaciones
POST /api/client/marketplace/equipment-requests # Solicitar equipo específico
```

### 🏢 Company Profile
```http
GET /api/client/profile                   # Perfil empresarial
PUT /api/client/profile                   # Actualizar empresa
GET /api/client/profile/locations         # Ubicaciones/sucursales
POST /api/client/profile/locations        # Agregar ubicación
GET /api/client/profile/users             # Usuarios del equipo
POST /api/client/profile/users            # Invitar usuario
```

---

## ⚙️ ADMIN ENDPOINTS

### 👥 User Management
```http
GET /api/admin/users                      # Gestión de usuarios
POST /api/admin/users                     # Crear usuario
PUT /api/admin/users/:id                  # Actualizar usuario
DELETE /api/admin/users/:id               # Eliminar usuario
```

### 🏢 Company Management
```http
GET /api/admin/companies                  # Gestión de empresas
PUT /api/admin/companies/:id/status       # Cambiar estado empresa
```

### 📊 System Stats
```http
GET /api/admin/stats                      # Estadísticas del sistema
```

---

## 🔧 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      "Field 'email' is required"
    ]
  }
}
```

---

## 🛡️ Security

- **JWT Authentication**: Required for all endpoints except login
- **Role-based Access**: Each endpoint validates user role
- **Company Isolation**: Users only access their company's data
- **Input Validation**: All inputs validated and sanitized

---

## 📊 Common Query Parameters

```http
# Pagination
?page=1&limit=10

# Filtering
?status=ACTIVE&type=REFRIGERATOR&location=1

# Date ranges
?startDate=2024-01-01&endDate=2024-12-31

# Sorting
?sortBy=createdAt&sortOrder=DESC

# Search
?search=equipment_name
```
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
