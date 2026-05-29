#!/bin/sh

# Ensure DATABASE_URL starts with file: for SQLite (Prisma requirement)
if [ "${DATABASE_URL#file:}" = "$DATABASE_URL" ]; then
    export DATABASE_URL="file:$DATABASE_URL"
fi

# Run schema push (safe for SQLite, idempotent)
npx --yes prisma@6 db push

# One-time migration: mark existing readings as billed
MIGRATION_FLAG="/app/data/.migration-mark-billed-done"
if [ ! -f "$MIGRATION_FLAG" ]; then
    echo "Running billing migration..."
    if node prisma/migrations/mark-existing-billed.js; then
        mkdir -p /app/data
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
