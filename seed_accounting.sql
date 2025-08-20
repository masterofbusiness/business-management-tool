-- Seed Data für Buchhaltungsmodul

-- Standard Kategorien für Einnahmen
INSERT OR IGNORE INTO accounting_categories (id, name, type, color, description, tax_deductible) VALUES 
(1, 'Dienstleistungen', 'income', '#10b981', 'Einnahmen aus Dienstleistungen', 0),
(2, 'Produktverkäufe', 'income', '#3b82f6', 'Einnahmen aus Produktverkäufen', 0),
(3, 'Beratung', 'income', '#8b5cf6', 'Beratungsleistungen', 0),
(4, 'Lizenzgebühren', 'income', '#f59e0b', 'Lizenz- und Nutzungsgebühren', 0),
(5, 'Sonstige Einnahmen', 'income', '#6b7280', 'Andere Einnahmenquellen', 0);

-- Standard Kategorien für Ausgaben
INSERT OR IGNORE INTO accounting_categories (id, name, type, color, description, tax_deductible) VALUES 
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

-- MWST-Sätze für verschiedene Länder
INSERT OR IGNORE INTO vat_rates (country_code, country_name, rate_type, rate_percentage, description) VALUES 
-- Schweiz
('CH', 'Schweiz', 'standard', 8.1, 'Normalsatz Schweiz'),
('CH', 'Schweiz', 'reduced', 2.6, 'Reduzierter Satz (Nahrungsmittel, Bücher, etc.)'),
('CH', 'Schweiz', 'accommodation', 3.8, 'Beherbergung'),

-- Liechtenstein 
('LI', 'Liechtenstein', 'standard', 8.0, 'Normalsatz Liechtenstein'),
('LI', 'Liechtenstein', 'reduced', 2.6, 'Reduzierter Satz'),

-- Österreich
('AT', 'Österreich', 'standard', 20.0, 'Normalsatz Österreich'),
('AT', 'Österreich', 'reduced', 10.0, 'Reduzierter Satz'),
('AT', 'Österreich', 'special', 13.0, 'Sondersatz (Kultur, etc.)'),

-- Deutschland
('DE', 'Deutschland', 'standard', 19.0, 'Normalsatz Deutschland'),
('DE', 'Deutschland', 'reduced', 7.0, 'Reduzierter Satz');

-- Standard QR-Templates
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
 '{"template": "software", "category_id": 7, "project_prompt": true, "fields": ["software_name", "license_type"]}')