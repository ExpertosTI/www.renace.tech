#!/bin/bash
# Busca posagent / initPos / Rufus / VC_redist en el VPS y los restaura al volumen data.
# Uso: ./scripts/find-pos-agent.sh
set -euo pipefail

cd /opt/www.renace.tech 2>/dev/null || true

echo "═══════════════════════════════════════════"
echo " Buscar POS Agent y binaries de descarga"
echo "═══════════════════════════════════════════"

PATTERNS='*posagent* *POS*Agent* *initPos* *rufus* *VC_redist* *vc_redist*'

echo "🔎 Host /opt y backups..."
FOUND=()
while IFS= read -r f; do
  [ -n "$f" ] && FOUND+=("$f")
done < <(find /opt /root /var/backups /home -type f \( \
  -iname '*posagent*' -o -iname '*initpos*' -o -iname 'rufus*.exe' -o -iname 'VC_redist*.exe' \
\) 2>/dev/null | head -40)

echo "🔎 Volúmenes Docker (renace*data*)..."
for vol in $(docker volume ls -q | grep -E 'renace|quotes|docs' || true); do
  echo "  — volume: $vol"
  while IFS= read -r f; do
    [ -n "$f" ] && FOUND+=("volume:$vol:$f")
  done < <(docker run --rm -v "${vol}:/v:ro" alpine sh -c \
    'find /v -type f \( -iname "*posagent*" -o -iname "*initpos*" -o -iname "rufus*.exe" -o -iname "VC_redist*.exe" -o -iname "*.exe" -o -iname "*.zip" \) 2>/dev/null | head -30' \
    2>/dev/null || true)
done

echo "🔎 Contenedor renace_app..."
CID=$(docker ps -q -f name=renace_app | head -1 || true)
if [ -n "$CID" ]; then
  docker exec "$CID" sh -c 'ls -la /app/docs /app/downloads /app/data/docs /app/data 2>/dev/null; find /app/data /app/docs /app/downloads -type f \( -iname "*pos*" -o -iname "*.exe" -o -iname "*.zip" -o -iname "*.apk" \) 2>/dev/null | head -40' || true
fi

echo ""
echo "══ Resultados ══"
if [ "${#FOUND[@]}" -eq 0 ]; then
  echo "❌ No se encontró posagent-win64.exe en el servidor."
  echo ""
  echo "Opciones:"
  echo "  1) Si tienes el EXE en tu Mac, súbelo:"
  echo "       scp posagent-win64.exe root@45.9.191.18:/tmp/"
  echo "       ssh root@45.9.191.18 '/opt/www.renace.tech/scripts/restore-download-files.sh /tmp'"
  echo "  2) O copia desde otra máquina/backup donde esté docs/posagent-win64.exe"
  echo ""
  echo "El listado de la web solo muestra archivos que EXISTEN."
  echo "Cuando esté en /app/data/docs/posagent-win64.exe o /app/downloads/,"
  echo "aparecerá automáticamente en /api/documents."
  exit 1
fi

n=0
for item in "${FOUND[@]}"; do
  n=$((n + 1))
  echo "  [$n] $item"
done

echo ""
echo "Para restaurar una carpeta completa al volumen:"
echo "  ./scripts/restore-download-files.sh /ruta/con/el/exe"
