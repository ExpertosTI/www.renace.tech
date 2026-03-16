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
      <div class="shop-card shop-card--entering" data-id="${p.id}" data-name="${escHtml(p.name)}" data-price="${p.list_price}">
        <div class="shop-card-scan"></div>
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
  function buildProductsGrid(products, query) {
    const label = query ? `Resultados para “${escHtml(query)}”` : 'Catálogo RENACE';
    const icon  = query ? 'fa-search' : 'fa-store';
    if (!products.length) {
      return `<div class="shop-empty">
        <i class="fas fa-box-open"></i>
        <p>No encontré productos${query ? ` para <strong>${escHtml(query)}</strong>` : ''}.</p>
        <button class="rg-chat-option-btn shop-show-all-btn" style="margin-top:0.75rem;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:0.8rem">
          <i class="fas fa-th"></i> Ver todo el catálogo
        </button>
      </div>`;
    }
    return `
      <div class="shop-grid-wrapper">
        <div class="shop-grid-header">
          <i class="fas ${icon}"></i>
          <span>${label}</span>
          <span class="shop-grid-count">${products.length} producto${products.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="shop-grid">
          ${products.map(buildProductCard).join('')}
        </div>
        <p class="shop-hint">Agrega productos al carrito para generar tu cotización ✨</p>
      </div>`;
  }

  /* ─── Build cart panel HTML (Temu-style) ────────────────────── */
  function buildCartHTML() {
    const items = cart.items;
    const empty = items.length === 0;

    const rows = items.map(i => {
      const imgEl = i.image
        ? `<img src="data:image/png;base64,${i.image}" class="cart-item-img" alt="${escHtml(i.name)}">`
        : `<div class="cart-item-img-placeholder"><i class="fas fa-cube"></i></div>`;
      const subtotal = fmt(i.price * i.qty);
      return `
      <div class="cart-item" data-id="${i.id}">
        ${imgEl}
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(i.name)}</div>
          <div class="cart-item-unit-price">${fmt(i.price)} / ud.</div>
        </div>
        <div class="cart-item-controls">
          <div class="cart-item-subtotal">${subtotal}</div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" data-action="dec" data-id="${i.id}" title="Reducir">−</button>
            <span>${i.qty}</span>
            <button class="cart-qty-btn" data-action="inc" data-id="${i.id}" title="Aumentar">+</button>
          </div>
          <button class="cart-remove-btn" data-id="${i.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>`;
    }).join('');

    const footer = !empty ? `
      <div class="cart-panel-footer">
        <div class="cart-summary">
          <span class="cart-summary-label">Total (${cart.count()} artículo${cart.count() !== 1 ? 's' : ''})</span>
          <span class="cart-total">${fmt(cart.total())}</span>
        </div>
        <div class="cart-footer-btns">
          <button class="cart-keep-shopping-btn" id="cart-keep-shopping">
            <i class="fas fa-th"></i> Seguir
          </button>
          <button class="cart-quote-btn" id="cart-quote-btn">
            <i class="fas fa-file-invoice"></i> Cotizar
          </button>
        </div>
      </div>` : '';

    return `
      <div class="cart-panel" id="rg-cart-panel">
        <div class="cart-panel-header">
          <div class="cart-panel-title"><i class="fas fa-shopping-cart"></i> Mi Carrito</div>
          <div class="cart-panel-actions">
            ${!empty ? `<button class="cart-clear-btn" id="cart-clear-btn"><i class="fas fa-trash"></i> Vaciar</button>` : ''}
            <button class="cart-panel-close" id="cart-panel-close" title="Cerrar"><i class="fas fa-chevron-down"></i></button>
          </div>
        </div>
        <div class="cart-panel-body">
          ${empty
            ? `<div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>Tu carrito está vacío.</p>
                <button class="cart-empty-cta" id="cart-go-catalog">
                  <i class="fas fa-store"></i> Ver catálogo
                </button>
              </div>`
            : rows}
        </div>
        ${footer}
      </div>`;
  }

  /* ─── Conversational Quote Flow ───────────────────────── */
  const quoteFlow = {
    state: 'idle',  // idle | name | email | phone | note | confirm | submitting
    data: {},

    start() {
      this.state = 'name';
      this.data = {};
      addBotMsg('¡Perfecto! Te voy a crear la cotización ahora mismo. ✨\n\n¿Me das tu nombre completo?');
    },

    isActive() { return this.state !== 'idle'; },

    handle(text) {
      text = text.trim();
      switch (this.state) {

        case 'name':
          this.data.name = text;
          this.state = 'email';
          addBotMsg(`Un gusto, ${text.split(' ')[0]}! 👋\n\n¿Cuál es tu email para enviarte la cotización?`);
          break;

        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
            addBotMsg('¡Hmm, ese email no parece válido! ¿Puedes revisarlo?');
            return;
          }
          this.data.email = text;
          this.state = 'phone';
          addBotMsg('¡Listo! Y para coordinar la entrega, ¿me das tu número de WhatsApp o teléfono?');
          addBotHtml('<div style="margin-top:4px;"><button id="qf-skip-phone" style="background:rgba(100,116,139,0.15);color:#94a3b8;border:1px solid rgba(100,116,139,0.3);padding:5px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-forward"></i> Omitir este paso</button></div>');
          setTimeout(() => {
            document.getElementById('qf-skip-phone')?.addEventListener('click', () => {
              document.getElementById('qf-skip-phone')?.closest('li')?.remove();
              quoteFlow.handle('omitir');
            });
          }, 50);
          break;

        case 'phone':
          this.data.phone = /^(omitir|no|skip|\.|-+)$/i.test(text) ? '' : text;
          this.state = 'note';
          addBotMsg('¿Tienes algún comentario especial para tu pedido? Por ejemplo: “necesito instación”, “entrega urgente”… (o escribe “listo” para continuar)');
          break;

        case 'note':
          this.data.note = /^(listo|no|ninguno?|skip|\.|-+)$/i.test(text) ? '' : text;
          this.state = 'confirm';
          this._showConfirmation();
          break;

        case 'confirm':
          if (/^(s[\u00ed]|si|confirm|ok|listo|crea|envi|dale|correcto|exacto|s)/i.test(text)) {
            this._submit();
          } else if (/^(cancel|no|salir|atrás|atras)/i.test(text)) {
            this.state = 'idle';
            addBotMsg('¡Claro! Cotización cancelada. Tus productos siguen en el carrito cuando quieras retomar. 🛒');
          } else {
            addBotMsg('Escribe **sí** para crear la cotización o **cancelar** si prefieres salir.');
          }
          break;
      }
    },

    _showConfirmation() {
      const lines = cart.items.map(i => `• ${i.qty}× ${i.name}`).join('\n');
      const phone = this.data.phone ? `\n📱 ${this.data.phone}` : '';
      const note  = this.data.note  ? `\n📝 ${this.data.note}` : '';
      addBotMsg(`¡Perfecto! Confirma tu cotización:\n\n👤 ${this.data.name}\n📧 ${this.data.email}${phone}${note}\n\n${lines}\n\n💰 Total: **${fmt(cart.total())}**\n\nEscribe **sí** para crear o **cancelar** para salir.`);
    },

    async _submit() {
      this.state = 'submitting';
      addBotMsg('⚡ Creando tu cotización en el sistema…');
      try {
        const res = await fetch('/api/odoo/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
            customer: { name: this.data.name, email: this.data.email, phone: this.data.phone, message: this.data.note },
          }),
        });
        const data = await res.json();
        if (data.success) {
          const savedEmail = this.data.email;
          const savedItems = cart.items.map(i => ({ ...i }));
          cart.clear();
          this.state = 'idle';
          this.data = {};
          addBotHtml(buildReceiptHTML(data.orderRef, data.total, savedItems, savedEmail));
        } else {
          throw new Error(data.error || 'Error desconocido');
        }
      } catch (e) {
        this.state = 'confirm';
        addBotMsg(`❌ Hubo un problema al crear la cotización: ${e.message}\n\n¿Lo intentamos de nuevo? Escribe **sí** para reintentar.`);
      }
    },
  };

  /* ─── Escape HTML ────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ─── Build receipt / ticket card HTML ─────────────────── */
  function buildReceiptHTML(orderRef, total, items, email) {
    const rows = items.map(i => `
      <div class="qt-item">
        <span class="qt-item-name">${escHtml((i.qty > 1 ? i.qty + '× ' : '') + i.name)}</span>
        <span class="qt-item-price">${fmt(i.price * i.qty)}</span>
      </div>`).join('');
    return `
      <div class="quote-ticket">
        <div class="qt-header">
          <div class="qt-check-icon"><i class="fas fa-check-circle"></i></div>
          <div class="qt-h-title">¡Cotización Creada!</div>
          <div class="qt-h-ref">${escHtml(orderRef)}</div>
        </div>
        <div class="qt-divider-dashed"></div>
        <div class="qt-body">${rows}</div>
        <div class="qt-divider-dashed"></div>
        <div class="qt-total-row">
          <span>Total</span>
          <strong>${fmt(total)}</strong>
        </div>
        <div class="qt-contact-row">
          <i class="fas fa-envelope"></i> ${escHtml(email)}<br>
          <small>Te contactaremos pronto • RENACE Tech</small>
        </div>
      </div>`;
  }

  /* ─── Update cart badge ───────────────────────────────── */
  function updateCartBadge() {
    const badge = document.getElementById('rg-cart-badge');
    if (!badge) return;
    const n = cart.count();
    badge.textContent = n;
    badge.style.display = n > 0 ? 'inline-flex' : 'none';
    if (n > 0) {
      badge.classList.remove('rg-cart-badge--pulse');
      void badge.offsetWidth;
      badge.classList.add('rg-cart-badge--pulse');
    }
  }

  /* ─── Cart command superpowers ─────────────────────────── */

  // Strip accents so "quítame" → "quitame", "agrégame" → "agregame", etc.
  function normText(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // Matches verb + optional 'me'/'nos' enclitic, with or without accent
  const CART_CMD_PATTERN = /\b(?:agreg[ae]r?|anad[ei]r?|mete?r?|pon[ge]r?|incluye?r?|quit[ae]r?|elimin[ae]r?|borr[ae]r?|sacar?|remueve?r?)(?:me|nos)?\b/i;

  // Build a compact inline product picker (no enterShopMode, no full grid)
  function buildProductPickerHTML(products, qty) {
    const cards = products.slice(0, 5).map((p, idx) => `
      <div class="bpp-card" data-idx="${idx}">
        ${p.image_128 ? `<img class="bpp-thumb" src="data:image/png;base64,${p.image_128}" alt="">` : `<div class="bpp-thumb bpp-thumb--empty"><i class="fas fa-box"></i></div>`}
        <div class="bpp-info">
          <span class="bpp-name">${escHtml(p.name)}</span>
          <span class="bpp-price">${fmt(p.list_price)}</span>
        </div>
        <button class="bpp-add" data-id="${p.id}" data-name="${escHtml(p.name)}" data-price="${p.list_price}" data-qty="${qty}">
          <i class="fas fa-plus"></i>
        </button>
      </div>`).join('');
    return `<div class="bot-product-picker">${cards}</div>`;
  }

  async function handleCartCommand(text) {
    const n = normText(text);   // accent-stripped, lowercase
    const t = text.trim();

    // ─ Remove from cart
    const removeM = n.match(/(?:quit[ae]r?|elimin[ae]r?|borr[ae]r?|sacar?|remueve?r?)(?:me|nos)?\s+(?:el?\s+|la\s+|los?\s+|las?\s+|un[ao]?\s+)?(.+?)[?!.\s]*$/);
    if (removeM) {
      const q = removeM[1].trim();
      const found = cart.items.find(i => normText(i.name).includes(q));
      if (!found) {
        addBotMsg(`No encuentro **"${removeM[1]}"** en tu carrito. ¿Quieres ver lo que tienes?`);
        addBotHtml('<div style="margin-top:4px;"><button id="cc-view-cart" style="background:rgba(129,140,248,0.12);color:#818cf8;border:1px solid rgba(129,140,248,0.35);padding:5px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-shopping-cart"></i> Ver carrito</button></div>');
        setTimeout(() => document.getElementById('cc-view-cart')?.addEventListener('click', renderCartPanel), 50);
      } else {
        cart.remove(found.id);
        addBotMsg(`✅ **${found.name}** eliminado del carrito.`);
      }
      return;
    }

    // ─ Add to cart
    const addM = n.match(/(?:agreg[ae]r?|anad[ei]r?|mete?r?|pon[ge]r?|incluye?r?)(?:me|nos)?\s+(?:(?:un[ao]?\s+|otra?\s+|mas?\s+|(\d+)\s+)(?:de\s+)?)?(.+?)[?!.\s]*$/);
    if (addM) {
      const qty   = addM[1] ? parseInt(addM[1]) : 1;
      const query = addM[2].trim();

      // Already in cart by name? Just increment qty
      const inCart = cart.items.find(i => normText(i.name).includes(query));
      if (inCart) {
        cart.updateQty(inCart.id, inCart.qty + qty);
        addBotMsg(`✅ Actualizado: **${inCart.qty}× ${inCart.name}** en tu carrito.\n\n💰 Total: **${fmt(cart.total())}**`);
        return;
      }

      addBotMsg(`Buscando **"${query}"** en el catálogo…`);
      try {
        const res      = await fetch(`/api/odoo/products?q=${encodeURIComponent(query)}`);
        const products = await res.json();
        if (!Array.isArray(products) || products.length === 0) {
          addBotMsg(`No encontré **"${query}"** disponible. ¿Quieres ver todo el catálogo?`);
          addBotHtml('<div style="margin-top:4px;"><button id="cc-show-all" style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);padding:5px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-store"></i> Ver catálogo</button></div>');
          setTimeout(() => document.getElementById('cc-show-all')?.addEventListener('click', () => fetchAndShowProducts(null)), 50);
          return;
        }
        if (products.length === 1) {
          const p = products[0];
          for (let n = 0; n < qty; n++) cart.add({ id: p.id, name: p.name, price: p.list_price, image: p.image_128 });
          addBotMsg(`✅ ${qty > 1 ? qty + '× ' : ''}**${p.name}** agregado al carrito! 🛒\n\n💰 Total: **${fmt(cart.total())}**`);
        } else {
          // Compact inline picker — does NOT open the full catalog
          addBotMsg(`Encontré ${products.length} opciones para **"${query}"**. ¿Cuál quieres?`);
          const bubble = addBotHtml(buildProductPickerHTML(products, qty));
          setTimeout(() => {
            bubble?.querySelectorAll('.bpp-add').forEach(btn => {
              btn.addEventListener('click', () => {
                const id    = parseInt(btn.dataset.id);
                const name  = btn.dataset.name;
                const price = parseFloat(btn.dataset.price);
                const q2    = parseInt(btn.dataset.qty);
                for (let n = 0; n < q2; n++) cart.add({ id, name, price });
                addBotMsg(`✅ ${q2 > 1 ? q2 + '× ' : ''}**${name}** agregado al carrito! 🛒\n\n💰 Total: **${fmt(cart.total())}**`);
                bubble.closest('li')?.remove();
              });
            });
          }, 50);
        }
      } catch (err) {
        addBotMsg('Hubo un error al buscar el producto. Intenta de nuevo.');
      }
    }
  }

  /* ─── Render cart panel — in-place update if already open ─── */
  function renderCartPanel() {
    const existing = document.getElementById('rg-cart-panel');

    // ── In-place patch when panel is already visible (avoids reset/blink) ──
    if (existing && existing.classList.contains('open')) {
      _patchCartPanel(existing);
      return;
    }

    if (existing) existing.remove();

    const wrapper = document.querySelector('.rg-chat-window');
    if (!wrapper) return;

    const el = document.createElement('div');
    el.innerHTML = buildCartHTML();
    const panel = el.firstElementChild;
    wrapper.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add('open'));
    _bindCartPanelEvents(panel);
  }

  /* In-place DOM update without removing the panel */
  function _patchCartPanel(panel) {
    const items = cart.items;
    const body  = panel.querySelector('.cart-panel-body');
    if (!body) return;

    if (items.length === 0) {
      // Switch to empty state
      body.innerHTML = `<div class="cart-empty">
        <i class="fas fa-shopping-bag"></i>
        <p>Tu carrito está vacío.</p>
        <button class="cart-empty-cta" id="cart-go-catalog"><i class="fas fa-store"></i> Ver catálogo</button>
      </div>`;
      panel.querySelector('.cart-panel-footer')?.remove();
      panel.querySelector('#cart-clear-btn')?.remove();
      body.querySelector('#cart-go-catalog')?.addEventListener('click', () => {
        _closePanelAndDo(panel, () => fetchAndShowProducts(null));
      });
      return;
    }

    // Update existing rows or rebuild if count changed
    const existingRows = body.querySelectorAll('.cart-item');
    if (existingRows.length !== items.length) {
      // Item was added or removed — rebuild body html only
      body.innerHTML = items.map(i => {
        const imgEl = i.image
          ? `<img src="data:image/png;base64,${i.image}" class="cart-item-img" alt="${escHtml(i.name)}">`
          : `<div class="cart-item-img-placeholder"><i class="fas fa-cube"></i></div>`;
        return `<div class="cart-item" data-id="${i.id}">
          ${imgEl}
          <div class="cart-item-info"><div class="cart-item-name">${escHtml(i.name)}</div><div class="cart-item-unit-price">${fmt(i.price)} / ud.</div></div>
          <div class="cart-item-controls">
            <div class="cart-item-subtotal">${fmt(i.price * i.qty)}</div>
            <div class="cart-item-qty">
              <button class="cart-qty-btn" data-action="dec" data-id="${i.id}">−</button>
              <span>${i.qty}</span>
              <button class="cart-qty-btn" data-action="inc" data-id="${i.id}">+</button>
            </div>
            <button class="cart-remove-btn" data-id="${i.id}"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>`;
      }).join('');
    } else {
      // Same item count — patch only qty + subtotal per row
      existingRows.forEach(row => {
        const id   = parseInt(row.dataset.id, 10);
        const item = items.find(i => i.id === id);
        if (!item) return;
        const qtySpan = row.querySelector('.cart-item-qty span');
        const subEl   = row.querySelector('.cart-item-subtotal');
        if (qtySpan) qtySpan.textContent = item.qty;
        if (subEl)   subEl.textContent   = fmt(item.price * item.qty);
      });
    }

    // Update footer total + count
    const totalEl = panel.querySelector('.cart-total');
    const labelEl = panel.querySelector('.cart-summary-label');
    if (totalEl) totalEl.textContent = fmt(cart.total());
    if (labelEl) labelEl.textContent = `Total (${cart.count()} artículo${cart.count() !== 1 ? 's' : ''})`;

    // Ensure clear button is shown
    const actionsEl = panel.querySelector('.cart-panel-actions');
    if (actionsEl && !panel.querySelector('#cart-clear-btn')) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'cart-clear-btn'; clearBtn.id = 'cart-clear-btn';
      clearBtn.innerHTML = '<i class="fas fa-trash"></i> Vaciar';
      clearBtn.addEventListener('click', () => { cart.clear(); _patchCartPanel(panel); });
      actionsEl.insertBefore(clearBtn, actionsEl.querySelector('.cart-panel-close'));
    }
  }

  function _closePanelAndDo(panel, fn) {
    panel.classList.remove('open');
    setTimeout(() => { panel.remove(); if (fn) fn(); }, 380);
  }

  function _bindCartPanelEvents(panel) {
    panel.querySelector('#cart-panel-close')?.addEventListener('click', () => _closePanelAndDo(panel));

    panel.querySelector('#cart-clear-btn')?.addEventListener('click', () => {
      cart.clear(); _patchCartPanel(panel);
    });
    panel.querySelector('#cart-go-catalog')?.addEventListener('click', () => _closePanelAndDo(panel, () => fetchAndShowProducts(null)));
    panel.querySelector('#cart-keep-shopping')?.addEventListener('click', () => _closePanelAndDo(panel, () => fetchAndShowProducts(null)));

    panel.querySelector('.cart-panel-body')?.addEventListener('click', (e) => {
      const qBtn = e.target.closest('[data-action]');
      if (qBtn) {
        const id   = parseInt(qBtn.dataset.id, 10);
        const item = cart.items.find(i => i.id === id);
        if (!item) return;
        cart.updateQty(id, qBtn.dataset.action === 'inc' ? item.qty + 1 : item.qty - 1);
        return;
      }
      const rm = e.target.closest('.cart-remove-btn');
      if (rm) cart.remove(parseInt(rm.dataset.id, 10));
    });

    panel.querySelector('#cart-quote-btn')?.addEventListener('click', () => _closePanelAndDo(panel, () => quoteFlow.start()));

    // Patch when cart changes (badge, qty, total) while panel is open
    cart.on(() => {
      if (panel.isConnected) _patchCartPanel(panel);
    });
  }

  /* ─── Start conversational quote (replaces form) ─────────── */
  function showQuoteForm() { quoteFlow.start(); }

  /* ─── Scroll helper (matches app.js scrollToBottom logic) ──── */
  function chatScrollBottom() {
    const body = document.querySelector('.rg-chat-body');
    const msgs = document.getElementById('rg-chat-messages');
    if (body) body.scrollTop = body.scrollHeight;
    else if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  /* ─── Add bot message helper ────────────────────────────── */
  function addBotMsg(text) {
    const messagesEl = document.getElementById('rg-chat-messages');
    if (!messagesEl) return;
    const li = document.createElement('li');
    li.className = 'rg-chat-message rg-chat-bot';
    const bubble = document.createElement('div');
    bubble.className = 'rg-chat-bubble';
    // simple markdown bold (**text**)
    bubble.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    li.appendChild(bubble);
    messagesEl.appendChild(li);
    chatScrollBottom();
  }

  /* ─── Add HTML bot message helper ──────────────────────── */
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
    chatScrollBottom();

    // Stagger the materialization animation per card
    // (returns bubble for caller to attach extra handlers)
    const cards = bubble.querySelectorAll('.shop-card--entering');
    cards.forEach((card, i) => {
      card.style.animationDelay = `${i * 70}ms`;
      // Remove scan line after animation completes
      setTimeout(() => {
        const scan = card.querySelector('.shop-card-scan');
        if (scan) scan.remove();
        card.classList.remove('shop-card--entering');
      }, 800 + i * 70);
    });

    // Bind add-to-cart buttons with ripple + flash effects
    // eslint-disable-next-line no-unused-expressions
    void bubble; // returned below
    bubble.addEventListener('click', (e) => {
      const btn = e.target.closest('.shop-card-btn');
      if (!btn) return;

      const id    = parseInt(btn.dataset.id, 10);
      const name  = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.img || '';

      // Ripple effect
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      const rect = btn.getBoundingClientRect();
      ripple.style.left = `${(e.clientX - rect.left)}px`;
      ripple.style.top  = `${(e.clientY - rect.top)}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      // Card flash
      const card = btn.closest('.shop-card');
      if (card) {
        card.classList.remove('shop-card--selected');
        void card.offsetWidth; // reflow to restart animation
        card.classList.add('shop-card--selected');
        setTimeout(() => card.classList.remove('shop-card--selected'), 700);
      }

      cart.add({ id, name, price, image });

      btn.innerHTML = '<i class="fas fa-check"></i>';
      btn.classList.add('added');
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-plus"></i>'; btn.classList.remove('added'); }, 1400);
    });

    return bubble;
  }

  /* ─── Product keywords & search patterns ──────────────────── */
  const PRODUCT_KEYWORDS = /producto|catálogo|catalogo|precio|cotiz|servicio|plan|comprar|tienda|ver servicios|qué ofrecen|que ofrecen|listado|oferta/i;

  // Detects: "busca impresoras", "muéstrame solo laptops", "ver teclados", etc.
  const SEARCH_PATTERN = /^(?:busca|buscar|muéstrame|mostrame|mostrar|ver|quiero ver|muestra(?:me)?|filtrar|dame|necesito|tienes?|hay\s)\s+(?:solo\s+|las?\s+|los?\s+|un(?:as?)?\s+|alguna?s?\s+)?(.{2,60})$/i;

  function extractSearchQuery(text) {
    const m = text.trim().match(SEARCH_PATTERN);
    return m ? m[1].replace(/\?|\.$/g, '').trim() : null;
  }

  /* ─── Expand chat to shop mode ──────────────────────────── */
  function enterShopMode() {
    const root = document.querySelector('.rg-chat-root');
    if (!root || root.classList.contains('shop-mode')) return;
    root.classList.add('shop-mode');
    root.querySelector('.rg-chat-close')?.addEventListener('click', () => {
      root.classList.remove('shop-mode');
    }, { once: true });
  }

  /* ─── Fetch & display products (with optional query) ────────── */
  async function fetchAndShowProducts(query) {
    const typingEl = showTypingInChat();
    try {
      const url = query ? `/api/odoo/products?q=${encodeURIComponent(query)}` : '/api/odoo/products';
      const res = await fetch(url);
      const products = await res.json();
      removeTypingFromChat(typingEl);
      if (!Array.isArray(products)) throw new Error(products?.error || 'Error de servidor');

      enterShopMode();
      const bubble = addBotHtml(buildProductsGrid(products, query || null));

      // Handle "Ver todo el catálogo" button in empty state
      bubble?.querySelector('.shop-show-all-btn')?.addEventListener('click', () => {
        fetchAndShowProducts(null);
      });
    } catch (e) {
      removeTypingFromChat(typingEl);
      addBotMsg(`No pude ${query ? `encontrar productos para "${query}"` : 'cargar el catálogo'}. Intenta de nuevo en un momento.`);
    }
  }

  window.odooShop = {
    isProductQuery:  (text) => PRODUCT_KEYWORDS.test(text),
    isSearchQuery:   (text) => !!extractSearchQuery(text),
    getSearchQuery:  (text) => extractSearchQuery(text),

    async showProducts()           { await fetchAndShowProducts(null); },
    async searchProducts(query)    { await fetchAndShowProducts(query); },

    openCart() { renderCartPanel(); },

    getCartContext() {
      if (!cart.items.length) return null;
      return cart.items.map(i => `${i.qty}x ${i.name} (${fmt(i.price)} c/u)`).join(', ');
    },

    // Conversational quote flow
    isInQuoteFlow:    ()     => quoteFlow.isActive(),
    handleQuoteInput: (text) => quoteFlow.handle(text),
    startQuoteFlow:   ()     => quoteFlow.start(),

    // Cart command superpowers
    isCartCommand:    (text) => CART_CMD_PATTERN.test(normText(text)),
    handleCartCommand:(text) => handleCartCommand(text),
  };

  /* ─── Typing indicator helpers ───────────────────────────────── */
  function showTypingInChat() {
    const messagesEl = document.getElementById('rg-chat-messages');
    if (!messagesEl) return null;
    const li = document.createElement('li');
    li.className = 'rg-chat-message rg-chat-bot shop-typing';
    li.innerHTML = `<div class="rg-chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span> Cargando catálogo…</div>`;
    messagesEl.appendChild(li);
    chatScrollBottom();
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
