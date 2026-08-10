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
DIRECT_URL="https://download.visualstudio.microsoft.com/download/pr/9b0d1fa5-c16d-4ee8-97f0-c2734086ece8/CC0FF0EB1DC3F5188AE6300FAEF32BF5BEEBA4BDD6E8E445A9184072096B713B/VC_redist.x64.exe"
curl -fsSL -L --max-time 30 --retry 3 -o "$OUT.partial" "$URL" || curl -fsSL --max-time 30 --retry 3 -o "$OUT.partial" "$DIRECT_URL"
mv -f "$OUT.partial" "$OUT"
echo "✓ $OUT ($(du -h "$OUT" | awk '{print $1}'))"
