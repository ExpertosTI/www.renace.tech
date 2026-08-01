'use strict';

/**
 * Barra técnica in-app (fallback del menú nativo Archivo).
 * Visible en modo admin aunque la ventana sea frameless o el menú nativo falle.
 */
function techToolbarScript() {
  return `(() => {
    const ID = 'renace-tech-toolbar';
    const STYLE_ID = 'renace-tech-toolbar-style';
    try {
      if (document.getElementById(ID)) return;
      if (!window.renaceDesktop || typeof window.renaceDesktop.techAction !== 'function') return;

      let style = document.getElementById(STYLE_ID);
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.documentElement.appendChild(style);
      }
      style.textContent = \`
#\${ID}{
  position:fixed;top:0;left:0;right:0;z-index:2147483646;
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;
  padding:6px 10px;min-height:36px;box-sizing:border-box;
  font:600 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;
  color:#e8eef8;background:linear-gradient(180deg,#0f2744 0%,#0a1a2e 100%);
  border-bottom:1px solid rgba(120,170,255,.35);
  -webkit-app-region:no-drag;user-select:none;
}
#\${ID} .rtb-brand{opacity:.85;margin-right:8px;letter-spacing:.04em;text-transform:uppercase;font-size:10px}
#\${ID} button{
  appearance:none;border:1px solid rgba(150,190,255,.35);border-radius:6px;
  background:rgba(255,255,255,.08);color:#f4f8ff;padding:5px 10px;cursor:pointer;
  font:inherit;-webkit-app-region:no-drag
}
#\${ID} button:hover{background:rgba(255,255,255,.16)}
#\${ID} button.rtb-danger{border-color:rgba(255,120,120,.45);background:rgba(180,40,40,.35)}
#\${ID} button.rtb-danger:hover{background:rgba(200,50,50,.5)}
html.renace-tech-pad,html.renace-tech-pad body{scroll-padding-top:44px}
\`;

      const bar = document.createElement('div');
      bar.id = ID;
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', 'Modo técnico RENACE');
      bar.innerHTML =
        '<span class="rtb-brand">Técnico</span>' +
        '<button type="button" data-act="instance">Instancia</button>' +
        '<button type="button" data-act="personal">Personal</button>' +
        '<button type="button" data-act="updates">Updates</button>' +
        '<button type="button" data-act="user">Modo usuario</button>' +
        '<button type="button" data-act="quit" class="rtb-danger">Salir</button>';

      bar.addEventListener('click', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('button[data-act]') : null;
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        try {
          window.renaceDesktop.techAction(act);
        } catch (_) {}
      });

      document.documentElement.classList.add('renace-tech-pad');
      (document.body || document.documentElement).appendChild(bar);
    } catch (_) {}
  })()`;
}

function techToolbarRemoveScript() {
  return `(() => {
    try {
      document.getElementById('renace-tech-toolbar')?.remove();
      document.getElementById('renace-tech-toolbar-style')?.remove();
      document.documentElement.classList.remove('renace-tech-pad');
    } catch (_) {}
  })()`;
}

module.exports = { techToolbarScript, techToolbarRemoveScript };
