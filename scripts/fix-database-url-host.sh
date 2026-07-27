#!/usr/bin/env bash
# Normaliza SOLO el host genérico "db" en DATABASE_URL.
# NO reescribe insforge_postgres ni renace_db (nombres de servicio únicos).
# Si el host es "db", usa el host de .env.bak si es único; si no, falla.
set -euo pipefail
cd /opt/www.renace.tech

python3 <<'PY'
from pathlib import Path
import re, subprocess

ALLOWED = {"insforge_postgres", "renace_db"}

def load_url(path):
    p = Path(path)
    if not p.exists():
        return None
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def host_of(url):
    m = re.match(r"postgresql://[^:]+:[^@]+@([^:/]+):", url or "")
    return m.group(1) if m else None

def set_host(url, host):
    return re.sub(r"@[^:/]+:", f"@{host}:", url, count=1)

def write_url(path, url):
    p = Path(path)
    lines = p.read_text(encoding="utf-8", errors="replace").splitlines() if p.exists() else []
    out, found = [], False
    for line in lines:
        if line.startswith("DATABASE_URL="):
            out.append(f'DATABASE_URL="{url}"'); found = True
        else:
            out.append(line)
    if not found:
        out.append(f'DATABASE_URL="{url}"')
    p.write_text("\n".join(out) + "\n", encoding="utf-8")

url = load_url(".env")
if not url:
    raise SystemExit("❌ Sin DATABASE_URL en .env")

host = host_of(url)
bak_host = host_of(load_url(".env.bak") or "")
print(f"actual={host} bak={bak_host}")

if host == "db":
    if bak_host in ALLOWED:
        url = set_host(url, bak_host)
        host = bak_host
        print(f"✓ host genérico db → {host} (desde .env.bak)")
    else:
        raise SystemExit(
            "❌ DATABASE_URL usa host genérico 'db'. "
            "Pon un servicio único: insforge_postgres o renace_db."
        )
elif host not in ALLOWED:
    raise SystemExit(f"❌ Host no permitido: {host}. Usa: {sorted(ALLOWED)}")
else:
    print(f"✓ host único OK: {host}")

write_url(".env", url)
# bak: solo corrige si tenía "db"
bak = load_url(".env.bak")
if bak and host_of(bak) == "db":
    write_url(".env.bak", set_host(bak, host))
    print("✓ .env.bak: db →", host)

Path("/tmp/renace-database-url.txt").write_text(url, encoding="utf-8")
print(f"canon host={host}")
PY

NEW_URL=$(cat /tmp/renace-database-url.txt)
rm -f /tmp/renace-database-url.txt
HOST=$(python3 -c "import re,sys; print(re.search(r'@([^:/]+):', sys.argv[1]).group(1))" "$NEW_URL")

echo "🔄 Swarm renace_app DATABASE_URL host=$HOST"
docker service update --env-add "DATABASE_URL=${NEW_URL}" --force renace_app
sleep 25
APP=$(docker ps -q -f name=renace_app | head -1)
echo "=== dns $HOST ==="
docker exec "$APP" node -e "require('dns').lookup(process.argv[1],(e,a)=>console.log(e||a))" "$HOST"
curl -sS https://renace.tech/api/health; echo
