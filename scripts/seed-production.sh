#!/bin/bash
# Seed automático de producción RENACE — sin nano.
# Corrige SMTP (info@renace.tech), WhatsApp OTP, sync Swarm, verifica APIs.
#
# Uso:
#   ./scripts/seed-production.sh
#   SMTP_PASSWORD='***' EVOLUTION_API_KEY='***' ./scripts/seed-production.sh
#
set -euo pipefail

cd /opt/www.renace.tech

echo "═══════════════════════════════════════════"
echo " RENACE — seed producción (automatizado)"
echo "═══════════════════════════════════════════"

if [ ! -f .env ]; then
  if [ -f .env.bak ]; then
    echo "⚠️  .env ausente — restaurando desde .env.bak"
    cp .env.bak .env
    sed -i 's/@insforge_postgres:/@db:/' .env
  else
    echo "❌ No hay .env ni .env.bak"
    exit 1
  fi
fi

env_set() {
  local key="$1"
  local val="$2"
  local tmp
  tmp=$(mktemp)
  if grep -q "^${key}=" .env 2>/dev/null; then
    python3 - "$key" "$val" .env "$tmp" <<'PY'
import sys
key, val, src, dst = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
out = []
found = False
with open(src, "r", encoding="utf-8", errors="replace") as f:
    for line in f:
        if line.startswith(key + "="):
            out.append(f"{key}={val}\n")
            found = True
        else:
            out.append(line)
if not found:
    out.append(f"{key}={val}\n")
with open(dst, "w", encoding="utf-8") as f:
    f.writelines(out)
PY
    mv "$tmp" .env
  else
    printf '%s=%s\n' "$key" "$val" >> .env
    rm -f "$tmp"
  fi
}

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "📧 Sembrando SMTP → info@renace.tech (465 SSL)..."
sed -i 's/info@renace\.space/info@renace.tech/g' .env
env_set SMTP_HOST "${SMTP_HOST:-smtp.hostinger.com}"
env_set SMTP_PORT "465"
env_set SMTP_SECURE "1"
env_set SMTP_USER "info@renace.tech"
env_set SMTP_FROM "RENACE.TECH <info@renace.tech>"
env_set MAIL_REPLY_TO "info@renace.tech"
if [ -n "${SMTP_PASSWORD:-}" ]; then
  env_set SMTP_PASSWORD "$SMTP_PASSWORD"
  echo "   SMTP_PASSWORD=set"
else
  echo "   ⚠️  SMTP_PASSWORD vacío en entorno/.env"
fi

echo "📱 Sembrando WhatsApp Evolution..."
env_set EVOLUTION_API_URL "${EVOLUTION_API_URL:-https://evoapi.renace.tech}"
env_set EVOLUTION_INSTANCE "${EVOLUTION_INSTANCE:-RENACE.TECH}"
env_set WHATSAPP_SENDER_NUMBER "${WHATSAPP_SENDER_NUMBER:-18093487921}"
env_set WHATSAPP_NOTIFY_NUMBERS "${WHATSAPP_NOTIFY_NUMBERS:-18494577463,18099152622}"
if [ -n "${EVOLUTION_API_KEY:-}" ]; then
  env_set EVOLUTION_API_KEY "$EVOLUTION_API_KEY"
  echo "   EVOLUTION_API_KEY=set"
else
  echo "   ⚠️  EVOLUTION_API_KEY vacío"
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

CID=$(docker ps -q -f name=renace_app | head -1 || true)
if [ -n "$CID" ]; then
  echo "💾 whatsapp-config.json → volumen data..."
  docker exec "$CID" mkdir -p /app/data
  docker exec \
    -e EVO_URL="${EVOLUTION_API_URL:-https://evoapi.renace.tech}" \
    -e EVO_KEY="${EVOLUTION_API_KEY:-}" \
    -e EVO_INST="${EVOLUTION_INSTANCE:-RENACE.TECH}" \
    -e EVO_SENDER="${WHATSAPP_SENDER_NUMBER:-18093487921}" \
    -e EVO_NOTIFY="${WHATSAPP_NOTIFY_NUMBERS:-18494577463,18099152622}" \
    "$CID" node -e '
const fs = require("fs");
const path = "/app/data/whatsapp-config.json";
let prev = {};
try { prev = JSON.parse(fs.readFileSync(path, "utf8")); } catch {}
const notify = String(process.env.EVO_NOTIFY || "").split(/[,;\s]+/).filter(Boolean);
const key = (process.env.EVO_KEY || "").trim() || prev.apiKey || "";
const cfg = {
  apiUrl: (process.env.EVO_URL || "https://evoapi.renace.tech").replace(/\/$/, ""),
  apiKey: key,
  instance: process.env.EVO_INST || "RENACE.TECH",
  sender: String(process.env.EVO_SENDER || "18093487921").replace(/\D/g, ""),
  notifyNumbers: notify.length ? notify : (prev.notifyNumbers || ["18494577463"]),
  otpPhones: Object.assign({
    "expertostird@gmail.com": "18494577463",
    "rcexpertos@gmail.com": "18099152622"
  }, prev.otpPhones || {}),
  updatedAt: new Date().toISOString()
};
fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, hasKey: !!cfg.apiKey, instance: cfg.instance }));
'
else
  echo "⚠️  renace_app no está corriendo"
fi

echo "🔄 Sync Swarm (solo vars no vacías)..."
env_add_args=()
add_env() {
  local key="$1"
  local val="${2-}"
  if [ -n "$val" ]; then
    env_add_args+=(--env-add "${key}=${val}")
  fi
}
add_env SMTP_HOST "${SMTP_HOST:-smtp.hostinger.com}"
add_env SMTP_PORT "${SMTP_PORT:-465}"
add_env SMTP_SECURE "${SMTP_SECURE:-1}"
add_env SMTP_USER "info@renace.tech"
add_env SMTP_PASSWORD "${SMTP_PASSWORD:-}"
add_env SMTP_FROM "RENACE.TECH <info@renace.tech>"
add_env MAIL_REPLY_TO "info@renace.tech"
add_env EVOLUTION_API_URL "${EVOLUTION_API_URL:-https://evoapi.renace.tech}"
add_env EVOLUTION_API_KEY "${EVOLUTION_API_KEY:-}"
add_env EVOLUTION_INSTANCE "${EVOLUTION_INSTANCE:-RENACE.TECH}"
add_env WHATSAPP_SENDER_NUMBER "${WHATSAPP_SENDER_NUMBER:-18093487921}"
add_env WHATSAPP_NOTIFY_NUMBERS "${WHATSAPP_NOTIFY_NUMBERS:-18494577463,18099152622}"
add_env ADMIN_ACCESS_PASSWORD "${ADMIN_ACCESS_PASSWORD:-}"
add_env DATABASE_URL "${DATABASE_URL:-}"
add_env PORT "${PORT:-3000}"

docker service update "${env_add_args[@]}" --force renace_app
echo "⏳ Esperando 45s..."
sleep 45

echo ""
echo "🏥 Health:"
curl -sS "https://renace.tech/api/health/live" | head -c 500 || true
echo ""

if [ -n "${ADMIN_ACCESS_PASSWORD:-}" ]; then
  echo "📨 Mail-test:"
  curl -sS -X POST "https://renace.tech/api/health/mail-test" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json, os
print(json.dumps({"pin": os.environ["ADMIN_ACCESS_PASSWORD"]}))
PY
)" | head -c 300 || true
  echo ""
fi

echo "🔐 OTP request-code:"
curl -sS -X POST "https://renace.tech/api/admin/login/request-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"expertostird@gmail.com","channel":"email"}' | head -c 400 || true
echo ""

echo ""
echo "✅ Seed terminado (sin nano)."
echo "   Password SMTP mala → SMTP_PASSWORD='xxx' ./scripts/seed-production.sh"
echo "   Key Evolution → EVOLUTION_API_KEY='xxx' ./scripts/seed-production.sh"
