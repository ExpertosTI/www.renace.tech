/* Inyectado en Odoo: fuerza empresa configurada + logo (multiempresa) */
(function renaceCompanyFocus() {
  if (window.__renaceCompanyFocusBoot) return;
  window.__renaceCompanyFocusBoot = true;

  function cfg() {
    return window.__renaceCompanyCfg || null;
  }

  function originOf() {
    try { return location.origin; } catch (_) { return ''; }
  }

  function logoUrl(companyId) {
    var c = cfg();
    var id = companyId || (c && c.companyId);
    if (!id) return '';
    return originOf() + '/web/image/res.company/' + id + '/logo';
  }

  function setCidsCookie(companyId) {
    if (!companyId) return;
    var maxAge = 60 * 60 * 24 * 365;
    document.cookie = 'cids=' + encodeURIComponent(String(companyId)) + ';path=/;max-age=' + maxAge + ';SameSite=None;Secure';
  }

  function normalizeName(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function namesMatch(a, b) {
    var na = normalizeName(a);
    var nb = normalizeName(b);
    if (!na || !nb) return false;
    return na === nb || na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1;
  }

  function parseAllowedCompanies(sessionInfo) {
    var list = [];
    var uc = sessionInfo && sessionInfo.user_companies;
    if (!uc) return list;
    var allowed = uc.allowed_companies;
    if (Array.isArray(allowed)) {
      for (var i = 0; i < allowed.length; i++) {
        var row = allowed[i];
        if (row && row.id != null) list.push({ id: Number(row.id), name: row.name || '' });
      }
      return list;
    }
    if (allowed && typeof allowed === 'object') {
      Object.keys(allowed).forEach(function (k) {
        var row = allowed[k];
        if (!row) return;
        var id = row.id != null ? Number(row.id) : Number(k);
        if (id) list.push({ id: id, name: row.name || '' });
      });
    }
    return list;
  }

  function currentCompanyId(sessionInfo) {
    var uc = sessionInfo && sessionInfo.user_companies;
    if (!uc) return null;
    if (uc.current_company != null) return Number(uc.current_company);
    if (Array.isArray(uc.allowed_companies) && uc.allowed_companies[0]) {
      return Number(uc.allowed_companies[0].id);
    }
    return null;
  }

  function pickCompany(sessionInfo, c) {
    var companies = parseAllowedCompanies(sessionInfo);
    if (!companies.length) return null;
    if (c && c.companyId) {
      var byId = companies.find(function (x) { return x.id === Number(c.companyId); });
      if (byId) return byId;
    }
    if (c && c.name) {
      var byName = companies.find(function (x) { return namesMatch(x.name, c.name); });
      if (byName) return byName;
    }
    return null;
  }

  function applyLoginLogo(companyId) {
    var url = logoUrl(companyId);
    if (!url) return;
    var imgs = document.querySelectorAll(
      '.o_login_logo img, .oe_login_logo img, form.oe_login_form img, .o_database_list img, img[src*="company_logo"], img[src*="res.company"]'
    );
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.getAttribute('data-renace-logo') === url) continue;
      img.setAttribute('data-renace-logo', url);
      img.src = url;
      img.style.objectFit = 'contain';
      img.style.maxHeight = img.style.maxHeight || '120px';
    }
    // Si el login no tiene img, inyectar una
    var form = document.querySelector('.oe_login_form, .o_database_form, form[action*="login"]');
    if (form && !document.getElementById('renace-company-logo')) {
      var wrap = document.createElement('div');
      wrap.id = 'renace-company-logo';
      wrap.style.cssText = 'text-align:center;margin:0 0 18px';
      var img2 = document.createElement('img');
      img2.src = url;
      img2.alt = (cfg() && cfg().name) || 'Empresa';
      img2.style.cssText = 'max-height:96px;max-width:220px;object-fit:contain';
      wrap.appendChild(img2);
      form.parentNode && form.parentNode.insertBefore(wrap, form);
    }
  }

  function rpcSessionInfo() {
    return fetch('/web/session/get_session_info', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: Date.now() }),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && (j.result || j); })
      .catch(function () { return null; });
  }

  function enforceCompany() {
    var c = cfg();
    if (!c || !c.url) return;
    try {
      if (location.origin !== new URL(c.url).origin) return;
    } catch (_) { return; }

    if (c.companyId) setCidsCookie(c.companyId);

    var path = location.pathname || '';
    var onLogin = /\/web\/login/i.test(path) || !!document.querySelector('.oe_login_form, form[action*="web/login"]');
    if (onLogin) {
      applyLoginLogo(c.companyId);
      return;
    }

    if (!/\/(web|odoo)(\/|$)/i.test(path)) return;
    if (window.__renaceCompanyEnforcing) return;
    window.__renaceCompanyEnforcing = true;

    rpcSessionInfo().then(function (info) {
      window.__renaceCompanyEnforcing = false;
      if (!info || !info.uid) return;
      var picked = pickCompany(info, c);
      if (!picked) return;

      // Persistir id descubierto por nombre
      if ((!c.companyId || Number(c.companyId) !== picked.id) && window.renaceDesktop && window.renaceDesktop.setInstance) {
        window.renaceDesktop.setInstance({
          url: c.url,
          name: c.name || picked.name,
          companyId: picked.id,
          locked: c.locked !== false,
        }).then(function () {
          window.__renaceCompanyCfg = Object.assign({}, c, { companyId: picked.id, name: c.name || picked.name });
        }).catch(function () {});
      }

      var active = currentCompanyId(info);
      if (active === picked.id) {
        applyLoginLogo(picked.id);
        return;
      }

      // Cambiar a la empresa correcta (no la primera)
      setCidsCookie(picked.id);
      var next = originOf() + '/web?cids=' + encodeURIComponent(String(picked.id));
      if (location.href.indexOf('cids=') !== -1 && Number(active) === picked.id) return;
      if (window.__renaceCompanyReloadOnce) return;
      window.__renaceCompanyReloadOnce = true;
      location.replace(next);
    });
  }

  function boot() {
    enforceCompany();
    try {
      var obs = new MutationObserver(function () {
        var c = cfg();
        if (c && c.companyId) applyLoginLogo(c.companyId);
      });
      if (document.documentElement) {
        obs.observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch (_) {}
    setInterval(enforceCompany, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
