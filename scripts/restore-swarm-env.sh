#!/bin/bash
# Restaura variables del stack renace desde .env en disco (sin stack deploy).
# Uso en producción: ./scripts/restore-swarm-env.sh
set -euo pipefail

cd /opt/www.renace.tech

ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ No existe $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Host interno del stack renace (no insforge_postgres)
if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL="${DATABASE_URL/@insforge_postgres:/@db:}"
fi
export PORT="${PORT:-3000}"

echo "🔧 Restaurando renace_db..."
docker service update \
  --env-add "POSTGRES_USER=${POSTGRES_USER}" \
  --env-add "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
  --env-add "POSTGRES_DB=${POSTGRES_DB}" \
  renace_db

echo "🔧 Restaurando renace_app..."
docker service update \
  --env-add "DATABASE_URL=${DATABASE_URL}" \
  --env-add "NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-https://renace.tech}" \
  --env-add "ADMIN_ACCESS_PASSWORD=${ADMIN_ACCESS_PASSWORD}" \
  --env-add "ADMIN_SESSION_SECRET=${ADMIN_SESSION_SECRET}" \
  --env-add "PARTICIPANT_SESSION_SECRET=${PARTICIPANT_SESSION_SECRET}" \
  --env-add "SMTP_HOST=${SMTP_HOST:-}" \
  --env-add "SMTP_PORT=${SMTP_PORT:-587}" \
  --env-add "SMTP_USER=${SMTP_USER:-}" \
  --env-add "SMTP_PASSWORD=${SMTP_PASSWORD:-}" \
  --env-add "SMTP_FROM=${SMTP_FROM:-RENACE.TECH <info@renace.tech>}" \
  --env-add "MAIL_REPLY_TO=${MAIL_REPLY_TO:-info@renace.tech}" \
  --env-add "ADMIN_EMAIL=${ADMIN_EMAIL:-}" \
  --env-add "CHAT_WEBHOOK=${CHAT_WEBHOOK:-}" \
  --env-add "ODOO_URL=${ODOO_URL:-}" \
  --env-add "ODOO_LONGPOLL_URL=${ODOO_LONGPOLL_URL:-}" \
  --env-add "ODOO_DB=${ODOO_DB:-}" \
  --env-add "ODOO_API_USER=${ODOO_API_USER:-}" \
  --env-add "ODOO_API_KEY=${ODOO_API_KEY:-}" \
  --env-add "ODOO_DEFAULT_PARTNER=${ODOO_DEFAULT_PARTNER:-3}" \
  --env-add "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}" \
  --env-add "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}" \
  --env-add "PORTAL_ENCRYPTION_KEY=${PORTAL_ENCRYPTION_KEY:-}" \
  --env-add "PORT=${PORT}" \
  --env-add "NODE_ENV=production" \
  renace_app

echo "✅ Variables aplicadas. Esperando arranque..."
sleep 45
docker service ps renace_app | head -3
curl -sI "https://renace.tech/api/health/live" | head -3
