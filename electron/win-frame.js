'use strict';

/**
 * Barra de ventana Windows a la izquierda (no tapa Cerrar sesión de Odoo a la derecha).
 */
module.exports = function winFrameScript() {
  return `(() => {
    if (document.getElementById('renace-win-chrome')) return;
    const css = document.createElement('style');
    css.id = 'renace-win-chrome-style';
    css.textContent = \`
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
      #renace-win-chrome button:hover{background:rgba(255,255,255,.08);color:#fff}
      #renace-win-chrome button[data-act="close"]:hover{background:#e81123;color:#fff}
      #renace-win-drag{
        position:fixed;top:0;left:138px;right:0;height:36px;z-index:2147483645;
        -webkit-app-region:drag;
      }
      /* Empujar un poco la navbar Odoo para no chocar con botones izquierdos */
      .o_main_navbar{padding-left:148px !important;}
    \`;
    const bar = document.createElement('div');
    bar.id = 'renace-win-chrome';
    bar.innerHTML = '<button type="button" data-act="close" title="Minimizar">✕</button>' +
      '<button type="button" data-act="min" title="Minimizar">─</button>' +
      '<button type="button" data-act="max" title="Pantalla completa">▢</button>';
    const drag = document.createElement('div');
    drag.id = 'renace-win-drag';
    document.documentElement.appendChild(css);
    document.documentElement.appendChild(bar);
    document.documentElement.appendChild(drag);
    bar.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-act]');
      if (!btn || !window.renaceDesktop) return;
      const act = btn.getAttribute('data-act');
      if (act === 'close') window.renaceDesktop.winClose?.();
      if (act === 'min') window.renaceDesktop.winMin?.();
      if (act === 'max') window.renaceDesktop.winMax?.();
    });
  })();`;
};
