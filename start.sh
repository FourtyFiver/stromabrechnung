#!/bin/sh

# Ensure DATABASE_URL starts with file: for SQLite (Prisma requirement)
if [ "${DATABASE_URL#file:}" = "$DATABASE_URL" ]; then
    export DATABASE_URL="file:$DATABASE_URL"
fi

# Security warning for default credentials
ADMIN_PASS="${ADMIN_PASSWORD:-}"
if [ -z "$ADMIN_PASS" ]; then
    echo "⚠️  WARNING: ADMIN_PASSWORD is not set!"
    echo "   Login via environment variables is disabled."
    echo "   Set ADMIN_USERNAME and ADMIN_PASSWORD in .env to enable admin login."
    echo ""
elif [ "$ADMIN_PASS" = "admin123" ] || [ "$ADMIN_PASS" = "secure_password_please_change" ] || [ "$ADMIN_PASS" = "password" ] || [ "$ADMIN_PASS" = "admin" ]; then
    echo "⚠️  SECURITY WARNING: ADMIN_PASSWORD is set to a known default value: '$ADMIN_PASS'"
    echo "   Please change it in .env for production use!"
    echo ""
fi

# Run schema push without regenerating the Prisma client at runtime.
npx --yes prisma@6 db push --skip-generate

# This migration is already idempotent, so run it directly without a marker file.
echo "Running billing migration..."
if node prisma/migrations/mark-existing-billed.js; then
    echo "Billing migration complete."
else
    echo "WARNING: Billing migration failed. Will retry on next start."
fi

# Start the application
node server.js