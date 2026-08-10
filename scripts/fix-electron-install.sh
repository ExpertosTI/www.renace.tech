#!/usr/bin/env bash
# electron@37 postinstall a veces deja dist incompleto en Node 24 — reparar con unzip
set -euo pipefail
cd "$(dirname "$0")/../node_modules/electron"

if [[ -f path.txt ]] && [[ -d dist/Electron.app/Contents/Frameworks ]]; then
  exit 0
fi

VERSION=$(node -p "require('./package.json').version")
ARCH=$(uname -m)
case "$ARCH" in arm64) EARCH=arm64;; *) EARCH=x64;; esac
ZIP_NAME="electron-v${VERSION}-darwin-${EARCH}.zip"

ZIP=$(find "${HOME}/Library/Caches/electron" -name "$ZIP_NAME" 2>/dev/null | head -1 || true)
if [[ -z "$ZIP" ]]; then
  ZIP=$(find /var/folders -name "$ZIP_NAME" 2>/dev/null | head -1 || true)
fi
if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
  echo "[fix-electron] descargando $ZIP_NAME..."
  node install.js
  exit 0
fi

echo "[fix-electron] extrayendo $ZIP ..."
rm -rf dist path.txt
mkdir -p dist
unzip -q "$ZIP" -d dist
echo 'Electron.app/Contents/MacOS/Electron' > path.txt
echo "[fix-electron] OK"
