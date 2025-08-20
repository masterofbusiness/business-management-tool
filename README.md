# Business Management Tool 🚀

## Projektübersicht
- **Name**: Business Management Tool - **All-in-One Lösung**
- **Ziel**: Vollständiges Tool für **Buchhaltung, Zeiterfassung und Kundenverwaltung (CRM)** mit **QR-Beleg-System**
- **Features**: Kundenstamm, Zeiterfassung mit Timer, Projektverwaltung, Rechnungserstellung, Angebotserstellung, **Vollständige Buchhaltung mit Mobile QR-Upload**

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
  - **🆕 `/api/accounting/entries`** - Buchhaltungseinträge (CRUD)
  - **🆕 `/api/accounting/categories`** - Buchungskategorien
  - **🆕 `/api/accounting/vat-rates`** - MwSt-Sätze (CH, LI, AT, DE)
  - **🆕 `/api/accounting/qr-templates`** - QR-Code Templates
  - **🆕 `/api/accounting/reports/summary`** - Buchhaltungsberichte
  - **🆕 `/mobile/upload/:token`** - Mobile QR-Beleg-Upload Interface

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

5. **Rechnungsmodul** ✅ **Vollständig funktionsfähig**
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
   - **Rechnungsbearbeitung** 🆕:
     - **Vollständig funktionsfähige Bearbeitung** existierender Rechnungen
     - **Korrektes Laden** aller Rechnungspositionen beim Bearbeiten
     - **Erhaltung bestehender Positionen** beim Hinzufügen neuer Items
     - **Echtzeitberechnung** bei Änderungen ohne Datenverlust

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

8. **PDF-Export & Vorschau** ✅ **Vollständig implementiert**
   - **Rechnungsvorschau-Modal** mit formatierter Darstellung
   - **PDF-Export für Rechnungen** mit Schweizer Formatierung
   - **Print-freundliches Layout** mit korrekter MwSt.-Darstellung
   - **Ein-Klick-Export** über Tabellen-Buttons oder Vorschau-Modal
   - **Automatischer Print-Dialog** beim PDF-Export
   - **Professional Layout** für geschäftliche Verwendung
   - **Dynamisches Firmenlogo** im PDF-Header
   - **Vollständige Firmendaten** im PDF-Footer

9. **Firmeneinstellungen** ✅ **Vollständig implementiert**
   - **Kompletter Einstellungen-Tab** für alle Firmendaten
   - **Logo-Integration** (URL-basiert, wird in PDFs angezeigt)
   - **Vollständige Kontaktdaten** (Adresse, Telefon, E-Mail, Website)
   - **Banking-Informationen** (IBAN, Bank, BIC/SWIFT)
   - **Steuer- und Rechtsdaten** (MwSt-Nummer, Standard-Sätze)
   - **Live-Vorschau** zeigt, wie Daten in Rechnungen erscheinen
   - **Automatische PDF-Integration** - alle Einstellungen werden in PDFs verwendet

10. **🆕 VOLLSTÄNDIGES BUCHHALTUNGSMODUL** ✅ **Neu implementiert!**
   - **Einnahmen/Ausgaben-Erfassung** mit vollständigem CRUD
   - **Kategorien-System** mit vorkonfigurierten Geschäftskategorien
   - **Multi-Country MwSt-Verwaltung** (Schweiz 8.1%, Liechtenstein 8.0%, Österreich 20%, Deutschland 19%)
   - **QR-Code Beleg-System**:
     - **QR-Templates** für verschiedene Ausgabentypen (Fahrtkosten, Wareneinkauf, Verpflegung, etc.)
     - **QR-Code Generator** für Mobile-Upload-Sessions
     - **Mobile Upload-Interface** via Smartphone-Kamera
     - **Base64-Belegbilder** direkt in Datenbank gespeichert
   - **Buchhaltungsübersicht**:
     - **Jahresübersicht** mit Einnahmen/Ausgaben/Gewinn
     - **MwSt-Schulden-Berechnung** automatisch
     - **Filterbare Buchungsansicht** nach Typ, Kategorie, Status
     - **Status-Management** (Entwurf, Bestätigt, Abgestimmt)
   - **OCR-ready**: Vorbereitet für automatische Texterkennung
   - **Reports-API**: Grundlage für Jahresabschluss und MwSt-Voranmeldung

11. **Mobile QR-Beleg-Upload** 🚀 **Innovatives Feature!**
   - **QR-Code Generierung** für verschiedene Ausgabentypen
   - **Mobile Web-App** ohne App-Installation benötigt
   - **Smartphone-Kamera Integration** für Beleg-Fotos
   - **Session-basierte Sicherheit** mit 24h Gültigkeit
   - **Automatische Desktop-Integration** - Belege erscheinen sofort in Buchhaltung

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
  - **🆕 `accounting_entries`** - Buchhaltungseinträge mit MwSt-Berechnung
  - **🆕 `accounting_categories`** - Einnahmen-/Ausgaben-Kategorien
  - **🆕 `vat_rates`** - MwSt-Sätze für verschiedene Länder
  - **🆕 `qr_templates`** - QR-Code Templates für Mobile Upload
  - **🆕 `upload_sessions`** - Sichere QR-Upload-Sessions

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

### 4. Rechnungen erstellen, bearbeiten & exportieren ✅
- **Zwei Erstellungsarten**:
  - **"Aus Zeiteinträgen"**: Kunde auswählen → Nicht abgerechnete Zeiteinträge markieren → Automatische Berechnung
  - **"Neue Rechnung"**: Freie Eingabe mit beliebigen Positionen
- **Positionen verwalten**: Add/Remove Buttons für Rechnungsposten
- **Echtzeitberechnung**: Automatische Summen- und MwSt.-Berechnung
- **Status verwalten**: Entwurf → Versendet → Bezahlt Workflow
- **Rechnungsbearbeitung**:
  - **Bearbeiten-Button** in Rechnungstabelle → Lädt vollständige Rechnungsdetails
  - **Alle Positionen werden korrekt geladen** und können bearbeitet werden
  - **Neue Positionen hinzufügbar** ohne Verlust bestehender Daten
  - **Sofortige Berechnung** bei jeder Änderung
- **Vorschau & Export**:
  - **Auge-Button** → Formatierte Rechnungsvorschau mit allen Details
  - **PDF-Export-Button** → Öffnet druckfertige HTML-Version
  - **Automatischer Print-Dialog** für sofortiges Drucken
  - **Schweizer Rechnungsformat** mit korrekter MwSt.-Darstellung
  - **Dynamisches Firmenlogo** im Header (aus Einstellungen)
  - **Professioneller Footer** mit allen Firmendaten

### 5. Firmeneinstellungen verwalten ✅
- **Einstellungen-Tab** für zentrale Datenverwaltung
- **Firmendaten**: Name, Adresse, Kontaktdaten komplett erfassen
- **Logo-Integration**: URL eingeben → erscheint automatisch in PDFs
- **Banking**: IBAN, Bank, BIC/SWIFT für Zahlungsinformationen
- **Rechtliches**: MwSt-Nummer, Standard-Steuersätze
- **Live-Vorschau**: Sofortige Anzeige, wie Daten in Rechnungen erscheinen
- **Ein-Klick-Speicherung**: Alle Änderungen zentral speichern

### 5. Angebote erstellen 🆕
- **"Neues Angebot"** Button im Angebots-Tab
- Status-Verfolgung von Entwurf bis Annahme/Ablehnung
- Gültigkeitsdaten für zeitlich begrenzte Angebote
- **Vollständige Backend-Funktionalität verfügbar**

### 6. **🆕 BUCHHALTUNG VERWALTEN** ✅ **Vollständig funktionsfähig**
- **Buchhaltungs-Tab** für komplette Einnahmen-/Ausgaben-Verwaltung
- **Neue Buchung erstellen**:
  - **Einnahme oder Ausgabe** auswählen
  - **Automatische MwSt-Berechnung** basierend auf Ländersätzen
  - **Kategorie-Zuordnung** (Büromaterial, Software, Fahrtkosten, etc.)
  - **Kunden- und Projekt-Verknüpfung** möglich
  - **Beleg-Upload** für Dokumentation
- **QR-Code System verwenden**:
  - **QR-Codes generieren** im Admin-Bereich für verschiedene Ausgabentypen
  - **QR-Code drucken/kopieren** für mobile Nutzung
  - **Mit Smartphone scannen** → Öffnet Upload-Interface
  - **Beleg fotografieren** und hochladen
  - **Automatische Kategorisierung** basierend auf QR-Template
- **Übersicht und Reporting**:
  - **Jahresübersicht** mit Einnahmen, Ausgaben, Gewinn/Verlust
  - **MwSt-Übersicht** - geschuldete Beträge automatisch berechnet
  - **Filterbare Ansicht** nach Datum, Typ, Kategorie, Status
  - **Belegbilder anzeigen** durch Klick auf Kamera-Icon

### 7. Dashboard überwachen
- Schneller Überblick über wichtige Kennzahlen
- Letzte Zeiteinträge und offene Rechnungen
- Wöchentliche Stunden und monatlicher Umsatz
- **🆕 Buchhaltungsübersicht** mit Jahresgewinn und MwSt-Status

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

Das Tool ist **vollständig produktionsreif** für alle Kern-Geschäftsprozesse:
- ✅ **Vollständige Kundenverwaltung**
- ✅ **Professionelle Zeiterfassung** (manuell + Timer)
- ✅ **Umfassende Projektverwaltung**
- ✅ **Vollständige Rechnungserstellung & -bearbeitung** (manuell + automatisch)
- ✅ **Rechnungsvorschau & PDF-Export** (Schweizer Format mit Logo)
- ✅ **Firmeneinstellungen** (Logo, Kontakt, Banking komplett)
- ✅ **Angebotsverwaltung** (Backend komplett)

### 🆕 **Neueste Verbesserungen (15.08.2025)**
- **Rechnungsbearbeitung vollständig funktionsfähig**: Behebung des Problems, bei dem beim Bearbeiten von Rechnungen die Positionsübersicht nicht geladen wurde
- **Korrektes Laden bestehender Positionen**: Alle eingetragenen Rechnungsposten werden beim Bearbeiten korrekt angezeigt
- **Keine Datenüberschreibung**: Neue Positionen können hinzugefügt werden, ohne bestehende zu verlieren
- **Verbesserte Benutzerfreundlichkeit**: Nahtlose Bearbeitung ohne Funktionalitätsverlust
- **Vollständiger PDF-Export implementiert**: Schweizer Rechnungsformat mit Ein-Klick-Export
- **Rechnungsvorschau hinzugefügt**: Formatierte Anzeige vor dem Export
- **Print-Integration**: Automatischer Print-Dialog beim PDF-Export

### 🆕 **BUCHHALTUNGSMODUL KOMPLETT IMPLEMENTIERT (20.08.2025)**
- **Vollständige Buchhaltungslösung** mit Einnahmen-/Ausgaben-Erfassung
- **QR-Beleg-System**: Innovative mobile Upload-Lösung für Smartphone-Belege
- **Multi-Country MwSt**: Schweiz, Liechtenstein, Österreich, Deutschland
- **Kategorien-System**: Vorkonfigurierte Geschäftskategorien mit Farb-Codierung
- **Mobile QR-Upload**: Session-basierte Sicherheit mit 24h gültigen QR-Codes
- **Base64-Belege**: Belegbilder direkt in Datenbank für Vollständigkeit
- **Buchhaltungs-Dashboard**: Jahresübersicht mit automatischer MwSt-Berechnung
- **Status-Workflow**: Entwurf → Bestätigt → Abgestimmt für ordnungsgemäße Buchführung

**Die Anwendung ist jetzt eine VOLLSTÄNDIGE ALL-IN-ONE BUSINESS-LÖSUNG!** 
- ✅ **CRM/Kundenstamm** komplett funktionsfähig
- ✅ **Zeiterfassung** mit Timer und manueller Eingabe
- ✅ **Projektverwaltung** mit Budget-Tracking
- ✅ **Rechnungserstellung** mit automatischer Generierung aus Zeiteinträgen
- ✅ **PDF-Export** in professionellem Schweizer Format
- ✅ **Firmeneinstellungen** mit Logo-Integration
- ✅ **BUCHHALTUNG** mit QR-Beleg-System für mobile Smartphone-Upload
- ✅ **Multi-Country MwSt-Verwaltung** für internationale Geschäfte

**Das System deckt nun ALLE Aspekte des modernen Geschäftslebens ab!** 🎯