#!/bin/sh
# Run migrations to ensure DB exists and is up to date
npx prisma db push

# Start the application
node server.js
