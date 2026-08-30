# ⚡ StromApp

Ein übersichtliches, webbasiertes Portal zur Verwaltung von Zählerständen und Stromkosten.

## 🚀 Features
- **Präzise Abrechnung:** Getrennte Erfassung von HT/NT, Berücksichtigung von Grundgebühren und Preisänderungen.
- **Visualisierung:** Interaktives Dashboard für den Verbrauchs- und Kostenüberblick.
- **Telegram Reports:** Automatische Benachrichtigungen über Verbräuche direkt aufs Handy — an beliebig viele Chats.
- **WhatsApp-Versand:** Click-to-Chat mit vorgefülltem Report — ohne Bot, ohne API.
- **Test-Versände:** Konnektivitäts-Tests pro Kanal direkt in den Einstellungen — niemals an die Empfänger.
- **Reset-Button:** Fehlgebuchte Perioden lassen sich in der Abrechnungs-Historie wieder öffnen.

## 📦 Installation (Docker)

Der schnellste und empfohlene Weg, um die App zu starten (Docker & Docker Compose vorausgesetzt):

```bash
git clone https://github.com/FourtyFiver/stromabrechnung.git && cd stromabrechnung
cp .env.example .env
docker compose up -d
```
*Die App ist danach unter `http://localhost:3000` erreichbar.*

## 📲 WhatsApp-Versand

Nachrichten werden per **Click-to-Chat** geöffnet: Die App baut den fertigen Link (`whatsapp://` bzw. `https://api.whatsapp.com/send`), WhatsApp öffnet sich mit vorgefülltem Text — der Versandtipp bleibt bei dir. Kein Bot, keine API, keine Meta-Cloud.

**Konfiguration (→ Einstellungen → WhatsApp-Empfänger):**
- Handynummer des Mieters im Format `+49 123 456789` eintragen und speichern
- Die Nummer liegt in der Datenbank (Tabelle `AppSettings`), nicht in der `.env`
- 📱 **Test-Nachricht senden** öffnet den Eigen-Chat („Message yourself") mit einer kurzen Test-Nachricht — ideal, um die Konfiguration zu prüfen, ohne jemanden zu kontaktieren

**Hinweise:**
- Die WhatsApp-Nummer braucht für den Versand einen aktiven WhatsApp-Account (der Mieter muss den Chat also empfangen können).
- Auf iOS fragt Safari vor dem Öffnen „In WhatsApp öffnen?" — das ist Standard und korrekt.
- WhatsApp kann Nachrichten nicht selbständig senden: Der User tippt den Versand immer final in der App. Die **Buchung** der Periode passiert jedoch bereits server-seitig beim Klick auf „Per WhatsApp senden" — vor dem Öffnen der App. Wird der Versand in WhatsApp abgebrochen, lässt sich die Buchung über den 🔄 Reset-Button in der Abrechnungs-Historie zurücknehmen.

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
- Dededuplizierung und Validierung machen die Liste sicher gegen Tippfehler
- **Test-Chat-ID** separat eintragen: Alle Test-Versände (Settings-Button 📤 und früherer Dialog-Test) gehen **nur** an diesen Chat — nie an die Empfängerliste. Der Mieter sieht keine Tests.
- 📤 **Test-Nachricht senden** prüft die Konnektivität, falls eine Test-Chat-ID gesetzt ist (sonst Fallback auf die `.env`)

**Fallback: `.env`** (Legacy-Setup bleibt so aktiv):
```ini
TELEGRAM_CHAT_ID='deine_id'
```
Ist in der WebUI keine Empfängerliste hinterlegt, greift automatisch diese `TELEGRAM_CHAT_ID`. So funktioniert ein bestehendes Setup auch ganz ohne WebUI-Konfiguration weiter.

### Wichtig für jeden Empfänger-Chat
Der Bot darf einem Chat nur schreiben, wenn dort jemand dem Bot bereits eine Nachricht geschickt hat (z. B. `/start` an den Bot). Sonst lehnt die Telegram-API den Versand an diesen Chat ab (Teilerfolg wird gemeldet).

## ❓ Troubleshooting & Hinweise
- **Start-Login:** Die voreingestellten Zugangsdaten lauten `admin` / `admin123` (falls nicht in der `.env` überschrieben).
- **Passwort mit Sonderzeichen:** Umschließe Passwörter in der `.env` mit einfachen Anführungszeichen (z.B. `'p@sswort'`).
- **Dashboard leer?** Für die Verbrauchs- und Kostenberechnung werden immer mindestens **2 Zählerstände** benötigt.
- **Test-Send aus dem Report-Dialog?** Entfallen — Test-Versände laufen bewusst nur über die Einstellungen (WhatsApp & Telegram), niemals an die Empfänger-Chat-Liste.
- **Fehlbuchung nach WhatsApp-Abbruch?** Abrechnungs-Historie öffnen → 🔄 Reset-Button der Periode drücken: BillPeriod-Eintrag wird gelöscht, Zählerstände werden wieder „offen" gesetzt.