#!/usr/bin/env bash
# Solo lectura: compara hosts DB posibles para renace_app (sin cambiar nada).
set -euo pipefail
cd /opt/www.renace.tech

APP=$(docker ps -q -f name=renace_app | head -1)
echo "APP=$APP"

python3 <<'PY'
from pathlib import Path
import re, subprocess

def get(path, key):
    p = Path(path)
    if not p.exists():
        return None
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def host_of(url):
    if not url:
        return None
    m = re.match(r"postgresql://[^:]+:[^@]+@([^:/]+):", url)
    return m.group(1) if m else None

env_h = host_of(get(".env", "DATABASE_URL"))
bak_h = host_of(get(".env.bak", "DATABASE_URL"))
out = subprocess.check_output(
    ["docker", "service", "inspect", "renace_app", "--format",
     "{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}"],
    text=True,
)
swarm_url = next((l.split("=", 1)[1] for l in out.splitlines() if l.startswith("DATABASE_URL=")), None)
swarm_h = host_of(swarm_url)
print("DATABASE_URL host .env :", env_h)
print("DATABASE_URL host .bak :", bak_h)
print("DATABASE_URL host swarm:", swarm_h)
PY

echo "=== servicios postgres/insforge ==="
docker service ls --format '{{.Name}} {{.Replicas}} {{.Image}}' | grep -iE 'insforge|renace_db' || true

echo "=== DNS desde renace_app ==="
for h in renace_db insforge_postgres db; do
  echo -n "$h -> "
  docker exec "$APP" node -e "require('dns').lookup(process.argv[1],(e,a)=>console.log(e?e.code:a))" "$h" 2>/dev/null || echo 'LOOKUP_FAIL'
done

echo "=== connect test (misma pass de DATABASE_URL, solo cambia host) ==="
docker exec "$APP" node -e '
const {Client}=require("pg");
const dns=require("dns");
const u=process.env.DATABASE_URL||"";
const m=u.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
if(!m){console.log("PARSE_FAIL"); process.exit(1)}
const [,user,password,,port,database]=m;
const hosts=["renace_db","insforge_postgres"];
(async()=>{
  for (const host of hosts){
    const addr=await new Promise(r=>dns.lookup(host,(e,a)=>r(e?null:a)));
    if(!addr){ console.log(host, "DNS_FAIL"); continue; }
    const c=new Client({user,password,host,port:Number(port),database,connectionTimeoutMillis:5000});
    try{
      await c.connect();
      const r=await c.query("select current_database() as db, current_user as u, (select count(*)::int from information_schema.tables where table_schema='\''public'\'') as public_tables");
      console.log(host, "OK", "ip="+addr, r.rows[0]);
      await c.end();
    }catch(e){ console.log(host, "FAIL", "ip="+addr, e.code, e.message); }
  }
})();
'
