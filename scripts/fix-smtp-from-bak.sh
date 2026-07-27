#!/usr/bin/env bash
# Hostinger SMTP — práctica correcta (sin saturar WhatsApp):
#   host: smtp.hostinger.com
#   user: info@renace.tech   (== From)
#   pass: contraseña del buzón info@renace.tech en hPanel (Emails)
#   465 + SSL  (preferido)  o  587 + STARTTLS
#
# Aplica user/from correctos y el password ya guardado; prueba mail-test.
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
  docker service inspect renace_app --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' 2>/dev/null \
    | python3 -c '
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
echo " Hostinger SMTP → info@renace.tech"
echo "═══════════════════════════════════════════"

SMTP_PASS_VAL="$(swarm_get SMTP_PASSWORD)"
if [ -z "$SMTP_PASS_VAL" ]; then SMTP_PASS_VAL="$(env_get .env SMTP_PASSWORD)"; fi
if [ -z "$SMTP_PASS_VAL" ]; then SMTP_PASS_VAL="$(env_get .env.bak SMTP_PASSWORD)"; fi

if [ -z "$SMTP_PASS_VAL" ]; then
  echo "❌ Sin SMTP_PASSWORD. En hPanel → Emails → info@renace.tech → reset password,"
  echo "   luego: SMTP_PASSWORD='...' ./scripts/set-smtp-password.sh"
  exit 1
fi

SMTP_USER_VAL="info@renace.tech"
SMTP_FROM_VAL="RENACE.TECH <info@renace.tech>"
SMTP_HOST_VAL="smtp.hostinger.com"
# Prefer Hostinger recommended 465 SSL; app auto-fallbacks to 587 if verify fails
SMTP_PORT_VAL="465"
SMTP_SECURE_VAL="1"

echo "→ Aplicando SMTP_USER=$SMTP_USER_VAL :$SMTP_PORT_VAL SSL"
env_set SMTP_HOST "$SMTP_HOST_VAL"
env_set SMTP_PORT "$SMTP_PORT_VAL"
env_set SMTP_SECURE "$SMTP_SECURE_VAL"
env_set SMTP_USER "$SMTP_USER_VAL"
env_set SMTP_PASSWORD "$SMTP_PASS_VAL"
env_set SMTP_FROM "$SMTP_FROM_VAL"
env_set MAIL_REPLY_TO "info@renace.tech"

docker service update \
  --env-add "SMTP_HOST=${SMTP_HOST_VAL}" \
  --env-add "SMTP_PORT=${SMTP_PORT_VAL}" \
  --env-add "SMTP_SECURE=${SMTP_SECURE_VAL}" \
  --env-add "SMTP_USER=${SMTP_USER_VAL}" \
  --env-add "SMTP_PASSWORD=${SMTP_PASS_VAL}" \
  --env-add "SMTP_FROM=${SMTP_FROM_VAL}" \
  --env-add "MAIL_REPLY_TO=info@renace.tech" \
  --force \
  renace_app

echo "⏳ 35s..."
sleep 35
PIN="$(env_get .env ADMIN_ACCESS_PASSWORD)"
[ -z "$PIN" ] && PIN="$(swarm_get ADMIN_ACCESS_PASSWORD)"
BODY=$(mktemp)
CODE=$(curl -sS -o "$BODY" -w "%{http_code}" -X POST "https://renace.tech/api/health/mail-test" \
  -H "Content-Type: application/json" -d "{\"pin\":\"${PIN}\"}" || echo 000)
echo "📨 mail-test HTTP $CODE $(head -c 200 "$BODY")"
rm -f "$BODY"

if [ "$CODE" = "200" ]; then
  echo "✅ SMTP listo — secretos solo por correo (WhatsApp no recibe secretos)."
  exit 0
fi

echo ""
echo "❌ Hostinger rechazó auth (típico 535 = password incorrecto para info@renace.tech)."
echo "   El .env.bak a menudo tenía password del buzón viejo @renace.space."
echo "   1) hPanel → Emails → info@renace.tech → Reset password"
echo "   2) SMTP_PASSWORD='NUEVO' ./scripts/set-smtp-password.sh"
exit 1
