# AGENTS.md

Kurzleitfaden fuer Coding-Agents in diesem Repository. Fuer Details zuerst [CLAUDE.md](CLAUDE.md) lesen, fuer Deployment und Nutzerhinweise [README.md](README.md).

## Schnellstart

- `npm run dev` startet die lokale Next.js-App.
- `npm run build` und `npm run start` pruefen den Produktionspfad.
- `npm run lint` ist die einzige vorhandene automatisierte Pruefung.
- `npx prisma db push` synchronisiert das SQLite-Schema. Keine Migrationsdateien anlegen.
- `npx prisma studio` ist das Werkzeug zum Pruefen der lokalen Daten.

## Arbeitsregeln

- Schreibe neue UI-Texte, Fehlermeldungen und Datumsdarstellungen auf Deutsch.
- Belasse Seiten mit Datenzugriff bei `export const dynamic = 'force-dynamic'`.
- Fuehre Schreiboperationen ueber [app/actions.js](app/actions.js) aus, inklusive Auth-Pruefung mit `getServerSession(authOptions)`.
- Bevorzuge Lesezugriffe in Server Components mit direktem Prisma-Zugriff statt Client-Fetching.
- Nutze fuer Preislogik immer `findRelevantPrice()` aus [lib/pricing.js](lib/pricing.js).
- Nutze fuer Telegram immer `sendTelegramMessage()` aus [lib/telegram.js](lib/telegram.js).
- Behandle `calculatePeriodCost()` aus [lib/billing.js](lib/billing.js) als Pure Function, die bei ungueltigen Daten `null` zurueckgeben kann.

## Projektmuster

- Stack: Next.js App Router, React 19, Prisma, SQLite, NextAuth.
- Styling liegt zentral in [app/globals.css](app/globals.css); kein Tailwind und keine UI-Bibliothek einfuehren, wenn es nicht ausdruecklich noetig ist.
- Das Projekt ist JavaScript-only. Folge dem bestehenden Stil und fuehre kein TypeScript ohne klaren Auftrag ein.
- Dashboard- und Settings-Abfragen werden parallelisiert. Beim Erweitern bestaetigte `Promise.all`-Muster beibehalten.
- `createBillPeriod()` in [lib/billing-status.js](lib/billing-status.js) kann vorab geladene Readings entgegennehmen, um doppelte Queries zu vermeiden.

## Domainenregeln

- Zaehlerstaende duerfen nicht rueckwaerts laufen; diese Regel beim Erfassen nicht umgehen.
- Bereits abgerechnete Readings duerfen nicht geloescht werden.
- `BillPeriod.pdfGenerated` markiert erzeugte PDF-Exporte und sollte bei PDF-Features konsistent gepflegt werden.

## Umgebung

- Wichtige Env-Variablen: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
- Optionale Telegram-Variablen: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Optionale Authentik-SSO-Variablen: `AUTHENTIK_ID`, `AUTHENTIK_SECRET`, `AUTHENTIK_ISSUER` (alle drei gesetzt → SSO-Button aktiv; Issuer ohne trailing slash).
- Schema-Aenderungen laufen ueber `prisma db push`; dieses Repo arbeitet bewusst ohne Prisma-Migrationsworkflow.

## Referenzen

- [CLAUDE.md](CLAUDE.md): Architektur, Datenmodell, Konventionen, Kern-Dateien.
- [README.md](README.md): Docker-Setup, Telegram-Konfiguration, Betriebs- und Troubleshooting-Hinweise.