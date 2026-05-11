#!/bin/sh
set -e

echo "=== RegioTicket API Startup ==="

echo "[1/3] Sincronizando schema de base de datos..."
node_modules/.bin/prisma db push --accept-data-loss --schema=packages/db/schema.prisma
echo "[1/3] Schema OK"

echo "[2/3] Ejecutando seed (admin + eventos)..."
node apps/api/dist/seed-only.js
echo "[2/3] Seed OK"

echo "[3/3] Iniciando servidor..."
exec node apps/api/dist/index.js
