/* ═══════════════════════════════════════════════════════════════
   RENACE.TECH — Immersive UX Layer
   12 features for a more engaging user experience
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 1. DOWNLOAD PROGRESS BAR ─────────────────────────────── */
  function initDownloadProgress() {
    function createProgressUI(filename) {
      const existing = document.getElementById('dl-progress-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'dl-progress-toast';
      toast.className = 'dl-toast';
      toast.innerHTML = `
        <div class="dl-toast-header">
          <i class="fas fa-download dl-toast-icon"></i>
          <span class="dl-toast-name">${filename}</span>
          <span class="dl-toast-pct">0%</span>
        </div>
        <div class="dl-toast-track"><div class="dl-toast-bar" style="width:0%"></div></div>
        <div class="dl-toast-status">Iniciando descarga…</div>
      `;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('visible'));
      return toast;
    }

    function removeProgressUI(toast, success) {
      const status = toast.querySelector('.dl-toast-status');
      const icon = toast.querySelector('.dl-toast-icon');
      if (success) {
        status.textContent = 'Descarga completada';
        icon.className = 'fas fa-check dl-toast-icon success';
        toast.classList.add('done');
      } else {
        status.textContent = 'Error en la descarga';
        icon.className = 'fas fa-times dl-toast-icon error';
      }
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
      }, 2200);
    }

    document.addEventListener('click', async (e) => {
      const link = e.target.closest('a.document-item[download], a.document-item[href*="/download"]');
      if (!link) return;

      const href = link.href;
      if (!href || href.startsWith('blob:')) return;

      e.preventDefault();
      const filename = link.querySelector('.document-name')?.textContent?.trim() || 'archivo';
      const toast = createProgressUI(filename);
      const bar = toast.querySelector('.dl-toast-bar');
      const pct = toast.querySelector('.dl-toast-pct');
      const status = toast.querySelector('.dl-toast-status');

      try {
        const res = await fetch(href);
        if (!res.ok) throw new Error('Error en la descarga');
        const total = parseInt(res.headers.get('content-length') || '0', 10);
        const reader = res.body.getReader();
        const chunks = [];
        let loaded = 0;

        status.textContent = 'Descargando…';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          const progress = total ? Math.round((loaded / total) * 100) : null;
          if (progress !== null) {
            bar.style.width = progress + '%';
            pct.textContent = progress + '%';
          } else {
            const kb = Math.round(loaded / 1024);
            pct.textContent = kb + ' KB';
            bar.style.width = '60%';
            bar.classList.add('indeterminate');
          }
        }

        bar.style.width = '100%';
        pct.textContent = '100%';

        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        removeProgressUI(toast, true);
      } catch (err) {
        removeProgressUI(toast, false);
      }
    });
  }

  /* ─── 2. SCROLL PROGRESS BAR ───────────────────────────────── */
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'scroll-progress-bar';
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = Math.min(progress, 100) + '%';
    }, { passive: true });
  }

  /* ─── 3. SECTION REVEAL ANIMATIONS ─────────────────────────── */
  function initRevealAnimations() {
    const targets = document.querySelectorAll(
      '.pricing-card, .service-card, .section-header, .contact-item, .finder-window, .custom-plan-banner'
    );
    if (!targets.length) return;

    targets.forEach(el => el.classList.add('reveal-target'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => observer.observe(el));
  }

  /* ─── 4. ACTIVE NAV SECTION HIGHLIGHT ──────────────────────── */
  function initActiveNav() {
    const sections = document.querySelectorAll('section[id], div[id="inicio"]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    if (!navLinks.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const active = link.getAttribute('href') === '#' + id;
            link.classList.toggle('nav-active', active);
          });
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  /* ─── 5. CURSOR GLOW EFFECT ─────────────────────────────────── */
  function initCursorGlow() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const glow = document.createElement('div');
    glow.id = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
    let rafId;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
      glowX = lerp(glowX, mouseX, 0.1);
      glowY = lerp(glowY, mouseY, 0.1);
      glow.style.transform = `translate(${glowX - 150}px, ${glowY - 150}px)`;
      rafId = requestAnimationFrame(animate);
    }
    animate();

    document.addEventListener('mouseleave', () => glow.style.opacity = '0');
    document.addEventListener('mouseenter', () => glow.style.opacity = '');
  }

  /* ─── 6. PRICING CARD 3D TILT ───────────────────────────────── */
  function initCardTilt() {
    const cards = document.querySelectorAll('.pricing-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
        card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ─── 7. COPY TO CLIPBOARD ──────────────────────────────────── */
  function initCopyToClipboard() {
    const targets = document.querySelectorAll(
      '.contact-info .value[href^="tel:"], .contact-info .value[href^="mailto:"], .contact-info .value:not([href])'
    );

    targets.forEach(el => {
      el.classList.add('copyable');
      el.setAttribute('title', 'Clic para copiar');
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        const text = el.textContent.trim().replace(/[\s\-]/g, match => match === ' ' ? '' : '');
        const raw = el.textContent.trim();
        try {
          await navigator.clipboard.writeText(raw);
          const orig = el.textContent;
          el.textContent = '¡Copiado!';
          el.classList.add('copied');
          setTimeout(() => { el.textContent = orig; el.classList.remove('copied'); }, 1500);
        } catch {}
      });
    });
  }

  /* ─── 8. BACK TO TOP BUTTON ─────────────────────────────────── */
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.setAttribute('aria-label', 'Volver al inicio');
    btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── 9. KEYBOARD SHORTCUTS ─────────────────────────────────── */
  function initKeyboardShortcuts() {
    const sections = {
      '1': '#inicio',
      '2': '#precios',
      '3': '#documentos',
      '4': '#contacto',
    };

    let shiftHeld = false;
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.shiftKey) shiftHeld = true;

      if (e.shiftKey && sections[e.key]) {
        e.preventDefault();
        const target = document.querySelector(sections[e.key]);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        showShortcutHint(`Ir a sección ${e.key}`);
      }
      if (e.key === '?' && !e.shiftKey) {
        showShortcutsHelp();
      }
    });
    document.addEventListener('keyup', () => { shiftHeld = false; });
  }

  function showShortcutHint(text) {
    const existing = document.getElementById('shortcut-hint');
    if (existing) existing.remove();
    const hint = document.createElement('div');
    hint.id = 'shortcut-hint';
    hint.className = 'shortcut-hint';
    hint.textContent = text;
    document.body.appendChild(hint);
    requestAnimationFrame(() => hint.classList.add('visible'));
    setTimeout(() => {
      hint.classList.remove('visible');
      setTimeout(() => hint.remove(), 300);
    }, 1500);
  }

  function showShortcutsHelp() {
    const existing = document.getElementById('shortcuts-help');
    if (existing) { existing.remove(); return; }
    const help = document.createElement('div');
    help.id = 'shortcuts-help';
    help.className = 'shortcuts-help';
    help.innerHTML = `
      <div class="shortcuts-help-header"><i class="fas fa-keyboard"></i> Atajos de teclado</div>
      <div class="shortcuts-help-list">
        <div><kbd>Shift+1</kbd> Inicio</div>
        <div><kbd>Shift+2</kbd> Precios</div>
        <div><kbd>Shift+3</kbd> Documentos</div>
        <div><kbd>Shift+4</kbd> Contacto</div>
        <div><kbd>?</kbd> Esta ayuda</div>
      </div>
    `;
    document.body.appendChild(help);
    requestAnimationFrame(() => help.classList.add('visible'));
    const close = e => { if (!help.contains(e.target)) { help.remove(); document.removeEventListener('click', close); } };
    setTimeout(() => document.addEventListener('click', close), 100);
  }

  /* ─── 10. FILE HOVER RIPPLE ─────────────────────────────────── */
  function initFileRipple() {
    document.addEventListener('click', e => {
      const item = e.target.closest('.document-item');
      if (!item) return;
      const ripple = document.createElement('span');
      ripple.className = 'file-ripple';
      const rect = item.getBoundingClientRect();
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top = (e.clientY - rect.top) + 'px';
      item.style.position = 'relative';
      item.style.overflow = 'hidden';
      item.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  /* ─── 11. ANIMATED COUNTERS ─────────────────────────────────── */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const duration = 1500;
        const start = performance.now();
        const step = ts => {
          const elapsed = ts - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target).toLocaleString('es');
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }

  /* ─── 12. TERMINAL BLINKING CURSOR ──────────────────────────── */
  function initTerminalCursor() {
    const output = document.querySelector('.terminal-output');
    if (!output) return;

    const observer = new MutationObserver(() => {
      const existing = output.querySelector('.terminal-cursor');
      if (existing) existing.remove();

      const actions = output.querySelector('.terminal-actions');
      if (!actions) return;

      const cursor = document.createElement('span');
      cursor.className = 'terminal-cursor';
      cursor.textContent = '█';
      const lastLine = output.querySelector('.output-line:last-of-type');
      if (lastLine) lastLine.appendChild(cursor);
    });

    observer.observe(output, { childList: true, subtree: false });
  }

  /* ─── INIT ALL ───────────────────────────────────────────────── */
  function init() {
    initScrollProgress();
    initRevealAnimations();
    initActiveNav();
    initCursorGlow();
    initCardTilt();
    initCopyToClipboard();
    initBackToTop();
    initKeyboardShortcuts();
    initFileRipple();
    initCounters();
    initTerminalCursor();
    initDownloadProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
