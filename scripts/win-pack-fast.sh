#!/usr/bin/env bash
# Build Windows rápido (Mac → NSIS): sin zip, sin firma Wine, sin regenerar icons/vendor si ya existen.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "══ win:pack:fast $(node -p "require('./package.json').version") ══"

if [[ ! -d node_modules/electron || ! -x node_modules/.bin/electron-builder ]]; then
  echo "→ npm ci (faltan electron / electron-builder locales)…"
  npm ci --include=dev
fi

if [[ ! -f vendor/posagent/app/posagent.exe ]]; then
  ./scripts/vendor-posagent.sh
else
  echo "· posagent OK (skip)"
fi

if [[ ! -f vendor/vcredist/VC_redist.x64.exe ]]; then
  ./scripts/vendor-vcredist.sh
else
  echo "· vcredist OK (skip)"
fi

if [[ ! -f build/icon.ico ]]; then
  npm run icons
else
  echo "· icons OK (skip)"
fi

export CSC_IDENTITY_AUTO_DISCOVERY=false
export WIN_CSC_LINK=
export ELECTRON_BUILDER_DISABLE_CODE_SIGN=true

rm -f dist-electron/RENACE-Portal-*-win-x64.exe dist-electron/*.blockmap 2>/dev/null || true

./node_modules/.bin/electron-builder --win nsis --x64 --publish never

ls -lh dist-electron/RENACE-Portal-*-win-x64.exe
echo "✓ win:pack:fast listo"
