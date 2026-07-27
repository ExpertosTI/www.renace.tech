#!/bin/bash
# Recuperación tras stack deploy accidental con .env vacío.
# Restaura .env.bak → Swarm env → opcionalmente imagen ya construida.
set -euo pipefail

cd /opt/www.renace.tech

echo "1/3 Restaurar .env desde backup..."
cp .env.bak .env
# No reescribir Insforge. Si el bak tiene @db: genérico, hay que corregirlo a mano.
if grep -qE '@db:' .env; then
  echo "❌ .env.bak tiene host genérico @db:. Edita DATABASE_URL a @insforge_postgres: o @renace_db:"
  exit 1
fi

echo "2/3 Aplicar variables a Swarm..."
bash scripts/restore-swarm-env.sh .env

echo "3/3 Si ya hay imagen nueva, reiniciar app..."
docker service update --force renace_app 2>/dev/null || true

sleep 30
echo "---"
docker service ps renace_app | head -3
curl -sI "https://renace.tech/api/health/live" | head -5
