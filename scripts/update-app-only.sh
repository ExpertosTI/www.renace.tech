#!/bin/bash
# Actualización SEGURA: solo código de renace_app — sin stack deploy, sin tocar db/Traefik.
# Uso: ./scripts/update-app-only.sh
set -euo pipefail

cd /opt/www.renace.tech

echo "═══════════════════════════════════════════"
echo " RENACE — deploy seguro (solo renace_app)"
echo "═══════════════════════════════════════════"

if [ ! -f Dockerfile ] || [ ! -f docker-compose.yml ]; then
  echo "❌ Faltan Dockerfile o docker-compose.yml"
  exit 1
fi

# Restaurar .env renace si se corrompió
if [ -f .env.bak ] && ! grep -q '^POSTGRES_USER=renace' .env 2>/dev/null; then
  echo "⚠️  .env incorrecto — restaurando desde .env.bak"
  cp .env.bak .env
  sed -i 's/@insforge_postgres:/@db:/' .env
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

export PORT="${PORT:-3000}"

# Asegurar remitente oficial si no está definido
if [ -z "${SMTP_FROM:-}" ]; then
  export SMTP_FROM='RENACE.TECH <info@renace.tech>'
  echo "ℹ️  SMTP_FROM vacío — usando info@renace.tech"
fi

echo "📋 Pre-check env (sin secretos):"
echo "   POSTGRES_USER=${POSTGRES_USER:-MISSING}"
echo "   DATABASE_URL=${DATABASE_URL:+set}"
echo "   SMTP_HOST=${SMTP_HOST:-MISSING}"
echo "   SMTP_FROM=${SMTP_FROM}"
echo "   PORT=${PORT}"

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Variables críticas vacías. Abortando (no se toca el stack)."
  exit 1
fi

echo "📥 Actualizando código..."
git fetch origin main
git reset --hard origin/main

echo "🐳 Build imagen renace-app..."
docker compose -f docker-compose.yml build app

echo "🔄 Reiniciando SOLO renace_app..."
docker service update --force renace_app

echo "⏳ Esperando health (45s)..."
sleep 45

echo "🏥 Health check:"
curl -sf "https://renace.tech/api/health/live" | head -c 400 || { echo "❌ Health falló"; exit 1; }
echo ""

echo "📧 Verificando SMTP en contenedor..."
docker service inspect renace_app --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' \
  | grep -E '^SMTP_(HOST|FROM|USER)=' || echo "⚠️  SMTP vars no visibles en service inspect"

if [ -n "${ADMIN_ACCESS_PASSWORD:-}" ] && [ -n "${SMTP_HOST:-}" ]; then
  echo "📨 Enviando email de prueba (notificaciones)..."
  MAIL_RESULT=$(curl -sf -X POST "https://renace.tech/api/health/mail-test" \
    -H "Content-Type: application/json" \
    -d "{\"pin\":\"${ADMIN_ACCESS_PASSWORD}\"}" 2>&1) || MAIL_RESULT='{"ok":false}'
  echo "   $MAIL_RESULT"
  if echo "$MAIL_RESULT" | grep -q '"ok":true'; then
    echo "✅ Email de prueba enviado desde info@renace.tech"
  else
    echo "⚠️  Email de prueba no enviado — revisa SMTP_* en .env"
  fi
else
  echo "⚠️  Saltando mail-test (falta ADMIN_ACCESS_PASSWORD o SMTP_HOST)"
fi

echo ""
echo "📊 Estado del servicio:"
docker service ps renace_app --no-trunc | head -4

echo ""
echo "✅ Deploy seguro completado — db, Traefik y otros stacks intactos."
