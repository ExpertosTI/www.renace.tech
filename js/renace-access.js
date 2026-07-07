/* ============================================================
   RENACE.TECH — Secure gate (konami-style + terminal PIN)
   Escribe "renacenet" en cualquier página pública → terminal
   PIN validado en servidor → /admin-dashboard.html
   ============================================================ */
(function () {
  'use strict';

  var SEQUENCE = 'renacenet';
  var TARGET = '/admin-dashboard.html';
  var MAX_ATTEMPTS = 5;

  var buffer = '';
  var overlay = null;
  var attempts = 0;
  var lastFocus = null;
  var bootDone = false;

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
           el.isContentEditable === true;
  }

  document.addEventListener('keydown', function (e) {
    if (overlay) return;
    if (e.metaKey || e.ctrlKey || e.altKey) { buffer = ''; return; }
    if (isTypingTarget(e.target)) return;

    var k = e.key;
    if (k && k.length === 1 && /[a-zA-Z]/.test(k)) {
      buffer = (buffer + k.toLowerCase()).slice(-SEQUENCE.length);
      if (buffer === SEQUENCE) {
        buffer = '';
        openTerminal();
      }
    } else if (k !== 'Shift' && k !== 'CapsLock') {
      buffer = '';
    }
  });

  function injectStyles() {
    if (document.getElementById('rn-access-style')) return;
    var css = [
      "@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');",
      '.rn-gate-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;',
      'background:radial-gradient(ellipse at 50% 0%,rgba(34,197,94,.08),transparent 55%),#020617;',
      'font-family:"JetBrains Mono",ui-monospace,monospace;animation:rn-gate-in .25s ease}',
      '.rn-gate-overlay::before{content:"";position:absolute;inset:0;pointer-events:none;',
      'background:repeating-linear-gradient(0deg,rgba(0,0,0,.12) 0,rgba(0,0,0,.12) 1px,transparent 1px,transparent 3px);opacity:.35}',
      '.rn-gate-shell{position:relative;width:100%;max-width:520px;border-radius:4px;overflow:hidden;',
      'border:1px solid rgba(34,197,94,.35);box-shadow:0 0 40px rgba(34,197,94,.12),0 24px 80px rgba(0,0,0,.85)}',
      '.rn-gate-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#0f172a;border-bottom:1px solid rgba(34,197,94,.2)}',
      '.rn-gate-dot{width:10px;height:10px;border-radius:50%}.rn-gate-dot.r{background:#ef4444}.rn-gate-dot.y{background:#eab308}.rn-gate-dot.g{background:#22c55e}',
      '.rn-gate-bar-title{flex:1;text-align:center;font-size:11px;letter-spacing:.14em;color:#64748b;text-transform:uppercase}',
      '.rn-gate-body{padding:22px 20px 18px;background:rgba(2,6,23,.96);min-height:220px;color:#86efac}',
      '.rn-gate-log{font-size:12px;line-height:1.65;color:#4ade80;margin:0 0 14px;white-space:pre-wrap;min-height:88px}',
      '.rn-gate-log .dim{color:#166534}.rn-gate-log .hi{color:#bbf7d0}',
      '.rn-gate-prompt{display:flex;align-items:center;gap:8px;margin-top:6px}',
      '.rn-gate-prefix{color:#22c55e;font-size:13px;white-space:nowrap}',
      '.rn-gate-input{flex:1;background:transparent;border:none;outline:none;color:#ecfccb;font-size:13px;',
      'letter-spacing:.22em;font-family:inherit;caret-color:#22c55e}',
      '.rn-gate-input.err{color:#fca5a5}',
      '.rn-gate-msg{min-height:18px;font-size:11px;margin-top:10px;color:#f87171}',
      '.rn-gate-msg.ok{color:#4ade80}',
      '.rn-gate-footer{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;',
      'border-top:1px solid rgba(34,197,94,.15);font-size:10px;color:#334155;letter-spacing:.08em}',
      '.rn-gate-footer kbd{padding:2px 6px;border-radius:3px;border:1px solid #1e293b;background:#0f172a;color:#64748b}',
      '.rn-gate-shell.rn-shake{animation:rn-gate-shake .42s}',
      '@keyframes rn-gate-in{from{opacity:0}to{opacity:1}}',
      '@keyframes rn-gate-shake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(4px)}50%{transform:translateX(-6px)}}',
      '@media (prefers-reduced-motion:reduce){.rn-gate-overlay,.rn-gate-shell.rn-shake{animation:none}}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'rn-access-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function typeBoot(logEl, onDone) {
    var lines = [
      { t: 'RENACE://SECURE_GATE v3.0', cls: 'hi' },
      { t: 'handshake... OK', cls: 'dim' },
      { t: 'tunnel encrypted [AES-256-GCM]', cls: 'dim' },
      { t: 'identity required — enter access key', cls: '' }
    ];
    var html = '';
    var li = 0;

    function nextLine() {
      if (li >= lines.length) {
        bootDone = true;
        if (onDone) onDone();
        return;
      }
      var line = lines[li++];
      var i = 0;
      var span = document.createElement('div');
      span.className = line.cls;
      logEl.appendChild(span);

      function tick() {
        if (i <= line.t.length) {
          span.textContent = line.t.slice(0, i);
          i++;
          setTimeout(tick, i === 1 ? 80 : 18);
        } else {
          setTimeout(nextLine, 120);
        }
      }
      tick();
    }
    nextLine();
  }

  function openTerminal() {
    injectStyles();
    attempts = 0;
    bootDone = false;
    lastFocus = document.activeElement;

    overlay = document.createElement('div');
    overlay.className = 'rn-gate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'RENACE secure gate');

    overlay.innerHTML =
      '<div class="rn-gate-shell">' +
        '<div class="rn-gate-bar">' +
          '<span class="rn-gate-dot r"></span><span class="rn-gate-dot y"></span><span class="rn-gate-dot g"></span>' +
          '<span class="rn-gate-bar-title">renace.tech — classified</span>' +
        '</div>' +
        '<div class="rn-gate-body">' +
          '<div class="rn-gate-log" id="rn-gate-log" aria-live="polite"></div>' +
          '<div class="rn-gate-prompt">' +
            '<span class="rn-gate-prefix">root@renace:~$</span>' +
            '<input class="rn-gate-input" type="password" inputmode="numeric" autocomplete="off" ' +
              'maxlength="32" aria-label="Access key" placeholder="" spellcheck="false">' +
          '</div>' +
          '<div class="rn-gate-msg" role="alert" aria-live="assertive"></div>' +
          '<div class="rn-gate-footer">' +
            '<span>seq: <kbd>renacenet</kbd></span>' +
            '<span><kbd>ENTER</kbd> auth · <kbd>ESC</kbd> abort</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    var shell = overlay.querySelector('.rn-gate-shell');
    var logEl = overlay.querySelector('#rn-gate-log');
    var input = overlay.querySelector('.rn-gate-input');
    var msg = overlay.querySelector('.rn-gate-msg');

    typeBoot(logEl, function () { input.focus(); });

    function deny(text) {
      attempts++;
      input.classList.add('err');
      shell.classList.remove('rn-shake');
      void shell.offsetWidth;
      shell.classList.add('rn-shake');
      if (attempts >= MAX_ATTEMPTS) {
        msg.textContent = '>> ACCESS DENIED — session locked';
        input.disabled = true;
        setTimeout(closeTerminal, 1100);
        return;
      }
      msg.className = 'rn-gate-msg';
      msg.textContent = text || ('>> invalid key [' + attempts + '/' + MAX_ATTEMPTS + ']');
      input.value = '';
      input.focus();
    }

    function submit() {
      if (!bootDone) return;
      var pin = input.value.trim();
      if (!pin) return;

      msg.className = 'rn-gate-msg';
      msg.textContent = '>> verifying...';
      input.disabled = true;

      fetch('/api/admin/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data && result.data.ok) {
            msg.className = 'rn-gate-msg ok';
            msg.textContent = '>> ACCESS GRANTED — routing to command center...';
            input.classList.remove('err');
            setTimeout(function () {
              window.location.href = result.data.redirect || TARGET;
            }, 520);
            return;
          }
          input.disabled = false;
          deny('>> authentication failed');
        })
        .catch(function () {
          input.disabled = false;
          deny('>> gate unreachable');
        });
    }

    input.addEventListener('input', function () {
      input.classList.remove('err');
      if (!msg.classList.contains('ok')) msg.textContent = '';
    });

    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeTerminal(); }
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeTerminal();
    });
  }

  function closeTerminal() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
})();
