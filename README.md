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
  - `/api/invoices` - Rechnungsverwaltung (GET, POST, PUT, DELETE)
  - `/api/quotes` - Angebotsverwaltung (GET, POST, PUT, DELETE)
  - `/api/invoices/from-time-entries` - Automatische Rechnungserstellung
  - `/api/customers/:id/unbilled-time-entries` - Nicht abgerechnete Zeiteinträge

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

5. **Rechnungsmodul** 🆕
   - **Vollständige CRUD-Operationen** für Rechnungen
   - **Automatische Rechnungsnummern** (RE-2025-001 Format)
   - **Zwei Erstellungsarten**:
     - **Freie Rechnungserstellung** mit beliebigen Positionen
     - **Automatisch aus Zeiteinträgen** mit Kundenauswahl
   - **Erweiterte Funktionen**:
     - Multi-Item Rechnungen mit Add/Remove Funktionalität
     - Echtzeitberechnung von Zwischensumme, MwSt. (8.1%) und Gesamtbetrag
     - Status-Tracking (Entwurf, Versendet, Bezahlt, Überfällig, Storniert)
     - Flexible Zahlungsbedingungen und Notizen
     - Automatische Markierung von Zeiteinträgen als "berechnet"
   - **Intelligente Zeiterfassung-Integration**:
     - Auswahl nicht abgerechneter Zeiteinträge pro Kunde
     - Vorschau mit Gesamtstunden und Betrag
     - Automatische Stundensatz-Erkennung aus Kundendaten

6. **Angebotsmodul** 🆕
   - **Vollständige CRUD-Operationen** für Angebote
   - **Automatische Angebotsnummern** (OFF-2025-001 Format)
   - **Status-Tracking** (Entwurf, Versendet, Angenommen, Abgelehnt, Abgelaufen)
   - **Tabellendarstellung** mit Übersicht aller Angebote
   - **Gültigkeitsdaten** und Betragsanzeige

7. **Benutzeroberfläche**
   - Responsive Design mit Tailwind CSS
   - Tab-Navigation zwischen allen Modulen
   - Modal-Dialoge für Dateneingabe
   - Live-Updates und Notifications
   - **Neue Rechnungs-/Angebots-Tabellen** mit Aktions-Buttons
   - **Erweiterte Formulare** mit Echtzeit-Berechnungen

### 🚧 In Entwicklung (APIs vollständig implementiert)
8. **PDF-Export** 
   - Vollständige Backend-APIs für Rechnungen und Angebote
   - Schweizer Rechnungsformat mit MwSt.-Ausweis
   - Professional layout für Angebote
   - **Frontend-Integration steht aus**

9. **Erweiterte Angebots-Bearbeitung**
   - Backend vollständig implementiert
   - **Frontend-Modal steht aus**

## Datenarchitektur
- **Datenbank**: Cloudflare D1 (SQLite-basiert, global verteilt)
- **Lokale Entwicklung**: SQLite mit wrangler --local flag
- **Haupttabellen**:
  - `customers` - Kundenstammdaten mit Kontaktinformationen
  - `projects` - Projekte mit Budget und Status-Tracking
  - `time_entries` - Zeiterfassung mit Abrechenbarkeit
  - `invoices` / `invoice_items` - **Vollständig implementiert** ✅
  - `quotes` / `quote_items` - **Vollständig implementiert** ✅
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

### 4. Rechnungen erstellen 🆕
- **Zwei Möglichkeiten**:
  - **"Aus Zeiteinträgen"**: Kunde auswählen → Nicht abgerechnete Zeiteinträge markieren → Automatische Berechnung
  - **"Neue Rechnung"**: Freie Eingabe mit beliebigen Positionen
- **Positionen verwalten**: Add/Remove Buttons für Rechnungsposten
- **Echtzeitberechnung**: Automatische Summen- und MwSt.-Berechnung
- **Status verwalten**: Entwurf → Versendet → Bezahlt Workflow

### 5. Angebote erstellen 🆕
- **"Neues Angebot"** Button im Angebots-Tab
- Status-Verfolgung von Entwurf bis Annahme/Ablehnung
- Gültigkeitsdaten für zeitlich begrenzte Angebote
- **Vollständige Backend-Funktionalität verfügbar**

### 6. Dashboard überwachen
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

1. **PDF-Export implementieren** 🔥 **Höchste Priorität**
   - Frontend-Integration für Rechnungs-PDF-Generation
   - Schweizer Rechnungsformat mit korrekter MwSt.-Darstellung
   - Angebots-PDF mit professionellem Layout
   - Download und Email-Versand Funktionalität

2. **Vollständiges Angebots-Modal** 
   - Erweiterte Angebotsbearbeitung (wie Rechnungsmodal)
   - Multi-Item Angebote mit Berechnungen
   - Geschäftsbedingungen und Gültigkeitslogik

3. **Anzeige-/Vorschau-Funktionen**
   - Rechnungen und Angebote in formatierter Ansicht anzeigen
   - Print-freundliche Darstellung
   - Status-History und Änderungsverfolgung

4. **Erweiterte Berichtswesen**
   - Detaillierte Zeitberichte pro Kunde/Projekt
   - Umsatzanalysen mit Charts
   - Export-Funktionen (Excel/CSV)

5. **Produktive Cloudflare Deployment**
   - Produktions-D1 Datenbank erstellen
   - Environment Variables konfigurieren
   - Custom Domain Setup

## Aktuelle Funktionalität (Stand 15.08.2025)

Das Tool ist **produktionsreif** für die Kern-Geschäftsprozesse:
- ✅ **Vollständige Kundenverwaltung**
- ✅ **Professionelle Zeiterfassung** (manuell + Timer)
- ✅ **Umfassende Projektverwaltung**
- ✅ **Vollständige Rechnungserstellung** (manuell + automatisch)
- ✅ **Angebotsverwaltung** (Backend komplett)
- 🚧 **PDF-Export** (APIs bereit, Frontend ausstehend)

**Die Anwendung kann bereits jetzt für das tägliche Business verwendet werden!** 
Rechnungen können erstellt, verwaltet und tracking werden. Der PDF-Export ist die einzige fehlende Komponente für den kompletten Workflow.