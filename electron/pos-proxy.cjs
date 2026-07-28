'use strict';

/**
 * RENACE POS Proxy — compatible con el protocolo hw_proxy de POS Agent PRO / IoT.
 * Escucha en 127.0.0.1:9069 (configurable).
 * En macOS imprime JPEG de recibo vía CUPS (`lp`).
 * Identidad: RENACE (no POS Agent PRO).
 *
 * Protocolo basado en dieg0-a/posagentpro-src (MIT).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');
const log = require('./log.cjs');

let server = null;
let settings = { port: 9069, printer: '', enabled: true };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Debug-Mode'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Connection', 'close');
  res.setHeader('Date', new Date().toUTCString());
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function jsonRpc(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id: id == null ? 0 : id, result });
}

function parseId(raw) {
  try {
    const d = JSON.parse(raw || '{}');
    return d.id != null ? d.id : 0;
  } catch {
    return 0;
  }
}

function listCupsPrinters() {
  return new Promise((resolve) => {
    execFile('lpstat', ['-a'], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve([]);
      const names = String(stdout || '')
        .split('\n')
        .map((l) => l.trim().split(/\s+/)[0])
        .filter(Boolean);
      resolve(names);
    });
  });
}

function printJpegBase64(b64) {
  return new Promise((resolve) => {
    try {
      const buf = Buffer.from(String(b64 || '').replace(/\s/g, ''), 'base64');
      if (buf.length < 32) return resolve({ ok: false, error: 'recibo vacío' });
      const tmp = path.join(os.tmpdir(), `renace-pos-receipt-${Date.now()}.jpg`);
      fs.writeFileSync(tmp, buf);
      const args = [];
      if (settings.printer) {
        args.push('-d', settings.printer);
      }
      args.push('-o', 'fit-to-page', tmp);
      const child = spawn('lp', args, { stdio: 'ignore' });
      child.on('error', (e) => {
        log.warn('pos-proxy lp error', e.message);
        try { fs.unlinkSync(tmp); } catch (_) {}
        resolve({ ok: false, error: e.message });
      });
      child.on('close', (code) => {
        setTimeout(() => { try { fs.unlinkSync(tmp); } catch (_) {} }, 15000);
        resolve({ ok: code === 0, code });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

function openCashDrawer() {
  // ESC/POS: ESC p 0 25 250
  return new Promise((resolve) => {
    const tmp = path.join(os.tmpdir(), `renace-cash-${Date.now()}.bin`);
    try {
      fs.writeFileSync(tmp, Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]));
      const args = [];
      if (settings.printer) args.push('-d', settings.printer);
      args.push('-o', 'raw', tmp);
      const child = spawn('lp', args, { stdio: 'ignore' });
      child.on('close', (code) => {
        try { fs.unlinkSync(tmp); } catch (_) {}
        resolve({ ok: code === 0 });
      });
      child.on('error', () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
        resolve({ ok: false });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

async function handleDefaultPrinterAction(raw) {
  let id = 0;
  try {
    const d = JSON.parse(raw || '{}');
    id = d.id != null ? d.id : 0;
    const data = d.params && d.params.data;
    if (!data || typeof data !== 'object') return jsonRpc(id, false);
    if (data.action === 'print_receipt') {
      const r = await printJpegBase64(data.receipt);
      log.info('pos-proxy print_receipt', r);
      return jsonRpc(id, Boolean(r.ok));
    }
    if (data.action === 'cashbox') {
      const r = await openCashDrawer();
      log.info('pos-proxy cashbox', r);
      return jsonRpc(id, Boolean(r.ok));
    }
    return jsonRpc(id, false);
  } catch (e) {
    log.warn('pos-proxy action', e.message);
    return jsonRpc(id, false);
  }
}

function createHandler() {
  return async (req, res) => {
    cors(res);
    const url = String(req.url || '').split('?')[0];

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'GET' && url === '/hw_proxy/hello') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('ping');
    }

    if (req.method === 'GET' && (url === '/' || url === '/hw_proxy/status')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        `<!doctype html><html><body style="font-family:system-ui;padding:24px;background:#0a0f1a;color:#e5e7eb">
        <h1 style="color:#0087ff">RENACE POS</h1>
        <p>Proxy local compatible IoT / POS Agent (puerto ${settings.port}).</p>
        <p>Impresora: <b>${settings.printer || 'predeterminada del sistema'}</b></p>
        <p><a style="color:#0087ff" href="/hw_proxy/hello">/hw_proxy/hello</a></p>
        </body></html>`
      );
    }

    if (req.method !== 'POST') {
      res.writeHead(404);
      return res.end('not found');
    }

    const body = await readBody(req);
    const id = parseId(body);

    if (url === '/hw_proxy/handshake') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(jsonRpc(id, true));
    }

    if (url === '/hw_proxy/status_json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        jsonRpc(id, {
          printer: { status: 'connected', messages: 'RENACE POS' },
          scanner: { status: 'disconnected', messages: '' },
        })
      );
    }

    if (url === '/hw_proxy/default_printer_action') {
      const out = await handleDefaultPrinterAction(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(out);
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(jsonRpc(id, false));
  };
}

function start(opts = {}) {
  settings = { ...settings, ...opts };
  if (!settings.enabled) {
    log.info('pos-proxy disabled');
    return Promise.resolve({ ok: false, reason: 'disabled' });
  }
  if (server) return Promise.resolve({ ok: true, already: true, port: settings.port });

  return new Promise((resolve) => {
    server = http.createServer(createHandler());
    server.on('error', (err) => {
      log.warn('pos-proxy listen error', err.message);
      server = null;
      resolve({ ok: false, error: err.message });
    });
    server.listen(settings.port, '127.0.0.1', () => {
      log.info('RENACE POS proxy listening', { port: settings.port, printer: settings.printer || 'default' });
      resolve({ ok: true, port: settings.port, brand: 'RENACE POS' });
    });
  });
}

function stop() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => {
      server = null;
      resolve();
    });
  });
}

module.exports = { start, stop, listCupsPrinters, getSettings: () => ({ ...settings }) };
