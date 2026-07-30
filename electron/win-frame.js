'use strict';

/**
 * Barra de ventana Windows a la izquierda (no tapa Cerrar sesión de Odoo a la derecha).
 * Incluye A− / A+ para zoom en cajas sin foco en el menú.
 */
module.exports = function winFrameScript() {
  return `(() => {
    const CHROME_W = 230; /* 3×46 ventana + 2×46 zoom */
    const cssText = \`
      #renace-win-chrome{
        position:fixed;top:0;left:0;z-index:2147483646;
        display:flex;align-items:stretch;height:36px;
        font-family:Segoe UI,system-ui,sans-serif;
        -webkit-app-region:no-drag;
        pointer-events:auto;
      }
      #renace-win-chrome button{
        width:46px;border:0;background:transparent;color:#c5d0e0;
        font-size:14px;line-height:36px;cursor:pointer;padding:0;
        -webkit-app-region:no-drag;
      }
      #renace-win-chrome button.renace-zoom-btn{
        font-size:12px;font-weight:600;letter-spacing:-0.02em;width:46px;
      }
      #renace-win-chrome button:hover{background:rgba(255,255,255,.08);color:#fff}
      #renace-win-chrome button[data-act="close"]:hover{background:#e81123;color:#fff}
      #renace-win-drag{
        position:fixed;top:0;left:\${CHROME_W}px;right:0;height:36px;z-index:2147483645;
        -webkit-app-region:drag;
      }
      /* Empujar un poco la navbar Odoo para no chocar con botones izquierdos */
      .o_main_navbar{padding-left:\${CHROME_W + 10}px !important;}
    \`;
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
        '<button type="button" class="renace-zoom-btn" data-act="zoom-out" title="Zoom − (Ctrl+−)">A−</button>' +
        '<button type="button" class="renace-zoom-btn" data-act="zoom-in" title="Zoom + (Ctrl+=)">A+</button>';
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
