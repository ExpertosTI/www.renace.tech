/* Notificaciones: deja que Odoo/bus funcionen; puente a aviso nativo del SO vía Electron */
(function renacePushBridge() {
  if (window.__renacePushBridge) return;
  window.__renacePushBridge = true;

  function sendNative(title, body, opts) {
    try {
      if (window.renaceDesktop && typeof window.renaceDesktop.notify === 'function') {
        window.renaceDesktop.notify({
          title: String(title || 'RENACE').slice(0, 120),
          body: String(body || '').slice(0, 500),
          silent: !!(opts && opts.silent),
        });
      }
    } catch (_) {}
  }

  // Permitir Notification del navegador + espejo nativo
  try {
    if (window.Notification) {
      var Orig = window.Notification;
      function BridgedNotification(title, options) {
        options = options || {};
        sendNative(title, options.body || '', options);
        try {
          return new Orig(title, options);
        } catch (_) {
          return { close: function () {}, onclick: null, onshow: null, onerror: null, onclose: null };
        }
      }
      BridgedNotification.permission = Orig.permission || 'default';
      BridgedNotification.requestPermission = function (cb) {
        var p = Orig.requestPermission
          ? Orig.requestPermission()
          : Promise.resolve('granted');
        return Promise.resolve(p).then(function (perm) {
          BridgedNotification.permission = perm;
          if (typeof cb === 'function') cb(perm);
          return perm;
        });
      };
      try {
        window.Notification = BridgedNotification;
      } catch (_) {}
    }
  } catch (_) {}

  // Pedir permiso una vez (silencioso si ya granted/denied)
  try {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission().catch(function () {});
    }
  } catch (_) {}

  // Observar toasts Odoo y reflejar en bandeja del SO (sin borrar el toast in-app)
  function mirrorOdooToasts(root) {
    try {
      var nodes = (root || document).querySelectorAll(
        '.o_notification:not([data-renace-notified]), .o_notification_manager .o_notification:not([data-renace-notified])'
      );
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        el.setAttribute('data-renace-notified', '1');
        var titleEl = el.querySelector('.o_notification_title, .o_notification_manager .o_notification_title');
        var bodyEl = el.querySelector('.o_notification_content, .o_notification_manager .o_notification_content, .o_notification_body');
        var title = (titleEl && titleEl.textContent) || 'Odoo';
        var body = (bodyEl && bodyEl.textContent) || (el.textContent || '').trim().slice(0, 200);
        if (body) sendNative(title.trim().slice(0, 80), body);
      }
    } catch (_) {}
  }

  try {
    var obs = new MutationObserver(function () { mirrorOdooToasts(document); });
    var start = function () {
      if (!document.documentElement) return;
      obs.observe(document.documentElement, { childList: true, subtree: true });
      mirrorOdooToasts(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  } catch (_) {}
})();
