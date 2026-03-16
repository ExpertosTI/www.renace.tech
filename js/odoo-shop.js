/* ═══════════════════════════════════════════════════════════════
   RENACE.TECH — Odoo Shop Integration
   Futuristic product cards + cart in chat
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── Cart State ─────────────────────────────────────────────── */
  const cart = {
    items: [],  // { id, name, price, qty, image }
    add(product) {
      const existing = this.items.find(i => i.id === product.id);
      if (existing) {
        existing.qty++;
      } else {
        this.items.push({ ...product, qty: 1 });
      }
      this.emit();
    },
    remove(id) {
      this.items = this.items.filter(i => i.id !== id);
      this.emit();
    },
    updateQty(id, qty) {
      const item = this.items.find(i => i.id === id);
      if (item) {
        if (qty < 1) this.remove(id);
        else item.qty = qty;
        this.emit();
      }
    },
    clear() { this.items = []; this.emit(); },
    total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },
    count() { return this.items.reduce((s, i) => s + i.qty, 0); },
    _listeners: [],
    on(fn) { this._listeners.push(fn); },
    emit() { this._listeners.forEach(fn => fn(this)); },
  };

  window.renaceCart = cart;

  /* ─── Format price ───────────────────────────────────────────── */
  function fmt(n) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 2 }).format(n);
  }

  /* ─── Build product card HTML ────────────────────────────────── */
  function buildProductCard(p) {
    const img = p.image_128 && p.image_128 !== false
      ? `<img src="data:image/png;base64,${p.image_128}" alt="${escHtml(p.name)}" class="shop-card-img" loading="lazy">`
      : `<div class="shop-card-img-placeholder"><i class="fas fa-cube"></i></div>`;

    const desc = p.description_sale && p.description_sale !== false
      ? `<p class="shop-card-desc">${escHtml(String(p.description_sale)).substring(0, 80)}…</p>`
      : '';

    const categ = Array.isArray(p.categ_id) ? escHtml(p.categ_id[1] || '') : '';

    return `
      <div class="shop-card" data-id="${p.id}" data-name="${escHtml(p.name)}" data-price="${p.list_price}">
        <div class="shop-card-glow"></div>
        <div class="shop-card-media">${img}</div>
        <div class="shop-card-body">
          ${categ ? `<span class="shop-card-tag">${categ}</span>` : ''}
          <div class="shop-card-name">${escHtml(p.name)}</div>
          ${desc}
          <div class="shop-card-footer">
            <div class="shop-card-price">${fmt(p.list_price)}</div>
            <button class="shop-card-btn" data-id="${p.id}" data-name="${escHtml(p.name)}" data-price="${p.list_price}" data-img="${p.image_128 || ''}">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>`;
  }

  /* ─── Build products grid message HTML ──────────────────────── */
  function buildProductsGrid(products) {
    if (!products.length) {
      return `<div class="shop-empty"><i class="fas fa-box-open"></i><p>No hay productos disponibles.</p></div>`;
    }
    return `
      <div class="shop-grid-wrapper">
        <div class="shop-grid-header">
          <i class="fas fa-store"></i>
          <span>Catálogo RENACE</span>
          <span class="shop-grid-count">${products.length} productos</span>
        </div>
        <div class="shop-grid">
          ${products.map(buildProductCard).join('')}
        </div>
        <p class="shop-hint">Agrega productos al carrito para generar tu cotización ✨</p>
      </div>`;
  }

  /* ─── Build cart sidebar HTML ────────────────────────────────── */
  function buildCartHTML() {
    const items = cart.items;
    const empty = items.length === 0;
    const rows = items.map(i => `
      <div class="cart-item" data-id="${i.id}">
        ${i.image ? `<img src="data:image/png;base64,${i.image}" class="cart-item-img">` : `<div class="cart-item-img cart-item-img-placeholder"><i class="fas fa-cube"></i></div>`}
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(i.name)}</div>
          <div class="cart-item-price">${fmt(i.price)}</div>
        </div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" data-action="dec" data-id="${i.id}">−</button>
          <span>${i.qty}</span>
          <button class="cart-qty-btn" data-action="inc" data-id="${i.id}">+</button>
        </div>
        <button class="cart-remove-btn" data-id="${i.id}"><i class="fas fa-times"></i></button>
      </div>`).join('');

    return `
      <div class="cart-panel" id="rg-cart-panel">
        <div class="cart-panel-header">
          <span><i class="fas fa-shopping-cart"></i> Tu Carrito</span>
          <button class="cart-panel-close" id="cart-panel-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="cart-panel-body">
          ${empty ? `<div class="cart-empty"><i class="fas fa-cart-plus"></i><p>Tu carrito está vacío.<br>Agrega productos del catálogo.</p></div>` : rows}
        </div>
        ${!empty ? `
        <div class="cart-panel-footer">
          <div class="cart-total">Total: <strong>${fmt(cart.total())}</strong></div>
          <button class="cart-quote-btn" id="cart-quote-btn">
            <i class="fas fa-file-invoice"></i> Solicitar Cotización
          </button>
        </div>` : ''}
      </div>`;
  }

  /* ─── Build quote form HTML ──────────────────────────────────── */
  function buildQuoteForm() {
    return `
      <div class="quote-form" id="shop-quote-form">
        <div class="quote-form-header"><i class="fas fa-file-alt"></i> Datos para cotización</div>
        <input class="quote-input" type="text" id="qf-name" placeholder="Nombre completo *" required>
        <input class="quote-input" type="email" id="qf-email" placeholder="Email *" required>
        <input class="quote-input" type="tel" id="qf-phone" placeholder="Teléfono">
        <textarea class="quote-input" id="qf-msg" rows="2" placeholder="Mensaje opcional"></textarea>
        <div class="quote-form-actions">
          <button class="quote-cancel-btn" id="qf-cancel">Cancelar</button>
          <button class="quote-submit-btn" id="qf-submit">
            <i class="fas fa-paper-plane"></i> Enviar
          </button>
        </div>
      </div>`;
  }

  /* ─── Escape HTML ────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ─── Cart Badge Update ──────────────────────────────────────── */
  function updateCartBadge() {
    const badge = document.getElementById('rg-cart-badge');
    const count = cart.count();
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    if (count > 0) badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 600);
  }

  /* ─── Render cart panel ──────────────────────────────────────── */
  function renderCartPanel() {
    const existing = document.getElementById('rg-cart-panel');
    if (existing) existing.remove();

    const wrapper = document.querySelector('.rg-chat-root');
    if (!wrapper) return;

    const el = document.createElement('div');
    el.innerHTML = buildCartHTML();
    const panel = el.firstElementChild;
    wrapper.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add('open'));

    // Close
    panel.querySelector('#cart-panel-close')?.addEventListener('click', () => {
      panel.classList.remove('open');
      setTimeout(() => panel.remove(), 300);
    });

    // Qty controls & remove
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        const id = parseInt(btn.dataset.id, 10);
        const item = cart.items.find(i => i.id === id);
        if (!item) return;
        cart.updateQty(id, btn.dataset.action === 'inc' ? item.qty + 1 : item.qty - 1);
        renderCartPanel();
        return;
      }
      const rm = e.target.closest('.cart-remove-btn');
      if (rm) { cart.remove(parseInt(rm.dataset.id, 10)); renderCartPanel(); }

      const qBtn = e.target.closest('#cart-quote-btn');
      if (qBtn) {
        panel.classList.remove('open');
        setTimeout(() => { panel.remove(); showQuoteForm(); }, 300);
      }
    });
  }

  /* ─── Show quote form in chat ────────────────────────────────── */
  function showQuoteForm() {
    const messagesEl = document.getElementById('rg-chat-messages');
    if (!messagesEl) return;

    const li = document.createElement('li');
    li.className = 'rg-chat-message rg-chat-bot';
    const bubble = document.createElement('div');
    bubble.className = 'rg-chat-bubble';
    bubble.innerHTML = buildQuoteForm();
    li.appendChild(bubble);
    messagesEl.appendChild(li);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    bubble.querySelector('#qf-cancel')?.addEventListener('click', () => li.remove());
    bubble.querySelector('#qf-submit')?.addEventListener('click', () => submitQuote(bubble));
  }

  /* ─── Submit quote to backend ────────────────────────────────── */
  async function submitQuote(formEl) {
    const name = formEl.querySelector('#qf-name')?.value?.trim();
    const email = formEl.querySelector('#qf-email')?.value?.trim();
    const phone = formEl.querySelector('#qf-phone')?.value?.trim();
    const message = formEl.querySelector('#qf-msg')?.value?.trim();

    if (!name || !email) {
      const err = formEl.querySelector('.quote-form-error') || document.createElement('p');
      err.className = 'quote-form-error';
      err.textContent = 'Nombre y email son requeridos.';
      formEl.querySelector('.quote-form-actions').before(err);
      return;
    }

    const submitBtn = formEl.querySelector('#qf-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando…';

    try {
      const res = await fetch('/api/odoo/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          customer: { name, email, phone, message },
        }),
      });

      const data = await res.json();

      if (data.success) {
        formEl.closest('.rg-chat-bubble').innerHTML = `
          <div class="quote-success">
            <div class="quote-success-icon"><i class="fas fa-check-circle"></i></div>
            <div class="quote-success-title">¡Cotización creada!</div>
            <div class="quote-success-ref">Referencia: <strong>${escHtml(data.orderRef)}</strong></div>
            <div class="quote-success-total">Total: <strong>${fmt(data.total)}</strong></div>
            <p class="quote-success-msg">Te contactaremos pronto al email <strong>${escHtml(email)}</strong>.</p>
          </div>`;
        cart.clear();
        addBotMsg(`✅ Cotización **${data.orderRef}** creada por **${fmt(data.total)}**. Te contactaremos pronto.`);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';
      const e = document.createElement('p');
      e.className = 'quote-form-error';
      e.textContent = 'Error: ' + (err.message || 'No se pudo enviar.');
      formEl.querySelector('.quote-form-actions').before(e);
    }
  }

  /* ─── Add bot message helper ─────────────────────────────────── */
  function addBotMsg(text) {
    const messagesEl = document.getElementById('rg-chat-messages');
    if (!messagesEl) return;
    const li = document.createElement('li');
    li.className = 'rg-chat-message rg-chat-bot';
    const bubble = document.createElement('div');
    bubble.className = 'rg-chat-bubble';
    bubble.textContent = text;
    li.appendChild(bubble);
    messagesEl.appendChild(li);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ─── Add HTML bot message helper ───────────────────────────── */
  function addBotHtml(html) {
    const messagesEl = document.getElementById('rg-chat-messages');
    if (!messagesEl) return;
    const li = document.createElement('li');
    li.className = 'rg-chat-message rg-chat-bot';
    const bubble = document.createElement('div');
    bubble.className = 'rg-chat-bubble rg-chat-bubble--wide';
    bubble.innerHTML = html;
    li.appendChild(bubble);
    messagesEl.appendChild(li);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Bind add-to-cart buttons within the grid
    bubble.addEventListener('click', (e) => {
      const btn = e.target.closest('.shop-card-btn');
      if (!btn) return;
      cart.add({
        id: parseInt(btn.dataset.id, 10),
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        image: btn.dataset.img || '',
      });
      // Visual feedback
      btn.innerHTML = '<i class="fas fa-check"></i>';
      btn.classList.add('added');
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-plus"></i>'; btn.classList.remove('added'); }, 1200);
    });
  }

  /* ─── Product keywords detection ────────────────────────────── */
  const PRODUCT_KEYWORDS = /producto|catálogo|catalogo|precio|cotiz|servicio|plan|comprar|tienda|ver servicios|qué ofrecen|que ofrecen|listado|oferta/i;

  window.odooShop = {
    isProductQuery: (text) => PRODUCT_KEYWORDS.test(text),

    async showProducts() {
      const typingEl = showTypingInChat();
      try {
        const res = await fetch('/api/odoo/products');
        const products = await res.json();
        removeTypingFromChat(typingEl);
        if (!Array.isArray(products)) throw new Error(products?.error || 'Error');
        addBotHtml(buildProductsGrid(products));
      } catch (e) {
        removeTypingFromChat(typingEl);
        addBotMsg('No pude cargar el catálogo ahora mismo. Intenta de nuevo en un momento.');
      }
    },

    openCart() { renderCartPanel(); },
  };

  /* ─── Typing indicator helpers ───────────────────────────────── */
  function showTypingInChat() {
    const messagesEl = document.getElementById('rg-chat-messages');
    if (!messagesEl) return null;
    const li = document.createElement('li');
    li.className = 'rg-chat-message rg-chat-bot shop-typing';
    li.innerHTML = `<div class="rg-chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span> Cargando catálogo…</div>`;
    messagesEl.appendChild(li);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return li;
  }

  function removeTypingFromChat(el) {
    if (el?.parentNode) el.parentNode.removeChild(el);
  }

  /* ─── Inject cart button into chat toolbar ───────────────────── */
  function injectCartButton() {
    const header = document.querySelector('.rg-chat-header');
    if (!header || document.getElementById('rg-cart-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'rg-cart-btn';
    btn.className = 'rg-cart-btn';
    btn.setAttribute('aria-label', 'Ver carrito');
    btn.innerHTML = `<i class="fas fa-shopping-cart"></i><span class="rg-cart-badge" id="rg-cart-badge" style="display:none">0</span>`;
    header.insertBefore(btn, header.querySelector('.rg-chat-close'));

    btn.addEventListener('click', () => {
      const existing = document.getElementById('rg-cart-panel');
      if (existing) {
        existing.classList.remove('open');
        setTimeout(() => existing.remove(), 300);
      } else {
        renderCartPanel();
      }
    });

    cart.on(updateCartBadge);
  }

  /* ─── Init ───────────────────────────────────────────────────── */
  function init() {
    // Wait for chat to be in DOM
    const tryInject = setInterval(() => {
      if (document.querySelector('.rg-chat-header')) {
        injectCartButton();
        clearInterval(tryInject);
      }
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
