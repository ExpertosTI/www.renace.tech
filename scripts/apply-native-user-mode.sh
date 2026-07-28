#!/usr/bin/env bash
# Aplica modo Usuario + shell Eleventa a proyectos Capacitor locales (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT=native/capacitor
[[ -f "$ROOT/MainActivity.java" ]] || { echo "❌ Falta $ROOT/MainActivity.java"; exit 1; }
[[ -f electron/user-shell.js ]] || { echo "❌ Falta electron/user-shell.js"; exit 1; }

bash scripts/cap-inject-push-stub.sh

# Android MainActivity
ANDROID_MAIN=$(find android -path '*/tech/renace/portal/MainActivity.java' 2>/dev/null | head -1 || true)
if [[ -n "${ANDROID_MAIN:-}" ]]; then
  cp "$ROOT/MainActivity.java" "$ANDROID_MAIN"
  mkdir -p android/app/src/main/assets
  cp electron/user-shell.js android/app/src/main/assets/renace-user-shell.js
  echo "✓ Android MainActivity + assets/renace-user-shell.js"
else
  echo "· Android no presente (ok si aún no corriste cap add android)"
fi

# iOS AppDelegate + shell embebido
if [[ -d ios/App/App ]]; then
  cp "$ROOT/AppDelegate.swift" ios/App/App/AppDelegate.swift
  python3 - <<'PY'
from pathlib import Path
js = Path("electron/user-shell.js").read_text(encoding="utf-8")
swift = (
    "import Foundation\n\nenum RenaceUserShell {\n"
    '    static let source: String = #"""\n'
    + js
    + '\n"""#\n}\n'
)
Path("ios/App/App/RenaceUserShell.swift").write_text(swift, encoding="utf-8")
Path("native/capacitor/RenaceUserShell.swift").write_text(swift, encoding="utf-8")
Path("ios/App/App/renace-user-shell.js").write_text(js, encoding="utf-8")
pub = Path("ios/App/App/public")
if pub.is_dir():
    (pub / "renace-user-shell.js").write_text(js, encoding="utf-8")
print("✓ iOS AppDelegate + RenaceUserShell.swift")
PY
  # Asegurar entrada en pbxproj
  if [[ -f ios/App/App.xcodeproj/project.pbxproj ]] && ! grep -q 'RenaceUserShell.swift' ios/App/App.xcodeproj/project.pbxproj; then
    echo "⚠ Añade RenaceUserShell.swift al target App en Xcode (File → Add Files)"
  fi
else
  echo "· iOS no presente (ok si aún no corriste cap add ios)"
fi

echo "✓ native user-mode aplicado"
