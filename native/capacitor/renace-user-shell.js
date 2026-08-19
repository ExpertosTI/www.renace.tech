/* Modo Usuario + atajos estilo Eleventa para Odoo POS */
(function renaceUserShell() {
  var cfg = window.__renaceShellCfg || {};
  var defaults = {
    enabled: true,
    profile: 'eleventa',
    sales: 'F1',
    pay: 'F12',
    payPrint: 'F1',
    payNoPrint: 'F2',
    cancel: 'Escape',
    priceCheck: 'F9',
    wholesale: 'F11',
  };

  if (window.__renaceUserShell) {
    if (window.renaceShell) {
      window.renaceShell.setMode(cfg.mode === 'admin' ? 'admin' : 'user');
      window.renaceShell.setKeymap(Object.assign({}, defaults, cfg.keymap || {}));
    }
    return;
  }
  window.__renaceUserShell = true;

  var mode = cfg.mode === 'admin' ? 'admin' : 'user';
  var keys = Object.assign({}, defaults, cfg.keymap || {});

  function isUser() { return mode === 'user'; }

  function isPos() {
    return !!(
      document.querySelector('.pos, .o_pos, .point-of-sale, .pos-content, .pos-topheader, #pos') ||
      /\/pos\b|action=pos|point_of_sale|model=pos\./i.test(location.href + location.hash)
    );
  }

  function ensurePosReloadButton() {
    var inPos = isPos();
    var btn = document.getElementById('renace-pos-reload-btn');

    if (!inPos) {
      if (btn) btn.style.display = 'none';
      return;
    }

    if (btn) {
      btn.style.display = 'flex';
      return;
    }

    if (!document.getElementById('renace-pos-reload-style')) {
      var style = document.createElement('style');
      style.id = 'renace-pos-reload-style';
      style.textContent = [
        '#renace-pos-reload-btn {',
        '  position: fixed;',
        '  top: 10px;',
        '  right: 14px;',
        '  z-index: 2147483647;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  gap: 6px;',
        '  padding: 6px 14px;',
        '  height: 38px;',
        '  background: rgba(15, 23, 42, 0.88);',
        '  backdrop-filter: blur(8px);',
        '  -webkit-backdrop-filter: blur(8px);',
        '  color: #ffffff;',
        '  border: 1px solid rgba(255, 255, 255, 0.3);',
        '  border-radius: 20px;',
        '  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
        '  font-size: 13px;',
        '  font-weight: 600;',
        '  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);',
        '  cursor: pointer;',
        '  user-select: none;',
        '  -webkit-user-select: none;',
        '  touch-action: none;',
        '  transition: transform 0.12s ease, background 0.2s ease;',
        '}',
        '#renace-pos-reload-btn:active {',
        '  transform: scale(0.93);',
        '  background: rgba(30, 41, 59, 0.95);',
        '}',
        '#renace-pos-reload-btn .renace-icon {',
        '  display: inline-block;',
        '  font-size: 15px;',
        '  line-height: 1;',
        '}',
        '#renace-pos-reload-btn.spinning .renace-icon {',
        '  animation: renace-spin-anim 0.8s linear infinite;',
        '}',
        '@keyframes renace-spin-anim {',
        '  0% { transform: rotate(0deg); }',
        '  100% { transform: rotate(360deg); }',
        '}'
      ].join('\n');
      (document.head || document.documentElement).appendChild(style);
    }

    btn = document.createElement('button');
    btn.id = 'renace-pos-reload-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Actualizar POS');
    btn.innerHTML = '<span class="renace-icon">↻</span><span>Actualizar</span>';

    var isDragging = false;
    btn.addEventListener('click', function (e) {
      if (isDragging) return;
      btn.classList.add('spinning');
      if (window.renaceDesktop && typeof window.renaceDesktop.reload === 'function') {
        window.renaceDesktop.reload();
      } else if (window.renaceDesktop && typeof window.renaceDesktop.winReload === 'function') {
        window.renaceDesktop.winReload();
      } else {
        window.location.reload();
      }
    });

    var startX = 0, startY = 0, origX = 0, origY = 0, moved = false;
    btn.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      var touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      var rect = btn.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      moved = false;
    }, { passive: true });

    btn.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 1) return;
      var touch = e.touches[0];
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        moved = true;
        isDragging = true;
        btn.style.left = (origX + dx) + 'px';
        btn.style.top = (origY + dy) + 'px';
        btn.style.right = 'auto';
      }
    }, { passive: true });

    btn.addEventListener('touchend', function () {
      if (moved) {
        setTimeout(function () { isDragging = false; }, 120);
      }
    });

    (document.body || document.documentElement).appendChild(btn);
  }

  // Inicialización y verificación continua del botón Actualizar en POS
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePosReloadButton);
  } else {
    ensurePosReloadButton();
  }
  window.addEventListener('load', ensurePosReloadButton);
  window.addEventListener('hashchange', ensurePosReloadButton);
  window.addEventListener('popstate', ensurePosReloadButton);
  setInterval(ensurePosReloadButton, 1000);

  function isPaymentScreen() {
    return !!(
      document.querySelector('.payment-screen, .pos-payment-screen, .payment-methods-container') ||
      document.querySelector('.paymentlines, .payment-numpad')
    );
  }

  function clickByText(patterns) {
    var nodes = document.querySelectorAll(
      'button, .button, .control-button, .o_key, .btn, a.button, .payment-method-list .button'
    );
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].innerText || nodes[i].textContent || '').replace(/\s+/g, ' ').trim();
      for (var j = 0; j < patterns.length; j++) {
        if (patterns[j].test(t)) {
          nodes[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function clickSelector(list) {
    for (var i = 0; i < list.length; i++) {
      var el = document.querySelector(list[i]);
      if (el) { el.click(); return true; }
    }
    return false;
  }

  function doPay() {
    return (
      clickSelector(['.pay-order-button', '.button.pay', '.actionpad .button.pay']) ||
      clickByText([/^pagar$/i, /^payment$/i, /^cobrar$/i, /pago/i])
    );
  }

  function doValidate() {
    return (
      clickSelector([
        '.next',
        '.button.next',
        '.validation-button',
        '.payment-screen .button.next',
        '.btn-primary.o_sale_order',
      ]) ||
      clickByText([/^validar$/i, /^validate$/i, /^ordenar$/i, /^order$/i, /cobrar e imprim/i])
    );
  }

  function doBackCancel() {
    return (
      clickSelector(['.button.back', '.payment-screen .back', '.discard']) ||
      clickByText([/^atr[aá]s$/i, /^back$/i, /^cancelar$/i, /^cancel$/i])
    );
  }

  function codeOf(e) {
    return e.key || e.code || '';
  }

  function matchBinding(e, name) {
    var want = String(keys[name] || '');
    if (!want) return false;
    var k = codeOf(e);
    if (want === 'Escape') return k === 'Escape' || k === 'Esc';
    if (want === '=') return k === '=' || k === 'Equal';
    return k === want || k === 'Key' + want;
  }

  // Modo usuario: bloquear menú contextual de “atrás/recargar” del sistema web
  document.addEventListener('contextmenu', function (e) {
    if (isUser()) e.preventDefault();
  }, true);

  // Atajos Eleventa → Odoo POS
  window.addEventListener('keydown', function (e) {
    if (!keys.enabled) return;
    if (!isPos() && !matchBinding(e, 'sales')) return;

    // En pantalla de cobro: F1 imprimir/cobrar, F2 sin imprimir, ESC cancelar
    if (isPaymentScreen()) {
      if (matchBinding(e, 'payPrint') || (matchBinding(e, 'sales') && isPaymentScreen())) {
        e.preventDefault();
        e.stopPropagation();
        doValidate();
        return;
      }
      if (matchBinding(e, 'payNoPrint')) {
        e.preventDefault();
        e.stopPropagation();
        // Odoo suele imprimir al validar; intentamos validar igual (sin print dedicado en CE)
        doValidate();
        return;
      }
      if (matchBinding(e, 'cancel')) {
        e.preventDefault();
        e.stopPropagation();
        doBackCancel();
        return;
      }
    }

    if (matchBinding(e, 'pay')) {
      e.preventDefault();
      e.stopPropagation();
      doPay();
      return;
    }

    if (matchBinding(e, 'sales') && !isPaymentScreen()) {
      // En POS ya estamos en ventas; enfocar input de búsqueda/barcode
      e.preventDefault();
      var inp = document.querySelector(
        '.search-bar input, .pos .searchbox input, input[placeholder*="buscar" i], input[placeholder*="search" i], .product-screen input'
      );
      if (inp) inp.focus();
      return;
    }

    if (matchBinding(e, 'cancel') && isPaymentScreen()) {
      e.preventDefault();
      doBackCancel();
    }
  }, true);

  // Exponer para nativo / debug
  window.renaceShell = {
    getMode: function () { return mode; },
    setMode: function (m) { mode = m === 'admin' ? 'admin' : 'user'; },
    setKeymap: function (k) { keys = Object.assign({}, defaults, k || {}); },
    getKeymap: function () { return Object.assign({}, keys); },
    isUser: isUser,
    isPos: isPos,
    ensurePosReloadButton: ensurePosReloadButton,
  };
})();
