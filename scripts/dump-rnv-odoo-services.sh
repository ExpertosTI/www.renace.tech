#!/usr/bin/env bash
# Dump live Odoo services from RNV and print JSON for portal Depurar.
# Usage:
#   export RNV_API_TOKEN=rnv_...   # from rnv.renace.tech → Ajustes → Cursor MCP
#   ./scripts/dump-rnv-odoo-services.sh
#   ./scripts/dump-rnv-odoo-services.sh | jq '[.[] | {name,type,url,port,client}] | length'
set -euo pipefail
BASE="${RNV_API_URL:-https://rnv.renace.tech}"
TOKEN="${RNV_API_TOKEN:-${RNV_API_KEY:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "Falta RNV_API_TOKEN (service token rnv_…)" >&2
  exit 1
fi
curl -fsS -H "Authorization: Bearer ${TOKEN}" -H 'Accept: application/json' \
  "${BASE%/}/api/services" \
  | node -e '
let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{
  const body=JSON.parse(d);
  if (body && body.success===false) { console.error(body.error||"RNV error"); process.exit(2); }
  const list=Array.isArray(body)?body:Array.isArray(body.data)?body.data:[];
  const odoo=list.filter(s=>String(s.type||"").toLowerCase()==="odoo");
  console.error("odoo_services="+odoo.length+" total_services="+list.length);
  process.stdout.write(JSON.stringify(odoo,null,2)+"\n");
});
'
