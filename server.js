/**
 * RENACE.TECH — Express Server (Production-Hardened)
 * Security: helmet, rate-limiting, input sanitization, CORS
 * Serves static files + provides API endpoints for:
 * - File upload/download (stored in PostgreSQL)
 * - Contact form (SMTP)
 * - Document listing
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const FORM_DATA_PATH = path.join(__dirname, 'form', 'data.json');
const allowedUploadTypes = {
  pdf: ['application/pdf', 'application/octet-stream'],
  doc: ['application/msword', 'application/octet-stream'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
  ppt: ['application/vnd.ms-powerpoint', 'application/octet-stream'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream'],
  txt: ['text/plain', 'application/octet-stream'],
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'],
  jpg: ['image/jpeg', 'application/octet-stream'],
  jpeg: ['image/jpeg', 'application/octet-stream'],
  png: ['image/png', 'application/octet-stream'],
  gif: ['image/gif', 'application/octet-stream'],
  svg: ['image/svg+xml', 'text/plain', 'application/octet-stream'],
  zip: ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip', 'application/octet-stream'],
  rar: ['application/vnd.rar', 'application/x-rar-compressed', 'application/octet-stream'],
  '7z': ['application/x-7z-compressed', 'application/octet-stream'],
};
const blockedStaticPathPattern = /(?:^\/(?:server\.js|package(?:-lock)?\.json|docker-compose\.yml|Dockerfile|deploy\.sh)$|\.(?:php|env|yml|yaml|sh|sql|log|bak|md)$)/i;

// Enable trust proxy for rate limiting behind Traefik
if (isProd) {
  app.set('trust proxy', 1);
}

// ── Security Headers (Helmet) ──
app.use((req, res, next) => {
  if (req.path.startsWith('/odoo')) return next();
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://ai.renace.tech"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        scriptSrcAttr: ["'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  })(req, res, next);
});

// ── Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Límite de mensajes alcanzado. Intenta más tarde.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas subidas, intenta más tarde.' },
});

// ── Database ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool security
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        size VARCHAR(50),
        mime_type VARCHAR(100),
        data BYTEA,
        category VARCHAR(50) DEFAULT 'other',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        message TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Database tables ready');
  } catch (err) {
    console.warn('⚠ Database not available, running in static mode');
  }
}

// ── SMTP ──
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

// ── Middleware ──
// Skip body parsing for Odoo proxy routes (stream must be unparsed)
app.use((req, res, next) => {
  if (req.path.startsWith('/odoo')) return next();
  express.json({ limit: '1mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/odoo')) return next();
  express.urlencoded({ extended: true, limit: '1mb' })(req, res, next);
});

// Disable X-Powered-By (helmet does this, but belt-and-suspenders)
app.disable('x-powered-by');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    const allowedMimeTypes = allowedUploadTypes[ext];
    if (!allowedMimeTypes) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  },
});
const documentUpload = upload.fields([
  { name: 'files', maxCount: 10 },
  { name: 'files[]', maxCount: 10 },
]);

function getUploadedFiles(req) {
  if (!req.files || typeof req.files !== 'object') return [];
  const directFiles = Array.isArray(req.files.files) ? req.files.files : [];
  const bracketFiles = Array.isArray(req.files['files[]']) ? req.files['files[]'] : [];
  return [...directFiles, ...bracketFiles];
}

function getAdminCredential(req) {
  const headerValue = typeof req.headers['x-admin-pin'] === 'string' ? req.headers['x-admin-pin'] : '';
  const bodyValue = typeof req.body?.pin === 'string' ? req.body.pin : '';
  return (headerValue || bodyValue).trim();
}

function getRequestClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

async function sendDocumentsList(res) {
  try {
    const result = await pool.query(
      'SELECT id, name, type, size, mime_type, category, created_at FROM documents ORDER BY created_at DESC'
    );
    const docs = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      size: row.size,
      file: `/api/documents/${row.id}/download`,
      category: row.category,
    }));
    return res.json(docs);
  } catch {
    const jsonPath = path.join(__dirname, 'data', 'documents.json');
    if (fs.existsSync(jsonPath)) {
      return res.sendFile(jsonPath);
    }
    return res.json([]);
  }
}

async function handleDocumentUpload(req, res) {
  const adminPin = getAdminCredential(req);
  if (!process.env.ADMIN_ACCESS_PASSWORD || adminPin !== process.env.ADMIN_ACCESS_PASSWORD) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const files = getUploadedFiles(req);
  if (files.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron archivos' });
  }

  try {
    const inserted = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).replace('.', '').toUpperCase();
      const sizeLabel = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      const result = await pool.query(
        'INSERT INTO documents (name, type, size, mime_type, data, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name',
        [sanitizeFilename(file.originalname), ext, sizeLabel, file.mimetype, file.buffer, getCategory(ext)]
      );
      inserted.push(result.rows[0]);
    }

    return res.json({
      message: `${inserted.length} archivo(s) subidos correctamente`,
      files: inserted,
      subidos: inserted.map(file => file.name),
      errores: [],
    });
  } catch {
    return res.status(500).json({ error: 'Error al subir archivos' });
  }
}

async function handleContactSubmission(req, res) {
  const { name, email, message, website } = req.body || {};

  if (website) {
    return res.json({ status: 'success', message: '¡Mensaje recibido!' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const safeName = sanitizeText(name).slice(0, 100);
  const safeEmail = sanitizeText(email).slice(0, 254);
  const safeMessage = sanitizeText(message).slice(0, 5000);

  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, message, ip_address) VALUES ($1, $2, $3, $4)',
      [safeName, safeEmail, safeMessage, getRequestClientIp(req)]
    );
  } catch {}

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@renace.tech',
        to: process.env.SMTP_USER || 'info@renace.tech',
        subject: `Contacto de ${safeName} — renace.tech`,
        text: `Nombre: ${safeName}\nEmail: ${safeEmail}\n\n${safeMessage}`,
        html: `<h3>Nuevo contacto desde renace.tech</h3>
          <p><strong>Nombre:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p>${safeMessage.replace(/\n/g, '<br>')}</p>`,
      });
    } catch (err) {
      console.warn('Email send failed:', err.message);
    }
  }

  return res.json({ status: 'success', message: '¡Mensaje recibido! Te contactaremos pronto.' });
}

async function readFormEntries() {
  try {
    const raw = await fs.promises.readFile(FORM_DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.promises.writeFile(FORM_DATA_PATH, '[]\n', 'utf8');
      return [];
    }
    throw err;
  }
}

async function writeFormEntries(entries) {
  await fs.promises.writeFile(FORM_DATA_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

app.get('/api/health/live', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/documents.php', apiLimiter, async (req, res) => sendDocumentsList(res));
app.post('/upload.php', uploadLimiter, documentUpload, async (req, res) => handleDocumentUpload(req, res));
app.post('/contact.php', contactLimiter, upload.none(), async (req, res) => handleContactSubmission(req, res));
app.get('/form/guardar.php', apiLimiter, async (req, res) => {
  try {
    res.json(await readFormEntries());
  } catch {
    res.status(500).json([]);
  }
});
app.post('/form/guardar.php', apiLimiter, async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ status: 'error', message: 'JSON inválido' });
  }

  try {
    const entries = await readFormEntries();
    const nextEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      evaluator: payload.evaluator ?? { name: 'Anónimo', role: 'Usuario' },
      winner: payload.winner ?? 'N/A',
      comments: payload.comments ?? '',
      scores: payload.scores ?? {},
      ip: getRequestClientIp(req),
      user_agent: req.headers['user-agent'] ?? 'Unknown',
    };
    entries.push(nextEntry);
    await writeFormEntries(entries);
    return res.json({
      status: 'success',
      message: 'Datos guardados correctamente',
      entry_id: nextEntry.id,
    });
  } catch {
    return res.status(500).json({ status: 'error', message: 'No se pudo escribir el archivo' });
  }
});
app.use((req, res, next) => {
  if (blockedStaticPathPattern.test(req.path)) {
    return res.status(404).end();
  }
  return next();
});

// ── Static Files ──
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
  dotfiles: 'deny',          // Block .env, .git, etc.
  setHeaders: (res, filePath) => {
    // Disable caching to prevent clients from getting stuck on old JS/HTML
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Prevent MIME sniffing (belt-and-suspenders with helmet)
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// ── Sanitization ──
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 5000); // Max 5000 chars
}

function sanitizeFilename(name) {
  return String(name || 'file')
    .replace(/[^\w.\-() ]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 200);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// ── API: List Documents ──
app.get('/api/documents', apiLimiter, async (req, res) => {
  return sendDocumentsList(res);
});

// ── API: Download Document ──
app.get('/api/documents/:id/download', apiLimiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

  try {
    const result = await pool.query('SELECT name, mime_type, data FROM documents WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });

    const doc = result.rows[0];
    const safeName = sanitizeFilename(doc.name);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(doc.data);
  } catch {
    res.status(500).json({ error: 'Error al descargar' });
  }
});

// ── API: Upload Document (Admin-only) ──
app.post('/api/documents', uploadLimiter, documentUpload, async (req, res) => handleDocumentUpload(req, res));

// ── API: Delete Document (Admin-only) ──
app.delete('/api/documents/:id', apiLimiter, async (req, res) => {
  const adminPin = getAdminCredential(req);
  if (!process.env.ADMIN_ACCESS_PASSWORD || adminPin !== process.env.ADMIN_ACCESS_PASSWORD) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ── API: Contact Form ──
app.post('/api/contact', contactLimiter, async (req, res) => handleContactSubmission(req, res));

// ── Helper ──
function getCategory(ext) {
  const cats = {
    image: ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'SVG', 'WEBP'],
    video: ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM'],
    audio: ['MP3', 'WAV', 'OGG', 'AAC', 'FLAC'],
    archive: ['ZIP', 'RAR', '7Z', 'TAR', 'GZ'],
    document: ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'CSV'],
  };
  for (const [cat, exts] of Object.entries(cats)) {
    if (exts.includes(ext)) return cat;
  }
  return 'other';
}

// ── Odoo Reverse Proxy ──────────────────────────────────────────
// Best practices: proxy_mode=True in odoo.conf (already set),
// strip /odoo prefix, forward real IP/proto headers, rewrite redirects.
const ODOO_URL          = process.env.ODOO_URL          || 'http://85.31.224.232:7015';
const ODOO_LONGPOLL_URL = process.env.ODOO_LONGPOLL_URL || 'http://85.31.224.232:7018';
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
]);

function buildOdooProxyHeaders(req) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k] = v;
  }
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  headers['x-forwarded-for']   = clientIp;
  headers['x-forwarded-proto'] = 'https';
  headers['x-forwarded-host']  = 'renace.tech';
  headers['x-real-ip']         = clientIp;
  return headers;
}

function rewriteOdooLocation(location) {
  if (!location) return location;
  // Strip internal scheme+host and re-root under /odoo
  return location
    .replace(/^https?:\/\/[^/]+(\/|$)/, (_, slash) => `https://renace.tech/odoo${slash === '/' ? '/' : ''}`)
    .replace(/^\/(?!odoo)/, '/odoo/');
}

function odooProxy(req, res, targetBase, stripPrefix) {
  const target = new URL(targetBase);
  const lib    = target.protocol === 'https:' ? https : http;

  // Strip the matched prefix from the path
  const upstreamPath = req.url.startsWith(stripPrefix)
    ? req.url.slice(stripPrefix.length) || '/'
    : req.url;

  const options = {
    hostname: target.hostname,
    port:     target.port || (target.protocol === 'https:' ? 443 : 80),
    path:     upstreamPath,
    method:   req.method,
    headers:  { ...buildOdooProxyHeaders(req), host: target.host },
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    const outHeaders = {};
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (HOP_BY_HOP.has(k.toLowerCase())) continue;
      outHeaders[k] = k.toLowerCase() === 'location'
        ? rewriteOdooLocation(Array.isArray(v) ? v[0] : v)
        : v;
    }
    // Disable caching for dynamic Odoo content
    outHeaders['cache-control'] = outHeaders['cache-control'] || 'no-store';
    res.writeHead(proxyRes.statusCode, outHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Odoo proxy]', err.message);
    if (!res.headersSent) {
      res.status(502).send(`
        <html><body style="font:1rem monospace;background:#0d1117;color:#e6edf3;padding:2rem">
          <h2>⚡ Odoo no disponible</h2>
          <p>El servicio en ${targetBase} no responde.<br>
          Verifica que Odoo esté activo: <code>sudo systemctl status renace-server</code></p>
        </body></html>`);
    }
  });

  // Stream body (POST/PUT/PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
}

// ── Odoo JSON-RPC API Client ────────────────────────────────────
let _odooSession = null; // { cookie, uid, expiresAt }

async function odooRpc(endpoint, params) {
  const target = new URL(ODOO_URL);
  const body = JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params });
  return new Promise((resolve, reject) => {
    const options = {
      hostname: target.hostname,
      port: parseInt(target.port) || 7015,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(_odooSession?.cookie ? { Cookie: _odooSession.cookie } : {}),
      },
    };
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const sc = res.headers['set-cookie'];
        if (sc) {
          const sid = (Array.isArray(sc) ? sc : [sc]).find(c => c.startsWith('session_id='));
          if (sid) _odooSession = { ..._odooSession, cookie: sid.split(';')[0] };
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.data?.message || 'Odoo RPC error'));
          else resolve(parsed.result);
        } catch { reject(new Error('Odoo response parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => req.destroy(new Error('Odoo timeout')));
    req.write(body);
    req.end();
  });
}

async function odooAuthenticate() {
  if (_odooSession?.uid && Date.now() < (_odooSession.expiresAt || 0)) return true;
  const db = process.env.ODOO_DB;
  const login = process.env.ODOO_API_USER;
  const password = process.env.ODOO_API_PASSWORD;
  if (!db || !login || !password) return false;
  try {
    const result = await odooRpc('/web/session/authenticate', { db, login, password });
    if (!result?.uid) return false;
    _odooSession = { ..._odooSession, uid: result.uid, expiresAt: Date.now() + 3_600_000 };
    console.log(`✓ Odoo session OK (uid=${result.uid})`);
    return true;
  } catch (e) {
    console.error('[Odoo auth]', e.message);
    return false;
  }
}

// GET /api/odoo/products
app.get('/api/odoo/products', apiLimiter, async (req, res) => {
  try {
    if (!await odooAuthenticate()) return res.status(503).json({ error: 'Odoo credentials not configured (ODOO_DB, ODOO_API_USER, ODOO_API_PASSWORD)' });
    const products = await odooRpc('/web/dataset/call_kw', {
      model: 'product.template',
      method: 'search_read',
      args: [],
      kwargs: {
        domain: [['sale_ok', '=', true], ['active', '=', true]],
        fields: ['id', 'name', 'list_price', 'description_sale', 'image_128', 'categ_id', 'type'],
        limit: 24,
        order: 'name asc',
      },
    });
    res.json(products || []);
  } catch (e) {
    console.error('[Odoo products]', e.message);
    res.status(502).json({ error: 'No se pudieron obtener los productos' });
  }
});

// POST /api/odoo/quote
app.post('/api/odoo/quote', apiLimiter, async (req, res) => {
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Items requeridos' });
  try {
    if (!await odooAuthenticate()) return res.status(503).json({ error: 'Odoo credentials not configured' });
    let partnerId = parseInt(process.env.ODOO_DEFAULT_PARTNER || '3', 10);
    if (customer?.email) {
      const existing = await odooRpc('/web/dataset/call_kw', {
        model: 'res.partner', method: 'search_read',
        args: [[['email', '=', customer.email]]],
        kwargs: { fields: ['id'], limit: 1 },
      });
      if (existing?.length) {
        partnerId = existing[0].id;
      } else {
        partnerId = await odooRpc('/web/dataset/call_kw', {
          model: 'res.partner', method: 'create',
          args: [{ name: customer.name || customer.email, email: customer.email, phone: customer.phone || '' }],
          kwargs: {},
        });
      }
    }
    const orderId = await odooRpc('/web/dataset/call_kw', {
      model: 'sale.order', method: 'create',
      args: [{
        partner_id: partnerId,
        note: customer?.message || 'Cotización creada desde web chat RENACE.TECH',
        order_line: items.map(item => [0, 0, {
          product_id: item.id,
          product_uom_qty: item.qty || 1,
          price_unit: item.price,
          name: item.name,
        }]),
      }],
      kwargs: {},
    });
    const order = await odooRpc('/web/dataset/call_kw', {
      model: 'sale.order', method: 'search_read',
      args: [[['id', '=', orderId]]],
      kwargs: { fields: ['name', 'amount_total'], limit: 1 },
    });
    res.json({ success: true, orderId, orderRef: order?.[0]?.name || `SO-${orderId}`, total: order?.[0]?.amount_total || 0 });
  } catch (e) {
    console.error('[Odoo quote]', e.message);
    res.status(502).json({ error: 'No se pudo crear la cotización: ' + e.message });
  }
});

// Longpolling (gevent port 7018) — must be before the generic /odoo route
app.use('/odoo/longpolling', (req, res) => odooProxy(req, res, ODOO_LONGPOLL_URL, '/odoo/longpolling'));

// Redirect bare /odoo → /odoo/web
app.get('/odoo', (req, res) => res.redirect(301, '/odoo/web'));

// All other /odoo/** → Odoo HTTP port 7015
app.use('/odoo', (req, res) => odooProxy(req, res, ODOO_URL, '/odoo'));

// ── Global Error Handler ──
app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Archivo demasiado grande (máx 20MB)' });
    }
    return res.status(400).json({ error: 'Error en la subida de archivos' });
  }
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Catch-all (SPA fallback) ──
app.use((req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
  // Prevent serving index.html for static files that don't exist (like manifest.json)
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).end();
  }
  // Disable caching for the HTML fallback to immediately deploy UI changes
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ── (raw http.Server for WebSocket upgrade support)
const rawServer = http.createServer(app);

// WebSocket tunnel for Odoo bus / longpolling (no external deps)
rawServer.on('upgrade', (req, socket, head) => {
  const isOdooWs = req.url.startsWith('/odoo/longpolling') ||
                   req.url.startsWith('/odoo/websocket')  ||
                   req.url.startsWith('/odoo/bus');
  if (!isOdooWs) { socket.destroy(); return; }

  const target = new URL(ODOO_LONGPOLL_URL);
  const upstream = http.request({
    hostname: target.hostname,
    port: target.port || 80,
    path: req.url.replace(/^\/odoo/, '') || '/',
    method: 'GET',
    headers: {
      ...req.headers,
      host: target.host,
      'x-forwarded-for': req.socket.remoteAddress,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'renace.tech',
    },
  });

  upstream.on('upgrade', (upRes, upSocket, upHead) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      Object.entries(upRes.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n'
    );
    if (upHead?.length) upSocket.unshift(upHead);
    upSocket.pipe(socket);
    socket.pipe(upSocket);
    socket.on('error', () => upSocket.destroy());
    upSocket.on('error', () => socket.destroy());
  });

  upstream.on('error', () => socket.destroy());
  upstream.end();
});

rawServer.listen(PORT, async () => {
  console.log(`🚀 RENACE.TECH running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  await initDB();
});
