# ⚡ StromApp

Ein übersichtliches, webbasiertes Portal zur Verwaltung von Zählerständen und Stromkosten.

## 🚀 Features
- **Präzise Abrechnung:** Getrennte Erfassung von HT/NT, Berücksichtigung von Grundgebühren und Preisänderungen.
- **Visualisierung:** Interaktives Dashboard für den Verbrauchs- und Kostenüberblick.
- **Telegram Reports:** Versand an beliebig viele Chats — Empfänger über die WebUI verwaltbar.
- **WhatsApp-Versand:** Click-to-Chat mit vorgefülltem Report — ohne Bot, ohne API.
- **Test-Versände mit echtem Report:** Die Test-Buttons in den Einstellungen senden den vollständigen Report der neuesten offenen Periode (mit „⚠️ TEST — nicht abgerechnet"-Fußnote) — so werden Versand **und** Nachrichtenformatierung (Emojis, Umbrüche, Werte) geprüft. Tests gehen niemals an die Empfänger.
- **Reset-Button:** Fehlgebuchte Perioden lassen sich in der Abrechnungs-Historie wieder öffnen.

## 📦 Installation (Docker)

Der schnellste und empfohlene Weg, um die App zu starten (Docker & Docker Compose vorausgesetzt):

```bash
git clone https://github.com/FourtyFiver/stromabrechnung.git && cd stromabrechnung
cp .env.example .env
docker compose up -d
```
*Die App ist danach unter `http://localhost:3000` erreichbar.*

*Alle Einstellungen zu Telegram- und WhatsApp-Versand werden komfortabel über die WebUI vorgenommen — die `.env` ist nur für Basis-Konfiguration und Secrets nötig.*

## 🤖 Telegram Bot

Reports können über einen Telegram-Bot an beliebig viele Chats versendet werden — eigener Chat und/oder Mieter-Gruppe.

### Bot-Token (immer in der `.env`)
```ini
TELEGRAM_BOT_TOKEN='dein_token'
```
Der Token ist ein Secret und wird bewusst **nicht** in die Datenbank gespeichert.

### Empfänger-Chat-IDs
**Empfohlen: über die WebUI (→ Einstellungen → Telegram-Empfänger)**
- Eine Chat-ID pro Zeile, max. 10 (Gruppen-IDs sind negativ, z. B. `-1001234567890`)
- Duplikate werden automatisch entfernt, ungültige Einträge werden abgelehnt
- **Test-Chat-ID** separat eintragen: Alle Test-Versände gehen **nur** an diesen Chat — nie an die Empfängerliste. Der Mieter sieht keine Tests.
- 📤 **Test-Nachricht senden**: Sendet den vollständigen Report der neuesten offenen Periode (mit TEST-Fußnote) nur an die Test-Chat-ID — so lassen sich Versand **und** korrekte Darstellung der Nachricht in einem Rutsch prüfen. Ohne hinterlegte Test-Chat-ID greift der Fallback auf die `TELEGRAM_CHAT_ID` aus der `.env`.

**Fallback: `.env`** (Legacy-Setup bleibt so aktiv):
```ini
TELEGRAM_CHAT_ID='deine_id'
```
Ist in der WebUI keine Empfängerliste hinterlegt, greift automatisch diese `TELEGRAM_CHAT_ID`. So funktioniert ein bestehendes Setup auch ganz ohne WebUI-Konfiguration weiter.

**Echte Reports senden:** Im Dashboard über **📊 Report erstellen** → Zeitraum wählen → **📤 Per Telegram senden**. Die Periode wird dabei sofort als abgerechnet gebucht.

### Wichtig für jeden Empfänger-Chat
Der Bot darf einem Chat nur schreiben, wenn dort jemand dem Bot bereits eine Nachricht geschickt hat (z. B. `/start` an den Bot). Sonst lehnt die Telegram-API den Versand an diesen Chat ab (Teilerfolg wird gemeldet).

## 📲 WhatsApp-Versand

Nachrichten werden per **Click-to-Chat** geöffnet: Die App baut den fertigen Link (`whatsapp://` bzw. `https://api.whatsapp.com/send`), WhatsApp öffnet sich mit vorgefülltem Report — der Versandtipp bleibt bei dir. Kein Bot, keine API, keine Meta-Cloud.

**Konfiguration (→ Einstellungen → WhatsApp-Empfänger):**
- Handynummer des Mieters im Format `+49 123 456789` eintragen und speichern
- Die Nummer liegt in der Datenbank (Tabelle `AppSettings`), nicht in der `.env`
- 📱 **Test-Nachricht senden:** Öffnet WhatsApp mit dem vollständigen Report der neuesten offenen Periode (mit TEST-Fußnote) im **Eigen-Chat** („Message yourself") — die Konfiguration lässt sich komplett durchtesten, ohne jemanden zu kontaktieren. Dazu die eigene Nummer eintragen.

**Echte Reports senden:** Im Dashboard über **📊 Report erstellen** → Zeitraum wählen → **📲 Per WhatsApp senden**. WhatsApp öffnet sich mit dem fertigen Text — dort noch auf Senden tippen.

**Hinweise:**
- Die WhatsApp-Nummer braucht für den Versand einen aktiven WhatsApp-Account (der Mieter muss den Chat also empfangen können).
- Auf iOS fragt Safari vor dem Öffnen „In WhatsApp öffnen?" — das ist Standard und korrekt.
- **Buchung vs. Senden:** Die **Buchung** der Periode passiert server-seitig bereits beim Klick auf „Per WhatsApp senden" — vor dem Öffnen der App. WhatsApp ist nur der Transport. Wird der Versand in WhatsApp abgebrochen, lässt sich die Buchung über den 🔄 Reset-Button in der Abrechnungs-Historie zurücknehmen (siehe Troubleshooting).

## ❓ Troubleshooting & Hinweise

- **Start-Login:** Die voreingestellten Zugangsdaten lauten `admin` / `admin123` (falls nicht in der `.env` überschrieben). Das `.env.example` zeigt die Sonder-Regularien für `ADMIN_PASSWORD` (keine Anführungszeichen, `$` muss als `$$` doppelt werden).
- **Dashboard leer?** Für die Verbrauchs- und Kostenberechnung werden immer mindestens **2 Zählerstände** benötigt.
- **Fehlbuchung nach abgebrochenem Versand?** Abrechnungs-Historie öffnen → 🔄 Reset-Button der Periode drücken: Der BillPeriod-Eintrag wird gelöscht, die Zählerstände werden wieder als „offen" gesetzt und können neu abgerechnet werden.
- **Test-Report, aber period wurde gebucht?** Tests buchen niemals — gebucht wird nur über die echten Sende-Buttons im Report-Dialog. Falls ein echter Versand statt eines Tests lief: Reset-Button (siehe oben).