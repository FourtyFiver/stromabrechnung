#!/bin/sh

# Ensure DATABASE_URL starts with file: for SQLite (Prisma requirement)
if [ "${DATABASE_URL#file:}" = "$DATABASE_URL" ]; then
    export DATABASE_URL="file:$DATABASE_URL"
fi

# Datenverzeichnis fuer das Migrations-Flag sicherstellen (vor der Migration)
mkdir -p /app/data

# Run schema push (safe for SQLite, idempotent)
# Schema aus dem Image (nicht vom gemounteten Volume) — siehe Dockerfile-Kommentar
# Prisma CLI liegt fest im Image (/opt/prisma, siehe Dockerfile) - kein Netzwerk beim Start noetig.
# --skip-generate: Client wurde schon beim Build erzeugt (Container laeuft ohne Root).
/opt/prisma/node_modules/.bin/prisma db push --skip-generate --schema /app/prisma-internal/schema.prisma

# One-time migration: mark existing readings as billed
MIGRATION_FLAG="/app/data/.migration-mark-billed-done"
if [ ! -f "$MIGRATION_FLAG" ]; then
    echo "Running billing migration..."
    if node prisma/migrations/mark-existing-billed.js; then
        touch "$MIGRATION_FLAG"
        echo "Billing migration complete."
    else
        echo "WARNING: Billing migration failed. Will retry on next start."
    fi
else
    echo "Billing migration already done, skipping."
fi

# Start the application
node server.js