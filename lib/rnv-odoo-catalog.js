/**
 * Public Odoo URLs for RENACE-managed clients (from RNV services inventory).
 * app.renace.tech / odoo.renace.tech = only the RENACE company instance — not every client.
 *
 * Fallback catalog = last known RNV backup (type=odoo). Live Depurar pulls /api/services.
 */
'use strict';

/** Hosts that are never seeded as Odoo portal instances. */
const NON_ODOO_HOSTS = new Set([
  'www', 'mail', 'webmail', 'rnv', 'evoapi', 'ai', 'forms', 'bx', 'chatce',
  'insforge', 'insforge-auth', 'webhook', 'admin', 'cloud', 'mvpflow',
  'prestanace', 'blokeempleo', 'astro', 'citas',
]);

/** @type {{ slug: string, publicUrl: string, aliases?: string[] }[]} */
const RNV_ODOO_PUBLIC = [
  { slug: 'app', publicUrl: 'https://app.renace.tech', aliases: ['odoo', 'renace', 'principal', 'renacetech'] },
  { slug: 'odoo', publicUrl: 'https://odoo.renace.tech', aliases: ['principal'] },
  { slug: 'alcaduarte', publicUrl: 'https://alcaduarte.renace.tech' },
  { slug: 'cacorojo', publicUrl: 'https://cacorojo.renace.tech' },
  { slug: 'calpad', publicUrl: 'https://calpad.renace.tech' },
  { slug: 'camuflaje', publicUrl: 'https://camuflaje.renace.tech' },
  { slug: 'ceramicajc', publicUrl: 'https://ceramicajc.renace.tech' },
  { slug: 'clb', publicUrl: 'https://clb.renace.tech' },
  { slug: 'cueromacho', publicUrl: 'https://cueromacho.renace.tech' },
  { slug: 'delkilo', publicUrl: 'https://delkilo.renace.tech' },
  { slug: 'delkilofood', publicUrl: 'https://delkilofood.renace.tech' },
  { slug: 'disttineo', publicUrl: 'https://disttineo.renace.tech' },
  { slug: 'dyfsmart', publicUrl: 'https://dyfsmart.renace.tech' },
  { slug: 'easymovil', publicUrl: 'https://easymovil.renace.tech' },
  { slug: 'fullbloke', publicUrl: 'https://fullbloke.renace.tech' },
  { slug: 'guerrero', publicUrl: 'https://guerrero.renace.tech' },
  { slug: 'hansel', publicUrl: 'https://hansel.renace.tech' },
  { slug: 'henryh', publicUrl: 'https://henryh.renace.tech' },
  { slug: 'heredia', publicUrl: 'https://heredia.renace.tech' },
  { slug: 'lagrasa', publicUrl: 'https://lagrasa.renace.tech' },
  { slug: 'lakersdisco', publicUrl: 'https://lakersdisco.renace.tech' },
  { slug: 'launi', publicUrl: 'https://launi.renace.tech' },
  { slug: 'limytech', publicUrl: 'https://limytech.renace.tech' },
  { slug: 'magile', publicUrl: 'https://magile.renace.tech' },
  { slug: 'manuelhookah', publicUrl: 'https://manuelhookah.renace.tech' },
  { slug: 'metro', publicUrl: 'https://metro.renace.tech' },
  { slug: 'mojo', publicUrl: 'https://mojo.renace.tech', aliases: ['mojofashion', 'fashion', 'mojof'] },
  { slug: 'naje', publicUrl: 'https://naje.renace.tech' },
  { slug: 'nominarf', publicUrl: 'https://nominarf.renace.tech' },
  { slug: 'pim', publicUrl: 'https://pim.renace.tech' },
  { slug: 'rey', publicUrl: 'https://rey.renace.tech' },
  { slug: 'reyplaza', publicUrl: 'https://reyplaza.renace.tech' },
  { slug: 'ronuimport', publicUrl: 'https://ronuimport.renace.tech' },
  { slug: 'soriinails', publicUrl: 'https://soriinails.renace.tech' },
  { slug: 'sp', publicUrl: 'https://sp.renace.tech' },
  { slug: 'tarjetaroja', publicUrl: 'https://tarjetaroja.renace.tech' },
  { slug: 'thiago', publicUrl: 'https://thiago.renace.tech' },
  { slug: 'thiagosmart', publicUrl: 'https://thiagosmart.renace.tech' },
  { slug: 'universal', publicUrl: 'https://universal.renace.tech' },
  { slug: 'yeurismart', publicUrl: 'https://yeurismart.renace.tech' },
];

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function hostnameOf(url) {
  try {
    return new URL(String(url || '').trim()).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function looksLikePublicHttps(url) {
  try {
    const u = new URL(String(url || '').trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (!u.hostname || /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) return false;
    if (u.hostname === 'localhost') return false;
    return true;
  } catch {
    return false;
  }
}

function slugFromUrlOrName(url, name) {
  const host = hostnameOf(url);
  const m = host.match(/^([a-z0-9-]+)\.renace\.tech$/i);
  if (m && m[1] && m[1] !== 'www') return m[1].toLowerCase();
  const fromName = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .slice(0, 40);
  return fromName || null;
}

/** True if an RNV inventory row is an Odoo tenant (not web/api/ai). */
function isRnvOdooService(raw = {}) {
  const typ = String(raw.type || raw.Type || '').trim().toLowerCase();
  if (typ && typ !== 'odoo') return false;
  if (typ === 'odoo') return true;
  // Explicit instance payloads without type
  if (raw.odoo_url || raw.odoo_db || raw.service_code) return true;
  const url = String(raw.url || raw.public_url || raw.odoo_url || '').trim();
  const host = hostnameOf(url);
  const slug = slugFromUrlOrName(url, raw.name || raw.client_name);
  if (slug && NON_ODOO_HOSTS.has(slug)) return false;
  if (host.endsWith('.renace.tech') && slug && !NON_ODOO_HOSTS.has(slug)) {
    // Ambiguous — only accept if caller already filtered, or catalog match
    return !!matchCatalogEntry({ service_code: slug, public_url: url, client_name: raw.name });
  }
  return false;
}

/**
 * Map an RNV Service (or portal instance payload) into normalizeRnvItem input.
 */
function fromRnvService(raw = {}) {
  const url = String(raw.url || raw.public_url || raw.publicUrl || raw.odoo_url || '').trim();
  const name = String(raw.name || raw.client_name || raw.label || '').trim();
  const client = raw.client || raw.Client || {};
  const clientName = String(
    (typeof client === 'object' && client?.name) || raw.client_name || raw.clientName || name || ''
  ).trim();
  const slug = String(raw.service_code || raw.serviceCode || raw.code || raw.slug || '').trim().toLowerCase()
    || slugFromUrlOrName(url, name);
  const vps = raw.vps || raw.VPS || {};
  const ip = String(vps.ipAddress || vps.ip || raw.ip || '').trim();
  const port = raw.port || raw.Port || null;
  let internal = String(raw.odoo_url || raw.internal_url || raw.internalUrl || '').trim();
  if (!internal && ip && port) internal = `http://${ip}:${port}`;

  return {
    client_name: clientName || slug || name,
    name: clientName || name,
    odoo_url: internal || url,
    public_url: url,
    url,
    odoo_db: raw.odoo_db || raw.db || raw.database || 'db',
    service_code: slug,
    slug,
    code: slug,
    active: raw.active !== undefined ? !!raw.active : String(raw.status || '').toLowerCase() !== 'stopped',
    type: raw.type || 'odoo',
  };
}

/** Flatten possible RNV API response shapes into a list of rows. */
function extractRnvList(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  for (const key of ['data', 'services', 'instances', 'clients', 'odoo', 'nodes']) {
    if (Array.isArray(body[key])) return body[key];
  }
  return [];
}

/**
 * Infer the browser SSO URL for an instance row using RNV catalog + existing fields.
 */
function resolvePublicUrlForInstance(row = {}) {
  const explicit = String(row.public_url || row.publicUrl || '').trim();
  if (looksLikePublicHttps(explicit)) return explicit.replace(/\/$/, '');

  const odooUrl = String(row.odoo_url || row.url || '').trim();
  if (looksLikePublicHttps(odooUrl)) return odooUrl.replace(/\/$/, '');

  const matched = matchCatalogEntry(row);
  if (matched) return matched.publicUrl;

  const code = String(row.service_code || row.serviceCode || row.code || '').trim().toLowerCase();
  if (code && /^[a-z0-9-]{2,40}$/.test(code) && code !== 'app' && code !== 'odoo' && !NON_ODOO_HOSTS.has(code)) {
    return `https://${code}.renace.tech`;
  }

  return null;
}

function matchCatalogEntry(row = {}) {
  const host = hostnameOf(row.public_url || row.odoo_url || row.url || '');
  const code = String(row.service_code || row.serviceCode || row.code || '').trim().toLowerCase();
  const name = String(row.client_name || row.name || '').trim();
  const hay = `${norm(code)} ${norm(name)} ${norm(host)}`;

  for (const entry of RNV_ODOO_PUBLIC) {
    const keys = [entry.slug, ...(entry.aliases || [])].map(norm).filter(Boolean);
    if (code && (code === entry.slug || keys.includes(norm(code)))) return entry;
    if (host && (host === `${entry.slug}.renace.tech` || host.startsWith(`${entry.slug}.`))) return entry;
    if (keys.some((k) => k.length >= 3 && hay.includes(k))) return entry;
  }
  return null;
}

/** Assign missing service_code from RNV slug (e.g. Mojo Fashion → mojo). */
function resolveServiceCodeForInstance(row = {}) {
  const existing = String(row.service_code || row.serviceCode || row.code || '').trim().toLowerCase();
  if (existing) return existing;
  const matched = matchCatalogEntry(row);
  if (matched) return matched.slug;
  const host = hostnameOf(row.public_url || row.odoo_url || '');
  const m = host.match(/^([a-z0-9-]+)\.renace\.tech$/i);
  if (m && m[1] && m[1] !== 'www' && !NON_ODOO_HOSTS.has(m[1].toLowerCase())) {
    return m[1].toLowerCase();
  }
  return null;
}

function normalizeRnvItem(item = {}) {
  const mapped = item.type || item.url || item.vps || item.VPS || item.client || item.Client
    ? fromRnvService(item)
    : item;

  const client_name = String(mapped.client_name || mapped.name || mapped.label || '').trim();
  const odoo_url = String(mapped.odoo_url || mapped.url || mapped.internal_url || mapped.internalUrl || '').trim();
  const public_url = String(
    mapped.public_url || mapped.publicUrl || mapped.domain || mapped.external_url || mapped.externalUrl || mapped.url || ''
  ).trim();
  const odoo_db = String(mapped.odoo_db || mapped.db || mapped.database || 'db').trim();
  let service_code = String(
    mapped.service_code || mapped.serviceCode || mapped.code || mapped.slug || ''
  ).trim().toLowerCase();
  const active = mapped.active !== undefined ? !!mapped.active : true;

  const base = { public_url, odoo_url, service_code, client_name };
  const resolvedPublic = resolvePublicUrlForInstance(base);
  if (!service_code) {
    service_code = resolveServiceCodeForInstance({ ...base, public_url: resolvedPublic }) || '';
  }

  return {
    client_name,
    odoo_url: odoo_url || resolvedPublic || '',
    public_url: resolvedPublic,
    odoo_db: odoo_db || 'db',
    service_code,
    active,
  };
}

module.exports = {
  RNV_ODOO_PUBLIC,
  NON_ODOO_HOSTS,
  resolvePublicUrlForInstance,
  resolveServiceCodeForInstance,
  matchCatalogEntry,
  normalizeRnvItem,
  looksLikePublicHttps,
  isRnvOdooService,
  fromRnvService,
  extractRnvList,
  slugFromUrlOrName,
};
