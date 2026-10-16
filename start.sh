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
# Schlaegt der Push fehl, wuerde die App mit altem Schema laufen und bei neuen Feldern abstuerzen:
# lieber laut abbrechen (Container startet neu, Fehler steht im Log).
if ! /opt/prisma/node_modules/.bin/prisma db push --skip-generate --schema /app/prisma-internal/schema.prisma; then
    echo "FEHLER: prisma db push fehlgeschlagen - Start abgebrochen." >&2
    exit 1
fi

# One-time migration: mark existing readings as billed
MIGRATION_FLAG="/app/data/.migration-mark-billed-done"
if [ ! -f "$MIGRATION_FLAG" ]; then
    echo "Running billing migration..."
    if node prisma/migrations/mark-existing-billed.js; then
        if touch "$MIGRATION_FLAG" 2>/dev/null; then
            echo "Billing migration complete."
        else
            echo "WARNUNG: Flag $MIGRATION_FLAG nicht schreibbar - ./data auf dem Host dem Container-User geben (chown). Migration ist idempotent und laeuft sonst bei jedem Start erneut."
        fi
    else
        echo "WARNING: Billing migration failed. Will retry on next start."
    fi
else
    echo "Billing migration already done, skipping."
fi

# Start the application
node server.js