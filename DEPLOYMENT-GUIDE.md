# 🚀 CLOUDFLARE PAGES DEPLOYMENT GUIDE
## Business Management Tool - Vollständige Bereitstellung

### 📋 VORAUSSETZUNGEN
✅ Cloudflare Account: andre.rossi@bluewin.ch  
✅ API Token: Konfiguriert  
✅ D1 Database: bc076908-7bfd-48b4-b035-f909cca67076  
✅ Code: Komplett entwickelt und getestet  

---

## 🎯 SCHRITT 1: CLOUDFLARE PAGES PROJEKT ERSTELLEN

### Via Cloudflare Dashboard:
1. **Gehen Sie zu:** https://dash.cloudflare.com/
2. **"Workers & Pages"** (linkes Menü)
3. **"Create application"**
4. **"Pages"** wählen
5. **"Upload assets"** oder **"Direct upload"**

### Projekt-Einstellungen:
- **Project name:** `business-management`
- **Production branch:** `main`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

---

## 🎯 SCHRITT 2: D1 DATABASE VERKNÜPFEN

### In den Pages Settings:
1. **Ihr Pages Projekt** → **"Settings"** → **"Functions"**
2. **"D1 database bindings"** → **"Add binding"**
3. **Variable name:** `DB`
4. **D1 database:** `business-management-production`
5. **Save**

---

## 🎯 SCHRITT 3: DATABASE SCHEMA ERSTELLEN

### Via D1 Console:
1. **"Workers & Pages"** → **"D1 SQL Database"** 
2. **"business-management-production"** → **"Console"**
3. **Führen Sie diese SQL-Befehle aus:**

```sql
-- WICHTIG: Führen Sie diese Befehle nacheinander aus!

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Switzerland',
  tax_number TEXT,
  notes TEXT,
  hourly_rate DECIMAL(10,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate DECIMAL(10,2),
  budget DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 3. Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  project_id INTEGER,
  description TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_minutes INTEGER,
  hourly_rate DECIMAL(10,2),
  is_billable BOOLEAN DEFAULT 1,
  is_billed BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(10,2) DEFAULT 0.00,
  tax_rate DECIMAL(5,2) DEFAULT 8.1,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  payment_terms TEXT DEFAULT '30 Tage',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 5. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  time_entry_id INTEGER,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (time_entry_id) REFERENCES time_entries(id)
);

-- 6. Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  quote_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal DECIMAL(10,2) DEFAULT 0.00,
  tax_rate DECIMAL(5,2) DEFAULT 8.1,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  terms TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 7. Quote Items Table  
CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- 8. Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_number TEXT,
  bank_account TEXT,
  iban TEXT,
  bic_swift TEXT,
  logo_url TEXT,
  default_tax_rate DECIMAL(5,2) DEFAULT 8.1,
  default_payment_terms TEXT DEFAULT '30 Tage',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### BUCHHALTUNGSMODUL SCHEMA:
```sql
-- 9. Accounting Categories
CREATE TABLE IF NOT EXISTS accounting_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#6b7280',
  description TEXT,
  tax_deductible INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. VAT Rates
CREATE TABLE IF NOT EXISTS vat_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  rate_percentage DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. QR Templates
CREATE TABLE IF NOT EXISTS qr_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  default_category_id INTEGER,
  default_project_id INTEGER,
  qr_data TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (default_category_id) REFERENCES accounting_categories(id),
  FOREIGN KEY (default_project_id) REFERENCES projects(id)
);

-- 12. Accounting Entries
CREATE TABLE IF NOT EXISTS accounting_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 0.00,
  vat_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  receipt_number TEXT,
  category_id INTEGER,
  customer_id INTEGER,
  project_id INTEGER,
  receipt_image_url TEXT,
  receipt_ocr_data TEXT,
  qr_template_id INTEGER,
  invoice_id INTEGER,
  time_entry_id INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'reconciled')),
  notes TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring_pattern TEXT,
  recurring_parent_id INTEGER,
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

-- 13. Upload Sessions
CREATE TABLE IF NOT EXISTS upload_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  qr_template_id INTEGER,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qr_template_id) REFERENCES qr_templates(id)
);
```

---

## 🎯 SCHRITT 4: STAMMDATEN EINFÜGEN

### Accounting Categories:
```sql
INSERT OR IGNORE INTO accounting_categories (id, name, type, color, description, tax_deductible) VALUES 
(1, 'Dienstleistungen', 'income', '#10b981', 'Einnahmen aus Dienstleistungen', 0),
(2, 'Produktverkäufe', 'income', '#3b82f6', 'Einnahmen aus Produktverkäufen', 0),
(3, 'Beratung', 'income', '#8b5cf6', 'Beratungsleistungen', 0),
(4, 'Lizenzgebühren', 'income', '#f59e0b', 'Lizenz- und Nutzungsgebühren', 0),
(5, 'Sonstige Einnahmen', 'income', '#6b7280', 'Andere Einnahmenquellen', 0),
(6, 'Büromaterial', 'expense', '#ef4444', 'Büromaterialien und Ausstattung', 1),
(7, 'Software & IT', 'expense', '#06b6d4', 'Software-Lizenzen und IT-Kosten', 1),
(8, 'Fahrtkosten', 'expense', '#84cc16', 'Fahrtkosten und Reisespesen', 1),
(9, 'Verpflegung', 'expense', '#f97316', 'Geschäftsessen und Verpflegung', 1),
(10, 'Marketing', 'expense', '#ec4899', 'Marketing und Werbung', 1),
(11, 'Miete & Nebenkosten', 'expense', '#6366f1', 'Büro-/Geschäftsmiete', 1),
(12, 'Telefon & Internet', 'expense', '#14b8a6', 'Telekommunikationskosten', 1),
(13, 'Versicherungen', 'expense', '#f59e0b', 'Geschäftsversicherungen', 1),
(14, 'Fortbildung', 'expense', '#8b5cf6', 'Weiterbildung und Schulungen', 1),
(15, 'Steuerberatung', 'expense', '#64748b', 'Steuer- und Rechtsberatung', 1);
```

### VAT Rates:
```sql
INSERT OR IGNORE INTO vat_rates (country_code, country_name, rate_type, rate_percentage, description) VALUES 
('CH', 'Schweiz', 'standard', 8.1, 'Normalsatz Schweiz'),
('CH', 'Schweiz', 'reduced', 2.6, 'Reduzierter Satz (Nahrungsmittel, Bücher, etc.)'),
('CH', 'Schweiz', 'accommodation', 3.8, 'Beherbergung'),
('LI', 'Liechtenstein', 'standard', 8.0, 'Normalsatz Liechtenstein'),
('LI', 'Liechtenstein', 'reduced', 2.6, 'Reduzierter Satz'),
('AT', 'Österreich', 'standard', 20.0, 'Normalsatz Österreich'),
('AT', 'Österreich', 'reduced', 10.0, 'Reduzierter Satz'),
('AT', 'Österreich', 'special', 13.0, 'Sondersatz (Kultur, etc.)'),
('DE', 'Deutschland', 'standard', 19.0, 'Normalsatz Deutschland'),
('DE', 'Deutschland', 'reduced', 7.0, 'Reduzierter Satz');
```

### QR Templates:
```sql
INSERT OR IGNORE INTO qr_templates (id, name, type, description, default_category_id, qr_data) VALUES 
(1, 'Allgemeine Ausgabe', 'standard', 'Standard QR-Code für alle Ausgaben', NULL, 
 '{"template": "standard", "category_prompt": true, "project_prompt": true}'),
(2, 'Fahrtkosten', 'travel', 'Spezial-QR für Fahrtkosten und Reisespesen', 8,
 '{"template": "travel", "category_id": 8, "project_prompt": true, "fields": ["distance", "purpose"]}'),
(3, 'Wareneinkauf', 'purchase', 'QR-Code für Wareneinkäufe und Material', 6,
 '{"template": "purchase", "category_id": 6, "project_prompt": true, "fields": ["supplier", "item_description"]}'),
(4, 'Geschäftsessen', 'meal', 'QR-Code für Verpflegung und Geschäftsessen', 9,
 '{"template": "meal", "category_id": 9, "project_prompt": true, "fields": ["participants", "purpose"]}'),
(5, 'Büromaterial', 'office', 'QR-Code für Büromaterial und Ausstattung', 6,
 '{"template": "office", "category_id": 6, "project_prompt": false, "fields": ["item_description"]}'),
(6, 'Software & IT', 'software', 'QR-Code für Software und IT-Ausgaben', 7,
 '{"template": "software", "category_id": 7, "project_prompt": true, "fields": ["software_name", "license_type"]}');
```

---

## 🎯 SCHRITT 5: DEPLOYMENT VERIFIZIEREN

### Nach dem Upload:
1. **Ihre URL:** `https://business-management.pages.dev`
2. **Custom Domain:** Später über Pages Settings
3. **Mobile QR-Codes:** Funktionieren sofort!

### Testing Checklist:
- [ ] Dashboard lädt
- [ ] Kundenstamm funktioniert  
- [ ] Zeiterfassung mit Timer
- [ ] Rechnungserstellung
- [ ] **Buchhaltung mit QR-Codes**
- [ ] Mobile Upload via iPhone/iPad

---

## 🏆 ERFOLG!

**Sie haben jetzt eine vollständige, professionelle Business Management Lösung mit:**
- ✅ CRM/Kundenstamm
- ✅ Zeiterfassung mit Timer
- ✅ Projektverwaltung
- ✅ Rechnungserstellung & PDF-Export
- ✅ VOLLSTÄNDIGE BUCHHALTUNG
- ✅ QR-BELEG-SYSTEM für Mobile Upload
- ✅ Multi-Country MwSt-Verwaltung

**Von überall zugänglich: iPhone, iPad, Computer, Laptop!** 🚀

### Support:
Bei Fragen: Die komplette Dokumentation ist im README.md verfügbar.