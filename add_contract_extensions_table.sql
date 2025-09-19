-- ==============================
-- TABLA DE EXTENSIONES DE CONTRATOS
-- ==============================

CREATE TABLE contract_extensions (
    extension_id SERIAL PRIMARY KEY,
    
    -- Referencia al contrato
    rental_id INT REFERENCES active_rentals(rental_id) ON DELETE CASCADE,
    
    -- Información del solicitante
    client_company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    requested_by_user_id INT REFERENCES users(user_id),
    
    -- Detalles de la extensión
    extension_months INT NOT NULL CHECK (extension_months >= 1 AND extension_months <= 60),
    proposed_rate DECIMAL(10,2),
    current_rate DECIMAL(10,2),
    reason TEXT,
    
    -- Fechas
    current_end_date DATE NOT NULL,
    proposed_end_date DATE NOT NULL,
    requested_start_date DATE,
    
    -- Estado de la solicitud
    status VARCHAR(30) DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED
    
    -- Información comercial
    estimated_total_cost DECIMAL(12,2),
    approved_rate DECIMAL(10,2),
    approved_months INT,
    
    -- Fechas de gestión
    requested_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    
    -- Notas y comentarios
    client_notes TEXT,
    provider_notes TEXT,
    rejection_reason TEXT,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_contract_extensions_rental_id ON contract_extensions(rental_id);
CREATE INDEX idx_contract_extensions_client_company ON contract_extensions(client_company_id);
CREATE INDEX idx_contract_extensions_status ON contract_extensions(status);
CREATE INDEX idx_contract_extensions_requested_at ON contract_extensions(requested_at);
