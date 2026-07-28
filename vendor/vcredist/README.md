# Visual C++ Redistributable (Windows x64)

POS Agent PRO (Qt) necesita **Microsoft Visual C++ 2015–2022 Redistributable (x64)**.
En PCs sin esos runtimes, `posagent.exe` falla al abrir.

```bash
./scripts/vendor-vcredist.sh
```

Deja `VC_redist.x64.exe` aquí. El instalador NSIS de RENACE Portal:

1. Detecta si ya está (registro / `vcruntime140.dll`)
2. Si falta, lo instala en silencio (`/quiet /norestart`)
3. Luego arranca POS Agent

También hay un fallback en `electron/posagent-win.cjs` al abrir el Portal.
