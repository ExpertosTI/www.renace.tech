/**
 * Public Odoo URLs for RENACE-managed clients (from RNV / Traefik node map).
 * app.renace.tech / odoo.renace.tech = only the RENACE company instance — not every client.
 */
'use strict';

/** @type {{ slug: string, publicUrl: string, aliases?: string[] }[]} */
const RNV_ODOO_PUBLIC = [
  { slug: 'app', publicUrl: 'https://app.renace.tech', aliases: ['odoo', 'renace', 'principal', 'renacetech'] },
  { slug: 'odoo', publicUrl: 'https://odoo.renace.tech', aliases: ['principal'] },
  { slug: 'thiagosmart', publicUrl: 'https://thiagosmart.renace.tech' },
  { slug: 'dyfsmart', publicUrl: 'https://dyfsmart.renace.tech' },
  { slug: 'soriinails', publicUrl: 'https://soriinails.renace.tech' },
  { slug: 'delkilo', publicUrl: 'https://delkilo.renace.tech' },
  { slug: 'thiago', publicUrl: 'https://thiago.renace.tech' },
  { slug: 'lakersdisco', publicUrl: 'https://lakersdisco.renace.tech' },
  { slug: 'alcaduarte', publicUrl: 'https://alcaduarte.renace.tech' },
  { slug: 'metro', publicUrl: 'https://metro.renace.tech' },
  { slug: 'hansel', publicUrl: 'https://hansel.renace.tech' },
  { slug: 'henryh', publicUrl: 'https://henryh.renace.tech' },
  { slug: 'ceramicajc', publicUrl: 'https://ceramicajc.renace.tech' },
  { slug: 'clb', publicUrl: 'https://clb.renace.tech' },
  { slug: 'delkilofood', publicUrl: 'https://delkilofood.renace.tech' },
  { slug: 'calpad', publicUrl: 'https://calpad.renace.tech' },
  { slug: 'rey', publicUrl: 'https://rey.renace.tech' },
  { slug: 'sp', publicUrl: 'https://sp.renace.tech' },
  { slug: 'guerrero', publicUrl: 'https://guerrero.renace.tech' },
  { slug: 'universal', publicUrl: 'https://universal.renace.tech' },
  { slug: 'manuelhookah', publicUrl: 'https://manuelhookah.renace.tech' },
  { slug: 'nominarf', publicUrl: 'https://nominarf.renace.tech' },
  { slug: 'reyplaza', publicUrl: 'https://reyplaza.renace.tech' },
  { slug: 'cacorojo', publicUrl: 'https://cacorojo.renace.tech' },
  { slug: 'cueromacho', publicUrl: 'https://cueromacho.renace.tech' },
  { slug: 'launi', publicUrl: 'https://launi.renace.tech' },
  { slug: 'naje', publicUrl: 'https://naje.renace.tech' },
  { slug: 'lagrasa', publicUrl: 'https://lagrasa.renace.tech' },
  { slug: 'ronuimport', publicUrl: 'https://ronuimport.renace.tech' },
  { slug: 'magile', publicUrl: 'https://magile.renace.tech' },
  { slug: 'camuflaje', publicUrl: 'https://camuflaje.renace.tech' },
  { slug: 'tarjetaroja', publicUrl: 'https://tarjetaroja.renace.tech' },
  { slug: 'heredia', publicUrl: 'https://heredia.renace.tech' },
  { slug: 'pim', publicUrl: 'https://pim.renace.tech' },
  { slug: 'easymovil', publicUrl: 'https://easymovil.renace.tech' },
  { slug: 'disttineo', publicUrl: 'https://disttineo.renace.tech' },
  { slug: 'yeurismart', publicUrl: 'https://yeurismart.renace.tech' },
  { slug: 'fullbloke', publicUrl: 'https://fullbloke.renace.tech' },
  { slug: 'limytech', publicUrl: 'https://limytech.renace.tech' },
  { slug: 'mojo', publicUrl: 'https://mojo.renace.tech', aliases: ['mojofashion', 'fashion'] },
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
  if (code && /^[a-z0-9-]{2,40}$/.test(code) && code !== 'app' && code !== 'odoo') {
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
  if (m && m[1] && m[1] !== 'www') return m[1].toLowerCase();
  return null;
}

function normalizeRnvItem(item = {}) {
  const client_name = String(item.client_name || item.name || item.label || '').trim();
  const odoo_url = String(item.odoo_url || item.url || item.internal_url || item.internalUrl || '').trim();
  const public_url = String(
    item.public_url || item.publicUrl || item.domain || item.external_url || item.externalUrl || ''
  ).trim();
  const odoo_db = String(item.odoo_db || item.db || item.database || 'db').trim();
  let service_code = String(item.service_code || item.serviceCode || item.code || item.slug || '').trim().toLowerCase();
  const active = item.active !== undefined ? !!item.active : true;

  const base = { public_url, odoo_url, service_code, client_name };
  const resolvedPublic = resolvePublicUrlForInstance(base);
  if (!service_code) service_code = resolveServiceCodeForInstance({ ...base, public_url: resolvedPublic }) || '';

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
  resolvePublicUrlForInstance,
  resolveServiceCodeForInstance,
  matchCatalogEntry,
  normalizeRnvItem,
  looksLikePublicHttps,
};
