#!/usr/bin/env bash
# Actualiza SOLO SMTP_PASSWORD (y fija info@renace.tech). Sin tocar DB/Odoo.
# Uso:
#   SMTP_PASSWORD='la-del-buzon' ./scripts/set-smtp-password.sh
set -euo pipefail
cd /opt/www.renace.tech

if [ -z "${SMTP_PASSWORD:-}" ]; then
  echo "Uso: SMTP_PASSWORD='...' ./scripts/set-smtp-password.sh"
  exit 1
fi

python3 - <<'PY'
from pathlib import Path
import os
key, val = "SMTP_PASSWORD", os.environ["SMTP_PASSWORD"]
safe = '"' + val.replace("\\", "\\\\").replace('"', '\\"') + '"'
path = Path(".env")
lines = path.read_text(encoding="utf-8", errors="replace").splitlines() if path.exists() else []
out, found = [], False
for line in lines:
    if line.startswith(key + "="):
        out.append(f"{key}={safe}"); found = True
    else:
        out.append(line)
if not found:
    out.append(f"{key}={safe}")
# force canonical user/from
def upsert(k, v):
    global out
    nv = f'{k}="{v}"'
    done = False
    nout = []
    for line in out:
        if line.startswith(k + "="):
            nout.append(nv); done = True
        else:
            nout.append(line)
    if not done: nout.append(nv)
    out = nout
upsert("SMTP_USER", "info@renace.tech")
upsert("SMTP_FROM", "RENACE.TECH <info@renace.tech>")
upsert("MAIL_REPLY_TO", "info@renace.tech")
upsert("SMTP_HOST", "smtp.hostinger.com")
upsert("SMTP_PORT", os.environ.get("SMTP_PORT", "465"))
upsert("SMTP_SECURE", os.environ.get("SMTP_SECURE", "1"))
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print("✓ .env actualizado")
PY

set -a; source .env; set +a
docker service update \
  --env-add "SMTP_HOST=${SMTP_HOST:-smtp.hostinger.com}" \
  --env-add "SMTP_PORT=${SMTP_PORT:-465}" \
  --env-add "SMTP_SECURE=${SMTP_SECURE:-1}" \
  --env-add "SMTP_USER=info@renace.tech" \
  --env-add "SMTP_PASSWORD=${SMTP_PASSWORD}" \
  --env-add "SMTP_FROM=RENACE.TECH <info@renace.tech>" \
  --env-add "MAIL_REPLY_TO=info@renace.tech" \
  --force renace_app

echo "⏳ 30s..."; sleep 30
curl -sS -X POST "https://renace.tech/api/health/mail-test" \
  -H "Content-Type: application/json" \
  -d "{\"pin\":\"${ADMIN_ACCESS_PASSWORD}\"}" | head -c 300
echo
