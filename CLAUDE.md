# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StromApp (stromabrechnung) is a German-language Next.js web app for tracking electricity meter readings (HT/NT dual-tariff) and generating billing reports. It's designed as a self-hosted Docker deployment for a single admin user.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npx prisma db push` — Sync schema to database (no migration files)
- `npx prisma studio` — Browse database interactively

There is **no test framework** installed. No test commands exist.

## Architecture

### Rendering Model

Next.js App Router with mixed server/client components. All data pages use `export const dynamic = 'force-dynamic'` to prevent static generation. Server components fetch data directly via Prisma. All mutations go through **server actions** in `app/actions.js`.

### Key Files

- `app/actions.js` — All server actions (mutations) with auth checks. Central place for writes. Includes `markPdfGenerated` for PDF tracking.
- `app/page.js` — Dashboard server component (entry point). Shows open billing period cost estimate. Uses `Promise.all` for parallel DB queries.
- `lib/billing.js` — Pure function `calculatePeriodCost(prev, curr, priceConfig)` — the core billing logic. Returns `null` for invalid input (missing data, negative consumption). No side effects.
- `lib/billing-status.js` — Async helpers: billing period validation (overlap detection), period creation (accepts pre-fetched readings to avoid redundant queries), available period suggestions. Uses single-query approach for `getAvailableBillingPeriods`.
- `lib/pricing.js` — `findRelevantPrice(allPrices, targetDate)` — centralized price lookup for a given date. Used by dashboard, report actions, and billing.
- `lib/telegram.js` — `sendTelegramMessage(message)` — centralized Telegram API call with error handling. Used by `sendCustomTelegramReport`.
- `lib/auth.js` — NextAuth config with credentials provider. Checks env vars (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) first, then falls back to DB User with bcrypt.
- `lib/db.js` — Prisma client singleton (prevents hot-reload connection proliferation).
- `lib/pdf-generator.js` — Client-side PDF generation via jsPDF + autotable. Generates a billing report PDF from `BillPeriod` data. Triggered from `PdfDownloadButton` component in billing history.
- `middleware.js` — NextAuth middleware protecting `/`, `/readings`, `/settings`, `/billing-history`.

### Data Model (Prisma/SQLite)

Four models: **User**, **PriceConfig**, **Reading**, **BillPeriod**.

- PriceConfig has `validFrom` date — price changes are tracked historically. Settings page shows full price history.
- Reading has nullable `billedAt` and `billPeriodId` — once billed, readings are linked to a period. Billed readings **cannot be deleted** (enforced in `deleteReading` action).
- BillPeriod stores computed totals (`totalCost`, `energyCost`, `baseFeeCost`, `diffHT`, `diffNT`), `billingMonths`, and `pdfGenerated` (set to `true` after PDF download).
- `baseFeeSplit` on PriceConfig controls what percentage of the base fee applies to HT vs NT.

### Client Components

Forms, chart, dialog, and PDF download are client components (`"use client"`). They use `useState`/`useRef` for local state. No global state library. Toast notifications via `sonner`.

### Navigation

The `Navigation` component highlights the active page link using `usePathname()`. Links are defined in a `navItems` array. Logout link has a separate `.nav-logout` class with red styling.

### Styling

All CSS is in `app/globals.css` (~630 lines) — dark theme with CSS custom properties. No Tailwind, no component library. Responsive breakpoints at 768px and 480px.

### i18n

The UI is entirely in German. Error messages, date formatting, and labels are all German.

## Database & Deployment

- **SQLite** database stored at `prisma/dev.db` (mounted as Docker volume for persistence).
- Schema changes use `prisma db push` (no migration files — the project opts for idempotent schema sync).
- Docker deployment via `docker-compose.yml` — builds from `ghcr.io/fourtyfiver/stromabrechnung:latest`.
- `start.sh` handles container startup: DB push → one-time migration → `node server.js` (standalone mode).
- `.env` required: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, plus optional `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`.

## Patterns & Conventions

- Server actions in `actions.js` all check `getServerSession(authOptions)` before performing writes.
- Zod validation is used for `addPriceConfig` and `addReading` (non-negative values, max comment length).
- `addReading` checks for meter rollback — rejects values lower than the last reading with a descriptive error.
- `deleteReading` rejects deletions of billed readings (`billedAt !== null`).
- `calculatePeriodCost` returns `null` for invalid input (missing data or negative consumption) — callers must handle `null`.
- Price lookup is centralized in `lib/pricing.js` — always use `findRelevantPrice()`, never inline the `.find()` logic.
- Telegram messaging is centralized in `lib/telegram.js` — always use `sendTelegramMessage()`, never call the API directly.
- `createBillPeriod` accepts optional `fromReading`/`toReading` params to skip redundant DB reads when callers already have the data.
- Dashboard queries are parallelized with `Promise.all` — keep this pattern when adding new queries.
- Settings page queries are also parallelized with `Promise.all` (current price + all prices).
- The dashboard shows an "Aktuelle Kosten (offen)" card when there are unbilled readings — calculated from existing data, no extra DB query.
- The app uses path alias `@/*` mapping to project root (configured in `jsconfig.json`).
- Project is **JavaScript only** (no TypeScript).
- **No dead code**: The old `sendTelegramReport()` (no billing tracking) and `getAllReadings()` export have been removed. Only `sendCustomTelegramReport` remains.

## Deferred Optimizations

- **Recharts → Chart.js**: Recharts accounts for ~416 KB in the client bundle (only loaded on the dashboard page). For this self-hosted single-user app, the bundle size is acceptable. Migration to `chart.js` + `react-chartjs-2` would save ~300 KB but is low priority.