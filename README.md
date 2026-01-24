# ⚡ Stromabrechnung Portal

Ein einfaches, modernes Portal zur Verwaltung von Stromzählerständen und Kostenberechnung für Untermieter. Entwickelt mit **Next.js 15**, **Prisma** (SQLite) und **Docker**.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Dashboard+Preview)

## 🚀 Features

- **HT / NT Unterscheidung**: Erfassung und Abrechnung getrennt nach Hochtarif und Niedertarif.
- **Dynamische Preise**: Pflege historischer Preise (Preisänderungen werden korrekt berücksichtigt).
- **Dashboard**: Übersicht über aktuelle Kosten und letzten Zählerstand.
- **Visualisierung**: Grafische Auswertung des Verbrauchs und der Kosten (Balken- & Liniendiagramme).
- **Premium UI**: Modernes Dark-Mode Design mit Glassmorphism-Effekten (ohne Tailwind, reines CSS).
- **Docker Ready**: Einfaches Deployment mittels `docker-compose`.
- **Sicher**: Login-geschützt (NextAuth.js).

## 🛠️ Technologien

- **Frontend/Framework**: Next.js 15 (App Router)
- **Datenbank**: SQLite (via Prisma ORM)
- **Visualisierung**: Recharts
- **Auth**: NextAuth.js
- **Container**: Docker & Docker Compose

## 📦 Installation & Start

### Option 1: Docker (Empfohlen)

1. **Repository klonen**
   ```bash
   git clone https://github.com/FourtyFiver/stromabrechnung.git
   cd stromabrechnung
   ```

2. **Umgebungsvariablen konfigurieren** (Optional)
   Erstelle eine `.env` Datei basierend auf `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Passe `ADMIN_USERNAME` und `ADMIN_PASSWORD` an.

3. **Starten**
   ```bash
   docker compose up -d --build
   ```
   Das Portal ist nun unter `http://localhost:3000` erreichbar.

### Option 2: Lokal (Node.js)

1. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

2. **Datenbank initialisieren**
   ```bash
   npx prisma db push
   node prisma/seed.js # Erstellt Admin User (admin/admin123)
   ```

3. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

## 🔐 Login

Standard-Zugangsdaten (wenn nicht in `.env` geändert):
- **Username**: `admin`
- **Password**: `admin123`

## 📸 Screenshots

*(Füge hier Screenshots ein)*

## 📄 Lizenz

MIT
