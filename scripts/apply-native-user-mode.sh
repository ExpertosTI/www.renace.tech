#!/usr/bin/env bash
# Aplica modo Usuario + shell Eleventa a proyectos Capacitor locales (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."

# Auto-detect JAVA_HOME if not set
if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    export PATH="$JAVA_HOME/bin:$PATH"
  elif command -v /usr/libexec/java_home >/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home 2>/dev/null || true)"
  fi
fi

ROOT=native/capacitor
[[ -f "$ROOT/MainActivity.java" ]] || { echo "❌ Falta $ROOT/MainActivity.java"; exit 1; }
[[ -f electron/user-shell.js ]] || { echo "❌ Falta electron/user-shell.js"; exit 1; }

bash scripts/cap-inject-push-stub.sh

# Android MainActivity & BootReceiver
ANDROID_MAIN=$(find android -path '*/tech/renace/*/MainActivity.java' 2>/dev/null | head -1 || find android/app/src/main/java -name 'MainActivity.java' 2>/dev/null | head -1 || true)
if [[ -n "${ANDROID_MAIN:-}" ]]; then
  cp "$ROOT/MainActivity.java" "$ANDROID_MAIN"
  BOOT_RECEIVER="$(dirname "$ANDROID_MAIN")/BootReceiver.java"
  if [[ -f "$ROOT/BootReceiver.java" ]]; then
    cp "$ROOT/BootReceiver.java" "$BOOT_RECEIVER"
  fi

  if [[ "$ANDROID_MAIN" == *"tech/renace/app/"* ]]; then
    sed -i '' 's/package tech.renace.portal;/package tech.renace.app;/g' "$ANDROID_MAIN"
    [[ -f "$BOOT_RECEIVER" ]] && sed -i '' 's/package tech.renace.portal;/package tech.renace.app;/g' "$BOOT_RECEIVER"
  elif [[ "$ANDROID_MAIN" == *"tech/renace/portal/"* ]]; then
    sed -i '' 's/package tech.renace.app;/package tech.renace.portal;/g' "$ANDROID_MAIN"
    [[ -f "$BOOT_RECEIVER" ]] && sed -i '' 's/package tech.renace.portal;/package tech.renace.portal;/g' "$BOOT_RECEIVER"
  fi
  mkdir -p android/app/src/main/assets
  cp electron/user-shell.js android/app/src/main/assets/renace-user-shell.js
  echo "✓ Android MainActivity & BootReceiver ($ANDROID_MAIN) + assets/renace-user-shell.js"
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
