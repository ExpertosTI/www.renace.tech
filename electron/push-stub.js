/* Injected into page main world — must stay free of require()/Node APIs */
(function renacePushStub() {
  if (window.__renacePushStub) return;
  window.__renacePushStub = true;

  function noop() {}

  function fakePermissionStatus(state, name) {
    return {
      state: state || 'denied',
      name: name || 'notifications',
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: function () { return false; },
    };
  }

  var fakeReg = {
    scope: '/',
    active: null,
    installing: null,
    waiting: null,
    pushManager: {
      getSubscription: function () { return Promise.resolve(null); },
      permissionState: function () { return Promise.resolve('denied'); },
      subscribe: function () {
        return Promise.reject(new DOMException('Push disabled in RENACE Portal', 'NotAllowedError'));
      },
    },
    unregister: function () { return Promise.resolve(true); },
    update: function () { return Promise.resolve(undefined); },
    addEventListener: noop,
    removeEventListener: noop,
  };

  var fakeSW = {
    controller: null,
    ready: Promise.resolve(fakeReg),
    register: function () { return Promise.resolve(fakeReg); },
    getRegistration: function () { return Promise.resolve(undefined); },
    getRegistrations: function () { return Promise.resolve([]); },
    addEventListener: noop,
    removeEventListener: noop,
    startMessages: noop,
  };

  try {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      get: function () { return fakeSW; },
    });
  } catch (_) {
    try { navigator.serviceWorker = fakeSW; } catch (__) {}
  }

  // No reemplazar Notification entero (rompe Odoo). Solo denegar permiso.
  try {
    if (window.Notification) {
      try {
        Object.defineProperty(window.Notification, 'permission', {
          configurable: true,
          get: function () { return 'denied'; },
        });
      } catch (_) {
        try { window.Notification.permission = 'denied'; } catch (__) {}
      }
      window.Notification.requestPermission = function () {
        return Promise.resolve('denied');
      };
    }
  } catch (_) {}

  // CRÍTICO: Odoo llama permission.addEventListener — el stub debe ser EventTarget-like
  try {
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      var origQuery = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = function (desc) {
        var name = desc && desc.name;
        if (name === 'notifications' || name === 'push' || name === 'push-messaging') {
          return Promise.resolve(fakePermissionStatus('denied', name));
        }
        return origQuery(desc).catch(function () {
          return fakePermissionStatus('prompt', name);
        });
      };
    } else if (navigator.permissions) {
      navigator.permissions.query = function (desc) {
        return Promise.resolve(fakePermissionStatus('denied', desc && desc.name));
      };
    }
  } catch (_) {}

  function scrubToasts(root) {
    try {
      var nodes = (root || document).querySelectorAll(
        '.o_notification, .o_notification_manager .o_notification, .modal-backdrop, .o_dialog_container .modal'
      );
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var t = (el.textContent || '').toLowerCase();
        if (
          t.indexOf('push') !== -1 ||
          t.indexOf('notificacion') !== -1 ||
          t.indexOf('notificación') !== -1 ||
          el.classList.contains('modal-backdrop')
        ) {
          el.remove();
        }
      }
      if (document.body && document.body.classList.contains('modal-open')) {
        // solo limpiar si no hay modal visible real
        if (!document.querySelector('.modal.show, .o_dialog')) {
          document.body.classList.remove('modal-open');
          document.body.style.position = '';
          document.body.style.overflow = '';
        }
      }
    } catch (_) {}
  }

  try {
    var obs = new MutationObserver(function () { scrubToasts(document); });
    var start = function () {
      if (!document.documentElement) return;
      obs.observe(document.documentElement, { childList: true, subtree: true });
      scrubToasts(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
    setInterval(function () { scrubToasts(document); }, 2000);
  } catch (_) {}
})();
