/* Inyectado en Odoo: logo/cookie cids — NO fuerza cambio de empresa ni recargas */
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

  function setCidsCookieSoft(companyId) {
    if (!companyId) return;
    // Solo si no hay cids aún — no pisar la empresa activa del usuario
    try {
      if (/(?:^|;\s*)cids=/.test(document.cookie || '')) return;
    } catch (_) {}
    var maxAge = 60 * 60 * 24 * 365;
    document.cookie = 'cids=' + encodeURIComponent(String(companyId)) + ';path=/;max-age=' + maxAge + ';SameSite=Lax';
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

  function softTouch() {
    var c = cfg();
    if (!c || !c.url) return;
    try {
      if (location.origin !== new URL(c.url).origin) return;
    } catch (_) { return; }

    var path = location.pathname || '';
    var onLogin = /\/web\/login/i.test(path) || !!document.querySelector('.oe_login_form, form[action*="web/login"]');
    if (onLogin && c.companyId) {
      setCidsCookieSoft(c.companyId);
      applyLoginLogo(c.companyId);
    }
    // En /web u otras pantallas: NO location.replace, NO RPC de forzar empresa,
    // NO setInstance desde la página — respeta sesión y empresa activa de Odoo.
  }

  function boot() {
    softTouch();
    try {
      var obs = new MutationObserver(function () {
        var c = cfg();
        var path = location.pathname || '';
        if (c && c.companyId && /\/web\/login/i.test(path)) applyLoginLogo(c.companyId);
      });
      if (document.documentElement) {
        obs.observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
