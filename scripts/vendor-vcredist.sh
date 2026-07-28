#!/usr/bin/env bash
# Descarga Microsoft Visual C++ 2015-2022 Redistributable (x64)
# para el instalador NSIS / POS Agent (Qt).
set -euo pipefail
cd "$(dirname "$0")/.."

DEST=vendor/vcredist
OUT="$DEST/VC_redist.x64.exe"
URL="${VCREDIST_URL:-https://aka.ms/vs/17/release/vc_redist.x64.exe}"

mkdir -p "$DEST"
if [[ -f "$OUT" ]] && [[ $(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT") -gt 1000000 ]]; then
  echo "✓ $OUT ya existe ($(du -h "$OUT" | awk '{print $1}'))"
  exit 0
fi

echo "→ Descargando VC++ Redistributable x64…"
curl -fsSL -L --retry 3 -o "$OUT.partial" "$URL"
mv -f "$OUT.partial" "$OUT"
echo "✓ $OUT ($(du -h "$OUT" | awk '{print $1}'))"
