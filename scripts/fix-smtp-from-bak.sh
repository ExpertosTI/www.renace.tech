#!/usr/bin/env bash
# Restaura SMTP de producción: info@renace.tech + password guardado.
# NO usa renace.space. NO pide nano.
# Uso: ./scripts/fix-smtp-from-bak.sh
set -euo pipefail
cd /opt/www.renace.tech

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
' "$1" "$2"
}

swarm_get() {
  local key="$1"
  local out=""
  out=$(docker service inspect renace_app --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' 2>/dev/null || true)
  printf '%s\n' "$out" | python3 -c '
import sys
key=sys.argv[1]
for line in sys.stdin:
  line=line.rstrip("\n")
  if line.startswith(key+"="):
    print(line.split("=",1)[1], end="")
    break
' "$key" || true
}

echo "═══════════════════════════════════════════"
echo " RENACE — SMTP info@renace.tech"
echo "═══════════════════════════════════════════"

# Password: Swarm (actual) → .env → .env.bak (solo el secreto, no el usuario viejo)
SMTP_PASS_VAL="$(swarm_get SMTP_PASSWORD)"
if [ -z "$SMTP_PASS_VAL" ]; then SMTP_PASS_VAL="$(env_get .env SMTP_PASSWORD)"; fi
if [ -z "$SMTP_PASS_VAL" ]; then SMTP_PASS_VAL="$(env_get .env.bak SMTP_PASSWORD)"; fi

SMTP_HOST_VAL="$(swarm_get SMTP_HOST)"
if [ -z "$SMTP_HOST_VAL" ]; then SMTP_HOST_VAL="$(env_get .env SMTP_HOST)"; fi
if [ -z "$SMTP_HOST_VAL" ]; then SMTP_HOST_VAL="$(env_get .env.bak SMTP_HOST)"; fi
if [ -z "$SMTP_HOST_VAL" ]; then SMTP_HOST_VAL="smtp.hostinger.com"; fi

SMTP_PORT_VAL="$(swarm_get SMTP_PORT)"
if [ -z "$SMTP_PORT_VAL" ]; then SMTP_PORT_VAL="$(env_get .env SMTP_PORT)"; fi
if [ -z "$SMTP_PORT_VAL" ]; then SMTP_PORT_VAL="$(env_get .env.bak SMTP_PORT)"; fi
if [ -z "$SMTP_PORT_VAL" ]; then SMTP_PORT_VAL="465"; fi

SMTP_SECURE_VAL="$(swarm_get SMTP_SECURE)"
if [ -z "$SMTP_SECURE_VAL" ]; then SMTP_SECURE_VAL="$(env_get .env SMTP_SECURE)"; fi
if [ -z "$SMTP_SECURE_VAL" ]; then
  if [ "$SMTP_PORT_VAL" = "465" ]; then SMTP_SECURE_VAL="1"; else SMTP_SECURE_VAL="0"; fi
fi

# Canonical mailbox — never renace.space
SMTP_USER_VAL="info@renace.tech"
SMTP_FROM_VAL="RENACE.TECH <info@renace.tech>"
MAIL_REPLY_VAL="info@renace.tech"

if [ -z "$SMTP_PASS_VAL" ]; then
  echo "❌ No hay SMTP_PASSWORD en Swarm/.env/.env.bak"
  exit 1
fi

echo "→ Aplicando:"
echo "   SMTP_HOST=$SMTP_HOST_VAL"
echo "   SMTP_PORT=$SMTP_PORT_VAL"
echo "   SMTP_USER=$SMTP_USER_VAL"
echo "   SMTP_FROM=$SMTP_FROM_VAL"
echo "   SMTP_PASSWORD=set"

env_set SMTP_HOST "$SMTP_HOST_VAL"
env_set SMTP_PORT "$SMTP_PORT_VAL"
env_set SMTP_SECURE "$SMTP_SECURE_VAL"
env_set SMTP_USER "$SMTP_USER_VAL"
env_set SMTP_PASSWORD "$SMTP_PASS_VAL"
env_set SMTP_FROM "$SMTP_FROM_VAL"
env_set MAIL_REPLY_TO "$MAIL_REPLY_VAL"

echo "→ Actualizando renace_app (solo SMTP)..."
docker service update \
  --env-add "SMTP_HOST=${SMTP_HOST_VAL}" \
  --env-add "SMTP_PORT=${SMTP_PORT_VAL}" \
  --env-add "SMTP_SECURE=${SMTP_SECURE_VAL}" \
  --env-add "SMTP_USER=${SMTP_USER_VAL}" \
  --env-add "SMTP_PASSWORD=${SMTP_PASS_VAL}" \
  --env-add "SMTP_FROM=${SMTP_FROM_VAL}" \
  --env-add "MAIL_REPLY_TO=${MAIL_REPLY_VAL}" \
  --force \
  renace_app

echo "⏳ Esperando 40s..."
sleep 40

PIN="$(env_get .env ADMIN_ACCESS_PASSWORD)"
if [ -z "$PIN" ]; then PIN="$(swarm_get ADMIN_ACCESS_PASSWORD)"; fi

echo "📨 Probando SMTP..."
BODY=$(mktemp)
CODE=$(curl -sS -o "$BODY" -w "%{http_code}" -X POST "https://renace.tech/api/health/mail-test" \
  -H "Content-Type: application/json" \
  -d "{\"pin\":\"${PIN}\"}" || echo "000")
echo "   HTTP $CODE  $(head -c 220 "$BODY")"
rm -f "$BODY"

if [ "$CODE" = "200" ]; then
  echo "✅ SMTP OK con info@renace.tech"
else
  echo "⚠️  Auth falló: el password guardado no autentica info@renace.tech en Hostinger."
  echo "   Hay que actualizar SMTP_PASSWORD en el panel Hostinger → .env (sin tocar el resto)."
fi
