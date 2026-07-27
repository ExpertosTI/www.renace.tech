#!/usr/bin/env bash
# Corrige DATABASE_URL: host genérico "db" / "insforge_postgres" → "renace_db"
# (evidencia: en RenaceNet muchos stacks registran alias "db"; DNS de la app cae en el Postgres equivocado).
# No regenera passwords. Solo renombra el host en .env + Swarm.
set -euo pipefail
cd /opt/www.renace.tech

python3 <<'PY'
from pathlib import Path
import re, subprocess

def load(path):
    p = Path(path)
    if not p.exists():
        return None
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def fix(url: str) -> str:
    return re.sub(r"@(?:insforge_postgres|db):", "@renace_db:", url)

url = load(".env")
if not url:
    raise SystemExit("❌ Sin DATABASE_URL en .env")

new = fix(url)
m = re.match(r"postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)", new)
if not m:
    raise SystemExit("❌ DATABASE_URL no parseable")
user, _pw, host, port, db = m.groups()
print(f"host={host} user={user} db={db} port={port}")
if host != "renace_db":
    raise SystemExit(f"❌ host quedó {host}, esperado renace_db")

# write .env
lines = Path(".env").read_text(encoding="utf-8", errors="replace").splitlines()
out = []
found = False
for line in lines:
    if line.startswith("DATABASE_URL="):
        out.append(f'DATABASE_URL="{new}"')
        found = True
    else:
        out.append(line)
if not found:
    out.append(f'DATABASE_URL="{new}"')
Path(".env").write_text("\n".join(out) + "\n", encoding="utf-8")
print("✓ .env actualizado")

# also fix .env.bak host if present (keep other values)
bak = Path(".env.bak")
if bak.exists():
    blines = bak.read_text(encoding="utf-8", errors="replace").splitlines()
    bout = []
    for line in blines:
        if line.startswith("DATABASE_URL="):
            raw = line.split("=", 1)[1].strip().strip('"').strip("'")
            bout.append(f'DATABASE_URL="{fix(raw)}"')
        else:
            bout.append(line)
    bak.write_text("\n".join(bout) + "\n", encoding="utf-8")
    print("✓ .env.bak host normalizado")

Path("/tmp/renace-database-url.txt").write_text(new, encoding="utf-8")
PY

NEW_URL=$(cat /tmp/renace-database-url.txt)
rm -f /tmp/renace-database-url.txt

echo "🔄 Swarm renace_app DATABASE_URL → host renace_db"
docker service update --env-add "DATABASE_URL=${NEW_URL}" --force renace_app

echo "⏳ 25s..."
sleep 25
APP=$(docker ps -q -f name=renace_app | head -1)
echo "=== dns renace_db ==="
docker exec "$APP" node -e 'require("dns").lookup("renace_db",(e,a)=>console.log(e||a))'
echo "=== health ==="
curl -sS https://renace.tech/api/health; echo
