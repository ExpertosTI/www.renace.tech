#!/usr/bin/env bash
# Restaura SMTP que YA funcionaba (.env.bak / Swarm) sin tocar DB/Odoo ni pedir nano.
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
echo " RENACE — restaurar SMTP (sin romper nada)"
echo "═══════════════════════════════════════════"

# Prefer .env.bak pair (known-working mailbox + password), then current .env, then Swarm
SMTP_USER_VAL="$(env_get .env.bak SMTP_USER)"
SMTP_PASS_VAL="$(env_get .env.bak SMTP_PASSWORD)"
SMTP_HOST_VAL="$(env_get .env.bak SMTP_HOST)"
SMTP_PORT_VAL="$(env_get .env.bak SMTP_PORT)"
SMTP_SECURE_VAL="$(env_get .env.bak SMTP_SECURE)"
SMTP_FROM_VAL="$(env_get .env.bak SMTP_FROM)"
MAIL_REPLY_VAL="$(env_get .env.bak MAIL_REPLY_TO)"

if [ -z "$SMTP_PASS_VAL" ]; then SMTP_PASS_VAL="$(env_get .env SMTP_PASSWORD)"; fi
if [ -z "$SMTP_PASS_VAL" ]; then SMTP_PASS_VAL="$(swarm_get SMTP_PASSWORD)"; fi
if [ -z "$SMTP_USER_VAL" ]; then SMTP_USER_VAL="$(env_get .env SMTP_USER)"; fi
if [ -z "$SMTP_USER_VAL" ]; then SMTP_USER_VAL="$(swarm_get SMTP_USER)"; fi
if [ -z "$SMTP_HOST_VAL" ]; then SMTP_HOST_VAL="$(env_get .env SMTP_HOST)"; fi
if [ -z "$SMTP_HOST_VAL" ]; then SMTP_HOST_VAL="$(swarm_get SMTP_HOST)"; fi
if [ -z "$SMTP_HOST_VAL" ]; then SMTP_HOST_VAL="smtp.hostinger.com"; fi
if [ -z "$SMTP_PORT_VAL" ]; then SMTP_PORT_VAL="$(env_get .env SMTP_PORT)"; fi
if [ -z "$SMTP_PORT_VAL" ]; then SMTP_PORT_VAL="$(swarm_get SMTP_PORT)"; fi
if [ -z "$SMTP_PORT_VAL" ]; then SMTP_PORT_VAL="465"; fi
if [ -z "$SMTP_SECURE_VAL" ]; then SMTP_SECURE_VAL="$(env_get .env SMTP_SECURE)"; fi
if [ -z "$SMTP_SECURE_VAL" ]; then SMTP_SECURE_VAL="$(swarm_get SMTP_SECURE)"; fi
if [ -z "$SMTP_SECURE_VAL" ]; then
  if [ "$SMTP_PORT_VAL" = "465" ]; then SMTP_SECURE_VAL="1"; else SMTP_SECURE_VAL="0"; fi
fi

# Hostinger exige From == usuario autenticado — NO forzar otro buzón
if [ -z "$SMTP_FROM_VAL" ]; then
  SMTP_FROM_VAL="RENACE.TECH <${SMTP_USER_VAL}>"
fi
if [ -z "$MAIL_REPLY_VAL" ]; then
  MAIL_REPLY_VAL="${SMTP_USER_VAL}"
fi

if [ -z "$SMTP_USER_VAL" ] || [ -z "$SMTP_PASS_VAL" ]; then
  echo "❌ No hay SMTP_USER/SMTP_PASSWORD en .env.bak / .env / Swarm"
  exit 1
fi

echo "→ Restaurando par SMTP que ya existía:"
echo "   SMTP_HOST=$SMTP_HOST_VAL"
echo "   SMTP_PORT=$SMTP_PORT_VAL"
echo "   SMTP_USER=$SMTP_USER_VAL"
echo "   SMTP_FROM=$SMTP_FROM_VAL"
echo "   SMTP_PASSWORD=set"

# Persist in .env without wiping other secrets
env_set SMTP_HOST "$SMTP_HOST_VAL"
env_set SMTP_PORT "$SMTP_PORT_VAL"
env_set SMTP_SECURE "$SMTP_SECURE_VAL"
env_set SMTP_USER "$SMTP_USER_VAL"
env_set SMTP_PASSWORD "$SMTP_PASS_VAL"
env_set SMTP_FROM "$SMTP_FROM_VAL"
env_set MAIL_REPLY_TO "$MAIL_REPLY_VAL"

echo "→ Aplicando solo SMTP a renace_app (sin rebuild)..."
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

echo "⏳ Esperando 35s..."
sleep 35

# mail-test needs gate PIN if configured — use ADMIN_ACCESS_PASSWORD from env
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
  echo "✅ SMTP restaurado."
else
  echo "⚠️  Aún falla. Revisa que .env.bak tenga el password del buzón $SMTP_USER_VAL"
fi
