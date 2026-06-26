#!/bin/bash
# Sincroniza la contraseña de PostgreSQL con .env (sin borrar datos ni stack deploy).
set -euo pipefail
cd /opt/www.renace.tech
set -a && source .env && set +a

DB_CID=$(docker ps -q -f name=renace_db | head -1)
if [ -z "$DB_CID" ]; then
  echo "❌ No hay contenedor renace_db corriendo"
  exit 1
fi

echo "🔧 Ajustando password de ${POSTGRES_USER} en PostgreSQL..."
# En esta imagen POSTGRES_USER=renace_user es superuser; no existe rol "postgres"
docker exec -u postgres "$DB_CID" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "ALTER USER \"${POSTGRES_USER}\" WITH PASSWORD '${POSTGRES_PASSWORD}';"

echo "🔄 Reiniciando renace_app..."
docker service update --force renace_app >/dev/null
sleep 35

docker service logs renace_app --tail 10 2>&1 | grep -iE 'Database|downloads|Registered' || true
curl -sI https://renace.tech/api/health/live | head -1
curl -s https://renace.tech/api/documents | grep -i envios || echo "(APK aún no en API — revisar logs)"
