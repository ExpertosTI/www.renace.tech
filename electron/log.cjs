'use strict';

const fs = require('fs');
const path = require('path');
const { app, shell } = require('electron');

let logPath = null;

function ensureLog() {
  if (logPath) return logPath;
  const dir = path.join(app.getPath('logs'), 'RENACE Portal');
  fs.mkdirSync(dir, { recursive: true });
  logPath = path.join(dir, 'portal.log');
  return logPath;
}

function stamp() {
  return new Date().toISOString();
}

function write(level, msg, extra) {
  const line =
    `${stamp()} [${level}] ${msg}` +
    (extra !== undefined ? ` ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : '') +
    '\n';
  try {
    fs.appendFileSync(ensureLog(), line);
  } catch (_) {}
  if (level === 'ERROR') console.error(line.trim());
  else console.log(line.trim());
}

module.exports = {
  path: () => ensureLog(),
  info: (m, e) => write('INFO', m, e),
  warn: (m, e) => write('WARN', m, e),
  error: (m, e) => write('ERROR', m, e),
  open: () => {
    const p = ensureLog();
    shell.showItemInFolder(p);
  },
};
