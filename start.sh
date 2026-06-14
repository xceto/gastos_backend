#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx sequelize-cli db:migrate

echo "⏳ Running database seeders..."
npx sequelize-cli db:seed:all

echo "🚀 Starting server..."
exec node src/index.js
