#!/bin/bash
# Seed automático RENACE — 100% self-contained.
# Lee secretos de .env.bak y/o del servicio Swarm ya desplegado.
# NO pide valores al operador. NO usa nano.
#
# Pegar en el VPS:
#   cd /opt/www.renace.tech && git fetch origin main && git reset --hard origin/main && chmod +x scripts/*.sh && ./scripts/seed-production.sh
#
set -euo pipefail

cd /opt/www.renace.tech

echo "═══════════════════════════════════════════"
echo " RENACE — seed producción (auto)"
echo "═══════════════════════════════════════════"

# ── Parse KEY from env file without bash source (safe with < > @) ──
env_get() {
  local file="$1" key="$2"
  python3 - "$file" "$key" <<'PY'
import sys
path, key = sys.argv[1], sys.argv[2]
try:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == key:
                v = v.strip()
                if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                    v = v[1:-1]
                print(v, end="")
                raise SystemExit(0)
except FileNotFoundError:
    pass
PY
}

env_set_quoted() {
  local key="$1" val="$2"
  python3 - "$key" "$val" .env <<'PY'
import sys
key, val = sys.argv[1], sys.argv[2]
# Always double-quote; escape embedded quotes/backslashes
safe = '"' + val.replace("\\", "\\\\").replace('"', '\\"') + '"'
lines = []
found = False
try:
    with open(".env", "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
except FileNotFoundError:
    lines = []
out = []
for line in lines:
    if line.startswith(key + "="):
        out.append(f"{key}={safe}\n")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"{key}={safe}\n")
with open(".env", "w", encoding="utf-8") as f:
    f.writelines(out)
print(f"  set {key}")
PY
}

swarm_get() {
  local key="$1"
  docker service inspect renace_app --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' 2>/dev/null \
    | python3 - "$key" <<'PY'
import sys
key = sys.argv[1]
for line in sys.stdin:
    line = line.rstrip("\n")
    if line.startswith(key + "="):
        print(line.split("=", 1)[1], end="")
        break
PY
}

# ── Recover .env if broken ───────────────────────────────────────
if [ ! -f .env ] || ! python3 - <<'PY'
import pathlib
p = pathlib.Path(".env")
text = p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""
# broken if FROM has unquoted < or placeholder junk
bad = False
for line in text.splitlines():
    if line.startswith("SMTP_FROM=") and "<" in line and not (line.startswith('SMTP_FROM="') or line.startswith("SMTP_FROM='")):
        bad = True
    if "TU_PASSWORD" in line or "TU_API_KEY" in line or "change_me" in line.lower() and "POSTGRES" not in line:
        if "TU_PASSWORD" in line or "TU_API_KEY" in line:
            bad = True
print("ok" if not bad else "bad")
PY
  | grep -q ok
then
  echo "⚠️  .env roto o con placeholders — restaurando desde .env.bak"
  if [ -f .env.bak ]; then
    cp .env.bak .env
    sed -i 's/@insforge_postgres:/@db:/g' .env
    sed -i 's/info@renace\.space/info@renace.tech/g' .env
  else
    echo "❌ No existe .env.bak — abortando"
    exit 1
  fi
fi

# ── Collect secrets: Swarm (live) > .env > .env.bak ──────────────
SMTP_PASSWORD_VAL="$(swarm_get SMTP_PASSWORD)"
[ -z "$SMTP_PASSWORD_VAL" ] && SMTP_PASSWORD_VAL="$(env_get .env SMTP_PASSWORD)"
[ -z "$SMTP_PASSWORD_VAL" ] && SMTP_PASSWORD_VAL="$(env_get .env.bak SMTP_PASSWORD)"

EVOLUTION_KEY_VAL="$(swarm_get EVOLUTION_API_KEY)"
[ -z "$EVOLUTION_KEY_VAL" ] && EVOLUTION_KEY_VAL="$(env_get .env EVOLUTION_API_KEY)"
[ -z "$EVOLUTION_KEY_VAL" ] && EVOLUTION_KEY_VAL="$(env_get .env.bak EVOLUTION_API_KEY)"

ADMIN_PIN_VAL="$(swarm_get ADMIN_ACCESS_PASSWORD)"
[ -z "$ADMIN_PIN_VAL" ] && ADMIN_PIN_VAL="$(env_get .env ADMIN_ACCESS_PASSWORD)"
[ -z "$ADMIN_PIN_VAL" ] && ADMIN_PIN_VAL="$(env_get .env.bak ADMIN_ACCESS_PASSWORD)"

DATABASE_URL_VAL="$(swarm_get DATABASE_URL)"
[ -z "$DATABASE_URL_VAL" ] && DATABASE_URL_VAL="$(env_get .env DATABASE_URL)"
[ -z "$DATABASE_URL_VAL" ] && DATABASE_URL_VAL="$(env_get .env.bak DATABASE_URL)"
DATABASE_URL_VAL="${DATABASE_URL_VAL//@insforge_postgres:/@db:}"

# Discard placeholder garbage if somehow still present
case "$SMTP_PASSWORD_VAL" in
  *TU_PASSWORD*|*"@RENACE.TECH"|*change_me*) SMTP_PASSWORD_VAL="" ;;
esac
case "$EVOLUTION_KEY_VAL" in
  *TU_API_KEY*|*change_me*|*your-evolution*) EVOLUTION_KEY_VAL="" ;;
esac

echo "📋 Secretos resueltos:"
echo "   SMTP_PASSWORD=${SMTP_PASSWORD_VAL:+set}"
echo "   EVOLUTION_API_KEY=${EVOLUTION_KEY_VAL:+set}"
echo "   ADMIN_ACCESS_PASSWORD=${ADMIN_PIN_VAL:+set}"
echo "   DATABASE_URL=${DATABASE_URL_VAL:+set}"

if [ -z "$SMTP_PASSWORD_VAL" ]; then
  echo "❌ No hay SMTP_PASSWORD en Swarm/.env/.env.bak"
  exit 1
fi

# ── Write canonical .env values (always quoted) ──────────────────
echo "📧 Aplicando SMTP info@renace.tech..."
env_set_quoted SMTP_HOST "smtp.hostinger.com"
env_set_quoted SMTP_PORT "465"
env_set_quoted SMTP_SECURE "1"
env_set_quoted SMTP_USER "info@renace.tech"
env_set_quoted SMTP_PASSWORD "$SMTP_PASSWORD_VAL"
env_set_quoted SMTP_FROM "RENACE.TECH <info@renace.tech>"
env_set_quoted MAIL_REPLY_TO "info@renace.tech"

echo "📱 Aplicando WhatsApp Evolution..."
env_set_quoted EVOLUTION_API_URL "https://evoapi.renace.tech"
env_set_quoted EVOLUTION_INSTANCE "RENACE.TECH"
env_set_quoted WHATSAPP_SENDER_NUMBER "18093487921"
env_set_quoted WHATSAPP_NOTIFY_NUMBERS "18494577463,18099152622"
if [ -n "$EVOLUTION_KEY_VAL" ]; then
  env_set_quoted EVOLUTION_API_KEY "$EVOLUTION_KEY_VAL"
fi
if [ -n "$ADMIN_PIN_VAL" ]; then
  env_set_quoted ADMIN_ACCESS_PASSWORD "$ADMIN_PIN_VAL"
fi
if [ -n "$DATABASE_URL_VAL" ]; then
  env_set_quoted DATABASE_URL "$DATABASE_URL_VAL"
fi
env_set_quoted PORT "3000"
env_set_quoted NEXT_PUBLIC_BASE_URL "https://renace.tech"

# ── Persist WhatsApp config into running volume ──────────────────
CID=$(docker ps -q -f name=renace_app | head -1 || true)
if [ -n "$CID" ]; then
  echo "💾 whatsapp-config.json en volumen data..."
  docker exec "$CID" mkdir -p /app/data
  docker exec \
    -e EVO_KEY="$EVOLUTION_KEY_VAL" \
    "$CID" node -e '
const fs = require("fs");
const path = "/app/data/whatsapp-config.json";
let prev = {};
try { prev = JSON.parse(fs.readFileSync(path, "utf8")); } catch {}
const key = (process.env.EVO_KEY || "").trim() || prev.apiKey || "";
const cfg = {
  apiUrl: "https://evoapi.renace.tech",
  apiKey: key,
  instance: "RENACE.TECH",
  sender: "18093487921",
  notifyNumbers: ["18494577463", "18099152622"],
  otpPhones: {
    "expertostird@gmail.com": "18494577463",
    "rcexpertos@gmail.com": "18099152622",
    ...(prev.otpPhones || {})
  },
  updatedAt: new Date().toISOString()
};
fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, hasKey: !!cfg.apiKey }));
'
fi

# ── Sync Swarm with quoted-safe values (no empty overwrites) ─────
echo "🔄 Sync Swarm renace_app..."
args=(--force)
add() { [ -n "$2" ] && args+=(--env-add "$1=$2"); }
add SMTP_HOST "smtp.hostinger.com"
add SMTP_PORT "465"
add SMTP_SECURE "1"
add SMTP_USER "info@renace.tech"
add SMTP_PASSWORD "$SMTP_PASSWORD_VAL"
add SMTP_FROM "RENACE.TECH <info@renace.tech>"
add MAIL_REPLY_TO "info@renace.tech"
add EVOLUTION_API_URL "https://evoapi.renace.tech"
add EVOLUTION_INSTANCE "RENACE.TECH"
add WHATSAPP_SENDER_NUMBER "18093487921"
add WHATSAPP_NOTIFY_NUMBERS "18494577463,18099152622"
add EVOLUTION_API_KEY "$EVOLUTION_KEY_VAL"
add ADMIN_ACCESS_PASSWORD "$ADMIN_PIN_VAL"
add DATABASE_URL "$DATABASE_URL_VAL"
add PORT "3000"
add NEXT_PUBLIC_BASE_URL "https://renace.tech"
add NODE_ENV "production"

docker service update "${args[@]}" renace_app

echo "⏳ Esperando health 50s..."
sleep 50

echo ""
echo "🏥 Health:"
curl -sS "https://renace.tech/api/health/live" || true
echo ""

if [ -n "$ADMIN_PIN_VAL" ]; then
  echo "📨 Mail-test:"
  python3 - "$ADMIN_PIN_VAL" <<'PY' | curl -sS -X POST "https://renace.tech/api/health/mail-test" -H "Content-Type: application/json" -d @- || true
import json, sys
print(json.dumps({"pin": sys.argv[1]}))
PY
  echo ""
fi

echo "🔐 OTP email:"
curl -sS -X POST "https://renace.tech/api/admin/login/request-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"expertostird@gmail.com","channel":"email"}' || true
echo ""

echo ""
echo "✅ Seed OK — sin nano, sin placeholders."
