#!/usr/bin/env bash
# Iconografía oficial RENACE — solo assets de este repo (images/)
set -euo pipefail
cd "$(dirname "$0")/.."

IMG=images/icon-512.png
MARK=images/logo.svg
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
  # Algunos entornos marcan Invalid Iconset si faltan tamaños; regenerar set limpio
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

# Fondo DMG con marca transparente (qlmanage pinta blanco detrás del SVG)
python3 - <<'PY'
from pathlib import Path
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("⚠ Pillow no instalado — omitiendo dmg-background.png (pip install pillow)")
    raise SystemExit(0)

root = Path(".")
build = root / "build"
w, h = 660, 400
bg = (6, 11, 20)  # #060b14
img = Image.new("RGB", (w, h), bg)
draw = ImageDraw.Draw(img)
for y in range(h):
    t = y / h
    c = int(bg[0] + (0 - bg[0]) * t * 0.15)
    draw.line([(0, y), (w, y)], fill=(c, c + 2, c + 8))

logo = root / "images" / "renacelogo.svg"
if logo.exists():
    import subprocess
    subprocess.run(
        ["qlmanage", "-t", "-s", "900", "-o", str(build), str(logo)],
        capture_output=True,
        check=False,
    )
    png = build / f"{logo.name}.png"
    if png.exists():
        wm = Image.open(png).convert("RGBA")
        pixels = wm.load()
        ww, hh = wm.size
        # Solo canvas blanco puro de Quick Look — conservar #f0f0f0 del wordmark
        for y in range(hh):
            for x in range(ww):
                r, g, b, a = pixels[x, y]
                if r >= 250 and g >= 250 and b >= 250:
                    pixels[x, y] = (0, 0, 0, 0)
        bbox = wm.getbbox()
        if bbox:
            wm = wm.crop(bbox)
        wm.thumbnail((340, 96), Image.Resampling.LANCZOS)
        # Wordmark gris un poco más legible sobre fondo oscuro
        px = wm.load()
        for y in range(wm.size[1]):
            for x in range(wm.size[0]):
                r, g, b, a = px[x, y]
                if a > 0 and abs(r - g) < 12 and abs(g - b) < 12 and 220 <= r <= 248:
                    px[x, y] = (236, 244, 255, a)
        img_rgba = img.convert("RGBA")
        img_rgba.paste(wm, ((w - wm.width) // 2, 44), wm)
        img = img_rgba.convert("RGB")
        png.unlink(missing_ok=True)

img.save(build / "dmg-background.png")
print("✓ build/dmg-background.png (logo transparente)")
PY

echo "✓ build/icon.icns (RENACE — images/icon-512.png)"
echo "✓ Sin assets de carpetas externas (ALTAMAR, etc.)"
