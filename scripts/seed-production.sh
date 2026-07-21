#!/bin/bash
# Seed RENACE — auto, sin nano, sin placeholders.
# Secretos: Swarm → .env → .env.bak
# Estilo Catagce/EnvíosRH: solo env no-vacío + service update (NO stack deploy).
#
# Pegar:
#   cd /opt/www.renace.tech && git fetch origin main && git reset --hard origin/main && chmod +x scripts/*.sh && ./scripts/seed-production.sh
#
set -euo pipefail
cd /opt/www.renace.tech

echo "═══════════════════════════════════════════"
echo " RENACE — seed producción (auto)"
echo "═══════════════════════════════════════════"

DISK_PCT=$(df -P / | awk 'NR==2{gsub(/%/,"",$5); print $5}')
echo "💾 Disco /: ${DISK_PCT}%"
if [ "${DISK_PCT:-0}" -ge 90 ]; then
  echo "⚠️  Disco casi lleno — docker update puede fallar. Limpia imágenes viejas si hace falta:"
  echo "   docker system df; docker image prune -af"
fi

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

# Reparar .env si falta o tiene placeholders
NEED_RESTORE=0
[ ! -f .env ] && NEED_RESTORE=1
if [ -f .env ]; then
  if grep -q 'TU_PASSWORD\|TU_API_KEY' .env 2>/dev/null; then NEED_RESTORE=1; fi
fi

if [ "$NEED_RESTORE" = "1" ]; then
  echo "⚠️  Reparando .env desde .env.bak"
  [ -f .env.bak ] || { echo "❌ Falta .env.bak"; exit 1; }
  cp .env.bak .env
  sed -i 's/@insforge_postgres:/@db:/g' .env
  # NO reemplazar SMTP_USER space→tech: el password de .env.bak es de la mailbox original
fi

# Secretos
SMTP_PASSWORD_VAL="$(swarm_get SMTP_PASSWORD)"
[ -z "$SMTP_PASSWORD_VAL" ] && SMTP_PASSWORD_VAL="$(env_get .env SMTP_PASSWORD)"
[ -z "$SMTP_PASSWORD_VAL" ] && SMTP_PASSWORD_VAL="$(env_get .env.bak SMTP_PASSWORD)"

# Auth SMTP = mailbox dueña del password (.env.bak). From/Reply = marca renace.tech
SMTP_USER_VAL="$(env_get .env.bak SMTP_USER)"
[ -z "$SMTP_USER_VAL" ] && SMTP_USER_VAL="$(swarm_get SMTP_USER)"
[ -z "$SMTP_USER_VAL" ] && SMTP_USER_VAL="$(env_get .env SMTP_USER)"
[ -z "$SMTP_USER_VAL" ] && SMTP_USER_VAL="info@renace.tech"

EVOLUTION_KEY_VAL="$(swarm_get EVOLUTION_API_KEY)"
[ -z "$EVOLUTION_KEY_VAL" ] && EVOLUTION_KEY_VAL="$(env_get .env EVOLUTION_API_KEY)"
[ -z "$EVOLUTION_KEY_VAL" ] && EVOLUTION_KEY_VAL="$(env_get .env.bak EVOLUTION_API_KEY)"

# Fallback: key en volumen del contenedor
if [ -z "$EVOLUTION_KEY_VAL" ]; then
  CID=$(docker ps -q -f name=renace_app | head -1 || true)
  if [ -n "${CID:-}" ]; then
    EVOLUTION_KEY_VAL=$(docker exec "$CID" node -e 'try{const c=require("/app/data/whatsapp-config.json");process.stdout.write(c.apiKey||"")}catch{}' 2>/dev/null || true)
  fi
fi

# Fallback: key en otros servicios Swarm con instance RENACE.TECH
if [ -z "$EVOLUTION_KEY_VAL" ]; then
  EVOLUTION_KEY_VAL=$(
    docker service ls --format '{{.Name}}' 2>/dev/null | while read -r svc; do
      docker service inspect "$svc" --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' 2>/dev/null
    done | python3 -c '
import sys
key=inst=None
best=""
for line in sys.stdin:
    line=line.strip()
    if line.startswith("EVOLUTION_INSTANCE="):
        inst=line.split("=",1)[1].strip()
    elif line.startswith("EVOLUTION_API_KEY="):
        key=line.split("=",1)[1].strip()
        if key and inst in ("RENACE.TECH","RENACE","renace.tech"):
            best=key
            break
        if key and not best:
            best=key
print(best, end="")
'
  )
  [ -n "$EVOLUTION_KEY_VAL" ] && echo "🔑 EVOLUTION_API_KEY tomada de otro servicio (instance RENACE.TECH)"
fi

ADMIN_PIN_VAL="$(swarm_get ADMIN_ACCESS_PASSWORD)"
[ -z "$ADMIN_PIN_VAL" ] && ADMIN_PIN_VAL="$(env_get .env ADMIN_ACCESS_PASSWORD)"
[ -z "$ADMIN_PIN_VAL" ] && ADMIN_PIN_VAL="$(env_get .env.bak ADMIN_ACCESS_PASSWORD)"

DATABASE_URL_VAL="$(swarm_get DATABASE_URL)"
[ -z "$DATABASE_URL_VAL" ] && DATABASE_URL_VAL="$(env_get .env DATABASE_URL)"
[ -z "$DATABASE_URL_VAL" ] && DATABASE_URL_VAL="$(env_get .env.bak DATABASE_URL)"
DATABASE_URL_VAL="${DATABASE_URL_VAL//@insforge_postgres:/@db:}"

case "$SMTP_PASSWORD_VAL" in *TU_PASSWORD*|*"@RENACE.TECH") SMTP_PASSWORD_VAL="";; esac
case "$EVOLUTION_KEY_VAL" in *TU_API_KEY*|*your-evolution*) EVOLUTION_KEY_VAL="";; esac

echo "📋 SMTP_USER=$SMTP_USER_VAL  SMTP_PASSWORD=${SMTP_PASSWORD_VAL:+set}  EVOLUTION_API_KEY=${EVOLUTION_KEY_VAL:+set}  ADMIN_PIN=${ADMIN_PIN_VAL:+set}"
[ -n "$SMTP_PASSWORD_VAL" ] || { echo "❌ Sin SMTP_PASSWORD en Swarm/.env.bak"; exit 1; }
[ -n "$ADMIN_PIN_VAL" ] || { echo "❌ Sin ADMIN_ACCESS_PASSWORD en Swarm/.env.bak"; exit 1; }
[ -n "$DATABASE_URL_VAL" ] || { echo "❌ Sin DATABASE_URL"; exit 1; }

echo "📧 SMTP auth=$SMTP_USER_VAL  from=info@renace.tech..."
env_set SMTP_HOST "smtp.hostinger.com"
env_set SMTP_PORT "465"
env_set SMTP_SECURE "1"
env_set SMTP_USER "$SMTP_USER_VAL"
env_set SMTP_PASSWORD "$SMTP_PASSWORD_VAL"
# From marca renace.tech; si Hostinger exige mismo buzón, auth ya usa .env.bak
env_set SMTP_FROM "RENACE.TECH <info@renace.tech>"
env_set MAIL_REPLY_TO "info@renace.tech"

echo "📱 WhatsApp..."
env_set EVOLUTION_API_URL "https://evoapi.renace.tech"
env_set EVOLUTION_INSTANCE "RENACE.TECH"
env_set WHATSAPP_SENDER_NUMBER "18093487921"
env_set WHATSAPP_NOTIFY_NUMBERS "18494577463,18099152622"
[ -n "$EVOLUTION_KEY_VAL" ] && env_set EVOLUTION_API_KEY "$EVOLUTION_KEY_VAL"
env_set ADMIN_ACCESS_PASSWORD "$ADMIN_PIN_VAL"
env_set DATABASE_URL "$DATABASE_URL_VAL"
env_set PORT "3000"
env_set NEXT_PUBLIC_BASE_URL "https://renace.tech"
env_set NODE_ENV "production"

CID=$(docker ps -q -f name=renace_app | head -1 || true)
if [ -n "${CID:-}" ]; then
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

# Sync Swarm: solo valores no vacíos (mismo patrón que update-app-only.sh)
# --detach evita colgarse si el disco está lleno / task no converge
env_add_args=()
add_env() {
  local key="$1"
  local val="${2-}"
  if [ -n "$val" ]; then
    env_add_args+=(--env-add "${key}=${val}")
  fi
}
add_env DATABASE_URL "$DATABASE_URL_VAL"
add_env NEXT_PUBLIC_BASE_URL "https://renace.tech"
add_env ADMIN_ACCESS_PASSWORD "$ADMIN_PIN_VAL"
add_env SMTP_HOST "smtp.hostinger.com"
add_env SMTP_PORT "465"
add_env SMTP_SECURE "1"
add_env SMTP_USER "$SMTP_USER_VAL"
add_env SMTP_PASSWORD "$SMTP_PASSWORD_VAL"
add_env SMTP_FROM "RENACE.TECH <info@renace.tech>"
add_env MAIL_REPLY_TO "info@renace.tech"
add_env EVOLUTION_API_URL "https://evoapi.renace.tech"
add_env EVOLUTION_API_KEY "$EVOLUTION_KEY_VAL"
add_env EVOLUTION_INSTANCE "RENACE.TECH"
add_env WHATSAPP_SENDER_NUMBER "18093487921"
add_env WHATSAPP_NOTIFY_NUMBERS "18494577463,18099152622"
add_env PORT "3000"
add_env NODE_ENV "production"

echo "🔄 Sync Swarm (detach, sin stack deploy)..."
if ! docker service update --detach "${env_add_args[@]}" --force renace_app; then
  echo "❌ docker service update falló"
  docker service ps renace_app --no-trunc 2>/dev/null | head -20 || true
  exit 1
fi

echo "⏳ Esperando health (hasta 90s)..."
OK=0
for i in 1 2 3 4 5 6 7 8 9; do
  sleep 10
  HEALTH=$(curl -sS --max-time 8 "https://renace.tech/api/health/live" 2>/dev/null || true)
  if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "🏥 Health OK (${i}0s)"
    echo "$HEALTH" | head -c 500
    echo ""
    OK=1
    break
  fi
  echo "   … aún no ($((i*10))s)"
done

if [ "$OK" != "1" ]; then
  echo "❌ Health no OK. Estado del servicio:"
  docker service ps renace_app --no-trunc 2>/dev/null | head -15 || true
  df -h / | head -2
  exit 1
fi

echo "📨 Mail-test:"
python3 -c 'import json,sys; print(json.dumps({"pin":sys.argv[1]}))' "$ADMIN_PIN_VAL" \
  | curl -sS --max-time 45 -X POST "https://renace.tech/api/health/mail-test" \
      -H "Content-Type: application/json" -d @- || true
echo ""

echo "🔐 OTP email:"
curl -sS --max-time 45 -X POST "https://renace.tech/api/admin/login/request-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"expertostird@gmail.com","channel":"email"}' || true
echo ""

if [ -z "$EVOLUTION_KEY_VAL" ]; then
  echo "⚠️  EVOLUTION_API_KEY ausente (SMTP/OTP email igual pueden funcionar)."
  echo "   Configúrala en Admin → WhatsApp o en .env.bak y re-corre el seed."
fi

echo "✅ Seed OK"
