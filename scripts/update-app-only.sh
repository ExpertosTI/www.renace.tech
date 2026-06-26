#!/bin/bash
# Actualización de código SOLO renace_app — sin stack deploy, sin tocar db/Traefik.
# Uso: ./scripts/update-app-only.sh
set -euo pipefail

cd /opt/www.renace.tech

if [ ! -f Dockerfile ] || [ ! -f docker-compose.yml ]; then
  echo "❌ Faltan Dockerfile o docker-compose.yml"
  exit 1
fi

if [ -f .env.bak ] && ! grep -q '^POSTGRES_USER=renace' .env 2>/dev/null; then
  echo "⚠️  .env incorrecto detectado — restaurando desde .env.bak"
  cp .env.bak .env
  sed -i 's/@insforge_postgres:/@db:/' .env
fi

echo "🐳 Build imagen renace-app..."
docker compose -f docker-compose.yml build app

echo "🔄 Reiniciando solo renace_app (imagen nueva)..."
docker service update --force renace_app

echo "⏳ Esperando health..."
sleep 40
docker service ps renace_app | head -3
curl -sI "https://renace.tech/api/health/live" | head -3
