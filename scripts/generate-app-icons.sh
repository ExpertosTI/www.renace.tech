#!/usr/bin/env bash
# Iconografía oficial RENACE — solo assets de este repo (images/)
set -euo pipefail
cd "$(dirname "$0")/.."

IMG=images/icon-512.png
BUILD=build
ICONSET="$BUILD/AppIcon.iconset"

if [[ ! -f "$IMG" ]]; then
  echo "❌ Falta $IMG"
  exit 1
fi

mkdir -p "$ICONSET" "$BUILD"

make_png() {
  local size="$1"
  local out="$2"
  sips -z "$size" "$size" "$IMG" --out "$out" >/dev/null
}

# macOS .iconset (Electron + futuro iOS local)
make_png 16  "$ICONSET/icon_16x16.png"
make_png 32  "$ICONSET/icon_16x16@2x.png"
make_png 32  "$ICONSET/icon_32x32.png"
make_png 64  "$ICONSET/icon_32x32@2x.png"
make_png 128 "$ICONSET/icon_128x128.png"
make_png 256 "$ICONSET/icon_128x128@2x.png"
make_png 256 "$ICONSET/icon_256x256.png"
make_png 512 "$ICONSET/icon_256x256@2x.png"
make_png 512 "$ICONSET/icon_512x512.png"
make_png 1024 "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$BUILD/icon.icns" || {
  echo "⚠ iconutil falló — reintentando con iconos mínimos"
  rm -rf "$ICONSET"
  mkdir -p "$ICONSET"
  make_png 16  "$ICONSET/icon_16x16.png"
  make_png 32  "$ICONSET/icon_16x16@2x.png"
  make_png 32  "$ICONSET/icon_32x32.png"
  make_png 64  "$ICONSET/icon_32x32@2x.png"
  make_png 128 "$ICONSET/icon_128x128.png"
  make_png 256 "$ICONSET/icon_128x128@2x.png"
  make_png 256 "$ICONSET/icon_256x256.png"
  make_png 512 "$ICONSET/icon_256x256@2x.png"
  make_png 512 "$ICONSET/icon_512x512.png"
  make_png 1024 "$ICONSET/icon_512x512@2x.png"
  iconutil -c icns "$ICONSET" -o "$BUILD/icon.icns"
}
cp "$IMG" "$BUILD/icon-512.png"
cp images/icon-192.png "$BUILD/icon-192.png" 2>/dev/null || make_png 192 "$BUILD/icon-192.png"
cp images/apple-touch-icon-180.png "$BUILD/apple-touch-icon-180.png" 2>/dev/null || true

python3 scripts/generate-dmg-background.py

echo "✓ build/icon.icns (RENACE — images/icon-512.png)"
echo "✓ Sin assets de carpetas externas (ALTAMAR, etc.)"
