#!/usr/bin/env bash
# Copia instaladores a docs/ con nombres estables para /descargas
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/Users/brainiacx/.nvm/versions/node/v24.16.0/bin:$PATH"
cd "$(dirname "$0")/.."
mkdir -p docs downloads

copy_one() {
  local src="$1" dest="$2"
  if [[ -f "$src" ]]; then
    cp -f "$src" "docs/$dest"
    cp -f "$src" "downloads/$dest"
    echo "✓ docs/$dest ($(du -h "docs/$dest" | awk '{print $1}'))"
  else
    echo "· falta $src"
  fi
}

# Nombres reales de electron-builder (versión desde package.json)
VER="$(node -p "require('./package.json').version")"
copy_one "dist-electron/RENACE Portal-${VER}-arm64.dmg" "RENACE-Portal-mac-arm64.dmg"
copy_one "dist-electron/RENACE Portal-${VER}.dmg" "RENACE-Portal-mac-x64.dmg"
copy_one "dist-electron/RENACE Portal-${VER}-mac.zip" "RENACE-Portal-mac-x64.zip"
copy_one "dist-electron/RENACE Portal-${VER}-arm64-mac.zip" "RENACE-Portal-mac-arm64.zip"
copy_one "dist-electron/RENACE-Portal-${VER}-win-x64.exe" "RENACE-Portal-win-x64.exe"
copy_one "dist-electron/RENACE-Portal-${VER}-win-x64.appx" "RENACE-Portal-win-x64.appx"
copy_one "android/app/build/outputs/apk/debug/app-debug.apk" "RENACE-Portal-android.apk"
copy_one "android/app/build/outputs/apk/release/app-release.apk" "RENACE-Portal-android.apk"

# Anuncio en documents.json si existe
python3 - <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone
p = Path("data/documents.json")
p.parent.mkdir(exist_ok=True)
items = []
if p.exists():
    try:
        items = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(items, list):
            items = []
    except Exception:
        items = []

def upsert(name, file, typ, category):
    global items
    items = [x for x in items if x.get("file") != file and x.get("name") != name]
    items.insert(0, {
        "name": name,
        "file": file,
        "type": typ,
        "category": category,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

upsert("RENACE Portal — macOS Apple Silicon", "docs/RENACE-Portal-mac-arm64.dmg", "DMG", "apps")
upsert("RENACE Portal — macOS Intel", "docs/RENACE-Portal-mac-x64.dmg", "DMG", "apps")
upsert("RENACE Portal — Windows", "docs/RENACE-Portal-win-x64.exe", "EXE", "apps")
upsert("RENACE Portal — Descargas", "descargas.html", "WEB", "apps")
p.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
print("✓ data/documents.json actualizado")
PY

echo "✓ stage:downloads listo → /descargas"
