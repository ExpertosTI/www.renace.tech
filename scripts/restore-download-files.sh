#!/bin/bash
# Restaura binarios de descarga en el volumen data (sin stack deploy).
# Uso:
#   ./scripts/restore-download-files.sh /ruta/a/carpeta/con/exe
# Si no pasas ruta, busca en /opt/www.renace.tech/docs, ./docs y /tmp
set -euo pipefail

cd /opt/www.renace.tech

SRC_DIR="${1:-}"
if [ -z "$SRC_DIR" ]; then
  for cand in /tmp /opt/www.renace.tech/docs ./docs /root/docs; do
    if [ -d "$cand" ] && ls "$cand"/*.{exe,zip,apk,msi} >/dev/null 2>&1; then
      SRC_DIR="$cand"
      break
    fi
  done
fi

if [ -z "$SRC_DIR" ] || [ ! -d "$SRC_DIR" ]; then
  echo "❌ No hay carpeta fuente con archivos .exe/.zip/.apk"
  echo "   Uso: $0 /ruta/donde/estan/posagent-win64.exe"
  exit 1
fi

echo "📂 Fuente: $SRC_DIR"
CONTAINER=$(docker ps -q -f name=renace_app | head -1)
if [ -z "$CONTAINER" ]; then
  echo "❌ Contenedor renace_app no encontrado"
  exit 1
fi

echo "🐳 Contenedor: $CONTAINER"
docker exec "$CONTAINER" mkdir -p /app/data/docs /app/docs /app/downloads

copied=0
for f in "$SRC_DIR"/*; do
  [ -f "$f" ] || continue
  case "${f##*.}" in
    exe|zip|apk|msi|pdf|dmg|rar|7z) ;;
    *) continue ;;
  esac
  base=$(basename "$f")
  echo "→ copiando $base → /app/data/docs/ y /app/downloads/"
  docker cp "$f" "$CONTAINER:/app/data/docs/$base"
  docker cp "$f" "$CONTAINER:/app/downloads/$base" 2>/dev/null || true
  copied=$((copied + 1))
done

if [ "$copied" -eq 0 ]; then
  echo "⚠️  No se copió ningún archivo"
  exit 1
fi

# Asegurar entradas en documents.json del volumen (nombres amigables)
docker exec "$CONTAINER" node -e "
const fs = require('fs');
const path = '/app/data/documents.json';
let list = [];
try { list = JSON.parse(fs.readFileSync(path, 'utf8')); if (!Array.isArray(list)) list = []; } catch { list = []; }
const known = {
  'posagent-win64.exe': { name: 'POS Agent Windows 64 bits', type: 'EXE' },
  'rufus-4.11.exe': { name: 'Rufus 4.11', type: 'EXE' },
  'VC_redist.x64.exe': { name: 'VC_redist.x64.exe', type: 'EXE' },
  'initPos.zip': { name: 'initPos.zip', type: 'ZIP' },
};
const files = fs.readdirSync('/app/data/docs');
for (const base of files) {
  const meta = known[base] || { name: base, type: base.split('.').pop().toUpperCase() };
  const file = 'docs/' + base;
  const idx = list.findIndex(x => x.file === file || x.file === '/docs/' + base || x.name === meta.name);
  const entry = { name: meta.name, file, type: meta.type, size: 'N/A' };
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
}
fs.writeFileSync(path, JSON.stringify(list, null, 2) + '\n');
console.log('documents.json actualizado:', list.length, 'entradas');
" || true

echo "✅ $copied archivo(s) en volumen persistente /app/data/docs"
echo "🔎 Contenedor:"
docker exec "$CONTAINER" ls -lh /app/data/docs || true
echo "🔎 API:"
curl -sS "https://renace.tech/api/documents" | head -c 1200 || true
echo ""
echo "Prueba directa POS:"
curl -sSI "https://renace.tech/docs/posagent-win64.exe" | head -8 || true
