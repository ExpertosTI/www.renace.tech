#!/usr/bin/env bash
# Genera docs/portal-desktop-update.json desde package.json + instaladores staged.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p docs
node -e '
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const version = require("./package.json").version;
const files = {
  "win32-x64": "docs/RENACE-Portal-win-x64.exe",
  "darwin-arm64": "docs/RENACE-Portal-mac-arm64.dmg",
  "darwin-x64": "docs/RENACE-Portal-mac-x64.dmg",
};
const platforms = {};
for (const [key, rel] of Object.entries(files)) {
  if (!fs.existsSync(rel)) continue;
  const buf = fs.readFileSync(rel);
  platforms[key] = {
    url: "https://renace.tech/docs/" + path.basename(rel),
    size: buf.length,
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
  };
}
const out = "docs/portal-desktop-update.json";
fs.writeFileSync(out, JSON.stringify({
  version,
  releasedAt: new Date().toISOString(),
  notes: "RENACE Portal " + version,
  platforms,
}, null, 2) + "\n");
console.log("✓", out, version, Object.keys(platforms).join(", ") || "(sin binaries locales)");
'
echo "API: https://renace.tech/api/portal/desktop-update"
