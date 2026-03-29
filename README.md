# ⚡ StromApp

Ein übersichtliches, webbasiertes Portal zur Verwaltung von Zählerständen und Stromkosten.

## 🚀 Features
- **Präzise Abrechnung:** Getrennte Erfassung von HT/NT, Berücksichtigung von Grundgebühren und Preisänderungen.
- **Visualisierung:** Interaktives Dashboard für den Verbrauchs- und Kostenüberblick.
- **Telegram Reports:** Automatische Benachrichtigungen über Verbräuche direkt aufs Handy.

## 📦 Installation (Docker)

Der schnellste und empfohlene Weg, um die App zu starten (Docker & Docker Compose vorausgesetzt):

```bash
git clone https://github.com/FourtyFiver/stromabrechnung.git && cd stromabrechnung
cp .env.example .env
docker compose up -d
```
*Die App ist danach unter `http://localhost:3000` erreichbar.*

## 🤖 Telegram Bot (Optional)
Damit du Reports direkt über Telegram erhältst, trage deine Bot-Daten in die `.env` ein:
```ini
TELEGRAM_BOT_TOKEN='dein_token'
TELEGRAM_CHAT_ID='deine_id'
```

## ❓ Troubleshooting & Hinweise
- **Start-Login:** Die voreingestellten Zugangsdaten lauten `admin` / `admin123` (falls nicht in der `.env` überschrieben).
- **Passwort mit Sonderzeichen:** Umschließe Passwörter in der `.env` mit einfachen Anführungszeichen (z.B. `'p@sswort'`).
- **Dashboard leer?** Für die Verbrauchs- und Kostenberechnung werden immer mindestens **2 Zählerstände** benötigt.
