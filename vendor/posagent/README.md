# POS Agent PRO (Windows)

Bundled from [dieg0-a/posagentpro](https://github.com/dieg0-a/posagentpro) — open-source alternative to Odoo IoT Box for ESC/POS printers and cash drawers.

## Refresh payload

```bash
./scripts/vendor-posagent.sh
./scripts/vendor-vcredist.sh   # Visual C++ x64 (Qt / POS Agent)
```

Creates:

- `POSAgentPROv021.exe` — official NSIS installer
- `app/` — extracted portable tree (`posagent.exe` + Qt DLLs) shipped inside RENACE Portal Windows builds

**Visual C++:** sin el redistributable x64, POS Agent falla al abrir. El instalador NSIS de RENACE Portal lo detecta e instala automáticamente (`vendor/vcredist`).

## Odoo POS

Default proxy port: **9069** (`127.0.0.1`). Match that in Odoo Point of Sale → IoT / POS Agent settings.
