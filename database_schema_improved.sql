-- ==============================
-- ESQUEMA MEJORADO POLARNET - MARKETPLACE MODEL
-- ==============================

-- Tabla base de empresas/organizaciones
CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'CLIENT',  -- CLIENT, PROVIDER
    tax_id VARCHAR(50) UNIQUE,                   -- RUT, NIT, Tax ID
    phone VARCHAR(30),
    email VARCHAR(150),
    address VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Chile',
    website VARCHAR(200),
    description TEXT,
    logo_url VARCHAR(500),
    business_type VARCHAR(100),                  -- Retail, Industrial, etc.
    specialization VARCHAR(150),                 -- Para providers: HVAC, Electrical, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios del sistema
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(30) NOT NULL,                   -- ADMIN, PROVIDER, CLIENT
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Planes de suscripción
CREATE TABLE plans (
    plan_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL,         -- MONTHLY, YEARLY
    max_equipments INT NOT NULL,
    max_users INT,
    max_storage_gb INT,
    target_type VARCHAR(20) NOT NULL,           -- CLIENT, PROVIDER
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Características de los planes
CREATE TABLE plan_features (
    plan_feature_id SERIAL PRIMARY KEY,
    feature_key VARCHAR(100) NOT NULL,          -- equipment_monitoring, maintenance_scheduling, etc.
    description VARCHAR(150) NOT NULL,
    plan_id INT REFERENCES plans(plan_id) ON DELETE CASCADE
);

-- Suscripciones activas
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    plan_id INT REFERENCES plans(plan_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, CANCELLED
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ubicaciones de equipos
CREATE TABLE equipment_locations (
    equipment_location_id SERIAL PRIMARY KEY,
    name VARCHAR(150),                           -- Nombre del sitio/sucursal
    address VARCHAR(200) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Chile',
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    contact_person VARCHAR(150),
    contact_phone VARCHAR(30),
    contact_email VARCHAR(150),
    company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Catálogo de equipos (Marketplace)
CREATE TABLE equipments (
    equipment_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,                  -- FREEZER, AC, HEAT_PUMP, etc.
    category VARCHAR(100),                       -- REFRIGERATION, HVAC, etc.
    model VARCHAR(100),
    serial_number VARCHAR(100),
    manufacturer VARCHAR(100),
    code VARCHAR(100),
    
    -- Especificaciones técnicas
    technical_specs JSONB,                       -- Flexibilidad para diferentes tipos
    optimal_temperature DECIMAL(5,2),
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    power_watts INT,
    energy_consumption_kwh DECIMAL(8,2),
    drive_type VARCHAR(50),
    cooling_type VARCHAR(50),
    dimensions JSONB,                            -- {width, height, depth, weight}
    
    -- Estado y disponibilidad
    status VARCHAR(50) DEFAULT 'AVAILABLE',      -- AVAILABLE, RENTED, MAINTENANCE, INACTIVE
    condition VARCHAR(50) DEFAULT 'NEW',         -- NEW, USED, REFURBISHED
    availability_status VARCHAR(50) DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, UNAVAILABLE
    
    -- Información del marketplace
    owner_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE, -- Proveedor dueño
    current_location_id INT REFERENCES equipment_locations(equipment_location_id),
    rental_price_daily DECIMAL(10,2),
    rental_price_monthly DECIMAL(10,2),
    purchase_price DECIMAL(12,2),
    year_manufactured INT,
    warranty_expiry DATE,
    
    -- Metadatos
    images JSONB,                                -- Array de URLs de imágenes
    documents JSONB,                             -- Manuales, certificados, etc.
    tags VARCHAR(500),                           -- Para búsquedas
    notes TEXT,
    
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Solicitudes de renta/compra (Marketplace)
CREATE TABLE equipment_requests (
    request_id SERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL,                   -- RENTAL, PURCHASE, SERVICE
    status VARCHAR(30) DEFAULT 'PENDING',        -- PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED
    
    -- Información del solicitante (cliente)
    client_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    client_user_id INT REFERENCES users(user_id),
    
    -- Información del proveedor
    provider_company_id INT REFERENCES companies(company_id),
    equipment_id INT REFERENCES equipments(equipment_id) ON DELETE CASCADE,
    
    -- Detalles de la solicitud
    quantity INT DEFAULT 1,
    start_date DATE,
    end_date DATE,
    delivery_location_id INT REFERENCES equipment_locations(equipment_location_id),
    
    -- Precios y términos
    unit_price DECIMAL(10,2),
    total_price DECIMAL(12,2),
    deposit_amount DECIMAL(10,2),
    terms_conditions TEXT,
    special_requirements TEXT,
    
    -- Fechas importantes
    requested_date TIMESTAMP DEFAULT NOW(),
    approved_date TIMESTAMP,
    delivery_date TIMESTAMP,
    return_date TIMESTAMP,
    
    -- Notas y comunicación
    client_notes TEXT,
    provider_notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contratos activos (rentas confirmadas)
CREATE TABLE active_rentals (
    rental_id SERIAL PRIMARY KEY,
    request_id INT REFERENCES equipment_requests(request_id),
    
    -- Partes involucradas
    client_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    provider_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    equipment_id INT REFERENCES equipments(equipment_id) ON DELETE CASCADE,
    
    -- Términos del contrato
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    daily_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    total_amount DECIMAL(12,2),
    deposit_paid DECIMAL(10,2),
    
    -- Estado del contrato
    status VARCHAR(30) DEFAULT 'ACTIVE',         -- ACTIVE, COMPLETED, TERMINATED, DEFAULTED
    payment_status VARCHAR(30) DEFAULT 'CURRENT', -- CURRENT, OVERDUE, PAID
    
    -- Ubicación actual
    current_location_id INT REFERENCES equipment_locations(equipment_location_id),
    
    -- Condiciones y notas
    contract_terms TEXT,
    delivery_notes TEXT,
    return_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lecturas de temperatura
CREATE TABLE temperature_readings (
    temperature_reading_id SERIAL PRIMARY KEY,
    value DECIMAL(5,2) NOT NULL,
    status VARCHAR(50),
    alert_triggered BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    equipment_id INT REFERENCES equipments(equipment_id) ON DELETE CASCADE
);

-- Promedios diarios de temperatura (para reportes)
CREATE TABLE daily_temperature_averages (
    daily_temperature_average_id SERIAL PRIMARY KEY,
    avg_temperature DECIMAL(5,2),
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    readings_count INT DEFAULT 0,
    date DATE NOT NULL,
    equipment_id INT REFERENCES equipments(equipment_id) ON DELETE CASCADE,
    
    UNIQUE(equipment_id, date)
);

-- Lecturas de energía
CREATE TABLE energy_readings (
    energy_reading_id SERIAL PRIMARY KEY,
    consumption_kwh DECIMAL(10,3),              -- Consumo en kWh
    power_watts DECIMAL(10,2),                  -- Potencia instantánea
    voltage DECIMAL(6,2),
    current_amps DECIMAL(8,3),
    frequency_hz DECIMAL(5,2),
    power_factor DECIMAL(4,3),
    usage_minutes INT,                          -- Tiempo de uso en minutos
    cost_estimate DECIMAL(10,2),               -- Costo estimado
    status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    equipment_id INT REFERENCES equipments(equipment_id) ON DELETE CASCADE
);

-- Solicitudes de servicio (Marketplace de servicios)
CREATE TABLE service_requests (
    service_request_id SERIAL PRIMARY KEY,
    
    -- Información básica
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(30) DEFAULT 'MEDIUM',       -- LOW, MEDIUM, HIGH, CRITICAL
    issue_type VARCHAR(50),                      -- ELECTRICAL, COOLING, MECHANICAL, INSTALLATION, etc.
    category VARCHAR(50),                        -- REPAIR, MAINTENANCE, INSTALLATION, CONSULTATION
    
    -- Fechas
    request_date TIMESTAMP DEFAULT NOW(),
    scheduled_date TIMESTAMP,
    completion_date TIMESTAMP,
    deadline_date TIMESTAMP,
    
    -- Estado
    status VARCHAR(30) DEFAULT 'OPEN',           -- OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, CLOSED
    
    -- Partes involucradas
    client_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    client_user_id INT REFERENCES users(user_id),
    provider_company_id INT REFERENCES companies(company_id),
    technician_id INT REFERENCES users(user_id), -- Técnico asignado
    
    -- Equipo relacionado
    equipment_id INT REFERENCES equipments(equipment_id),
    location_id INT REFERENCES equipment_locations(equipment_location_id),
    
    -- Información comercial
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'CLP',
    
    -- Evaluación y seguimiento
    client_rating INT CHECK (client_rating >= 1 AND client_rating <= 5),
    client_feedback TEXT,
    provider_rating INT CHECK (provider_rating >= 1 AND provider_rating <= 5),
    provider_feedback TEXT,
    
    -- Archivos y documentos
    attachments JSONB,                           -- URLs de archivos adjuntos
    completion_photos JSONB,                     -- Fotos del trabajo completado
    
    -- Notas internas
    internal_notes TEXT,
    client_notes TEXT,
    technician_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Mantenimientos programados
CREATE TABLE maintenances (
    maintenance_id SERIAL PRIMARY KEY,
    
    -- Información básica
    title VARCHAR(200),
    description TEXT,
    type VARCHAR(50) NOT NULL,                   -- PREVENTIVE, CORRECTIVE, EMERGENCY
    category VARCHAR(50),                        -- CLEANING, INSPECTION, REPAIR, REPLACEMENT
    
    -- Programación
    scheduled_date DATE NOT NULL,
    estimated_duration_hours INT,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    next_scheduled_date DATE,
    
    -- Estado
    status VARCHAR(30) DEFAULT 'SCHEDULED',      -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED
    
    -- Relaciones
    equipment_id INT REFERENCES equipments(equipment_id) ON DELETE CASCADE,
    service_request_id INT REFERENCES service_requests(service_request_id),
    technician_id INT REFERENCES users(user_id),
    client_company_id INT REFERENCES companies(company_id),
    provider_company_id INT REFERENCES companies(company_id),
    
    -- Costos y recursos
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    parts_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    
    -- Detalles técnicos
    work_performed TEXT,
    parts_used JSONB,                            -- Lista de partes/repuestos usados
    findings TEXT,                               -- Hallazgos durante el mantenimiento
    recommendations TEXT,                        -- Recomendaciones para el futuro
    
    -- Archivos
    before_photos JSONB,
    after_photos JSONB,
    documents JSONB,                             -- Reportes, certificados, etc.
    
    -- Evaluación
    quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
    client_satisfaction INT CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sistema de notificaciones
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,                   -- ALERT, INFO, WARNING, SUCCESS, REMINDER
    category VARCHAR(50),                        -- EQUIPMENT, SERVICE, PAYMENT, SYSTEM, MAINTENANCE
    priority VARCHAR(30) DEFAULT 'NORMAL',       -- LOW, NORMAL, HIGH, URGENT
    
    -- Destinatario
    recipient_user_id INT REFERENCES users(user_id),
    recipient_company_id INT REFERENCES companies(company_id),
    
    -- Relaciones contextuales
    equipment_id INT REFERENCES equipments(equipment_id),
    service_request_id INT REFERENCES service_requests(service_request_id),
    maintenance_id INT REFERENCES maintenances(maintenance_id),
    rental_id INT REFERENCES active_rentals(rental_id),
    
    -- Estado y acciones
    status VARCHAR(30) DEFAULT 'UNREAD',         -- UNREAD, READ, DISMISSED, ARCHIVED
    action_required BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),                     -- URL para acción específica
    action_label VARCHAR(100),                   -- Texto del botón de acción
    
    -- Programación
    scheduled_send TIMESTAMP,                    -- Para notificaciones programadas
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- TABLAS PARA RPA Y AUTOMATIZACIÓN
-- ==============================

-- Procesos RPA disponibles
CREATE TABLE rpa_processes (
    process_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),                        -- REPORTING, DATA_SYNC, NOTIFICATION, etc.
    input_schema JSONB,                          -- Schema de los datos de entrada esperados
    output_schema JSONB,                         -- Schema de los datos de salida
    execution_timeout_minutes INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Jobs de RPA en ejecución
CREATE TABLE rpa_jobs (
    rpa_job_id SERIAL PRIMARY KEY,
    process_id INT REFERENCES rpa_processes(process_id),
    
    -- Información del job
    name VARCHAR(100),
    type VARCHAR(50) NOT NULL,                   -- REPORT, SYNC, NOTIFICATION, MAINTENANCE_REPORT
    priority VARCHAR(30) DEFAULT 'NORMAL',       -- LOW, NORMAL, HIGH, URGENT
    
    -- Estado y ejecución
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED', -- QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress_percentage INT DEFAULT 0,
    
    -- Datos y resultados
    input_payload JSONB,                         -- Datos de entrada
    output_result JSONB,                         -- Resultado de la ejecución
    result_files JSONB,                          -- URLs de archivos generados
    error_details JSONB,                         -- Detalles del error si falla
    
    -- Relaciones contextuales
    triggered_by_user_id INT REFERENCES users(user_id),
    company_id INT REFERENCES companies(company_id),
    service_request_id INT REFERENCES service_requests(service_request_id),
    maintenance_id INT REFERENCES maintenances(maintenance_id),
    equipment_id INT REFERENCES equipments(equipment_id),
    
    -- Tiempos
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Logs detallados de ejecución RPA
CREATE TABLE rpa_job_logs (
    log_id SERIAL PRIMARY KEY,
    rpa_job_id INT REFERENCES rpa_jobs(rpa_job_id) ON DELETE CASCADE,
    
    -- Información del log
    step_name VARCHAR(100) NOT NULL,
    step_order INT,
    level VARCHAR(20) DEFAULT 'INFO',            -- DEBUG, INFO, WARN, ERROR
    status VARCHAR(20) NOT NULL,                 -- STARTED, SUCCESS, WARNING, ERROR, SKIPPED
    
    -- Contenido
    message TEXT,
    details JSONB,                               -- Datos adicionales estructurados
    duration_ms INT,                             -- Duración del paso en milisegundos
    
    -- Archivos generados en este paso
    output_files JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================
-- TABLAS DE FACTURACIÓN Y PAGOS
-- ==============================

-- Facturas generadas
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Partes involucradas
    provider_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    client_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    
    -- Información de la factura
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms VARCHAR(100),                  -- "Net 30", "COD", etc.
    
    -- Montos
    subtotal DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.19,         -- IVA 19%
    tax_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP',
    
    -- Estado
    status VARCHAR(30) DEFAULT 'PENDING',        -- PENDING, PAID, OVERDUE, CANCELLED, REFUNDED
    payment_method VARCHAR(50),                  -- TRANSFER, CREDIT_CARD, CASH, CHECK
    
    -- Referencias
    rental_id INT REFERENCES active_rentals(rental_id),
    service_request_id INT REFERENCES service_requests(service_request_id),
    
    -- Archivos
    pdf_url VARCHAR(500),
    xml_url VARCHAR(500),                        -- Para facturación electrónica
    
    -- Fechas de pago
    paid_date DATE,
    paid_amount DECIMAL(12,2),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Líneas de detalle de facturas
CREATE TABLE invoice_line_items (
    line_item_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    
    -- Detalle del item
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    
    -- Referencias
    equipment_id INT REFERENCES equipments(equipment_id),
    service_type VARCHAR(50),                    -- RENTAL, SERVICE, MAINTENANCE, PARTS
    
    -- Fechas de servicio
    service_start_date DATE,
    service_end_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW()
);