#!/bin/sh

# Ensure DATABASE_URL starts with file: for SQLite (Prisma requirement)
if [[ "$DATABASE_URL" != "file:"* ]]; then
    echo "DEBUG: Fixing DATABASE_URL (missing file: prefix)"
    export DATABASE_URL="file:$DATABASE_URL"
fi

# Run migrations (use --yes to strict-mode confirm, suppress 'no YES option' error)
npx --yes prisma@6 db push

# Start the application
node server.js
