#!/usr/bin/env bash
# www/ para Capacitor — portal RENACE desde ESTE repo (no ALTAMAR)
set -euo pipefail
cd "$(dirname "$0")/.."

for f in portal.html images/icon-192.png images/logo.svg; do
  [[ -f "$f" ]] || { echo "❌ Falta $f"; exit 1; }
done

rm -rf www
mkdir -p www/images
cp portal.html www/index.html
cp -r images www/
cp electron/push-stub.js www/renace-push-stub.js 2>/dev/null || cp electron/push-bridge.js www/renace-push-stub.js
cp electron/user-shell.js www/renace-user-shell.js
mkdir -p android/app/src/main/assets
cp electron/user-shell.js android/app/src/main/assets/renace-user-shell.js
# iOS: copia al bundle App (Capacitor public + recurso suelto)
mkdir -p ios/App/App
cp electron/user-shell.js ios/App/App/renace-user-shell.js
cp electron/user-shell.js ios/App/App/public/renace-user-shell.js 2>/dev/null || true
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
PY

# Rutas relativas para Capacitor (file:// / capacitor://)
python3 - <<'PY'
from pathlib import Path
p = Path("www/index.html")
html = p.read_text(encoding="utf-8")
html = html.replace('href="/images/', 'href="./images/')
html = html.replace("href='/images/", "href='./images/")
html = html.replace('src="/images/', 'src="./images/')
tags = [
    '<script src="./renace-push-stub.js"></script>\n',
    '<script src="./renace-user-shell.js"></script>\n',
]
for tag, needle in [
    (tags[0], "renace-push-stub"),
    (tags[1], "renace-user-shell"),
]:
    if needle not in html:
        if "</head>" in html:
            html = html.replace("</head>", tag + "</head>", 1)
        else:
            html = tag + html
p.write_text(html, encoding="utf-8")
print("✓ www/ listo (portal → index.html, images/, push-stub, user-shell)")
PY
