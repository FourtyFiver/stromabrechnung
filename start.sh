# Debug Env Vars (Safe: printing lengths only)
echo "DEBUG: ADMIN_USERNAME length: ${#ADMIN_USERNAME}"
echo "DEBUG: ADMIN_PASSWORD length: ${#ADMIN_PASSWORD}"
echo "DEBUG: DATABASE_URL value: $DATABASE_URL"

# Debug Filesystem permissions where DB should be
echo "DEBUG: Listing /app/prisma permissions:"
ls -la /app/prisma

# Ensure DATABASE_URL starts with file: for SQLite (Prisma requirement)
if [[ "$DATABASE_URL" != "file:"* ]]; then
    echo "DEBUG: Fixing DATABASE_URL (missing file: prefix)"
    export DATABASE_URL="file:$DATABASE_URL"
fi

# Run migrations (use --yes to strict-mode confirm, suppress 'no YES option' error)
npx --yes prisma@6 db push

# Start the application
node server.js
