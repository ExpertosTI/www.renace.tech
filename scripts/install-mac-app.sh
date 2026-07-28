#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_SRC="$ROOT/dist-electron/mac-arm64/RENACE Portal.app"
APP_DST="/Applications/RENACE Portal.app"
INFO="$APP_SRC/Contents/Info.plist"
ASAR="$APP_SRC/Contents/Resources/app.asar"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

if [[ ! -d "$APP_SRC" ]]; then
  echo "Falta el build. Corre: npm run mac:pack"
  exit 1
fi

# Quitar integridad asar si quedó (rompe el arranque)
if /usr/libexec/PlistBuddy -c "Print :ElectronAsarIntegrity" "$INFO" &>/dev/null; then
  /usr/libexec/PlistBuddy -c "Delete :ElectronAsarIntegrity" "$INFO" || true
  echo "→ ElectronAsarIntegrity eliminado del Info.plist"
fi

# Re-firmar ad-hoc local si hace falta para que Gatekeeper no mate el proceso
# (Developer ID sin notarizar + integridad rota = ventana negra)
IDENTITY=$(security find-identity -v -p codesigning 2>/dev/null | grep -m1 "Developer ID Application: ADDERLY MARTE" | sed -E 's/.*"(.+)"/\1/' || true)
if [[ -n "${IDENTITY:-}" ]]; then
  codesign --force --deep --options runtime \
    --entitlements "$ROOT/electron/entitlements.mac.plist" \
    --sign "$IDENTITY" \
    "$APP_SRC" 2>/dev/null || codesign --force --deep --sign "$IDENTITY" "$APP_SRC"
  echo "→ re-firmado: $IDENTITY"
fi

rm -rf "$APP_DST"
cp -R "$APP_SRC" "$APP_DST"
xattr -cr "$APP_DST" 2>/dev/null || true
touch "$APP_DST"

if [[ -x "$LSREGISTER" ]]; then
  "$LSREGISTER" -f -R "$APP_DST"
fi

open "$APP_DST"
sleep 3
if pgrep -f "RENACE Portal.app/Contents/MacOS" >/dev/null; then
  echo "✓ Viva: $APP_DST"
else
  echo "⚠ Proceso no detectado — prueba:"
  echo "  open -a \"RENACE Portal\""
  exit 1
fi
