-- ==============================
-- DATOS DE PRUEBA POLARNET - MARKETPLACE MODEL
-- ==============================

-- ========================================
-- 1. EMPRESAS DE PRUEBA
-- ========================================

-- Empresa Cliente (Supermercado)
INSERT INTO companies (
    name, type, tax_id, phone, email, address, city, state, 
    postal_code, country, website, description, business_type, is_active
) VALUES (
    'SuperMercado Los Andes S.A.', 
    'CLIENT', 
    '76.123.456-7', 
    '+56987654321', 
    'contacto@superlosandes.cl', 
    'Av. Las Condes 12345', 
    'Santiago', 
    'Región Metropolitana', 
    '7550000', 
    'Chile', 
    'https://www.superlosandes.cl', 
    'Cadena de supermercados con 15 sucursales en Santiago. Especializada en productos frescos y congelados. Necesitamos servicios de refrigeración industrial para mantener la cadena de frío.', 
    'Retail - Supermercados', 
    true
);

-- Empresa Proveedora (Servicios de Refrigeración)
INSERT INTO companies (
    name, type, tax_id, phone, email, address, city, state, 
    postal_code, country, website, description, business_type, specialization, is_active
) VALUES (
    'FrioTech Servicios Industriales Ltda.', 
    'PROVIDER', 
    '77.987.654-3', 
    '+56912345678', 
    'ventas@friotech.cl', 
    'Av. Industrial 8888, Quilicura', 
    'Santiago', 
    'Región Metropolitana', 
    '8730000', 
    'Chile', 
    'https://www.friotech.cl', 
    'Empresa líder en servicios de refrigeración industrial con 20+ años de experiencia. Ofrecemos equipos, mantención, instalación y monitoreo 24/7. Certificados por principales marcas internacionales.', 
    'Servicios Industriales', 
    'Refrigeración Industrial, HVAC, Monitoreo IoT, Mantención Preventiva',
    true
);

-- ========================================
-- 2. USUARIOS DE PRUEBA
-- ========================================

-- Usuario Cliente (Gerente de Operaciones del Supermercado)
INSERT INTO users (
    name, username, password, email, phone, role, company_id, is_active
) VALUES (
    'María Elena Rodríguez Sánchez', 
    'maria.rodriguez', 
    '$2b$10$lI.gu/tLUzPUuT8vwojS9.xVGexQaur9aZZKq2RiXl.0ptEKq4mm2', -- password: cliente123
    'maria.rodriguez@superlosandes.cl', 
    '+56987654322', 
    'CLIENT', 
    1, 
    true
);

-- Usuario adicional Cliente (Jefe de Mantención)
INSERT INTO users (
    name, username, password, email, phone, role, company_id, is_active
) VALUES (
    'Carlos Andrés Morales Torres', 
    'carlos.morales', 
    '$2b$10$lI.gu/tLUzPUuT8vwojS9.xVGexQaur9aZZKq2RiXl.0ptEKq4mm2', -- password: cliente123
    'carlos.morales@superlosandes.cl', 
    '+56987654323', 
    'CLIENT', 
    1, 
    true
);

-- Usuario Proveedor (Gerente Comercial)
INSERT INTO users (
    name, username, password, email, phone, role, company_id, is_active
) VALUES (
    'Roberto Silva Fernández', 
    'roberto.silva', 
    '$2b$10$Vgoa3pbBaApRzzQSHf8XG.BNnOzOOw/6Tt0B2.CX/CeJ75T9QE9mq', -- password: proveedor123
    'roberto.silva@friotech.cl', 
    '+56912345679', 
    'PROVIDER', 
    2, 
    true
);

-- Técnico Proveedor
INSERT INTO users (
    name, username, password, email, phone, role, company_id, is_active
) VALUES (
    'Luis Alberto González Pérez', 
    'luis.gonzalez', 
    '$2b$10$Vgoa3pbBaApRzzQSHf8XG.BNnOzOOw/6Tt0B2.CX/CeJ75T9QE9mq', -- password: proveedor123
    'luis.gonzalez@friotech.cl', 
    '+56912345680', 
    'PROVIDER', 
    2, 
    true
);

-- Técnico Senior Proveedor
INSERT INTO users (
    name, username, password, email, phone, role, company_id, is_active
) VALUES (
    'Ana Patricia Vásquez Rojas', 
    'ana.vasquez', 
    '$2b$10$Vgoa3pbBaApRzzQSHf8XG.BNnOzOOw/6Tt0B2.CX/CeJ75T9QE9mq', -- password: proveedor123
    'ana.vasquez@friotech.cl', 
    '+56912345681', 
    'PROVIDER', 
    2, 
    true
);

-- ========================================
-- 3. UBICACIONES DE EQUIPOS
-- ========================================

-- Sucursales del Cliente
INSERT INTO equipment_locations (
    name, address, city, state, postal_code, country, lat, lng, 
    contact_person, contact_phone, contact_email, company_id
) VALUES 
-- Sucursal Principal
(
    'SuperMercado Los Andes - Casa Matriz', 
    'Av. Las Condes 12345', 
    'Santiago', 
    'Región Metropolitana', 
    '7550000', 
    'Chile', 
    -33.4189, 
    -70.5969, 
    'María Elena Rodríguez', 
    '+56987654322', 
    'maria.rodriguez@superlosandes.cl', 
    1
),
-- Sucursal Mall
(
    'SuperMercado Los Andes - Mall Plaza Norte', 
    'Av. Américo Vespucio 1737, Huechuraba', 
    'Santiago', 
    'Región Metropolitana', 
    '8580000', 
    'Chile', 
    -33.3654, 
    -70.6482, 
    'Carlos Morales', 
    '+56987654323', 
    'carlos.morales@superlosandes.cl', 
    1
),
-- Sucursal Providencia
(
    'SuperMercado Los Andes - Providencia', 
    'Av. Providencia 2594', 
    'Santiago', 
    'Región Metropolitana', 
    '7500000', 
    'Chile', 
    -33.4321, 
    -70.6188, 
    'María Elena Rodríguez', 
    '+56987654322', 
    'providencia@superlosandes.cl', 
    1
);

-- Bodega del Proveedor
INSERT INTO equipment_locations (
    name, address, city, state, postal_code, country, lat, lng, 
    contact_person, contact_phone, contact_email, company_id
) VALUES 
(
    'FrioTech - Bodega Central', 
    'Av. Industrial 8888, Quilicura', 
    'Santiago', 
    'Región Metropolitana', 
    '8730000', 
    'Chile', 
    -33.3500, 
    -70.7000, 
    'Roberto Silva', 
    '+56912345679', 
    'bodega@friotech.cl', 
    2
),
(
    'FrioTech - Taller de Reparaciones', 
    'Calle Los Artesanos 1234, Maipú', 
    'Santiago', 
    'Región Metropolitana', 
    '9250000', 
    'Chile', 
    -33.5115, 
    -70.7581, 
    'Luis González', 
    '+56912345680', 
    'taller@friotech.cl', 
    2
);

-- ========================================
-- 4. EQUIPOS DEL PROVEEDOR (CATÁLOGO)
-- ========================================

-- Cámara de Frío Industrial
INSERT INTO equipments (
    name, description, type, category, model, serial_number, manufacturer, code,
    technical_specs, optimal_temperature, min_temperature, max_temperature,
    power_watts, energy_consumption_kwh, drive_type, cooling_type, dimensions,
    status, condition, availability_status, owner_company_id, current_location_id,
    rental_price_daily, rental_price_monthly, purchase_price, year_manufactured, warranty_expiry,
    images, documents, tags, notes, is_featured, view_count
) VALUES 
(
    'Cámara de Frío Industrial ColdMax Pro 5000',
    'Cámara de frío industrial de alta eficiencia para supermercados y centros de distribución. Capacidad para 500m³, con sistema de control automático de temperatura y humedad. Ideal para productos lácteos, carnes y congelados.',
    'COLD_ROOM',
    'REFRIGERATION',
    'ColdMax Pro 5000',
    'CM5000-2023-001',
    'FrigorTech International',
    'EQUIP-001',
    '{"capacity_m3": 500, "energy_efficiency": "A+++", "noise_level_db": 45, "refrigerant": "R290", "control_system": "Digital PLC", "defrost_system": "Hot Gas", "insulation_thickness_mm": 150, "door_type": "Hermetic Sliding", "monitoring": "IoT Enabled"}',
    -18.0,
    -25.0,
    5.0,
    8500,
    85.5,
    'Scroll Compressor',
    'Direct Expansion',
    '{"width_m": 8, "height_m": 3, "depth_m": 12, "weight_kg": 2500}',
    'AVAILABLE',
    'NEW',
    'AVAILABLE',
    2,
    4,
    150000,
    3500000,
    85000000,
    2023,
    '2026-12-31',
    '["https://friotech.cl/images/coldmax-pro-5000-1.jpg", "https://friotech.cl/images/coldmax-pro-5000-2.jpg", "https://friotech.cl/images/coldmax-pro-5000-interior.jpg"]',
    '["https://friotech.cl/docs/coldmax-pro-5000-manual.pdf", "https://friotech.cl/docs/coldmax-pro-5000-specs.pdf", "https://friotech.cl/docs/coldmax-pro-5000-warranty.pdf"]',
    'cámara frío, industrial, supermercado, alta capacidad, eficiente, IoT',
    'Equipo estrella de nuestra línea premium. Instalación incluida en Santiago. Monitoreo 24/7 disponible.',
    true,
    156
),

-- Freezer Vertical Comercial
(
    'Freezer Vertical Comercial FreezeMax 800L',
    'Freezer vertical de acero inoxidable para uso comercial intensivo. Perfecto para heladerías, restaurantes y supermercados. Puerta de vidrio con LED interior, control digital de temperatura.',
    'FREEZER',
    'REFRIGERATION',
    'FreezeMax 800L',
    'FM800-2023-005',
    'CoolTech Solutions',
    'EQUIP-002',
    '{"capacity_liters": 800, "door_type": "Glass", "shelves": 6, "led_lighting": true, "lock": "Digital", "wheels": true, "drainage": "Automatic", "alarm_system": true}',
    -18.0,
    -22.0,
    -12.0,
    450,
    3.2,
    'Reciprocating Compressor',
    'Static Cooling',
    '{"width_m": 0.68, "height_m": 2.0, "depth_m": 0.75, "weight_kg": 85}',
    'AVAILABLE',
    'NEW',
    'AVAILABLE',
    2,
    4,
    15000,
    350000,
    1200000,
    2023,
    '2025-06-30',
    '["https://friotech.cl/images/freezemax-800l-1.jpg", "https://friotech.cl/images/freezemax-800l-interior.jpg"]',
    '["https://friotech.cl/docs/freezemax-800l-manual.pdf", "https://friotech.cl/docs/freezemax-800l-specs.pdf"]',
    'freezer, vertical, comercial, vidrio, LED, acero inoxidable',
    'Muy popular para puntos de venta. Bajo consumo energético. Garantía extendida disponible.',
    false,
    89
),

-- Sistema de Aire Acondicionado Comercial
(
    'Sistema HVAC Comercial AirMax 48000 BTU',
    'Sistema de aire acondicionado comercial tipo split para grandes espacios. Perfecto para supermercados, oficinas y centros comerciales. Incluye unidad exterior e interior con control remoto inteligente.',
    'AC_COMMERCIAL',
    'HVAC',
    'AirMax Commercial 48K',
    'AM48K-2023-012',
    'ClimaTech Pro',
    'EQUIP-003',
    '{"btu_capacity": 48000, "cooling_capacity_tons": 4, "heating": true, "inverter": true, "wifi_control": true, "air_purification": true, "humidity_control": true, "timer": true, "energy_star": true}',
    22.0,
    16.0,
    30.0,
    3800,
    18.5,
    'Inverter Compressor',
    'Split System',
    '{"indoor_width_m": 1.2, "indoor_height_m": 0.3, "indoor_depth_m": 0.85, "outdoor_width_m": 0.95, "outdoor_height_m": 1.7, "outdoor_depth_m": 0.35, "total_weight_kg": 145}',
    'AVAILABLE',
    'NEW',
    'AVAILABLE',
    2,
    4,
    45000,
    1200000,
    2800000,
    2023,
    '2025-12-31',
    '["https://friotech.cl/images/airmax-48k-1.jpg", "https://friotech.cl/images/airmax-48k-outdoor.jpg", "https://friotech.cl/images/airmax-48k-remote.jpg"]',
    '["https://friotech.cl/docs/airmax-48k-manual.pdf", "https://friotech.cl/docs/airmax-48k-installation.pdf"]',
    'aire acondicionado, comercial, inverter, WiFi, 48000 BTU, eficiente',
    'Ideal para espacios comerciales. Instalación profesional incluida. Bajo consumo con tecnología inverter.',
    true,
    203
),

-- Equipo RENTED (ya en uso por el cliente)
(
    'Vitrina Refrigerada Horizontal ShowCool 2.5m',
    'Vitrina refrigerada horizontal para exhibición de productos lácteos y embutidos. Vidrio curvo antivaho, iluminación LED, control digital de temperatura y humedad.',
    'DISPLAY_REFRIGERATOR',
    'REFRIGERATION',
    'ShowCool Pro 2.5',
    'SC25-2022-089',
    'DisplayTech',
    'EQUIP-004',
    '{"length_m": 2.5, "display_area_m2": 3.5, "glass_type": "Curved Anti-fog", "lighting": "LED Strip", "temperature_zones": 2, "humidity_control": true, "night_curtain": true}',
    4.0,
    0.0,
    8.0,
    850,
    6.8,
    'Hermetic Compressor',
    'Forced Air',
    '{"width_m": 2.5, "height_m": 1.2, "depth_m": 0.9, "weight_kg": 180}',
    'RENTED',
    'USED',
    'UNAVAILABLE',
    2,
    1, -- Está en la casa matriz del cliente
    25000,
    650000,
    3200000,
    2022,
    '2024-12-31',
    '["https://friotech.cl/images/showcool-25-1.jpg", "https://friotech.cl/images/showcool-25-products.jpg"]',
    '["https://friotech.cl/docs/showcool-25-manual.pdf"]',
    'vitrina, refrigerada, horizontal, exhibición, lácteos, LED',
    'Equipo actualmente rentado. Disponible para nuevos contratos desde enero 2024.',
    false,
    67
),

-- Equipo en MANTENIMIENTO
(
    'Congelador Industrial FrostGuard 1000L',
    'Congelador industrial de gran capacidad para almacenamiento de productos congelados. Tapa superior, canastas organizadoras, sistema de descongelación manual.',
    'CHEST_FREEZER',
    'REFRIGERATION',
    'FrostGuard 1000',
    'FG1000-2021-156',
    'ArcticTech',
    'EQUIP-005',
    '{"capacity_liters": 1000, "lid_type": "Sliding", "baskets": 4, "lock": "Mechanical", "defrost": "Manual", "temperature_alarm": true, "power_failure_alarm": true}',
    -18.0,
    -24.0,
    -15.0,
    380,
    2.8,
    'Reciprocating Compressor',
    'Static Cooling',
    '{"width_m": 2.1, "height_m": 0.85, "depth_m": 0.7, "weight_kg": 95}',
    'MAINTENANCE',
    'USED',
    'UNAVAILABLE',
    2,
    5, -- Está en el taller
    18000,
    480000,
    1800000,
    2021,
    '2024-06-30',
    '["https://friotech.cl/images/frostguard-1000-1.jpg", "https://friotech.cl/images/frostguard-1000-interior.jpg"]',
    '["https://friotech.cl/docs/frostguard-1000-manual.pdf"]',
    'congelador, industrial, 1000L, horizontal, canastas, alarmas',
    'En mantenimiento preventivo. Disponible desde próxima semana. Excelente estado.',
    false,
    34
);

-- ========================================
-- 5. SOLICITUDES DE EQUIPOS (MARKETPLACE)
-- ========================================

-- Solicitud APROBADA (que genera el contrato activo)
INSERT INTO equipment_requests (
    type, status, client_company_id, client_user_id, provider_company_id, equipment_id,
    quantity, start_date, end_date, delivery_location_id, unit_price, total_price, deposit_amount,
    terms_conditions, special_requirements, requested_date, approved_date, delivery_date,
    client_notes, provider_notes
) VALUES 
(
    'RENTAL',
    'APPROVED',
    1, -- SuperMercado Los Andes
    1, -- María Elena Rodríguez
    2, -- FrioTech
    4, -- Vitrina ShowCool (la que está RENTED)
    1,
    '2023-09-01',
    '2024-02-29',
    1, -- Casa Matriz
    650000, -- Precio mensual
    3900000, -- 6 meses
    1300000, -- 2 meses de depósito
    'Contrato de arriendo por 6 meses renovable. Incluye mantención preventiva mensual y soporte técnico 24/7. Seguro contra daños incluido.',
    'Instalación durante horario nocturno (22:00-06:00) para no interrumpir operaciones. Capacitación al personal de mantención incluida.',
    '2023-08-15 10:30:00',
    '2023-08-17 14:20:00',
    '2023-08-31 23:00:00',
    'Necesitamos para la sección de lácteos de nuestra casa matriz. Urgente por apertura de nueva línea de productos importados.',
    'Instalación confirmada para el 31 de agosto. Técnico Luis González asignado. Incluye capacitación y manual de operación.'
),

-- Solicitud PENDIENTE
(
    'RENTAL',
    'PENDING',
    1, -- SuperMercado Los Andes
    2, -- Carlos Morales
    2, -- FrioTech
    1, -- Cámara de Frío ColdMax Pro
    1,
    '2024-01-15',
    '2024-12-31',
    2, -- Mall Plaza Norte
    3500000, -- Precio mensual
    42000000, -- 12 meses
    7000000, -- 2 meses de depósito
    'Arriendo anual con opción de compra al 50% del valor. Incluye instalación, puesta en marcha, capacitación y mantención.',
    'Requiere instalación en área de 10x15m en bodega refrigerada. Conexión eléctrica trifásica 380V disponible. Acceso para grúa necesario.',
    '2023-12-01 09:15:00',
    NULL,
    NULL,
    'Para nueva sucursal Mall Plaza Norte. Necesitamos ampliar capacidad de almacenamiento para productos congelados antes de temporada alta.',
    NULL
),

-- Solicitud de COMPRA
(
    'PURCHASE',
    'PENDING',
    1, -- SuperMercado Los Andes
    1, -- María Elena
    2, -- FrioTech
    2, -- Freezer FreezeMax 800L
    3, -- 3 unidades
    '2024-02-01',
    NULL,
    3, -- Providencia
    1200000, -- Precio unitario
    3600000, -- 3 unidades
    720000, -- 20% de depósito
    'Compra de 3 unidades. Pago 50% al pedido, 50% contra entrega. Garantía de 2 años. Instalación incluida.',
    'Entrega escalonada: 1 unidad por semana. Instalación en horario de menor movimiento (14:00-16:00). Capacitación incluida.',
    '2023-12-10 11:45:00',
    NULL,
    NULL,
    'Para renovación completa de equipos en sucursal Providencia. Reemplazo de equipos antiguos que consumen mucha energía.',
    NULL
);

-- ========================================
-- 6. CONTRATOS ACTIVOS (RENTAS EN CURSO)
-- ========================================

INSERT INTO active_rentals (
    request_id, client_company_id, provider_company_id, equipment_id,
    start_date, end_date, daily_rate, monthly_rate, total_amount, deposit_paid,
    status, payment_status, current_location_id, contract_terms, delivery_notes
) VALUES 
(
    1, -- Request ID de la solicitud aprobada
    1, -- SuperMercado Los Andes
    2, -- FrioTech
    4, -- Vitrina ShowCool
    '2023-09-01',
    '2024-02-29',
    21666, -- Diario (650k/30)
    650000, -- Mensual
    3900000, -- Total 6 meses
    1300000, -- Depósito pagado
    'ACTIVE',
    'CURRENT',
    1, -- Casa Matriz
    'Contrato de arriendo 6 meses. Mantención incluida primer lunes de cada mes. Renovación automática por 3 meses adicionales si no se notifica término con 30 días de anticipación.',
    'Entregado el 31/08/2023 a las 23:45. Instalación supervisada por técnico Luis González. Personal capacitado: María Rodríguez y Carlos Morales. Sistema funcionando correctamente.'
);

-- ========================================
-- 7. SOLICITUDES DE SERVICIO
-- ========================================

-- Servicio COMPLETADO
INSERT INTO service_requests (
    title, description, priority, issue_type, category, request_date, scheduled_date, completion_date,
    status, client_company_id, client_user_id, provider_company_id, technician_id,
    equipment_id, location_id, estimated_cost, final_cost, client_rating, client_feedback,
    provider_rating, provider_feedback, attachments, completion_photos, client_notes, technician_notes
) VALUES 
(
    'Mantención Preventiva Vitrina ShowCool - Octubre 2023',
    'Mantención preventiva mensual programada según contrato de arriendo. Incluye: limpieza de condensadores, verificación de niveles de refrigerante, calibración de termostatos, revisión de sellos y luces LED.',
    'MEDIUM',
    'MAINTENANCE',
    'MAINTENANCE',
    '2023-10-02 08:00:00',
    '2023-10-02 14:00:00',
    '2023-10-02 16:30:00',
    'COMPLETED',
    1, -- SuperMercado Los Andes
    1, -- María Elena
    2, -- FrioTech
    4, -- Luis González
    4, -- Vitrina ShowCool
    1, -- Casa Matriz
    0, -- Sin costo (incluido en contrato)
    0,
    5, -- Excelente calificación
    'Excelente servicio. Técnico muy profesional y puntual. Explicó todo el proceso y dejó recomendaciones por escrito. Sin interrupciones en la operación.',
    5,
    'Cliente muy organizado. Acceso fácil al equipo. Personal colaborador. Mantención realizada sin problemas.',
    '["https://friotech.cl/reports/maintenance-oct-2023-before.jpg"]',
    '["https://friotech.cl/reports/maintenance-oct-2023-after.jpg", "https://friotech.cl/reports/maintenance-oct-2023-checklist.jpg"]',
    'Por favor coordinar próxima mantención para primer lunes de noviembre. Mismo horario 14:00-16:00.',
    'Equipo en excelente estado. Cambié filtro de aire y ajusté temperatura 0.5°C. Próxima mantención noviembre. Recomiendo revisar puerta cada 15 días.'
),

-- Servicio EN PROGRESO
(
    'Reparación Urgente - Falla en Sistema de Refrigeración',
    'Equipo presentó alarma de alta temperatura durante la madrugada. Temperatura subió a 12°C poniendo en riesgo productos lácteos. Se requiere diagnóstico y reparación urgente.',
    'CRITICAL',
    'ELECTRICAL',
    'REPAIR',
    '2023-12-15 03:30:00',
    '2023-12-15 07:00:00',
    NULL,
    'IN_PROGRESS',
    1, -- SuperMercado Los Andes
    2, -- Carlos Morales
    2, -- FrioTech
    5, -- Ana Vásquez (técnico senior)
    4, -- Vitrina ShowCool
    1, -- Casa Matriz
    250000,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '["https://superlosandes.cl/reports/alarm-screenshot-031523.jpg"]',
    NULL,
    'URGENTE. Productos en riesgo. Personal disponible para asistir desde las 06:00. Acceso por entrada de proveedores.',
    'Llegada 06:45. Problema en sensor de temperatura. Reemplazando componente. ETA finalización 09:00.'
),

-- Servicio ABIERTO (sin asignar)
(
    'Solicitud de Cotización - Instalación Nuevo Sistema HVAC',
    'Requerimos cotización para instalación de sistema de aire acondicionado en nueva sucursal (400m²). Necesitamos evaluación técnica del espacio y propuesta de equipamiento.',
    'LOW',
    'INSTALLATION',
    'CONSULTATION',
    '2023-12-20 10:15:00',
    NULL,
    NULL,
    'OPEN',
    1, -- SuperMercado Los Andes
    1, -- María Elena
    NULL, -- Sin proveedor asignado aún
    NULL, -- Sin técnico asignado
    NULL, -- Sin equipo específico
    3, -- Sucursal Providencia
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '["https://superlosandes.cl/docs/providencia-floor-plan.pdf", "https://superlosandes.cl/docs/electrical-specs.pdf"]',
    NULL,
    'Local en remodelación. Disponible para visita técnica lunes a viernes 09:00-17:00. Contactar con Carlos Morales para coordinar.',
    NULL
);

-- ========================================
-- 8. MANTENIMIENTOS PROGRAMADOS
-- ========================================

-- Mantenimiento PROGRAMADO
INSERT INTO maintenances (
    title, description, type, category, scheduled_date, estimated_duration_hours,
    status, equipment_id, technician_id, client_company_id, provider_company_id,
    estimated_cost, work_performed, next_scheduled_date
) VALUES 
(
    'Mantención Preventiva Trimestral - Cámara de Frío',
    'Mantención preventiva trimestral completa: limpieza profunda de evaporadores, revisión de sistema eléctrico, calibración de controles, verificación de aislamiento, prueba de sistemas de seguridad.',
    'PREVENTIVE',
    'INSPECTION',
    '2024-01-15',
    4,
    'SCHEDULED',
    1, -- Cámara ColdMax Pro (si se aprueba la solicitud)
    4, -- Luis González
    1, -- SuperMercado Los Andes
    2, -- FrioTech
    180000,
    NULL,
    '2024-04-15'
),

-- Mantenimiento COMPLETADO
(
    'Cambio de Filtros y Limpieza General',
    'Cambio de filtros de aire, limpieza de condensadores, verificación de conexiones eléctricas, calibración de termostatos.',
    'PREVENTIVE',
    'CLEANING',
    '2023-11-06',
    2,
    'COMPLETED',
    4, -- Vitrina ShowCool
    4, -- Luis González
    1, -- SuperMercado Los Andes
    2, -- FrioTech
    0, -- Incluido en contrato
    'Cambio de filtro de aire (ref: FA-SC25-001). Limpieza completa de condensadores. Calibración de termostato principal (+0.3°C). Verificación de conexiones eléctricas - todas en buen estado. Prueba de funcionamiento OK.',
    '2023-12-04'
);

-- ========================================
-- 9. LECTURAS DE TEMPERATURA
-- ========================================

-- Lecturas recientes de la vitrina en operación
INSERT INTO temperature_readings (value, status, alert_triggered, timestamp, equipment_id) VALUES 
(4.2, 'NORMAL', false, '2023-12-21 00:00:00', 4),
(4.1, 'NORMAL', false, '2023-12-21 01:00:00', 4),
(4.3, 'NORMAL', false, '2023-12-21 02:00:00', 4),
(11.8, 'HIGH_TEMP_ALARM', true, '2023-12-21 03:15:00', 4), -- Momento de la falla
(12.1, 'HIGH_TEMP_ALARM', true, '2023-12-21 03:16:00', 4),
(12.0, 'HIGH_TEMP_ALARM', true, '2023-12-21 03:17:00', 4),
(8.5, 'RECOVERING', false, '2023-12-21 07:30:00', 4), -- Después de la reparación
(6.2, 'RECOVERING', false, '2023-12-21 08:00:00', 4),
(4.8, 'NORMAL', false, '2023-12-21 08:30:00', 4),
(4.2, 'NORMAL', false, '2023-12-21 09:00:00', 4);

-- ========================================
-- 10. LECTURAS DE ENERGÍA
-- ========================================

-- Lecturas de energía de la vitrina
INSERT INTO energy_readings (
    consumption_kwh, power_watts, voltage, current_amps, usage_minutes, 
    cost_estimate, status, timestamp, equipment_id
) VALUES 
(6.8, 850, 220.5, 3.86, 60, 850, 'NORMAL', '2023-12-21 00:00:00', 4),
(6.9, 862, 221.2, 3.89, 60, 862, 'NORMAL', '2023-12-21 01:00:00', 4),
(7.1, 890, 219.8, 4.05, 60, 890, 'NORMAL', '2023-12-21 02:00:00', 4),
(12.5, 1550, 218.5, 7.10, 60, 1550, 'HIGH_CONSUMPTION', '2023-12-21 03:00:00', 4), -- Durante la falla
(6.7, 835, 220.8, 3.78, 60, 835, 'NORMAL', '2023-12-21 08:00:00', 4); -- Después de reparación

-- ========================================
-- 11. NOTIFICACIONES
-- ========================================

INSERT INTO notifications (
    title, message, type, category, priority, recipient_user_id, recipient_company_id,
    equipment_id, service_request_id, status, action_required, action_url, action_label
) VALUES 
-- Alerta de temperatura
(
    'ALERTA: Temperatura Crítica Detectada',
    'La vitrina ShowCool en Casa Matriz ha superado los límites seguros de temperatura (12.1°C). Se requiere atención inmediata para evitar pérdida de productos.',
    'ALERT',
    'EQUIPMENT',
    'URGENT',
    2, -- Carlos Morales
    1, -- SuperMercado Los Andes
    4, -- Vitrina ShowCool
    2, -- Service request urgente
    'READ',
    true,
    '/dashboard/service-requests/2',
    'Ver Solicitud de Servicio'
),

-- Recordatorio de mantenimiento
(
    'Recordatorio: Mantenimiento Programado Mañana',
    'Se acerca el mantenimiento preventivo programado para la vitrina ShowCool el 04/12/2023 a las 14:00. Por favor, coordinar con el personal para facilitar el acceso.',
    'REMINDER',
    'MAINTENANCE',
    'NORMAL',
    1, -- María Elena
    1, -- SuperMercado Los Andes
    4, -- Vitrina ShowCool
    NULL,
    'UNREAD',
    false,
    '/dashboard/maintenances',
    'Ver Mantenimientos'
),

-- Confirmación de servicio
(
    'Servicio Completado Satisfactoriamente',
    'El mantenimiento preventivo de octubre ha sido completado exitosamente. El equipo está funcionando óptimamente. Próximo mantenimiento programado para el 04/12/2023.',
    'SUCCESS',
    'SERVICE',
    'NORMAL',
    1, -- María Elena
    1, -- SuperMercado Los Andes
    4, -- Vitrina ShowCool
    1, -- Service request completado
    'READ',
    false,
    '/dashboard/service-requests/1',
    'Ver Detalles'
);

-- ========================================
-- 12. FACTURAS
-- ========================================

-- Factura del contrato de arriendo
INSERT INTO invoices (
    invoice_number, provider_company_id, client_company_id, issue_date, due_date,
    payment_terms, subtotal, tax_rate, tax_amount, total_amount, status, payment_method,
    rental_id, notes
) VALUES 
(
    'FT-2023-001234',
    2, -- FrioTech
    1, -- SuperMercado Los Andes
    '2023-09-01',
    '2023-09-15',
    'Net 15',
    1950000.00, -- 3 meses inicial
    0.19,
    370500.00,
    2320500.00,
    'PAID',
    'TRANSFER',
    1, -- Contrato activo
    'Factura por arriendo inicial 3 meses + depósito. Incluye instalación y capacitación.'
),

-- Factura mensual actual
(
    'FT-2023-001567',
    2, -- FrioTech
    1, -- SuperMercado Los Andes
    '2023-12-01',
    '2023-12-15',
    'Net 15',
    650000.00, -- Mensual diciembre
    0.19,
    123500.00,
    773500.00,
    'PENDING',
    NULL,
    1, -- Contrato activo
    'Arriendo mes de diciembre 2023. Incluye mantención preventiva del 04/12.'
);

-- Líneas de detalle de facturas
INSERT INTO invoice_line_items (
    invoice_id, description, quantity, unit_price, line_total, equipment_id, service_type
) VALUES 
-- Factura inicial
(1, 'Arriendo Vitrina ShowCool Pro 2.5m - Septiembre 2023', 1, 650000, 650000, 4, 'RENTAL'),
(1, 'Arriendo Vitrina ShowCool Pro 2.5m - Octubre 2023', 1, 650000, 650000, 4, 'RENTAL'),
(1, 'Arriendo Vitrina ShowCool Pro 2.5m - Noviembre 2023', 1, 650000, 650000, 4, 'RENTAL'),

-- Factura mensual
(2, 'Arriendo Vitrina ShowCool Pro 2.5m - Diciembre 2023', 1, 650000, 650000, 4, 'RENTAL');

-- ========================================
-- RESUMEN DE DATOS CREADOS
-- ========================================

/*
EMPRESAS:
- SuperMercado Los Andes S.A. (CLIENTE) - Cadena de supermercados
- FrioTech Servicios Industriales Ltda. (PROVEEDOR) - Servicios refrigeración

USUARIOS:
- María Elena Rodríguez (CLIENTE) - Gerente Operaciones
- Carlos Andrés Morales (CLIENTE) - Jefe Mantención  
- Roberto Silva (PROVEEDOR) - Gerente Comercial
- Luis González (PROVEEDOR) - Técnico
- Ana Vásquez (PROVEEDOR) - Técnico Senior

UBICACIONES:
- 3 sucursales del cliente (Casa Matriz, Mall, Providencia)
- 2 instalaciones del proveedor (Bodega, Taller)

EQUIPOS (5):
- Cámara de Frío Industrial (DISPONIBLE, DESTACADO)
- Freezer Vertical 800L (DISPONIBLE)
- Sistema HVAC 48K BTU (DISPONIBLE, DESTACADO)
- Vitrina Horizontal ShowCool (RENTADO - en uso)
- Congelador 1000L (EN MANTENIMIENTO)

SOLICITUDES (3):
- 1 APROBADA (genera contrato activo)
- 1 PENDIENTE (arriendo cámara de frío)
- 1 PENDIENTE (compra 3 freezers)

CONTRATOS ACTIVOS (1):
- Vitrina ShowCool rentada por 6 meses

SERVICIOS (3):
- 1 COMPLETADO (mantención octubre)
- 1 EN PROGRESO (reparación urgente)
- 1 ABIERTO (cotización HVAC)

MANTENIMIENTOS (2):
- 1 PROGRAMADO (enero 2024)
- 1 COMPLETADO (noviembre 2023)

LECTURAS:
- 10 lecturas de temperatura (incluyendo falla)
- 5 lecturas de energía

NOTIFICACIONES (3):
- Alerta crítica temperatura
- Recordatorio mantenimiento
- Confirmación servicio

FACTURAS (2):
- 1 PAGADA (inicial 3 meses)
- 1 PENDIENTE (diciembre actual)
*/
