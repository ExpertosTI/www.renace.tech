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
      document.querySelector('.pos, .o_pos, .point-of-sale') ||
      /\/pos\b|action=pos|point_of_sale/i.test(location.href + location.hash)
    );
  }

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
  };
})();
