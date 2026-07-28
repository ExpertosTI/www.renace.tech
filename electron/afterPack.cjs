const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 1) Quitar ElectronAsarIntegrity (si el hash no cuadra, Electron abre en negro y muere).
 * 2) Solo xattr -cr — nunca reescribir el .app con ditto.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const infoPath = path.join(appPath, 'Contents', 'Info.plist');

  try {
    execSync(
      `/usr/libexec/PlistBuddy -c "Delete :ElectronAsarIntegrity" ${JSON.stringify(infoPath)}`,
      { stdio: 'pipe' }
    );
    console.log('[afterPack] ElectronAsarIntegrity eliminado');
  } catch (_) {
    try {
      if (fs.existsSync(infoPath)) {
        execSync(`plutil -convert xml1 ${JSON.stringify(infoPath)}`);
        let xml = fs.readFileSync(infoPath, 'utf8');
        if (xml.includes('ElectronAsarIntegrity')) {
          xml = xml.replace(
            /<key>ElectronAsarIntegrity<\/key>\s*<dict>[\s\S]*?<\/dict>\s*/m,
            ''
          );
          fs.writeFileSync(infoPath, xml);
          execSync(`plutil -convert binary1 ${JSON.stringify(infoPath)}`);
          console.log('[afterPack] ElectronAsarIntegrity eliminado (xml)');
        }
      }
    } catch (e2) {
      console.warn('[afterPack] ElectronAsarIntegrity:', e2.message);
    }
  }

  try {
    execSync(`xattr -cr ${JSON.stringify(appPath)}`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('[afterPack] xattr:', e.message);
  }
};
