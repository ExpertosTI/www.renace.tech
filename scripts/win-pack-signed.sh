#!/usr/bin/env bash
# Build Windows FIRMADO (Authenticode) — necesario para que Edge/SmartScreen no diga "no es de confianza".
#
# Requisitos (elige uno):
#   A) Certificado OV exportable (.pfx / .p12):
#        export WIN_CSC_LINK="/ruta/segura/renace-codesign.pfx"
#        export WIN_CSC_KEY_PASSWORD="****"
#   B) Azure Trusted Signing (recomendado CI / sin USB):
#        ver https://www.electron.build/docs/features/code-signing/code-signing-win/
#
# Compra tipica: Sectigo / DigiCert / SSL.com — Code Signing OV o EV a nombre de RENACE.TECH (empresa).
# Sin certificado REAL no hay forma de quitar el aviso de Edge.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "══ win:pack:signed $(node -p "require('./package.json').version") ══"

if [[ -z "${WIN_CSC_LINK:-${CSC_LINK:-}}" ]]; then
  cat <<'MSG'
❌ Falta certificado de firma Windows.

Edge marca el instalador como "no confiable" porque no está firmado con Authenticode.

1) Compra un Code Signing Certificate a nombre de tu empresa (RENACE.TECH):
   - OV (.pfx): más barato; SmartScreen mejora con descargas
   - EV (USB/HSM) o Azure Trusted Signing: confianza más rápida

2) Guarda el .pfx FUERA del repo (nunca lo subas a Git) y exporta:
     export WIN_CSC_LINK="/Users/…/renace-codesign.pfx"
     export WIN_CSC_KEY_PASSWORD="tu-password"

3) Vuelve a correr:
     npm run win:pack:signed

Mientras tanto, para pruebas internas sin firma:
     npm run win:pack:fast
MSG
  exit 1
fi

if [[ ! -d node_modules/electron || ! -x node_modules/.bin/electron-builder ]]; then
  npm ci --include=dev
fi

[[ -f vendor/posagent/app/posagent.exe ]] || ./scripts/vendor-posagent.sh
[[ -f vendor/vcredist/VC_redist.x64.exe ]] || ./scripts/vendor-vcredist.sh
[[ -f build/icon.ico ]] || npm run icons

# Activar firma (no usar fast / disable)
unset ELECTRON_BUILDER_DISABLE_CODE_SIGN || true
export CSC_IDENTITY_AUTO_DISCOVERY=true
# Preferir vars Windows específicas
export WIN_CSC_LINK="${WIN_CSC_LINK:-$CSC_LINK}"
export WIN_CSC_KEY_PASSWORD="${WIN_CSC_KEY_PASSWORD:-${CSC_KEY_PASSWORD:-}}"

if [[ -z "${WIN_CSC_KEY_PASSWORD}" ]]; then
  echo "❌ Falta WIN_CSC_KEY_PASSWORD (password del .pfx)"
  exit 1
fi

rm -f dist-electron/RENACE-Portal-*-win-x64.exe dist-electron/*.blockmap 2>/dev/null || true

./node_modules/.bin/electron-builder --win nsis --x64 --publish never \
  -c.win.signAndEditExecutable=true

ls -lh dist-electron/RENACE-Portal-*-win-x64.exe
echo "✓ Instalador firmado — verifica propiedades del EXE → Firmas digitales → RENACE.TECH"
echo "  Luego: stage + ship como siempre."
