#!/bin/sh
set -e

echo "Running database migrations..."
npx sequelize-cli db:migrate 2>&1 || echo "Warning: migrations failed or already up to date"

echo "Starting server..."
exec node dist/server.js
