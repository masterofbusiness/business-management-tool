-- Accounting Module Database Schema
-- Migration 0002: Buchhaltungsmodul mit QR-Beleg-System

-- Accounting Categories (Einnahmen/Ausgaben Kategorien)
CREATE TABLE IF NOT EXISTS accounting_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')), -- Einnahme oder Ausgabe
    color TEXT DEFAULT '#6b7280', -- Hex-Farbe für UI
    description TEXT,
    tax_deductible INTEGER DEFAULT 0, -- Steuerlich absetzbar (0=nein, 1=ja)
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VAT Rates für verschiedene Länder
CREATE TABLE IF NOT EXISTS vat_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_code TEXT NOT NULL, -- CH, LI, AT, DE
    country_name TEXT NOT NULL,
    rate_type TEXT NOT NULL, -- standard, reduced, special
    rate_percentage DECIMAL(5,2) NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- QR-Code Templates für verschiedene Beleg-Typen
CREATE TABLE IF NOT EXISTS qr_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'standard', 'travel', 'purchase', 'meal', 'office'
    description TEXT,
    default_category_id INTEGER,
    default_project_id INTEGER,
    qr_data TEXT NOT NULL, -- JSON mit Template-Daten
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (default_category_id) REFERENCES accounting_categories(id),
    FOREIGN KEY (default_project_id) REFERENCES projects(id)
);

-- Accounting Entries (Buchungseinträge)
CREATE TABLE IF NOT EXISTS accounting_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
    
    -- Beträge und Steuer
    amount DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0.00,
    vat_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Datum und Beschreibung
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    receipt_number TEXT, -- Belegnummer
    
    -- Kategorisierung
    category_id INTEGER,
    customer_id INTEGER, -- Bei Einnahmen
    project_id INTEGER,
    
    -- Beleg-Informationen
    receipt_image_url TEXT, -- Bild des Belegs
    receipt_ocr_data TEXT, -- JSON mit OCR-erkannten Daten
    qr_template_id INTEGER, -- Verwendetes QR-Template
    
    -- Verknüpfungen
    invoice_id INTEGER, -- Verknüpfung zu Rechnung bei automatischer Buchung
    time_entry_id INTEGER, -- Verknüpfung zu Zeiteintrag
    
    -- Status und Verwaltung
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'reconciled')),
    notes TEXT,
    
    -- Recurring (Wiederkehrende Buchungen)
    is_recurring INTEGER DEFAULT 0,
    recurring_pattern TEXT, -- JSON: {"frequency": "monthly", "day": 15}
    recurring_parent_id INTEGER, -- Verweis auf Parent-Eintrag
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES accounting_categories(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (time_entry_id) REFERENCES time_entries(id),
    FOREIGN KEY (qr_template_id) REFERENCES qr_templates(id),
    FOREIGN KEY (recurring_parent_id) REFERENCES accounting_entries(id)
);

-- Upload Sessions für Mobile App
CREATE TABLE IF NOT EXISTS upload_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    qr_template_id INTEGER,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qr_template_id) REFERENCES qr_templates(id)
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON accounting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_type ON accounting_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_category ON accounting_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_customer ON accounting_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_project ON accounting_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_status ON accounting_entries(status);
CREATE INDEX IF NOT EXISTS idx_qr_templates_active ON qr_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_token ON upload_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON upload_sessions(expires_at);

-- Trigger für updated_at
CREATE TRIGGER IF NOT EXISTS accounting_categories_updated_at 
    AFTER UPDATE ON accounting_categories
    BEGIN 
        UPDATE accounting_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS accounting_entries_updated_at 
    AFTER UPDATE ON accounting_entries
    BEGIN 
        UPDATE accounting_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;