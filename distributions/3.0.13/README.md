# RENACE Portal — distribuciones 3.0.13

Instaladores generados desde este repo (`www.renace.tech`).

| Archivo | Plataforma |
|---------|------------|
| `RENACE-Portal-3.0.13-mac-arm64.dmg` | macOS Apple Silicon |
| `RENACE-Portal-3.0.13-mac-arm64.zip` | macOS Apple Silicon (zip) |
| `RENACE-Portal-3.0.13-win-x64.exe` | Windows x64 (NSIS, sin firma SmartScreen) |
| `RENACE-Portal-3.0.13-android.aab` | Google Play (AAB) |
| `RENACE-Portal-3.0.13-android-unsigned.apk` | Android APK (unsigned) |
| `RENACE-Portal-3.0.13-ios.ipa` | iOS (ad-hoc / export) |
| `latest-mac.yml` / `latest.yml` | Manifests electron-updater |
| `SHA256SUMS.txt` | Checksums |

Los binarios grandes van con **Git LFS**.

```bash
git lfs install
git fetch origin distributions/portal-3.0.13
git checkout distributions/portal-3.0.13
git lfs pull
```
