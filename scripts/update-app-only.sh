#!/bin/bash
# Deploy SEGURO estilo Catagce/EnvíosRH:
#  - build imagen nueva
#  - sincroniza SOLO variables NO VACÍAS desde .env → Swarm (no pisa Odoo/etc con vacío)
#  - reinicia renace_app
#  - NUNCA hace docker stack deploy
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

if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL="${DATABASE_URL/@insforge_postgres:/@db:}"
  export DATABASE_URL
fi

# Remitente: si falta, usar el SMTP_USER (Hostinger autenticado)
if [ -z "${SMTP_FROM:-}" ] && [ -n "${SMTP_USER:-}" ]; then
  export SMTP_FROM="RENACE.TECH <${SMTP_USER}>"
fi
if [ -z "${MAIL_REPLY_TO:-}" ]; then
  export MAIL_REPLY_TO="info@renace.tech"
fi

echo "📋 Pre-check env (sin secretos):"
echo "   POSTGRES_USER=${POSTGRES_USER:-MISSING}"
echo "   DATABASE_URL=${DATABASE_URL:+set}"
echo "   SMTP_HOST=${SMTP_HOST:-MISSING}"
echo "   SMTP_USER=${SMTP_USER:-MISSING}"
echo "   SMTP_FROM=${SMTP_FROM:-MISSING}"
echo "   SMTP_PASSWORD=${SMTP_PASSWORD:+set}"
echo "   ADMIN_ACCESS_PASSWORD=${ADMIN_ACCESS_PASSWORD:+set}"
echo "   EVOLUTION_API_KEY=${EVOLUTION_API_KEY:+set}"
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

# ── Sync env (solo claves con valor) — igual filosofía que enviosrh/castagce ──
# No sobreescribe variables del servicio con strings vacíos.
env_add_args=()
add_env() {
  local key="$1"
  local val="${2-}"
  if [ -n "$val" ]; then
    env_add_args+=(--env-add "${key}=${val}")
  fi
}

add_env DATABASE_URL "${DATABASE_URL:-}"
add_env NEXT_PUBLIC_BASE_URL "${NEXT_PUBLIC_BASE_URL:-https://renace.tech}"
add_env ADMIN_ACCESS_PASSWORD "${ADMIN_ACCESS_PASSWORD:-}"
add_env ADMIN_SESSION_SECRET "${ADMIN_SESSION_SECRET:-}"
add_env PARTICIPANT_SESSION_SECRET "${PARTICIPANT_SESSION_SECRET:-}"
add_env SMTP_HOST "${SMTP_HOST:-}"
add_env SMTP_PORT "${SMTP_PORT:-587}"
add_env SMTP_USER "${SMTP_USER:-}"
add_env SMTP_PASSWORD "${SMTP_PASSWORD:-}"
add_env SMTP_FROM "${SMTP_FROM:-}"
add_env MAIL_REPLY_TO "${MAIL_REPLY_TO:-info@renace.tech}"
add_env ADMIN_EMAIL "${ADMIN_EMAIL:-}"
add_env CHAT_WEBHOOK "${CHAT_WEBHOOK:-}"
add_env EVOLUTION_API_URL "${EVOLUTION_API_URL:-https://evoapi.renace.tech}"
add_env EVOLUTION_API_KEY "${EVOLUTION_API_KEY:-}"
add_env EVOLUTION_INSTANCE "${EVOLUTION_INSTANCE:-RENACE.TECH}"
add_env WHATSAPP_SENDER_NUMBER "${WHATSAPP_SENDER_NUMBER:-18093487921}"
add_env WHATSAPP_NOTIFY_NUMBERS "${WHATSAPP_NOTIFY_NUMBERS:-}"
add_env NOTIFY_API_KEY "${NOTIFY_API_KEY:-}"
add_env ODOO_URL "${ODOO_URL:-}"
add_env ODOO_LONGPOLL_URL "${ODOO_LONGPOLL_URL:-}"
add_env ODOO_DB "${ODOO_DB:-}"
add_env ODOO_API_USER "${ODOO_API_USER:-}"
add_env ODOO_API_KEY "${ODOO_API_KEY:-}"
add_env ODOO_DEFAULT_PARTNER "${ODOO_DEFAULT_PARTNER:-}"
add_env GOOGLE_CLIENT_ID "${GOOGLE_CLIENT_ID:-}"
add_env GOOGLE_CLIENT_SECRET "${GOOGLE_CLIENT_SECRET:-}"
add_env PORTAL_ENCRYPTION_KEY "${PORTAL_ENCRYPTION_KEY:-}"
add_env PORT "${PORT}"
add_env NODE_ENV production

echo "🔄 Actualizando renace_app (imagen + env intactas no-vacías)..."
docker service update \
  --image renace-app:latest \
  "${env_add_args[@]}" \
  --force \
  renace_app

echo "⏳ Esperando health (50s)..."
sleep 50

echo "🏥 Health check:"
HEALTH=$(curl -sS "https://renace.tech/api/health/live" || true)
echo "$HEALTH" | head -c 600
echo ""
echo "$HEALTH" | grep -q '"status":"ok"' || { echo "❌ Health falló"; exit 1; }

echo "📧 SMTP en servicio Swarm:"
docker service inspect renace_app --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' \
  | grep -E '^SMTP_(HOST|FROM|USER|PORT)=' || echo "⚠️  SMTP vars no visibles"

# mail-test sin -f para ver body real
if [ -n "${ADMIN_ACCESS_PASSWORD:-}" ] && [ -n "${SMTP_HOST:-}" ]; then
  echo "📨 Email de prueba..."
  MAIL_HTTP=$(mktemp)
  MAIL_BODY=$(mktemp)
  curl -sS -o "$MAIL_BODY" -w "%{http_code}" -X POST "https://renace.tech/api/health/mail-test" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json, os
print(json.dumps({"pin": os.environ.get("ADMIN_ACCESS_PASSWORD", "")}))
PY
)" > "$MAIL_HTTP" || true
  echo "   HTTP $(cat "$MAIL_HTTP")  $(cat "$MAIL_BODY")"
  if grep -q '"ok":true' "$MAIL_BODY"; then
    echo "✅ Email OK (From = SMTP autenticado)"
  else
    echo "⚠️  Email falló — revisa SMTP_PASSWORD / remitente debe coincidir con SMTP_USER"
  fi
  rm -f "$MAIL_HTTP" "$MAIL_BODY"
else
  echo "⚠️  Saltando mail-test"
fi

if [ -n "${ADMIN_ACCESS_PASSWORD:-}" ] && [ -n "${EVOLUTION_API_KEY:-}" ]; then
  echo "📱 WhatsApp de prueba..."
  WA_BODY=$(curl -sS -X POST "https://renace.tech/api/health/wa-test" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json, os
print(json.dumps({"pin": os.environ.get("ADMIN_ACCESS_PASSWORD", "")}))
PY
)" || echo '{"ok":false}')
  echo "   $WA_BODY"
else
  echo "⚠️  Saltando wa-test (falta EVOLUTION_API_KEY en .env)"
fi

echo ""
echo "📄 Descargas disponibles:"
curl -sS "https://renace.tech/api/documents" | head -c 800 || true
echo ""

echo "📊 Estado:"
docker service ps renace_app --no-trunc | head -4

echo ""
echo "✅ Deploy seguro completado — db, Traefik y otros stacks intactos."
echo "   POS/EXE: ./scripts/restore-download-files.sh /ruta/archivos"
echo "   Buscar POS: ./scripts/find-pos-agent.sh"
