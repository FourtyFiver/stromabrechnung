# ⚡ Stromabrechnung Portal

Ein modernes, webbasiertes Portal zur Verwaltung von Zählerständen und zur Kostenabrechnung.
**Tech Stack:** Next.js 15+ (React 19, App Router), SQLite (Prisma), NextAuth v4, Recharts, Vanilla CSS (Dark Theme/Glassmorphism), Docker.

## 🚀 Features
- **Tarife & Abrechnung:** Getrennte Erfassung von Hoch- (HT) und Niedertarif (NT), bis zu 4 Nachkommastellen bei Preisen, anteilige Grundgebühr.
- **Dynamik:** Rückwirkende Preisänderungen und historische Preisverläufe werden bei der Kostenberechnung berücksichtigt.
- **Visualisierung & Reports:** Interaktive Recharts-Grafiken und transparente Kostenaufschlüsselung im Dashboard & per Telegram-Bot.
- **Security & Hosting:** Gesicherter Login (NextAuth), Responsive UI, Docker-Ready (inkl. GHCR CI/CD-Pipeline).

## 📦 Installation & Start

### Option 1: Docker (Empfohlen für Produktion)
Voraussetzungen: Docker & Docker Compose (V2)

```bash
git clone https://github.com/FourtyFiver/stromabrechnung.git && cd stromabrechnung
cp .env.example .env
docker compose pull && docker compose up -d
```
*Tipp: Enthält dein `ADMIN_PASSWORD` in der `.env` Sonderzeichen, setze es in einfache Anführungszeichen (z.B. `'mein$passwort'`).*
*(Das Portal ist danach unter `http://localhost:3000` erreichbar)*

### Option 2: Lokal (Für Entwicklung)
Voraussetzungen: Node.js 22+

```bash
npm install
npx prisma db push && node prisma/seed.js # Erstellt Default-Admin
npm run dev
```

*Hinweis: Wenn keine `.env` konfiguriert ist, lauten die Entwicklungs-Zugangsdaten `admin` / `admin123`.*

## 🤖 Telegram Bot Einrichtung
1. Sende `/newbot` an **@BotFather** in Telegram, um deinen API Token zu erhalten.
2. Schreibe **@userinfobot** an, um deine Chat ID herauszufinden.
3. Trage beide Werte in deine `.env` Datei ein:
   ```ini
   TELEGRAM_BOT_TOKEN='dein_token'
   TELEGRAM_CHAT_ID='deine_id'
   ```

## ❓ Troubleshooting
- **Login fehlgeschlagen:** Docker-Logs prüfen (`docker compose logs -f`). Bei abgeschnittenem Passwort dieses in der `.env` mit `''` umschließen.
- **"Malformed" Fehler im Dashboard:** Der Chart benötigt mindestens **2 Zählerstände** zur Verbrauchsberechnung.
- **Build Fehler (EBADENGINE):** Node.js 20+ erforderlich (Im Dockerfile ist Node 22 konfiguriert).

## 📄 Lizenz
MIT License
