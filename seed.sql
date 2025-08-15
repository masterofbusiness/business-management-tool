-- Test data for Business Management Tool
-- Run with: npm run db:seed

-- Insert company settings
INSERT OR IGNORE INTO company_settings (
  company_name, address, city, postal_code, country, 
  phone, email, website, tax_number, 
  default_tax_rate, default_payment_terms
) VALUES (
  'Meine Firma GmbH',
  'Musterstrasse 123',
  'Zürich',
  '8001',
  'Schweiz',
  '+41 44 123 45 67',
  'info@meinefirma.ch',
  'www.meinefirma.ch',
  'CHE-123.456.789',
  8.1,
  '30 Tage'
);

-- Insert test customers
INSERT OR IGNORE INTO customers (
  company_name, contact_person, email, phone, 
  address, city, postal_code, country, 
  hourly_rate, notes
) VALUES 
(
  'Tech Solutions AG',
  'Hans Müller',
  'hans.mueller@techsolutions.ch',
  '+41 44 987 65 43',
  'Bahnhofstrasse 1',
  'Zürich',
  '8001',
  'Schweiz',
  120.00,
  'Langjähriger Kunde, spezialisiert auf Web-Entwicklung'
),
(
  'Digital Marketing GmbH',
  'Sarah Weber',
  'sarah.weber@digitalmarketing.ch',
  '+41 61 234 56 78',
  'Freie Strasse 45',
  'Basel',
  '4001',
  'Schweiz',
  95.00,
  'Neue Kundin, fokussiert auf SEO und Content Marketing'
),
(
  'StartUp Innovation',
  'Marco Rossi',
  'marco.rossi@startup-innovation.ch',
  '+41 21 345 67 89',
  'Avenue de la Gare 12',
  'Lausanne',
  '1003',
  'Schweiz',
  80.00,
  'Junges StartUp, budgetbewusst'
);

-- Insert test projects
INSERT OR IGNORE INTO projects (
  customer_id, name, description, hourly_rate, 
  budget, status, start_date, end_date
) VALUES 
(
  1,
  'E-Commerce Website',
  'Entwicklung einer modernen E-Commerce Plattform mit Payment Integration',
  120.00,
  15000.00,
  'active',
  '2025-08-01',
  '2025-10-31'
),
(
  1,
  'Mobile App Development',
  'Native iOS und Android App für Kundenverwaltung',
  120.00,
  25000.00,
  'active',
  '2025-07-15',
  '2025-12-15'
),
(
  2,
  'SEO Optimierung',
  'Suchmaschinenoptimierung der Firmenwebsite',
  95.00,
  5000.00,
  'completed',
  '2025-06-01',
  '2025-07-31'
),
(
  3,
  'MVP Development',
  'Entwicklung des Minimum Viable Product',
  80.00,
  8000.00,
  'active',
  '2025-08-10',
  '2025-09-30'
);

-- Insert test time entries
INSERT OR IGNORE INTO time_entries (
  customer_id, project_id, description, 
  start_time, end_time, duration_minutes, 
  hourly_rate, is_billable, is_billed
) VALUES 
(
  1,
  1,
  'Frontend Development - Produktkatalog',
  '2025-08-15 09:00:00',
  '2025-08-15 17:00:00',
  480,
  120.00,
  1,
  0
),
(
  1,
  1,
  'Backend API - Payment Integration',
  '2025-08-14 10:00:00',
  '2025-08-14 16:30:00',
  390,
  120.00,
  1,
  0
),
(
  2,
  3,
  'Keyword Research und Analyse',
  '2025-08-13 14:00:00',
  '2025-08-13 18:00:00',
  240,
  95.00,
  1,
  1
),
(
  3,
  4,
  'Projektplanung und Anforderungsanalyse',
  '2025-08-12 09:30:00',
  '2025-08-12 12:30:00',
  180,
  80.00,
  1,
  0
),
(
  1,
  2,
  'UI/UX Design für Mobile App',
  '2025-08-11 13:00:00',
  '2025-08-11 17:30:00',
  270,
  120.00,
  1,
  0
);

-- Insert test quotes
INSERT OR IGNORE INTO quotes (
  quote_number, customer_id, issue_date, valid_until,
  status, subtotal, tax_rate, tax_amount, total_amount,
  notes, terms_conditions
) VALUES (
  'OFF-2025-001',
  1,
  '2025-08-15',
  '2025-09-15',
  'sent',
  5000.00,
  8.1,
  405.00,
  5405.00,
  'Angebot für zusätzliche Features',
  'Gültig für 30 Tage. Zahlungsbedingungen: 30 Tage netto.'
);

-- Insert test quote items
INSERT OR IGNORE INTO quote_items (
  quote_id, description, quantity, unit_price, total
) VALUES 
(
  1,
  'Zusätzliche Payment-Gateway Integration',
  20.0,
  120.00,
  2400.00
),
(
  1,
  'Advanced Analytics Dashboard',
  15.0,
  120.00,
  1800.00
),
(
  1,
  'Mobile App Optimierung',
  8.0,
  100.00,
  800.00
);