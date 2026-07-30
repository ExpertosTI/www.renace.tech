#!/usr/bin/env bash
# Inyecta push-stub en WebViews Capacitor (evita crash Odoo: permission.addEventListener)
set -euo pipefail
cd "$(dirname "$0")/.."

STUB_SRC=electron/push-bridge.js
[[ -f "$STUB_SRC" ]] || { echo "❌ Falta $STUB_SRC"; exit 1; }

SHELL_SRC=electron/user-shell.js

# Copiar stub + user-shell a www / nativo
mkdir -p www android/app/src/main/assets ios/App/App
cp "$STUB_SRC" www/renace-push-stub.js
cp "$SHELL_SRC" www/renace-user-shell.js
cp "$SHELL_SRC" android/app/src/main/assets/renace-user-shell.js
cp "$SHELL_SRC" ios/App/App/renace-user-shell.js
cp "$SHELL_SRC" ios/App/App/public/renace-user-shell.js 2>/dev/null || true

# Regenerar Swift embebido (fallback iOS)
python3 - <<'PY'
from pathlib import Path
js = Path("electron/user-shell.js").read_text(encoding="utf-8")
Path("ios/App/App/RenaceUserShell.swift").write_text(
    "import Foundation\n\nenum RenaceUserShell {\n"
    '    static let source: String = #"""\n'
    + js
    + '\n"""#\n}\n',
    encoding="utf-8",
)
print("✓ RenaceUserShell.swift regenerado")
PY

# Asegurar <script> en index del portal Capacitor
if [[ -f www/index.html ]]; then
  python3 - <<'PY'
from pathlib import Path
p = Path("www/index.html")
html = p.read_text(encoding="utf-8")
changed = False
for needle, tag in [
    ("renace-push-stub", '<script src="./renace-push-stub.js"></script>\n'),
    ("renace-user-shell", '<script src="./renace-user-shell.js"></script>\n'),
]:
    if needle not in html:
        if "</head>" in html:
            html = html.replace("</head>", tag + "</head>", 1)
        else:
            html = tag + html
        changed = True
if changed:
    p.write_text(html, encoding="utf-8")
    print("✓ www/index.html ← push-stub + user-shell")
PY
fi

# Android: UserScript al inicio de cada documento (incluye navegación a Odoo)
ANDROID_MAIN=$(find android -name 'MainActivity.java' -o -name 'MainActivity.kt' 2>/dev/null | head -1 || true)
if [[ -n "${ANDROID_MAIN:-}" ]]; then
  echo "✓ Android presente: $ANDROID_MAIN (modo Usuario + shell assets)"
fi

# iOS: stub + shell vía AppDelegate
if [[ -f ios/App/App/AppDelegate.swift ]]; then
  if grep -q '__renacePushStub' ios/App/App/AppDelegate.swift; then
    echo "✓ iOS AppDelegate tiene push-stub"
  else
    echo "⚠ Revisa ios/App/App/AppDelegate.swift — falta push-stub"
  fi
  if grep -q 'renace-user-shell\|hardenWebView\|__renaceShellCfg' ios/App/App/AppDelegate.swift; then
    echo "✓ iOS AppDelegate tiene modo Usuario / shell"
  else
    echo "⚠ Revisa ios/App/App/AppDelegate.swift — falta user-shell"
  fi
fi

echo "✓ cap push-stub + user-shell listo"
