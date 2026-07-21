#!/bin/bash
# Seed RENACE — auto, sin nano, sin placeholders.
# Secretos: Swarm → .env → .env.bak
#
# Pegar:
#   cd /opt/www.renace.tech && git fetch origin main && git reset --hard origin/main && chmod +x scripts/*.sh && ./scripts/seed-production.sh
#
set -euo pipefail
cd /opt/www.renace.tech

echo "═══════════════════════════════════════════"
echo " RENACE — seed producción (auto)"
echo "═══════════════════════════════════════════"

env_get() {
  python3 -c '
import sys
path, key = sys.argv[1], sys.argv[2]
try:
  for line in open(path, encoding="utf-8", errors="replace"):
    line=line.strip()
    if not line or line.startswith("#") or "=" not in line: continue
    k,v=line.split("=",1)
    if k.strip()!=key: continue
    v=v.strip()
    if len(v)>=2 and ((v[0]==v[-1]=="\"") or (v[0]==v[-1]=="'\''")): v=v[1:-1]
    print(v, end="")
    sys.exit(0)
except FileNotFoundError:
  pass
' "$1" "$2"
}

env_set() {
  python3 -c '
import sys
key, val = sys.argv[1], sys.argv[2]
safe = "\"" + val.replace("\\\\","\\\\\\\\").replace("\"","\\\\\"") + "\""
try:
  lines = open(".env", encoding="utf-8", errors="replace").readlines()
except FileNotFoundError:
  lines = []
out=[]; found=False
for line in lines:
  if line.startswith(key+"="):
    out.append(f"{key}={safe}\n"); found=True
  else:
    out.append(line)
if not found: out.append(f"{key}={safe}\n")
open(".env","w",encoding="utf-8").writelines(out)
print("  set", key)
' "$1" "$2"
}

swarm_get() {
  docker service inspect renace_app --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' 2>/dev/null \
  | python3 -c '
import sys
key=sys.argv[1]
for line in sys.stdin:
  line=line.rstrip("\n")
  if line.startswith(key+"="):
    print(line.split("=",1)[1], end="")
    break
' "$1"
}

# Reparar .env si falta o está roto
NEED_RESTORE=0
[ ! -f .env ] && NEED_RESTORE=1
if [ -f .env ]; then
  if grep -q 'TU_PASSWORD\|TU_API_KEY' .env 2>/dev/null; then NEED_RESTORE=1; fi
  if grep -q '^SMTP_FROM=.*<' .env 2>/dev/null && ! grep -q '^SMTP_FROM="' .env 2>/dev/null; then NEED_RESTORE=1; fi
fi

if [ "$NEED_RESTORE" = "1" ]; then
  echo "⚠️  Reparando .env desde .env.bak"
  [ -f .env.bak ] || { echo "❌ Falta .env.bak"; exit 1; }
  cp .env.bak .env
  sed -i 's/@insforge_postgres:/@db:/g' .env
  sed -i 's/info@renace\.space/info@renace.tech/g' .env
fi

# Secretos
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

# Ignorar basura de placeholders
case "$SMTP_PASSWORD_VAL" in *TU_PASSWORD*|*"@RENACE.TECH") SMTP_PASSWORD_VAL="";; esac
case "$EVOLUTION_KEY_VAL" in *TU_API_KEY*|*your-evolution*) EVOLUTION_KEY_VAL="";; esac

echo "📋 SMTP_PASSWORD=${SMTP_PASSWORD_VAL:+set}  EVOLUTION_API_KEY=${EVOLUTION_KEY_VAL:+set}  ADMIN_PIN=${ADMIN_PIN_VAL:+set}"
[ -n "$SMTP_PASSWORD_VAL" ] || { echo "❌ Sin SMTP_PASSWORD en Swarm/.env.bak"; exit 1; }

echo "📧 SMTP info@renace.tech..."
env_set SMTP_HOST "smtp.hostinger.com"
env_set SMTP_PORT "465"
env_set SMTP_SECURE "1"
env_set SMTP_USER "info@renace.tech"
env_set SMTP_PASSWORD "$SMTP_PASSWORD_VAL"
env_set SMTP_FROM "RENACE.TECH <info@renace.tech>"
env_set MAIL_REPLY_TO "info@renace.tech"

echo "📱 WhatsApp..."
env_set EVOLUTION_API_URL "https://evoapi.renace.tech"
env_set EVOLUTION_INSTANCE "RENACE.TECH"
env_set WHATSAPP_SENDER_NUMBER "18093487921"
env_set WHATSAPP_NOTIFY_NUMBERS "18494577463,18099152622"
[ -n "$EVOLUTION_KEY_VAL" ] && env_set EVOLUTION_API_KEY "$EVOLUTION_KEY_VAL"
[ -n "$ADMIN_PIN_VAL" ] && env_set ADMIN_ACCESS_PASSWORD "$ADMIN_PIN_VAL"
[ -n "$DATABASE_URL_VAL" ] && env_set DATABASE_URL "$DATABASE_URL_VAL"
env_set PORT "3000"
env_set NEXT_PUBLIC_BASE_URL "https://renace.tech"

CID=$(docker ps -q -f name=renace_app | head -1 || true)
if [ -n "$CID" ]; then
  echo "💾 whatsapp-config.json..."
  docker exec "$CID" mkdir -p /app/data
  docker exec -e EVO_KEY="$EVOLUTION_KEY_VAL" "$CID" node -e '
const fs=require("fs");
const p="/app/data/whatsapp-config.json";
let prev={}; try{prev=JSON.parse(fs.readFileSync(p,"utf8"))}catch{}
const key=(process.env.EVO_KEY||"").trim()||prev.apiKey||"";
const cfg={
  apiUrl:"https://evoapi.renace.tech",
  apiKey:key,
  instance:"RENACE.TECH",
  sender:"18093487921",
  notifyNumbers:["18494577463","18099152622"],
  otpPhones:Object.assign({"expertostird@gmail.com":"18494577463","rcexpertos@gmail.com":"18099152622"}, prev.otpPhones||{}),
  updatedAt:new Date().toISOString()
};
fs.writeFileSync(p, JSON.stringify(cfg,null,2)+"\n");
console.log(JSON.stringify({ok:true,hasKey:!!cfg.apiKey}));
'
fi

echo "🔄 Sync Swarm..."
args=(--force)
add(){ [ -n "$2" ] && args+=(--env-add "$1=$2"); }
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

echo "⏳ 50s..."
sleep 50

echo "🏥 Health:"
curl -sS "https://renace.tech/api/health/live" || true
echo ""

if [ -n "$ADMIN_PIN_VAL" ]; then
  echo "📨 Mail-test:"
  python3 -c 'import json,sys; print(json.dumps({"pin":sys.argv[1]}))' "$ADMIN_PIN_VAL" \
    | curl -sS -X POST "https://renace.tech/api/health/mail-test" -H "Content-Type: application/json" -d @- || true
  echo ""
fi

echo "🔐 OTP:"
curl -sS -X POST "https://renace.tech/api/admin/login/request-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"expertostird@gmail.com","channel":"email"}' || true
echo ""
echo "✅ Seed OK"
