# PolarNet Server - Guía de Configuración y Uso

## 📋 Configuración Inicial

### 1. Configurar Base de Datos
Edita el archivo `.env` con tus credenciales de PostgreSQL:

```env
# Configuración de la base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=polarnet_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password
```

### 2. Configurar JWT Secret
Cambia el JWT_SECRET en `.env` por algo más seguro:
```env
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambialo_en_produccion
```

## 🚀 Iniciar el Servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

## 🔐 Endpoints de Autenticación

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "carlosp",
  "password": "1234"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Carlos Pérez",
    "username": "carlosp",
    "email": "carlos@superlima.com",
    "role": "EMPRESA",
    "company_id": 1,
    "company_name": "Supermercado Lima Norte"
  }
}
```

### Registro
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ana García",
  "username": "anag",
  "password": "1234",
  "email": "ana@tecservices.com",
  "phone": "987654321",
  "role": "TECNICO"
}
```

### Obtener Perfil
```
GET /api/auth/profile
Authorization: Bearer tu_token_aqui
```

### Verificar Token
```
GET /api/auth/verify
Authorization: Bearer tu_token_aqui
```

## 🔧 Endpoints de Administrador

### Obtener Todos los Usuarios
```
POST /api/auth/admin/users
Content-Type: application/json

{
  "admin_password": "polarnetadmin"
}
```

### Verificar Conexión a Base de Datos
```
POST /api/auth/admin/db-status
Content-Type: application/json

{
  "admin_password": "polarnetadmin"
}
```

**Respuesta exitosa de db-status:**
```json
{
  "success": true,
  "message": "Conexión a base de datos exitosa",
  "database_info": {
    "server_time": "2025-09-04T...",
    "postgres_version": "PostgreSQL 15.x...",
    "total_users": 2,
    "total_companies": 1,
    "total_equipments": 1
  },
  "environment": {
    "db_host": "localhost",
    "db_name": "polarnet_db",
    "db_user": "tu_usuario"
  }
}
```

## 🔧 Endpoints de Equipos

### Obtener Equipos
```
GET /api/equipments
Authorization: Bearer tu_token_aqui

# Filtros opcionales:
GET /api/equipments?status=OK&type=Freezer
```

### Obtener Equipo Específico
```
GET /api/equipments/1
Authorization: Bearer tu_token_aqui
```

### Obtener Lecturas de Temperatura
```
GET /api/equipments/1/temperature
Authorization: Bearer tu_token_aqui

# Con filtros de fecha:
GET /api/equipments/1/temperature?from_date=2025-09-01&to_date=2025-09-04&limit=100
```

### Obtener Lecturas de Energía
```
GET /api/equipments/1/energy
Authorization: Bearer tu_token_aqui
```

## 🔧 Endpoints de Servicios

### Obtener Solicitudes de Servicio
```
GET /api/services
Authorization: Bearer tu_token_aqui

# Filtros:
GET /api/services?status=OPEN&priority=HIGH
```

### Crear Solicitud de Servicio (Solo Empresas)
```
POST /api/services
Authorization: Bearer tu_token_empresa
Content-Type: application/json

{
  "description": "El equipo no llega a la temperatura mínima",
  "priority": "HIGH",
  "issue_type": "COOLING",
  "equipment_id": 1
}
```

### Asignar Técnico (Solo Técnicos)
```
PUT /api/services/1/assign
Authorization: Bearer tu_token_tecnico
```

### Actualizar Estado
```
PUT /api/services/1/status
Authorization: Bearer tu_token
Content-Type: application/json

{
  "status": "COMPLETED",
  "notes": "Problema resuelto, se cambió el termostato"
}
```

## 🏢 Roles y Permisos

### EMPRESA
- Ver solo sus propios equipos
- Crear solicitudes de servicio
- Ver solo sus propias solicitudes
- Actualizar estado de sus solicitudes

### TECNICO
- Ver equipos de todas las empresas
- Ver solicitudes asignadas o sin asignar
- Asignarse solicitudes
- Actualizar estado de solicitudes asignadas

## 🧪 Datos de Prueba

Usa estos usuarios para probar:

**Empresa:**
- Username: `carlosp`
- Password: `1234`
- Role: EMPRESA

**Técnico:**
- Username: `juant`
- Password: `abcd`
- Role: TECNICO

## ⚡ Ejemplos de Uso con curl

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"carlosp","password":"1234"}'
```

### 2. Obtener Equipos (guarda el token del login)
```bash
curl -X GET http://localhost:3000/api/equipments \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 3. Crear Solicitud de Servicio
```bash
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer TU_TOKEN_EMPRESA" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Equipo presenta ruidos extraños",
    "priority": "MEDIUM",
    "issue_type": "MECHANICAL",
    "equipment_id": 1
  }'
```

## 🔍 Estados y Valores Permitidos

### Estados de Equipos
- `OK`, `WARNING`, `ERROR`, `MAINTENANCE`

### Prioridades de Servicio
- `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

### Estados de Solicitud
- `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

### Tipos de Problema
- `COOLING`, `HEATING`, `ELECTRICAL`, `MECHANICAL`, `OTHER`

## 🛠️ Estructura del Proyecto

```
polarnet-server/
├── app.js                 # Configuración principal de Express
├── package.json           # Dependencias y scripts
├── .env                   # Variables de entorno
├── controllers/           # Lógica de negocio
│   ├── authController.js
│   ├── equipmentController.js
│   └── serviceController.js
├── routes/                # Definición de rutas
│   ├── auth.js
│   ├── equipments.js
│   └── services.js
├── helpers/               # Middlewares y utilidades
│   └── auth.js
└── lib/                   # Configuración de servicios
    └── database.js
```
"# PolarNet-Server" 
