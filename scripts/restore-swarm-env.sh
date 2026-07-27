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

# No reescribir hosts únicos. Rechazar alias genérico "db".
if [ -n "${DATABASE_URL:-}" ]; then
  case "$DATABASE_URL" in
    *@db:*)
      echo "❌ DATABASE_URL con host genérico 'db'. Usa insforge_postgres o renace_db."
      exit 1
      ;;
  esac
fi
export PORT="${PORT:-3000}"

echo "🔧 Restaurando renace_db env (Postgres del stack, si aplica)..."
docker service update \
  --env-add "POSTGRES_USER=${POSTGRES_USER}" \
  --env-add "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
  --env-add "POSTGRES_DB=${POSTGRES_DB}" \
  renace_db

echo "🔧 Restaurando renace_app (DATABASE_URL host=$(python3 -c "import re,os; m=re.search(r'@([^:/]+):', os.environ.get('DATABASE_URL','')); print(m.group(1) if m else '?')"))..."
docker service update \
  --env-add "DATABASE_URL=${DATABASE_URL}" \
  --env-add "NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-https://renace.tech}" \
  --env-add "ADMIN_ACCESS_PASSWORD=${ADMIN_ACCESS_PASSWORD}" \
  --env-add "ADMIN_SESSION_SECRET=${ADMIN_SESSION_SECRET}" \
  --env-add "PARTICIPANT_SESSION_SECRET=${PARTICIPANT_SESSION_SECRET}" \
  --env-add "SMTP_HOST=${SMTP_HOST:-}" \
  --env-add "SMTP_PORT=${SMTP_PORT:-465}" \
  --env-add "SMTP_SECURE=${SMTP_SECURE:-1}" \
  --env-add "SMTP_USER=${SMTP_USER:-info@renace.tech}" \
  --env-add "SMTP_PASSWORD=${SMTP_PASSWORD:-}" \
  --env-add "SMTP_FROM=${SMTP_FROM:-RENACE.TECH <info@renace.tech>}" \
  --env-add "MAIL_REPLY_TO=${MAIL_REPLY_TO:-info@renace.tech}" \
  --env-add "ADMIN_EMAIL=${ADMIN_EMAIL:-}" \
  --env-add "CHAT_WEBHOOK=${CHAT_WEBHOOK:-}" \
  --env-add "EVOLUTION_API_URL=${EVOLUTION_API_URL:-https://evoapi.renace.tech}" \
  --env-add "EVOLUTION_API_KEY=${EVOLUTION_API_KEY:-}" \
  --env-add "EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE:-RENACE.TECH}" \
  --env-add "WHATSAPP_SENDER_NUMBER=${WHATSAPP_SENDER_NUMBER:-18093487921}" \
  --env-add "WHATSAPP_NOTIFY_NUMBERS=${WHATSAPP_NOTIFY_NUMBERS:-}" \
  --env-add "NOTIFY_API_KEY=${NOTIFY_API_KEY:-}" \
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
