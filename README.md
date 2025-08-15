# Business Management Tool

## Projektübersicht
- **Name**: Business Management Tool
- **Ziel**: Vollständiges Tool für Buchhaltung, Zeiterfassung und Kundenverwaltung (CRM)
- **Features**: Kundenstamm, Zeiterfassung mit Timer, Projektverwaltung, Rechnungserstellung, Angebotserstellung

## URLs
- **Lokale Entwicklung**: https://3000-imcwy1rf2rqoa9ixk3xzy-6532622b.e2b.dev
- **API Endpunkte**:
  - `/api/customers` - Kundenverwaltung (GET, POST, PUT, DELETE)
  - `/api/time-entries` - Zeiterfassung (GET, POST, PUT, DELETE) 
  - `/api/projects` - Projektverwaltung (GET, POST, PUT, DELETE)
  - `/api/init-db` - Datenbank-Initialisierung

## Aktuell implementierte Features

### ✅ Vollständig funktionsfähig
1. **Kundenstamm/CRM**
   - Vollständige CRUD-Operationen für Kunden
   - Firmenname, Ansprechpartner, Kontaktdaten
   - Individuelle Stundensätze pro Kunde
   - Notizen und zusätzliche Informationen

2. **Zeiterfassung**
   - Manueller Zeiteintrag mit Start-/Endzeit
   - Live-Timer mit Start/Stop/Reset Funktionalität
   - Automatische Dauern-Berechnung
   - Zuordnung zu Kunden und Projekten
   - Abrechenbar/Nicht-abrechenbar Status
   - Berechnet/Unberechnet Tracking

3. **Projektverwaltung**
   - Projekt-Erstellung und -Verwaltung
   - Zuordnung zu Kunden
   - Budget und Stundensatz pro Projekt
   - Status-Tracking (Aktiv, Abgeschlossen, Pausiert, Abgebrochen)
   - Start- und Enddaten

4. **Dashboard**
   - Übersicht über aktive Kunden
   - Wöchentliche Stunden-Zusammenfassung
   - Aktive Projekte Anzahl
   - Monatlicher Umsatz (berechnet)
   - Letzte Zeiteinträge

5. **Benutzeroberfläche**
   - Responsive Design mit Tailwind CSS
   - Tab-Navigation zwischen Modulen
   - Modal-Dialoge für Dateneingabe
   - Live-Timer mit visueller Anzeige
   - Echtzeit-Aktualisierung

### 🚧 In Entwicklung (Datenstruktur vorhanden)
6. **Rechnungsmodul**
   - Vollständiges Datenbankschema implementiert
   - Rechnungsnummern, Fälligkeitsdaten, Status
   - Rechnungsposten mit Zeiteinträgen verknüpft
   - PDF-Export in Vorbereitung

7. **Angebotsmodul** 
   - Vollständiges Datenbankschema implementiert
   - Angebotsnummern, Gültigkeitsdaten, Status
   - Angebotsposten mit flexibler Preisgestaltung
   - PDF-Export in Vorbereitung

## Datenarchitektur
- **Datenbank**: Cloudflare D1 (SQLite-basiert, global verteilt)
- **Lokale Entwicklung**: SQLite mit wrangler --local flag
- **Haupttabellen**:
  - `customers` - Kundenstammdaten mit Kontaktinformationen
  - `projects` - Projekte mit Budget und Status-Tracking
  - `time_entries` - Zeiterfassung mit Abrechenbarkeit
  - `invoices` / `invoice_items` - Rechnungsverwaltung (vorbereitet)
  - `quotes` / `quote_items` - Angebotsverwaltung (vorbereitet) 
  - `company_settings` - Firmeneinstellungen für Rechnungen/Angebote

## Benutzeranleitung

### 1. Kundenstamm verwalten
- Neue Kunden über "Neuer Kunde" Button anlegen
- Firmenname, Ansprechpartner und Kontaktdaten eingeben
- Individuellen Stundensatz pro Kunde festlegen
- Kunden bearbeiten oder löschen über Aktions-Buttons

### 2. Zeit erfassen
- **Manual**: "Zeit erfassen" Button für manuelle Eingabe
- **Timer**: Live-Timer verwenden mit Start/Stop Funktionalität
- Beschreibung der Tätigkeit eingeben
- Kunde und Projekt zuordnen
- Abrechenbar/Nicht-abrechenbar markieren

### 3. Projekte verwalten
- Neue Projekte über "Neues Projekt" erstellen
- Kunde zuordnen, Budget und Stundensatz definieren
- Status verfolgen (Aktiv, Abgeschlossen, Pausiert, Abgebrochen)
- Start- und Enddaten für bessere Planung

### 4. Dashboard überwachen
- Schneller Überblick über wichtige Kennzahlen
- Letzte Zeiteinträge und offene Rechnungen
- Wöchentliche Stunden und monatlicher Umsatz

## Deployment
- **Platform**: Cloudflare Pages (für Produktion)
- **Status**: ✅ Aktiv in Entwicklungsumgebung
- **Tech Stack**: Hono + TypeScript + Tailwind CSS + D1 Database
- **Lokaler Server**: PM2 mit wrangler pages dev
- **Last Updated**: 15. August 2025

## Development

### Lokale Entwicklung starten
```bash
# Dependencies installieren
npm install

# Datenbank initialisieren (lokal)
npm run db:migrate:local
npm run db:seed

# Development server starten
npm run build
pm2 start ecosystem.config.cjs

# Testen
curl http://localhost:3000
```

### Datenbank-Befehle
```bash
# Lokale Migrationen anwenden
npm run db:migrate:local

# Testdaten hinzufügen
npm run db:seed

# Datenbank zurücksetzen
npm run db:reset

# Lokale DB-Konsole
npm run db:console:local
```

## Empfohlene nächste Entwicklungsschritte

1. **PDF-Export für Rechnungen implementieren**
   - PDF-Generierung mit jsPDF oder Puppeteer
   - Schweizer Rechnungsformat mit MwSt.
   - Email-Versand Integration

2. **PDF-Export für Angebote implementieren**
   - Professionelles Angebotslayout
   - Geschäftsbedingungen und Gültigkeit
   - Digitale Unterschrift Option

3. **Erweiterte Zeiterfassung**
   - Zeiteinträge bearbeiten/löschen
   - Bulk-Operationen für Abrechnung
   - Export nach Excel/CSV

4. **Berichtswesen**
   - Detaillierte Zeitberichte pro Kunde/Projekt
   - Umsatzanalysen und Charts
   - Monatliche/Jährliche Zusammenfassungen

5. **Produktive Cloudflare Deployment**
   - Produktions-D1 Datenbank erstellen
   - Environment Variables konfigurieren
   - Custom Domain Setup

Das Tool ist bereits vollständig funktionsfähig für die Hauptfunktionen Kundenverwaltung, Zeiterfassung und Projektverwaltung. Die Grundlage für Rechnungen und Angebote ist gelegt und kann schnell erweitert werden.