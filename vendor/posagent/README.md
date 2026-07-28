# POS Agent PRO (Windows)

Bundled from [dieg0-a/posagentpro](https://github.com/dieg0-a/posagentpro) — open-source alternative to Odoo IoT Box for ESC/POS printers and cash drawers.

## Refresh payload

```bash
./scripts/vendor-posagent.sh
```

Creates:

- `POSAgentPROv021.exe` — official NSIS installer
- `app/` — extracted portable tree (`posagent.exe` + Qt DLLs) shipped inside RENACE Portal Windows builds

## Odoo POS

Default proxy port: **9069** (`127.0.0.1`). Match that in Odoo Point of Sale → IoT / POS Agent settings.
