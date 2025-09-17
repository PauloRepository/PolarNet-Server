# 🚀 PolarNet Server

**Plataforma B2B para gestión de equipos de refrigeración industrial**

> Sistema completo con arquitectura DDD para proveedores y clientes de equipos de refrigeración, incluyendo monitoreo IoT, gestión de contratos, facturación y marketplace.

## 🏗️ Arquitectura

**Domain-Driven Design (DDD)** con 4 capas bien definidas:

```
src/
├── 🔹 domain/           # Lógica de negocio pura
├── 🎯 application/      # Casos de uso y coordinación  
├── 🔧 infrastructure/   # Implementaciones técnicas
└── 🌐 interfaces/       # Controllers y rutas HTTP
```

## 🎯 Roles del Sistema

- **👤 CLIENT**: Empresas que rentan equipos de refrigeración
- **🏢 PROVIDER**: Empresas que proveen equipos y servicios  
- **⚙️ ADMIN**: Administradores del sistema

## 🚀 Quick Start

### 1. Configuración
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

### 2. Base de Datos
```env
# .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=polarnet_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password
JWT_SECRET=tu_jwt_secret_muy_seguro
```

### 3. Iniciar Servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start

# Con PM2
npx pm2 start ecosystem.config.js
```

**Servidor corriendo en**: `http://localhost:3200`

## 🔐 Autenticación

```javascript
// Login
POST /api/auth/login
{
  "email": "user@example.com", 
  "password": "password123"
}

// Response
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

## 📊 Endpoints Principales

### 🏢 Provider Endpoints
```http
GET /api/provider/dashboard          # Dashboard con métricas
GET /api/provider/equipments         # Gestión de equipos
GET /api/provider/clients            # Gestión de clientes
GET /api/provider/rentals            # Contratos de renta
GET /api/provider/service-requests   # Solicitudes de servicio
GET /api/provider/maintenances       # Mantenimientos programados
GET /api/provider/invoices           # Facturación
```

### 👤 Client Endpoints  
```http
GET /api/client/dashboard            # Dashboard del cliente
GET /api/client/equipments           # Mis equipos rentados
GET /api/client/service-requests     # Mis solicitudes de servicio
GET /api/client/contracts            # Mis contratos
GET /api/client/invoices             # Mis facturas
GET /api/client/marketplace          # Buscar equipos disponibles
```

### ⚙️ Admin Endpoints
```http
GET /api/admin/users                 # Gestión de usuarios
GET /api/admin/companies             # Gestión de empresas
GET /api/admin/stats                 # Estadísticas del sistema
```

## 🛡️ Seguridad

- **JWT Authentication**: Requerido para todos los endpoints
- **Role-based Access Control**: Validación por roles
- **Company Isolation**: Los usuarios solo acceden a datos de su empresa
- **Input Validation**: Validación completa de todos los inputs

## 🔧 Tecnologías

- **Backend**: Node.js + Express.js
- **Base de Datos**: PostgreSQL  
- **Autenticación**: JWT
- **Arquitectura**: Domain-Driven Design (DDD)
- **Process Manager**: PM2
- **Validación**: Joi / Express-validator

## 📁 Estructura del Proyecto

```
├── src/
│   ├── domain/              # Entidades y lógica de negocio
│   ├── application/         # Casos de uso
│   ├── infrastructure/      # Conexiones BD, repositorios
│   ├── interfaces/          # Controllers HTTP por roles
│   └── shared/              # Helpers compartidos
├── bin/www                  # Punto de entrada del servidor
├── ecosystem.config.js      # Configuración PM2
└── package.json
```

## 📚 Documentación Completa

- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)**: Documentación completa de todos los endpoints
- **Tests**: Ejecutar con `npm test`
- **Logs**: Disponibles en `/logs` y con `npx pm2 logs`

## 🚀 Deploy

### Desarrollo
```bash
npm run dev
```

### Producción con PM2
```bash
npx pm2 start ecosystem.config.js
npx pm2 save
npx pm2 startup
```

### Monitoreo
```bash
npx pm2 status      # Estado de procesos
npx pm2 logs        # Ver logs
npx pm2 monit       # Monitor en tiempo real
```

## 🎯 Características Principales

### Para Providers 🏢
- ✅ Dashboard con KPIs de negocio
- ✅ Gestión completa de equipos (CRUD + IoT)
- ✅ Gestión de clientes y contratos
- ✅ Programación de mantenimientos
- ✅ Sistema de facturación completo
- ✅ Seguimiento de servicios técnicos

### Para Clients 👤  
- ✅ Dashboard de equipos rentados
- ✅ Monitoreo en tiempo real (temperatura, energía)
- ✅ Solicitudes de servicio
- ✅ Gestión de contratos y facturas
- ✅ Marketplace para buscar equipos
- ✅ Gestión empresarial multi-ubicación

### Para Admins ⚙️
- ✅ Gestión de usuarios y empresas
- ✅ Estadísticas globales del sistema
- ✅ Configuración y mantenimiento

## 🔄 Status del Proyecto

**Estado**: ✅ **PRODUCCIÓN READY**
- ✅ Arquitectura DDD completa implementada
- ✅ Todos los endpoints de Provider funcionando
- ✅ Endpoints de Client implementados  
- ✅ Sistema de autenticación robusto
- ✅ Base de datos optimizada
- ✅ Validaciones y seguridad completas
- ✅ Documentación actualizada

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## 📞 Soporte

- **Email**: soporte@polarnet.com
- **Issues**: GitHub Issues
- **Docs**: Ver `API_ENDPOINTS.md` para documentación completa

---

**PolarNet Server v2.0** - Arquitectura empresarial con DDD, lista para producción 🚀 
