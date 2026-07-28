#!/usr/bin/env bash
# Sube instaladores Portal al VPS y despliega la web.
# Uso (desde la Mac, con SSH que pida password si hace falta):
#   ./scripts/ship-portal-downloads.sh
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${RENACE_VPS:-root@45.9.191.18}"
REMOTE_TMP="/tmp/renace-portal-ship"

need=(
  docs/RENACE-Portal-mac-arm64.dmg
  docs/RENACE-Portal-mac-x64.dmg
  docs/RENACE-Portal-win-x64.exe
  docs/RENACE-Portal-ios.ipa
  docs/RENACE-Portal-android.apk
)

# Manifiesto de updates (opcional pero recomendado)
if [[ -f docs/portal-desktop-update.json ]]; then
  need+=(docs/portal-desktop-update.json)
else
  ./scripts/publish-desktop-update.sh || true
  [[ -f docs/portal-desktop-update.json ]] && need+=(docs/portal-desktop-update.json)
fi

echo "═══════════════════════════════════════════"
echo " Ship Portal → $HOST"
echo "═══════════════════════════════════════════"

for f in "${need[@]}"; do
  [[ -f "$f" ]] || { echo "❌ Falta $f — corre stage/build primero"; exit 1; }
  ls -lh "$f"
done

echo "📤 Subiendo a $HOST:$REMOTE_TMP ..."
ssh -o ConnectTimeout=20 "$HOST" "mkdir -p '$REMOTE_TMP' && rm -f '$REMOTE_TMP'/RENACE-Portal-*"
scp -o ConnectTimeout=20 "${need[@]}" "$HOST:$REMOTE_TMP/"

echo "🚀 Deploy código + restaurar archivos..."
ssh -o ConnectTimeout=20 "$HOST" bash -s <<EOF
set -euo pipefail
cd /opt/www.renace.tech
git fetch origin main
git reset --hard origin/main
chmod +x scripts/*.sh
./scripts/update-app-only.sh
./scripts/restore-download-files.sh '$REMOTE_TMP'
echo "── Verificación ──"
curl -sSI https://renace.tech/docs/RENACE-Portal-mac-arm64.dmg | head -5
curl -sSI https://renace.tech/docs/RENACE-Portal-win-x64.exe | head -5
curl -sSI https://renace.tech/docs/RENACE-Portal-ios.ipa | head -5
curl -sSI https://renace.tech/docs/RENACE-Portal-android.apk | head -5
EOF

echo "✅ Ship completo → https://renace.tech/descargas"
