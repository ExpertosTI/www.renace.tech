'use strict';

/**
 * Chrome Windows limpio:
 * - Franja superior con espacio para clics (no tapa menús Odoo)
 * - Controles a la izquierda + zoom
 * - Arrastre solo en la franja, no sobre la navbar
 */
module.exports = function winFrameScript() {
  return `(() => {
    const TOP = 40;       /* altura franja / safe area */
    const CHROME_W = 240; /* botones izq + zoom */
    const cssText = \`
      :root { --renace-top: \${TOP}px; --renace-chrome-w: \${CHROME_W}px; }

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
        font-size:13px;line-height:var(--renace-top);cursor:pointer;padding:0;
        -webkit-app-region:no-drag;
      }
      #renace-win-chrome button.renace-zoom-btn{
        font-size:12px;font-weight:600;letter-spacing:-0.02em;width:46px;
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

      /* Empujar TODO el UI de Odoo debajo de la franja — clics arriba funcionan */
      html.renace-win-pad,
      html.renace-win-pad body{
        box-sizing:border-box !important;
      }
      html.renace-win-pad body{
        padding-top:var(--renace-top) !important;
      }
      html.renace-win-pad .o_web_client,
      html.renace-win-pad .o_action_manager,
      html.renace-win-pad .o_main_navbar,
      html.renace-win-pad .o_home_menu,
      html.renace-win-pad .o_pos,
      html.renace-win-pad .pos,
      html.renace-win-pad .o_pos_kanban{
        /* navbar ya no queda bajo el drag */
      }
      html.renace-win-pad .o_main_navbar{
        padding-left:12px !important;
        top:var(--renace-top) !important;
      }
      /* Login / setup locales */
      html.renace-win-pad .oe_login_form,
      html.renace-win-pad .o_database_form{
        margin-top:8px;
      }
    \`;
    document.documentElement.classList.add('renace-win-pad');

    let css = document.getElementById('renace-win-chrome-style');
    if (!css) {
      css = document.createElement('style');
      css.id = 'renace-win-chrome-style';
      document.documentElement.appendChild(css);
    }
    css.textContent = cssText;

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
  })();`;
};
