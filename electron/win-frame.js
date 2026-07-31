'use strict';

/**
 * Chrome Windows limpio:
 * - Franja superior compacta (no tapa menús Odoo / logout)
 * - Controles a la izquierda + zoom
 * - Arrastre solo en la franja, no sobre la navbar
 * - Altura responsive; en POS online se relaja el padding del body
 *   para no empujar botones de pago fuera de pantalla
 */
module.exports = function winFrameScript() {
  return `(() => {
    const CHROME_W = 240; /* botones izq + zoom */
    /* Antes: TOP fijo 40px — franja demasiado alta; en 1080p+ empujaba el pago POS */
    const TOP_TALL = 26;  /* ≥1080px alto */
    const TOP_MID = 28;   /* ≥900px */
    const TOP_SHORT = 30; /* ventanas bajas — hit target usable */
    const TOP_POS = 22;   /* POS online: chrome mínimo, sin robar altura al pago */

    function isPosUi() {
      try {
        if (document.querySelector('.o_pos, .pos, .pos-content, .pos-topheader, #pos, .point-of-sale')) {
          return true;
        }
        const hay = String(location.href || '') + String(location.hash || '');
        return /\\/pos\\b|point_of_sale|action=pos|model=pos\\./i.test(hay);
      } catch (_) {
        return false;
      }
    }

    function computeTop() {
      if (isPosUi()) return TOP_POS;
      const h = window.innerHeight || 900;
      if (h >= 1080) return TOP_TALL;
      if (h >= 900) return TOP_MID;
      return TOP_SHORT;
    }

    function cssText(top, posMode) {
      const posRules = posMode
        ? \`
      /* POS online: no padding en body (eso encogía el viewport y tapaba el pago).
         El chrome flota; el root POS usa box-sizing con safe-area. */
      html.renace-win-pad.renace-pos-mode body{
        padding-top:0 !important;
      }
      html.renace-win-pad.renace-pos-mode .o_pos,
      html.renace-win-pad.renace-pos-mode .pos,
      html.renace-win-pad.renace-pos-mode .pos-content,
      html.renace-win-pad.renace-pos-mode .o_action_manager > .o_pos{
        box-sizing:border-box !important;
        padding-top:var(--renace-top) !important;
        min-height:100vh !important;
        height:100vh !important;
        max-height:100vh !important;
      }
      html.renace-win-pad.renace-pos-mode .o_main_navbar{
        display:none !important;
      }
      \`
        : \`
      html.renace-win-pad body{
        padding-top:var(--renace-top) !important;
      }
      html.renace-win-pad .o_main_navbar{
        padding-left:12px !important;
        top:var(--renace-top) !important;
      }
      \`;

      return \`
      :root { --renace-top: \${top}px; --renace-chrome-w: \${CHROME_W}px; }

      #renace-win-chrome{
        position:fixed;top:0;left:0;z-index:2147483646;
        display:flex;align-items:stretch;height:var(--renace-top);
        font-family:Segoe UI,system-ui,sans-serif;
        -webkit-app-region:no-drag;
        pointer-events:auto;
        background:linear-gradient(180deg,#0d1420 0%,rgba(10,15,26,.92) 100%);
        border-bottom:1px solid rgba(148,163,184,.08);
      }
      #renace-win-chrome button{
        width:46px;border:0;background:transparent;color:#c5d0e0;
        font-size:12px;line-height:var(--renace-top);cursor:pointer;padding:0;
        -webkit-app-region:no-drag;
      }
      #renace-win-chrome button.renace-zoom-btn{
        font-size:11px;font-weight:600;letter-spacing:-0.02em;width:46px;
      }
      #renace-win-chrome button:hover{background:rgba(255,255,255,.08);color:#fff}
      #renace-win-chrome button[data-act="close"]:hover{background:#e81123;color:#fff}

      /* Solo arrastre a la derecha de los botones, dentro de la franja */
      #renace-win-drag{
        position:fixed;top:0;left:var(--renace-chrome-w);right:0;
        height:var(--renace-top);z-index:2147483645;
        -webkit-app-region:drag;
        background:linear-gradient(180deg,#0d1420 0%,rgba(10,15,26,.92) 100%);
        border-bottom:1px solid rgba(148,163,184,.08);
      }

      html.renace-win-pad,
      html.renace-win-pad body{
        box-sizing:border-box !important;
      }
      \${posRules}
      /* Login / setup locales */
      html.renace-win-pad:not(.renace-pos-mode) .oe_login_form,
      html.renace-win-pad:not(.renace-pos-mode) .o_database_form{
        margin-top:8px;
      }
    \`;
    }

    document.documentElement.classList.add('renace-win-pad');

    let css = document.getElementById('renace-win-chrome-style');
    if (!css) {
      css = document.createElement('style');
      css.id = 'renace-win-chrome-style';
      document.documentElement.appendChild(css);
    }

    function applyTop() {
      const pos = isPosUi();
      document.documentElement.classList.toggle('renace-pos-mode', pos);
      css.textContent = cssText(computeTop(), pos);
    }
    applyTop();

    let bar = document.getElementById('renace-win-chrome');
    if (bar && !bar.querySelector('[data-act="zoom-out"]')) {
      bar.remove();
      bar = null;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'renace-win-chrome';
      bar.innerHTML =
        '<button type="button" data-act="close" title="Minimizar">✕</button>' +
        '<button type="button" data-act="min" title="Minimizar">─</button>' +
        '<button type="button" data-act="max" title="Pantalla completa">▢</button>' +
        '<button type="button" class="renace-zoom-btn" data-act="zoom-out" title="Zoom −">A−</button>' +
        '<button type="button" class="renace-zoom-btn" data-act="zoom-in" title="Zoom +">A+</button>';
      document.documentElement.appendChild(bar);
      bar.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-act]');
        if (!btn || !window.renaceDesktop) return;
        const act = btn.getAttribute('data-act');
        if (act === 'close') window.renaceDesktop.winClose?.();
        if (act === 'min') window.renaceDesktop.winMin?.();
        if (act === 'max') window.renaceDesktop.winMax?.();
        if (act === 'zoom-out') window.renaceDesktop.zoomOut?.();
        if (act === 'zoom-in') window.renaceDesktop.zoomIn?.();
      });
    }

    let drag = document.getElementById('renace-win-drag');
    if (!drag) {
      drag = document.createElement('div');
      drag.id = 'renace-win-drag';
      document.documentElement.appendChild(drag);
    }

    if (!window.__renaceWinFrameResize) {
      let t = 0;
      window.__renaceWinFrameResize = true;
      window.addEventListener('resize', () => {
        clearTimeout(t);
        t = setTimeout(applyTop, 80);
      });
    }

    /* Odoo POS es SPA: detectar entrada/salida a /pos sin recarga completa */
    if (!window.__renaceWinFramePosWatch) {
      window.__renaceWinFramePosWatch = true;
      let lastPos = isPosUi();
      const tick = () => {
        const now = isPosUi();
        if (now !== lastPos) {
          lastPos = now;
          applyTop();
        }
      };
      setInterval(tick, 1200);
      try {
        const obs = new MutationObserver(() => tick());
        if (document.documentElement) {
          obs.observe(document.documentElement, { childList: true, subtree: true });
        }
      } catch (_) {}
    }
  })();`;
};
