#!/bin/bash
# Restaura binarios de descarga en el volumen data (sin stack deploy).
# Uso:
#   ./scripts/restore-download-files.sh /ruta/a/carpeta/con/exe
# Si no pasas ruta, busca en /opt/www.renace.tech/docs y ./docs
set -euo pipefail

cd /opt/www.renace.tech 2>/dev/null || cd "$(dirname "$0")/.."

SRC_DIR="${1:-}"
if [ -z "$SRC_DIR" ]; then
  for cand in /opt/www.renace.tech/docs ./docs /root/docs; do
    if [ -d "$cand" ] && ls "$cand"/*.{exe,zip,apk,msi} >/dev/null 2>&1; then
      SRC_DIR="$cand"
      break
    fi
  done
fi

if [ -z "$SRC_DIR" ] || [ ! -d "$SRC_DIR" ]; then
  echo "❌ No hay carpeta fuente con archivos .exe/.zip/.apk"
  echo "   Uso: $0 /ruta/donde/estan/VC_redist.x64.exe"
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
  echo "→ copiando $base"
  docker cp "$f" "$CONTAINER:/app/data/docs/$base"
  docker cp "$f" "$CONTAINER:/app/downloads/$base" 2>/dev/null || true
  copied=$((copied + 1))
done

if [ "$copied" -eq 0 ]; then
  echo "⚠️  No se copió ningún archivo"
  exit 1
fi

echo "✅ $copied archivo(s) en /app/data/docs (volumen persistente)"
echo "🔎 Verificación:"
docker exec "$CONTAINER" ls -lh /app/data/docs || true
curl -sS "https://renace.tech/api/documents" | head -c 800 || true
echo ""
