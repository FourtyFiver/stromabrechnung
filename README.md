# ⚡ Stromabrechnung Portal

Ein modernes, webbasiertes Portal zur Verwaltung von Stromzählerständen und zur Kostenabrechnung. Entwickelt mit **Next.js 15+**, **Recharts**, **Prisma** und **Docker**.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Dashboard+Stromabrechnung)

## 🚀 Features

- **HT / NT Unterscheidung**: Getrennte Erfassung von Hochtarif (Tag) und Niedertarif (Nacht).
- **Interaktive Charts**: Visuelle Auswertung des Verbrauchs und der Kostenverläufe.
- **Dynamische Preise**: Historische Preisänderungen werden bei der Kostenberechnung berücksichtigt.
- **Benutzerverwaltung**: Gesicherter Zugriff via Login (NextAuth.js).
- **Responsive Design**: Modernes UI mit Dark Mode und Glassmorphism-Effekten.
- **Docker Ready**: Vollständig containerisiert für einfaches Deployment.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19
- **Styling**: Vanilla CSS (Premium Dark Theme)
- **Datenbank**: SQLite (via Prisma ORM)
- **Auth**: NextAuth.js v4
- **Charts**: Recharts

## 📦 Installation & Start

### Vrequisiten
- **Docker** & **Docker Compose** (V2 empfohlen)
- *Oder lokal:* Node.js Version 22 oder höher

### Option 1: Docker (Empfohlen)

1. **Repository klonen**
   ```bash
   git clone https://github.com/FourtyFiver/stromabrechnung.git
   cd stromabrechnung
   ```

2. **Konfiguration**
   Erstelle eine `.env` Datei (kopiere die Vorlage):
   ```bash
   cp .env.example .env
   ```
   
   ⚠️ **WICHTIG bei Passwörtern:**
   Wenn dein Passwort Sonderzeichen enthält (z.B. `$`, `&`, `#`), setze es in **einfache Anführungszeichen**:
   ```ini
   ADMIN_PASSWORD='mein$sicheres#passwort'
   ```

3. **Starten**
   ```bash
   docker compose up -d --build
   ```
   Das Portal ist unter `http://localhost:3000` erreichbar.

### Option 2: Lokal (Entwicklung)

1. **Installieren**
   ```bash
   npm install
   ```

2. **Datenbank Setup**
   ```bash
   npx prisma db push
   node prisma/seed.js # Erstellt Default-Admin
   ```

3. **Starten**
   ```bash
   npm run dev
   ```

## ❓ Troubleshooting

### Login funktioniert nicht ("Ungültige Zugangsdaten")
- Prüfe in den Docker Logs (`docker compose logs -f`), welche Passwort-Länge ankommt.
- Wenn die Länge kürzer ist als dein Passwort, interpretiert Docker die Sonderzeichen falsch.
- **Lösung**: Setze das Passwort in der `.env` in einfache Anführungszeichen: `ADMIN_PASSWORD='...'`.

### "Malformed" Fehler im Dashboard
- Der Chart benötigt mindestens **2 Zählerstände**, um eine Differenz (Verbrauch) zu berechnen.
- Trage einen weiteren Wert ein, dann erscheint die Grafik.

### Build Fehler (EBADENGINE)
- Dieses Projekt nutzt Next.js 16 und benötigt **Node.js 20+** (im Dockerfile ist Node 22 bereits konfiguriert).

## 🔐 Standard-Login

Wenn keine `.env` konfiguriert ist, gelten diese Fallbacks (nur für Dev-Umgebung!):
- **User**: `admin`
- **Pass**: `admin123`

## 📄 Lizenz

MIT License
