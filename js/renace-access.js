/* ============================================================
   RENACE.TECH — Acceso discreto al portal administrador
   Escribe "renacenet" en cualquier página pública para abrir
   el modal de PIN. PIN correcto → /admin-dashboard.html
   ============================================================ */
(function () {
  'use strict';

  var SEQUENCE = 'renacenet';
  var PIN = '101284';
  var TARGET = '/admin-dashboard.html';
  var MAX_ATTEMPTS = 5;

  var buffer = '';
  var overlay = null;
  var attempts = 0;
  var lastFocus = null;

  /* ── No capturar mientras el usuario escribe en un campo ── */
  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
           el.isContentEditable === true;
  }

  /* ── Detección de la secuencia de teclado ── */
  document.addEventListener('keydown', function (e) {
    if (overlay) return;                       // el modal gestiona sus teclas
    if (e.metaKey || e.ctrlKey || e.altKey) { buffer = ''; return; }
    if (isTypingTarget(e.target)) return;

    var k = e.key;
    if (k && k.length === 1 && /[a-zA-Z]/.test(k)) {
      buffer = (buffer + k.toLowerCase()).slice(-SEQUENCE.length);
      if (buffer === SEQUENCE) {
        buffer = '';
        openModal();
      }
    } else if (k !== 'Shift' && k !== 'CapsLock') {
      buffer = '';
    }
  });

  /* ── Estilos del modal (inyectados una sola vez) ── */
  function injectStyles() {
    if (document.getElementById('rn-access-style')) return;
    var css = [
      '.rn-access-overlay{position:fixed;inset:0;z-index:100000;display:flex;',
      'align-items:center;justify-content:center;padding:20px;',
      'background:rgba(5,9,18,.78);backdrop-filter:blur(8px);',
      '-webkit-backdrop-filter:blur(8px);animation:rn-fade .2s ease}',
      '.rn-access-card{width:100%;max-width:360px;background:rgba(15,23,42,.96);',
      'border:1px solid rgba(56,189,248,.25);border-radius:18px;padding:28px 26px;',
      'box-shadow:0 24px 60px -12px rgba(0,0,0,.7),0 0 0 1px rgba(56,189,248,.06);',
      "font-family:'Inter',system-ui,sans-serif;color:#e2e8f0;animation:rn-pop .22s cubic-bezier(.34,1.3,.64,1)}",
      '.rn-access-card.rn-shake{animation:rn-shake .4s}',
      '.rn-access-icon{width:46px;height:46px;border-radius:12px;display:flex;',
      'align-items:center;justify-content:center;margin-bottom:14px;font-size:20px;',
      'background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff}',
      '.rn-access-title{font-size:1.05rem;font-weight:700;margin:0 0 4px}',
      '.rn-access-sub{font-size:.8rem;color:#94a3b8;margin:0 0 18px;line-height:1.5}',
      '.rn-access-input{width:100%;box-sizing:border-box;padding:13px 14px;',
      'font-size:1.25rem;letter-spacing:.4em;text-align:center;color:#f8fafc;',
      'background:rgba(2,6,16,.85);border:1px solid rgba(56,189,248,.3);',
      'border-radius:11px;outline:none;transition:border-color .15s,box-shadow .15s}',
      '.rn-access-input:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.18)}',
      '.rn-access-input.rn-err{border-color:#f87171;box-shadow:0 0 0 3px rgba(248,113,113,.18)}',
      '.rn-access-msg{min-height:16px;font-size:.74rem;margin:9px 2px 0;color:#f87171}',
      '.rn-access-actions{display:flex;gap:10px;margin-top:16px}',
      '.rn-access-btn{flex:1;padding:11px 14px;border-radius:10px;font-size:.85rem;',
      'font-weight:600;cursor:pointer;border:1px solid transparent;transition:filter .15s,background .15s}',
      '.rn-access-btn.primary{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff}',
      '.rn-access-btn.primary:hover{filter:brightness(1.12)}',
      '.rn-access-btn.ghost{background:rgba(255,255,255,.04);color:#94a3b8;',
      'border-color:rgba(255,255,255,.1)}',
      '.rn-access-btn.ghost:hover{background:rgba(255,255,255,.08);color:#e2e8f0}',
      '@keyframes rn-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes rn-pop{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}',
      '@keyframes rn-shake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(5px)}',
      '50%{transform:translateX(-7px)}20%,40%,60%,80%{transform:translateX(4px)}}',
      '@media (prefers-reduced-motion:reduce){.rn-access-overlay,.rn-access-card,',
      '.rn-access-card.rn-shake{animation:none}}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'rn-access-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── Construcción y apertura del modal ── */
  function openModal() {
    injectStyles();
    attempts = 0;
    lastFocus = document.activeElement;

    overlay = document.createElement('div');
    overlay.className = 'rn-access-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Acceso al portal administrador');

    overlay.innerHTML =
      '<div class="rn-access-card">' +
        '<div class="rn-access-icon" aria-hidden="true">&#128274;</div>' +
        '<h2 class="rn-access-title">Acceso restringido</h2>' +
        '<p class="rn-access-sub">Introduce el PIN para abrir el portal administrador de RENACE.</p>' +
        '<input class="rn-access-input" type="password" inputmode="numeric" ' +
          'autocomplete="off" maxlength="10" aria-label="PIN de acceso" placeholder="••••••">' +
        '<div class="rn-access-msg" role="alert" aria-live="assertive"></div>' +
        '<div class="rn-access-actions">' +
          '<button type="button" class="rn-access-btn ghost" data-act="cancel">Cancelar</button>' +
          '<button type="button" class="rn-access-btn primary" data-act="ok">Entrar</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    var card = overlay.querySelector('.rn-access-card');
    var input = overlay.querySelector('.rn-access-input');
    var msg = overlay.querySelector('.rn-access-msg');

    setTimeout(function () { input.focus(); }, 30);

    function submit() {
      if (input.value === PIN) {
        msg.style.color = '#34d399';
        msg.textContent = 'Acceso concedido. Redirigiendo…';
        input.classList.remove('rn-err');
        overlay.querySelectorAll('.rn-access-btn').forEach(function (b) { b.disabled = true; });
        setTimeout(function () { window.location.href = TARGET; }, 450);
        return;
      }
      attempts++;
      input.classList.add('rn-err');
      card.classList.remove('rn-shake');
      void card.offsetWidth;                   // reinicia la animación
      card.classList.add('rn-shake');
      if (attempts >= MAX_ATTEMPTS) {
        msg.textContent = 'Demasiados intentos. Acceso bloqueado.';
        setTimeout(closeModal, 900);
        return;
      }
      msg.textContent = 'PIN incorrecto. Intento ' + attempts + ' de ' + MAX_ATTEMPTS + '.';
      input.value = '';
      input.focus();
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) return closeModal();
      var act = e.target.getAttribute('data-act');
      if (act === 'cancel') closeModal();
      if (act === 'ok') submit();
    });

    input.addEventListener('input', function () {
      input.classList.remove('rn-err');
      if (msg.style.color !== 'rgb(52, 211, 153)') msg.textContent = '';
    });

    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      if (e.key === 'Enter')  { e.preventDefault(); submit(); }
    });
  }

  function closeModal() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
})();
