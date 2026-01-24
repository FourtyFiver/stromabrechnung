# Debug Env Vars (Safe: printing lengths only)
echo "DEBUG: ADMIN_USERNAME length: ${#ADMIN_USERNAME}"
echo "DEBUG: ADMIN_PASSWORD length: ${#ADMIN_PASSWORD}"

# Run migrations to ensure DB exists and is up to date
# Run migrations (use --yes to strict-mode confirm, suppress 'no YES option' error)
npx --yes prisma db push

# Start the application
node server.js
