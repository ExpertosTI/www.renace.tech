#!/usr/bin/env bash
# Descarga POS Agent PRO (dieg0-a/posagentpro) y extrae el payload portable.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."

DEST=vendor/posagent
APP="$DEST/app"
URL="${POSAGENT_URL:-https://github.com/dieg0-a/posagentpro/raw/main/assets/releases/POSAgentPROv021.exe}"
EXE="$DEST/POSAgentPROv021.exe"

mkdir -p "$DEST"

if [[ ! -f "$EXE" ]]; then
  echo "→ Descargando POS Agent PRO…"
  curl -fL --progress-bar -o "$EXE" "$URL"
fi

command -v 7zz >/dev/null || command -v 7z >/dev/null || {
  echo "❌ Necesitas 7-Zip (brew install sevenzip)"
  exit 1
}
SEVEN=$(command -v 7zz || command -v 7z)

rm -rf "$APP"
mkdir -p "$APP"
( cd "$APP" && "$SEVEN" x "../POSAgentPROv021.exe" -y >/dev/null )
rm -f "$APP/uninstall.exe"

[[ -f "$APP/posagent.exe" ]] || { echo "❌ No se extrajo posagent.exe"; exit 1; }
echo "✓ $APP/posagent.exe ($(du -sh "$APP" | awk '{print $1}'))"
