/**
 * RENACE.TECH — Clean Application Script 2026
 * Replaces: script.js (3484 lines), effects.js (2999 lines), pricing.js, 
 *           enhancements.js, cursor.js, immersive-background.js, three-effects.js
 * 
 * All duplicates removed. Single implementations for:
 * - Chat system (rg-chat only)
 * - Notification system
 * - Document management
 * - Effects & animations
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  chatWebhook: 'https://ai.renace.tech/webhook/499666c3-d807-4bb7-8195-43932f64a91f/chat',
  metricsWebhook: 'https://ai.renace.tech/webhook/6e33280a-faeb-4394-a34c-142fee0ebfc7',
  scrollThreshold: 100,
  debounceTime: 150,
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
const utils = {
  debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },
  throttle(fn, ms) {
    let ok = true;
    return (...a) => { if (ok) { fn(...a); ok = false; setTimeout(() => ok = true, ms); } };
  },
  escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
  formatMarkdown(text) {
    if (text == null) return '';
    let s = utils.escapeHtml(text);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Add support for Markdown links -> Clickable options/links
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--primary); text-decoration:underline; font-weight:600;">$1</a>');
    s = s.replace(/\n/g, '<br>');
    return s;
  },
};

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function getSessionId() {
  try {
    let id = localStorage.getItem('n8n_chat_session');
    if (!id) {
      id = 'session-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('n8n_chat_session', id);
    }
    return id;
  } catch {
    return 'temp-' + Math.random().toString(36).substr(2, 9);
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION SYSTEM (Single Implementation)
// ═══════════════════════════════════════════════════════════════
function showNotification(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `notification ${type}`;
  const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  el.innerHTML = `<i class="fas ${iconMap[type] || iconMap.info}"></i><span>${message}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 50);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function initNavigation() {
  const header = document.querySelector('header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Mobile menu toggle
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return; // Prevent empty selector error
      e.preventDefault();
      try {
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (navLinks) navLinks.classList.remove('active');
        }
      } catch (err) {}
    });
  });

  // Header scroll effect
  if (header) {
    const onScroll = utils.throttle(() => {
      header.classList.toggle('scrolled', window.scrollY > CONFIG.scrollThreshold);
    }, 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

// ═══════════════════════════════════════════════════════════════
// E-CF FLOATING TOAST REGULATION
// ═══════════════════════════════════════════════════════════════
function closeEcfToast() {
  const toast = document.getElementById('ecf-toast');
  if (toast) {
    toast.classList.remove('show');
    sessionStorage.setItem('ecf_toast_closed', 'true');
  }
}

function initEcfToast() {
  if (sessionStorage.getItem('ecf_toast_closed')) return;
  const toast = document.getElementById('ecf-toast');
  if (toast) {
    // Show toast after 8 seconds of user navigating
    setTimeout(() => {
      toast.classList.add('show');
    }, 8000);
  }
}

// ═══════════════════════════════════════════════════════════════
// SCROLL ANIMATIONS
// ═══════════════════════════════════════════════════════════════
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '50px' }
  );

  document.querySelectorAll('.fade-in-element').forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════════════
// CONTACT FORM
// ═══════════════════════════════════════════════════════════════
function initContactForm() {
  const form = document.getElementById('main-contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

      const data = {
        name: form.querySelector('[name="name"]')?.value?.trim(),
        email: form.querySelector('[name="email"]')?.value?.trim(),
        message: form.querySelector('[name="message"]')?.value?.trim(),
        website: form.querySelector('[name="website"]')?.value || '',
      };

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (response.ok && result.status === 'success') {
        showNotification(result.message || 'Mensaje enviado con éxito', 'success');
        form.reset();
      } else {
        throw new Error(result.error || 'Error al enviar');
      }
    } catch (err) {
      showNotification(err.message || 'Error al enviar el mensaje', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// FINDER WINDOW CONTROLS
// ═══════════════════════════════════════════════════════════════
function toggleFileLock(forceState) {
  const btn = document.querySelector('.finder-lock-btn i');
  const finder = document.querySelector('.finder-window');
  if (!btn || !finder) return finder ? finder.classList.contains('locked') : true;

  const current = finder.classList.contains('locked');
  const nextLocked = typeof forceState === 'boolean' ? forceState : !current;
  finder.classList.toggle('locked', nextLocked);
  btn.classList.toggle('fa-lock', nextLocked);
  btn.classList.toggle('fa-lock-open', !nextLocked);
  return nextLocked;
}

function maximizeFolder() {
  const f = document.querySelector('.finder-window');
  if (!f) return;
  f.style.display = '';
  f.classList.remove('minimized');
  f.classList.toggle('maximized');
}

function minimizeFolder() {
  const f = document.querySelector('.finder-window');
  if (!f) return;
  f.classList.remove('maximized');
  f.classList.toggle('minimized');
  f.style.display = '';
}

function closeFolder() {
  const f = document.querySelector('.finder-window');
  if (!f) return;
  f.classList.remove('maximized', 'minimized');
  f.style.opacity = '0';
  f.style.transform = 'scale(0.9) translateY(10px)';
  setTimeout(() => {
    f.style.display = 'none';
    f.style.opacity = '';
    f.style.transform = '';
  }, 200);
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS SYSTEM
// ═══════════════════════════════════════════════════════════════
let DOCUMENTS_DATA = [];
let documentsViewState = { view: 'list', filter: 'all', search: '' };
let _adminCredential = '';

function getSafeDocumentUrl(doc) {
  if (!doc || typeof doc.file !== 'string') return null;
  const raw = doc.file.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.includes('..')) return null;
  return raw;
}

function getDocumentIconConfig(doc) {
  const type = (doc?.type || '').toUpperCase();
  const file = (doc?.file || '').toLowerCase();

  if (type.includes('PDF') || file.endsWith('.pdf')) return { iconClass: 'fa-file-pdf', typeClass: 'document-icon--pdf' };
  if (type.includes('ZIP') || file.match(/\.(zip|rar|7z)$/)) return { iconClass: 'fa-file-archive', typeClass: 'document-icon--zip' };
  if (type.includes('EXE') || file.match(/\.(exe|msi)$/)) return { iconClass: 'fa-microchip', typeClass: 'document-icon--exe' };
  if (type.includes('DOC') || file.match(/\.docx?$/)) return { iconClass: 'fa-file-word', typeClass: 'document-icon--doc' };
  if (type.includes('XLS') || file.match(/\.xlsx?$/)) return { iconClass: 'fa-file-excel', typeClass: 'document-icon--xls' };
  if (type.includes('PPT') || file.match(/\.pptx?$/)) return { iconClass: 'fa-file-powerpoint', typeClass: 'document-icon--ppt' };
  if (file.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/)) return { iconClass: 'fa-file-image', typeClass: 'document-icon--image' };
  return { iconClass: 'fa-file-alt', typeClass: 'document-icon--generic' };
}

function getDocumentCategory(doc) {
  const name = doc?.name || doc?.file || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const cats = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
    audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz'],
    document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
  };
  for (const [cat, exts] of Object.entries(cats)) {
    if (exts.includes(ext)) return cat;
  }
  return 'other';
}

function updateDocumentsFilter() {
  const list = document.getElementById('documents-list');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('.document-item'));
  const q = documentsViewState.search.trim();
  let visible = 0;

  items.forEach(item => {
    const cat = item.dataset.category || 'other';
    const name = (item.dataset.name || '').toLowerCase();
    const show = (documentsViewState.filter === 'all' || cat === documentsViewState.filter)
      && (!q || name.includes(q));
    item.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  const empty = list.querySelector('.document-empty--filter');
  if (empty) empty.style.display = items.length && !visible ? 'block' : 'none';
}

function setDocumentsView(viewName) {
  documentsViewState.view = viewName || 'list';
  document.querySelectorAll('.documents-view').forEach(v => {
    v.classList.toggle('active', v.dataset.view === documentsViewState.view);
  });
  document.querySelectorAll('.finder-nav-btn').forEach(b => {
    const isActive = b.dataset.view === documentsViewState.view;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  if (documentsViewState.view === 'rar' && window.renderRarExtractor) {
    window.renderRarExtractor();
  }
}

function initDocumentsList() {
  const list = document.getElementById('documents-list');
  if (!list || !Array.isArray(DOCUMENTS_DATA)) return;
  list.innerHTML = '';

  if (!DOCUMENTS_DATA.length) {
    const empty = document.createElement('div');
    empty.className = 'document-empty';
    empty.textContent = 'No hay documentos disponibles.';
    list.appendChild(empty);
    return;
  }

  DOCUMENTS_DATA.forEach(doc => {
    const url = getSafeDocumentUrl(doc);
    const item = document.createElement(url ? 'a' : 'div');
    item.className = 'document-item';
    item.dataset.category = getDocumentCategory(doc);

    if (url) {
      item.href = url;
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
      item.setAttribute('download', '');
    } else {
      item.setAttribute('aria-disabled', 'true');
    }

    const { iconClass, typeClass } = getDocumentIconConfig(doc);
    const nameText = doc?.name || 'Sin nombre';
    item.dataset.name = nameText.toLowerCase();

    const typeLabel = doc?.type || '';
    const sizeLabel = doc?.size || '';
    const infoText = typeLabel && sizeLabel ? `${typeLabel} • ${sizeLabel}` : typeLabel || sizeLabel;

    const docId = doc?.id || null;
    item.innerHTML = `
      <div class="document-icon ${typeClass}"><i class="fas ${iconClass}"></i></div>
      <div class="document-meta">
        <div class="document-name">${utils.escapeHtml(nameText)}</div>
        ${infoText ? `<div class="document-info">${utils.escapeHtml(infoText)}</div>` : ''}
      </div>
      ${url ? '<div class="document-download"><i class="fas fa-download"></i></div>' : ''}
      ${docId ? `<button class="document-delete-btn" title="Eliminar documento" data-id="${docId}" aria-label="Eliminar ${utils.escapeHtml(nameText)}"><i class="fas fa-trash"></i></button>` : ''}
    `;
    item.title = `${nameText}${infoText ? ' — ' + infoText : ''}`;
    if (docId) {
      const delBtn = item.querySelector('.document-delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteDocument(docId, nameText);
        });
      }
    }
    list.appendChild(item);
  });

  const emptyFilter = document.createElement('div');
  emptyFilter.className = 'document-empty document-empty--filter';
  emptyFilter.textContent = 'No hay archivos que coincidan.';
  emptyFilter.style.display = 'none';
  list.appendChild(emptyFilter);
  updateDocumentsFilter();
}

function showConfirmModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm }) {
  const existing = document.getElementById('app-confirm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'app-confirm-modal';
  overlay.className = 'app-modal-overlay';
  overlay.innerHTML = `
    <div class="app-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="app-modal-icon"><i class="fas fa-exclamation-triangle"></i></div>
      <h3 class="app-modal-title" id="modal-title">${title}</h3>
      <p class="app-modal-message">${message}</p>
      <div class="app-modal-actions">
        <button class="app-modal-btn app-modal-btn--cancel" id="modal-cancel">${cancelText}</button>
        <button class="app-modal-btn app-modal-btn--confirm" id="modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const close = () => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.querySelector('#modal-confirm').addEventListener('click', () => { close(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
}

function deleteDocument(id, name) {
  if (!_adminCredential) {
    showNotification('Desbloquea con el PIN de administrador para eliminar.', 'error');
    return;
  }

  showConfirmModal({
    title: 'Eliminar archivo',
    message: `¿Eliminar <strong>${utils.escapeHtml(name)}</strong>? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    onConfirm: () => {
      fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': _adminCredential }
      })
        .then(async r => {
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error || 'Error al eliminar');
          }
          return r.json();
        })
        .then(() => {
          showNotification(`"${name}" eliminado correctamente.`, 'success');
          loadDocuments();
        })
        .catch(err => {
          if ((err.message || '').toLowerCase().includes('no autorizado')) {
            _adminCredential = '';
          }
          showNotification(err.message || 'Error al eliminar.', 'error');
        });
    }
  });
}

function loadDocuments() {
  if (window.location.protocol === 'file:') {
    const list = document.getElementById('documents-list');
    if (list) {
      list.innerHTML = '<div class="document-empty">Abre el sitio con un servidor (http://) para ver documentos.</div>';
    }
    return;
  }

  fetch('/api/documents', { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => { DOCUMENTS_DATA = Array.isArray(data) ? data : []; initDocumentsList(); })
    .catch(() => {
      fetch('data/documents.json', { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => { DOCUMENTS_DATA = Array.isArray(data) ? data : []; initDocumentsList(); })
        .catch(() => { DOCUMENTS_DATA = []; initDocumentsList(); });
    });
}

function initDocumentsNavigation() {
  document.querySelectorAll('.finder-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => setDocumentsView(btn.dataset.view || 'list'));
  });

  const sidebarItems = document.querySelectorAll('.finder-sidebar-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      setDocumentsView(item.dataset.view || 'list');
      if (item.dataset.filter) {
        documentsViewState.filter = item.dataset.filter;
        updateDocumentsFilter();
      }
    });
  });

  const search = document.querySelector('.finder-search');
  if (search) {
    search.addEventListener('input', (e) => {
      documentsViewState.search = e.target.value.toLowerCase();
      updateDocumentsFilter();
    });
  }

  setDocumentsView('list');
}

function initDocumentsUpload() {
  const form = document.getElementById('documents-upload-form');
  const input = document.getElementById('documents-upload-input');
  const pinInput = document.getElementById('documents-admin-pin');
  const unlockBtn = document.getElementById('documents-admin-unlock');
  const dropzone = document.getElementById('documents-dropzone');
  const lockBtn = document.querySelector('.finder-lock-btn');
  const lockBackBtn = document.getElementById('documents-lock-btn');
  const finderWindow = document.querySelector('.finder-window');
  const uploadNavBtn = document.querySelector('.finder-nav-btn[data-view="upload"]');
  const submitBtn = form?.querySelector('button[type="submit"]');
  let adminUnlocked = false;

  function setAdminVisibility(visible) {
    if (uploadNavBtn) uploadNavBtn.style.display = visible ? 'inline-flex' : 'none';
    if (finderWindow) finderWindow.classList.toggle('documents-admin-visible', visible);
    setDocumentsView(visible ? 'upload' : 'list');
  }

  function setAdminUnlocked(unlocked) {
    toggleFileLock(!unlocked);
    adminUnlocked = unlocked;
    if (finderWindow) finderWindow.classList.toggle('documents-admin-unlocked', unlocked);
    if (pinInput) pinInput.disabled = unlocked;
    if (unlockBtn) unlockBtn.disabled = unlocked;
    if (submitBtn) submitBtn.disabled = !unlocked;
    if (dropzone) {
      dropzone.classList.toggle('unlocked', unlocked);
      dropzone.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
    }
  }

  setAdminVisibility(false);
  setAdminUnlocked(false);

  if (lockBtn) {
    lockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isLocked = finderWindow?.classList.contains('locked') ?? true;
      if (isLocked) {
        setAdminVisibility(true);
        if (pinInput) { pinInput.disabled = false; pinInput.focus(); }
      } else {
        _adminCredential = '';
        setAdminUnlocked(false);
        if (pinInput) pinInput.value = '';
        showNotification('Panel bloqueado.', 'info');
        setAdminVisibility(false);
      }
    });
  }

  if (unlockBtn && pinInput) {
    unlockBtn.addEventListener('click', () => {
      const nextCredential = pinInput.value.trim();
      if (nextCredential) {
        _adminCredential = nextCredential;
        setAdminUnlocked(true);
        if (uploadNavBtn) uploadNavBtn.style.display = 'inline-flex';
        if (finderWindow) finderWindow.classList.add('documents-admin-visible');
        setDocumentsView('list');
        showNotification('Desbloqueado. Puedes eliminar y subir archivos.', 'success');
      } else {
        showNotification('Ingresa tu credencial de administrador.', 'error');
      }
    });
  }

  if (lockBackBtn) {
    lockBackBtn.addEventListener('click', () => {
      _adminCredential = '';
      setAdminUnlocked(false);
      if (pinInput) pinInput.value = '';
      setAdminVisibility(false);
    });
  }

  // Drag & Drop
  if (dropzone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
      dropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(ev => {
      dropzone.addEventListener(ev, () => dropzone.classList.add('highlight'), false);
    });
    ['dragleave', 'drop'].forEach(ev => {
      dropzone.addEventListener(ev, () => dropzone.classList.remove('highlight'), false);
    });

    dropzone.addEventListener('click', () => {
      if (!adminUnlocked) { showNotification('Desbloquea con el PIN primero.', 'error'); return; }
      input?.click();
    });

    dropzone.addEventListener('drop', (e) => {
      if (!adminUnlocked) { showNotification('Desbloquea con el PIN primero.', 'error'); return; }
      if (input && e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        showNotification(`${e.dataTransfer.files.length} archivo(s) listos.`, 'info');
      }
    });
  }

  // Upload form submit
  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!adminUnlocked) { showNotification('Desbloquea con el PIN primero.', 'error'); return; }
      const files = Array.from(input.files || []);
      if (!files.length) { showNotification('Selecciona al menos un archivo.', 'error'); return; }
      if (!_adminCredential) { showNotification('Ingresa tu credencial de administrador.', 'error'); return; }

      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      fetch('/api/documents', {
        method: 'POST',
        headers: { 'x-admin-pin': _adminCredential },
        body: formData
      })
        .then(async r => {
          if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error || 'Error al subir');
          }
          return r.json();
        })
        .then(data => {
          showNotification(data.message || 'Archivos subidos.', 'success');
          input.value = '';
          loadDocuments();
        })
        .catch(err => {
          if ((err.message || '').toLowerCase().includes('no autorizado')) {
            _adminCredential = '';
            setAdminUnlocked(false);
            if (pinInput) {
              pinInput.value = '';
              pinInput.disabled = false;
              pinInput.focus();
            }
          }
          showNotification(err.message || 'Error subiendo archivos.', 'error');
        });
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// CHAT SYSTEM (Single Implementation — rg-chat)
// ═══════════════════════════════════════════════════════════════
function initRgChat() {
  const root = document.querySelector('.rg-chat-root');
  if (!root) return;

  const toggle = root.querySelector('.rg-chat-toggle');
  const windowEl = root.querySelector('.rg-chat-window');
  const closeBtn = root.querySelector('.rg-chat-close');
  const messagesEl = document.getElementById('rg-chat-messages');
  const input = document.getElementById('rg-chat-input');
  const sendBtn = document.getElementById('rg-chat-send');

  if (!toggle || !windowEl || !messagesEl || !input || !sendBtn) return;

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'rg-chat-window');

  const HISTORY_KEY = 'rg_chat_dom_v1';

  function scrollToBottom() {
    const body = root.querySelector('.rg-chat-body') || messagesEl;
    body.scrollTop = body.scrollHeight;
  }

  // Restore history
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) { messagesEl.innerHTML = saved; scrollToBottom(); }
  } catch {}

  function persist() {
    try { localStorage.setItem(HISTORY_KEY, messagesEl.innerHTML); } catch {}
  }

  function addMessage(sender, text) {
    const li = document.createElement('li');
    li.className = 'rg-chat-message ' + (sender === 'user' ? 'rg-chat-user' : 'rg-chat-bot');
    const bubble = document.createElement('div');
    bubble.className = 'rg-chat-bubble';
    bubble.innerHTML = utils.formatMarkdown(text);
    li.appendChild(bubble);
    messagesEl.appendChild(li);
    scrollToBottom();
    persist();
  }

  function addHtmlMessage(html) {
    const li = document.createElement('li');
    li.className = 'rg-chat-message rg-chat-bot';
    const bubble = document.createElement('div');
    bubble.className = 'rg-chat-bubble';
    bubble.innerHTML = html;
    li.appendChild(bubble);
    messagesEl.appendChild(li);
    scrollToBottom();
    persist();
  }

  let typingLi = null;
  function showTyping() {
    if (typingLi) return;
    typingLi = document.createElement('li');
    typingLi.className = 'rg-chat-message rg-chat-bot';
    const bubble = document.createElement('div');
    bubble.className = 'rg-chat-bubble';
    bubble.textContent = 'Escribiendo…';
    typingLi.appendChild(bubble);
    messagesEl.appendChild(typingLi);
    scrollToBottom();
  }

  function removeTyping() {
    if (typingLi?.parentNode) typingLi.parentNode.removeChild(typingLi);
    typingLi = null;
  }

  // Normalize n8n response (single implementation)
  function normalizeReply(data, rawText) {
    let reply = null;
    if (data && typeof data === 'object') {
      reply = data.output || data.reply || data.message || data.text;
      if (!reply && Array.isArray(data) && data[0]) {
        reply = data[0].output || data[0].reply || data[0].message || data[0].text;
      }
    }
    if (!reply && rawText && typeof rawText === 'string') {
      const t = rawText.trim();
      if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
        try {
          const p = JSON.parse(t);
          if (p && typeof p === 'object') {
            reply = p.output || p.reply || p.message || p.text;
            if (!reply && Array.isArray(p) && p[0]) {
              reply = p[0].output || p[0].reply || p[0].message || p[0].text;
            }
          }
        } catch {}
      }
    }
    if (!reply && rawText) reply = rawText;
    return reply != null ? String(reply) : null;
  }

  // Build sales report card (single implementation)
  function buildSalesReportCard(report) {
    if (!report || typeof report !== 'object') return '';
    const e = utils.escapeHtml;
    const title = e(report.title || 'Resumen de ventas');
    const period = e(report.period || report.range || '');
    const highlight = e(report.highlight || report.summary || '');
    const items = Array.isArray(report.metrics) ? report.metrics : Array.isArray(report.items) ? report.items : [];

    const rows = items.map(item => {
      if (!item || typeof item !== 'object') return '';
      const label = e(item.label || item.name || '');
      const value = e(item.value || item.total || item.amount || '');
      let trend = '';
      if (typeof item.trend === 'string') trend = e(item.trend);
      else if (typeof item.trend === 'number') trend = (item.trend > 0 ? '+' : '') + item.trend + '%';
      const cls = trend.startsWith('-') ? 'down' : 'up';
      const trendHtml = trend ? `<div class="sales-report-trend sales-report-trend-${cls}">${trend}</div>` : '';
      return `<div class="sales-report-row"><div class="sales-report-label">${label}</div><div class="sales-report-value">${value}</div>${trendHtml}</div>`;
    }).filter(Boolean).join('');

    return `<div class="sales-report-card">
      <div class="sales-report-header"><div class="sales-report-title">${title}</div>${period ? `<div class="sales-report-period">${period}</div>` : ''}</div>
      ${highlight ? `<div class="sales-report-highlight">${highlight}</div>` : ''}
      ${rows ? `<div class="sales-report-body">${rows}</div>` : ''}
    </div>`;
  }

  async function sendMessageToN8n(text) {
    if (!CONFIG.chatWebhook) {
      addMessage('bot', 'El asistente no está disponible.');
      return;
    }

    showTyping();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout for Odoo APIs

      const cartContext = window.odooShop?.getCartContext?.();
      const response = await fetch(CONFIG.chatWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: getSessionId(),
          source: 'renace-web-chat',
          ...(cartContext ? { cart: cartContext, cartTotal: window.renaceCart?.total?.() } : {}),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const rawText = await response.text();
      let data = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch { data = null; }

      removeTyping();

      if (data && typeof data === 'object' && (data.type === 'sales_report' || data.reportType === 'sales')) {
        const html = buildSalesReportCard(data);
        if (html) addHtmlMessage(html);
      }

      const reply = normalizeReply(data, rawText);
      addMessage('bot', reply || 'El asistente respondió sin contenido.');

      if (data && typeof data === 'object' && Array.isArray(data.options)) {
        const optionsHtml = data.options.map(opt => `<button class="rg-chat-option-btn" style="display:inline-block; background:rgba(0,180,216,0.2); color:white; border:1px solid rgba(0,180,216,0.6); padding:8px 14px; border-radius:20px; margin:4px; font-size:0.85rem; cursor:pointer">${utils.escapeHtml(opt)}</button>`).join('');
        addHtmlMessage(`<div class="rg-chat-options" style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">${optionsHtml}</div>`);
      }

      // Proactive catalog suggestion when AI mentions products/prices
      const CATALOG_TRIGGER = /precio|producto|cat[aá]logo|disponible|oferta|cotiz|equipo|servicio|tienda|comprar|modelo|marca/i;
      if (reply && CATALOG_TRIGGER.test(reply)) {
        addHtmlMessage(`<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
          <button class="rg-chat-option-btn" id="bot-show-catalog-btn" style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;">
            <i class="fas fa-store"></i> Ver catálogo
          </button>
          ${window.renaceCart?.count?.() > 0 ? `<button class="rg-chat-option-btn" id="bot-show-cart-btn" style="background:rgba(129,140,248,0.12);color:#818cf8;border:1px solid rgba(129,140,248,0.35);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;">
            <i class="fas fa-shopping-cart"></i> Mi carrito (${window.renaceCart.count()})
          </button>` : ''}
        </div>`);
        setTimeout(() => {
          document.getElementById('bot-show-catalog-btn')?.addEventListener('click', () => window.odooShop?.showProducts());
          document.getElementById('bot-show-cart-btn')?.addEventListener('click', () => window.odooShop?.openCart());
        }, 50);
      }
    } catch (err) {
      removeTyping();
      let msg = 'Hubo un problema de conexión.';
      if (err.name === 'AbortError') msg = 'La solicitud tardó demasiado.';
      addMessage('bot', msg + ' Intenta de nuevo.');
    }
  }

  function updateSendState() {
    sendBtn.disabled = !(input.value && input.value.trim().length > 0);
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    sendMetricsEvent('chat_message', { length: text.length });
    input.value = '';
    input.style.height = '';
    updateSendState();

    // Intercept quote conversation flow — bot asks data one step at a time
    if (window.odooShop?.isInQuoteFlow()) {
      window.odooShop.handleQuoteInput(text);
      return;
    }

    // Intercept cart command superpowers ("agrega una impresora", "quita la laptop")
    if (window.odooShop?.isCartCommand(text)) {
      await window.odooShop.handleCartCommand(text);
      return;
    }

    // Intercept cart queries → respond directly from cart state
    const CART_QUERY = /carrito|qu[eé]\s+(?:ten[ig]|a[gñ]ré?|selecc)|cu[aá]nto\s+(?:es|ser[aá]|me\s+sale|tengo|suman?)|mi[s]?\s+(?:producto|selec|pedido)|ver\s+(?:mi\s+)?carrito|total\s+(?:del?\s+)?carrito/i;
    if (CART_QUERY.test(text) && window.renaceCart) {
      const c = window.renaceCart;
      if (c.count() === 0) {
        addMessage('bot', 'Tu carrito está vacío. ¿Quieres que te muestre el catálogo de productos?');
        addHtmlMessage(`<div style="margin-top:6px;"><button class="rg-chat-option-btn" id="empty-cart-catalog" style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-store"></i> Ver catálogo</button></div>`);
        setTimeout(() => document.getElementById('empty-cart-catalog')?.addEventListener('click', () => window.odooShop?.showProducts()), 50);
      } else {
        const lines = c.items.map(i => `• ${i.qty}x ${i.name} — ${new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:2}).format(i.price * i.qty)}`).join('\n');
        const total = new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:2}).format(c.total());
        addMessage('bot', `🛒 Tienes ${c.count()} artículo${c.count()!==1?'s':''} en tu carrito:\n\n${lines}\n\n**Total: ${total}**`);
        addHtmlMessage(`<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;"><button class="rg-chat-option-btn" id="cart-q-view" style="background:rgba(129,140,248,0.12);color:#818cf8;border:1px solid rgba(129,140,248,0.35);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-shopping-cart"></i> Ver carrito</button><button class="rg-chat-option-btn" id="cart-q-quote" style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-file-invoice"></i> Solicitar cotización</button></div>`);
        setTimeout(() => {
          document.getElementById('cart-q-view')?.addEventListener('click', () => window.odooShop?.openCart());
          document.getElementById('cart-q-quote')?.addEventListener('click', () => {
            // trigger quote form directly  
            window.odooShop?.openCart();
          });
        }, 50);
      }
      return;
    }

    // Intercept product search (e.g. "muéstrame impresoras") → filtered Odoo catalog
    if (window.odooShop?.isSearchQuery(text)) {
      const query = window.odooShop.getSearchQuery(text);
      await window.odooShop.searchProducts(query);
      return;
    }
    // Intercept general product / catalog queries → full Odoo catalog
    if (window.odooShop?.isProductQuery(text)) {
      await window.odooShop.showProducts();
      return;
    }
    await sendMessageToN8n(text);
  }

  // Open / Close
  function open() {
    root.classList.add('rg-chat-open');
    windowEl.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    scrollToBottom();
    try { input.focus(); } catch {}
  }

  function close() {
    root.classList.remove('rg-chat-open');
    windowEl.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Escape') && root.classList.contains('rg-chat-open')) close();
  });

  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
    if (!this.value) this.style.height = '';
    updateSendState();
  });

  input.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter') && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  });

  messagesEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('rg-chat-option-btn')) {
      input.value = e.target.textContent;
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  updateSendState();

  if (messagesEl.children.length === 0) {
    addMessage('bot', 'Hola, soy Roberto de RENACE. ¿En qué puedo ayudarte hoy?');
  }
}

// ═══════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════
function sendMetricsEvent(type, data) {
  try {
    if (!CONFIG.metricsWebhook) return;
    const hostname = window.location?.hostname;
    if (!hostname || !['renace.tech', 'www.renace.tech'].includes(hostname)) return;

    const payload = {
      type, sessionId: getSessionId(),
      path: window.location.pathname, timestamp: new Date().toISOString(),
      data: data || {},
    };

    fetch(CONFIG.metricsWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function initMetrics() {
  try {
    const key = 'metrics_pageview_' + window.location.pathname;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      sendMetricsEvent('page_view');
    }
  } catch { sendMetricsEvent('page_view'); }
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL ANIMATION
// ═══════════════════════════════════════════════════════════════
class TerminalAnimator {
  constructor(container) {
    this.container = container;
    this.container.innerHTML = '';
    this.stopped = false;
  }

  wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async type(text, element, speed = 50) {
    for (const char of text) {
      if (this.stopped) return;
      element.textContent += char;
      await this.wait(speed);
    }
  }

  async addCommand(text, showPrompt = true, customPrompt = null) {
    if (this.stopped) return;
    const line = document.createElement('div');
    line.className = 'terminal-line';
    if (showPrompt) {
      const prompt = document.createElement('span');
      prompt.className = 'prompt';
      prompt.textContent = customPrompt ? `${customPrompt}:~$ ` : '$ ';
      line.appendChild(prompt);
    }
    const cmd = document.createElement('span');
    cmd.className = 'command';
    line.appendChild(cmd);
    this.container.appendChild(line);
    await this.type(text, cmd);
    if (!this.stopped) this.container.scrollTop = this.container.scrollHeight;
  }

  async addOutput(text, isProgress = false) {
    if (this.stopped) return;
    const el = document.createElement('div');
    el.className = 'output-line' + (isProgress ? ' build-output' : '');
    el.textContent = text;
    this.container.appendChild(el);
    this.container.scrollTop = this.container.scrollHeight;
    await this.wait(80);
  }

  async processInstallation() {
    await this.wait(300);
    await this.addCommand('npm run build', true, 'client@renace.tech');
    await this.wait(200);

    const steps = [
      '⚡ Collecting packages...',
      'Downloading renace-tech-3.0 (12.4 MB)',
      '   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 12.4/12.4 MB',
      '→ Installing dependencies...',
      '→ Building modules...',
      '✓ Successfully built renace-tech',
      '',
      '⚡ Build complete!',
      '→ RENACE Tech 3.0 — Digitaliza tu negocio',
    ];

    for (const step of steps) {
      await this.addOutput(step, step.startsWith('Downloading') || step.startsWith('→ Installing'));
      await this.wait(60);
    }

    const actions = document.createElement('div');
    actions.className = 'terminal-actions';
    actions.innerHTML = `
      <button class="terminal-btn primary pulse-button" onclick="startProject()">
        <i class="fas fa-rocket"></i> Iniciar Proyecto
      </button>
      <button class="terminal-btn secondary" onclick="scrollToFiles()">
        <i class="fas fa-folder"></i> Ver Documentos
      </button>
    `;
    this.container.appendChild(actions);
    this.container.scrollTop = this.container.scrollHeight;
  }
}

function startProject() {
  const terminalOutput = document.querySelector('.terminal-output');
  if (!terminalOutput) return;
  terminalOutput.innerHTML = '';
  const terminal = new TerminalAnimator(terminalOutput);

  (async () => {
    await terminal.addCommand('npm run build', true, 'user@renace.tech');
    const steps = [
      '🚀 Iniciando RENACE Project v3.0',
      '🤖 Activando Sistema IA',
      '⚡ Analizando componentes',
      '🔮 Sincronizando servicios',
      '✨ Sistema listo',
    ];
    for (const s of steps) {
      await terminal.addOutput(s);
      await terminal.wait(100);
    }

    const menu = document.createElement('div');
    menu.className = 'terminal-actions menu-grid';
    menu.innerHTML = `
      <button class="terminal-btn primary" onclick="scrollToTop()"><i class="fas fa-home"></i> Inicio</button>
      <button class="terminal-btn primary" onclick="scrollToFiles()"><i class="fas fa-folder"></i> Documentos</button>
      <button class="terminal-btn primary" onclick="goToPricing()"><i class="fas fa-tags"></i> Precios</button>
      <button class="terminal-btn primary" onclick="goToTools()"><i class="fas fa-tools"></i> Herramientas</button>
      <button class="terminal-btn primary" onclick="goToPrestApp()"><i class="fas fa-mobile-alt"></i> PrestApp</button>
    `;
    terminalOutput.appendChild(menu);
  })();
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION HELPERS
// ═══════════════════════════════════════════════════════════════
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToFiles() {
  document.querySelector('.files-section')?.scrollIntoView({ behavior: 'smooth' });
}

function scrollToContact() {
  document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
}

function goToPricing() {
  const el = document.getElementById('precios');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function goToPrestApp() {
  window.location.href = 'PrestApp/index.html';
}

function goToTools() {
  window.location.href = 'tools.html';
}

// ═══════════════════════════════════════════════════════════════
// CLIENT LOGOS CAROUSEL
// ═══════════════════════════════════════════════════════════════
function loadClientLogos() {
  const container = document.getElementById('clients-logos-container');
  if (!container) return;

  container.className = 'clients-carousel-container';
  const logos = ['client1.png','client2.png','client3.png','client4.png','client5.png',
    'client6.png','client7.png','client8.png','client9.png','client10.png','client11.png'];

  const track = document.createElement('div');
  track.className = 'clients-track';

  const createLogo = (file, i) => {
    const div = document.createElement('div');
    div.className = 'client-logo';
    const img = document.createElement('img');
    img.src = `images/clients/${file}`;
    img.alt = `Cliente ${i + 1}`;
    img.loading = 'lazy';
    img.onerror = () => { div.style.display = 'none'; };
    div.appendChild(img);
    return div;
  };

  // Double for infinite scroll
  logos.forEach((l, i) => track.appendChild(createLogo(l, i)));
  logos.forEach((l, i) => track.appendChild(createLogo(l, i)));

  container.innerHTML = '';
  container.appendChild(track);
}

// ═══════════════════════════════════════════════════════════════
// VISUAL EFFECTS
// ═══════════════════════════════════════════════════════════════
function initParticles() {
  const now = new Date();
  const month = now.getMonth();
  const isSnow = month === 11 || month === 0 || month === 1;
  const count = isSnow ? 60 : 40;

  const container = document.createElement('div');
  container.id = 'global-particles';
  document.body.insertBefore(container, document.body.firstChild);

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const size = isSnow ? (Math.random() * 4 + 2) : (Math.random() * 3 + 1);
    const x = Math.random() * 100;
    const y = isSnow ? (Math.random() * -20) : (Math.random() * 100);
    const dur = isSnow ? (Math.random() * 20 + 20) : (Math.random() * 30 + 20);
    const delay = Math.random() * 10;
    const opacity = isSnow ? (Math.random() * 0.5 + 0.2) : (Math.random() * 0.3 + 0.1);
    const anim = isSnow ? 'snowParticleFall' : 'floatParticle';
    const color = isSnow
      ? `radial-gradient(circle, rgba(255,255,255,${opacity}), rgba(148,163,184,${opacity * 0.7}))`
      : `radial-gradient(circle, rgba(0,212,255,${opacity}), rgba(56,189,248,${opacity * 0.5}))`;

    p.style.cssText = `
      position:absolute; width:${size}px; height:${size}px; background:${color};
      border-radius:50%; top:${y}%; left:${x}%;
      animation:${anim} ${dur}s infinite ${delay}s ease-in-out;
      box-shadow:0 0 ${size * 2}px rgba(${isSnow ? '148,163,184' : '0,212,255'},${opacity * 0.5});
    `;
    container.appendChild(p);
  }
}

function initCursor() {
  // Cursor is now handled natively via CSS in styles.css
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL WINDOW CONTROLS
// ═══════════════════════════════════════════════════════════════
function maximizeTerminal() {
  const t = document.querySelector('.hero .terminal-window');
  if (!t) return;
  t.style.display = '';
  t.classList.remove('minimized');
  t.classList.toggle('maximized');
}

function minimizeTerminal() {
  const t = document.querySelector('.hero .terminal-window');
  if (!t) return;
  t.classList.remove('maximized');
  t.classList.toggle('minimized');
  t.style.display = '';
}

function closeTerminal() {
  const t = document.querySelector('.hero .terminal-window');
  if (!t) return;
  t.classList.remove('maximized', 'minimized');
  
  const terminalOutput = document.querySelector('.hero .terminal-output');
  if (terminalOutput) {
    if (window.heroTerminalInstance) {
      window.heroTerminalInstance.stopped = true;
    }
    terminalOutput.innerHTML = '';
    const isLowEnd = (navigator.hardwareConcurrency || 2) <= 2 || window.innerWidth <= 360;
    if (isLowEnd) {
      terminalOutput.textContent = 'RENACE Tech — Digitaliza tu negocio.\nDesliza para explorar.';
    } else {
      const terminal = new TerminalAnimator(terminalOutput);
      window.heroTerminalInstance = terminal;
      terminal.processInstallation();
    }
  }
}

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('active');
        // observer.unobserve(e.target); // Optional: if we want them to re-animate on scroll up, don't unobserve
      } else {
        e.target.classList.remove('active'); // Re-hides so animation triggers again on scrolling back down
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal-section').forEach(el => observer.observe(el));
}

function initScrollIndicator() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const indicator = document.createElement('div');
  indicator.classList.add('scroll-indicator', 'fade-in-element');
  indicator.innerHTML = '<div class="mouse"><div class="wheel"></div></div><div class="arrow"><span></span></div>';
  hero.appendChild(indicator);

  window.addEventListener('scroll', utils.throttle(() => {
    indicator.classList.toggle('hidden', window.scrollY > 100);
  }, 100), { passive: true });
}

function initHeroTerminalTilt() {
  if (window.innerWidth < 1024 || !window.matchMedia('(pointer:fine)').matches) return;

  const terminal = document.querySelector('.hero .terminal-window');
  if (!terminal) return;

  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (e) => {
    const rect = terminal.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // More dramatic tilt: max ~12deg
    targetY = ((e.clientX - centerX) / (window.innerWidth / 2)) * 12;
    targetX = -((e.clientY - centerY) / (window.innerHeight / 2)) * 8;
  }, { passive: true });

  function animate() {
    if (terminal.classList.contains('maximized')) {
      // Smoothly return to 0,0 when maximized
      currentX += (0 - currentX) * 0.1;
      currentY += (0 - currentY) * 0.1;
      terminal.style.transform = `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg)`;
    } else {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      terminal.style.transform = `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg)`;
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// ═══════════════════════════════════════════════════════════════
// APP INITIALIZATION
// ═══════════════════════════════════════════════════════════════
function updateLoadingProgress(progress) {
  const loading = document.querySelector('.loading');
  if (!loading) return;

  let bar = loading.querySelector('.loading-progress-bar');
  let text = loading.querySelector('.loading-progress-text');

  if (!bar) {
    const el = document.createElement('div');
    el.innerHTML = `<div class="loading-progress"><div class="loading-progress-bar" style="width:${progress}%"></div><div class="loading-progress-text">${Math.round(progress)}%</div></div>`;
    loading.appendChild(el);
  } else {
    bar.style.width = `${progress}%`;
    if (text) text.textContent = `${Math.round(progress)}%`;
  }
}

async function initializeApp() {
  const loading = document.querySelector('.loading');
  try {
    updateLoadingProgress(0);

    // Initialize components
    const inits = [
      { fn: initNavigation, weight: 20 },
      { fn: initScrollAnimations, weight: 10 },
      { fn: initContactForm, weight: 15 },
      { fn: loadDocuments, weight: 10 },
      { fn: initDocumentsNavigation, weight: 10 },
      { fn: initDocumentsUpload, weight: 10 },
      { fn: loadClientLogos, weight: 5 },
      { fn: initParticles, weight: 5 },
      { fn: initCursor, weight: 5 },
      { fn: initScrollIndicator, weight: 5 },
      { fn: initHeroTerminalTilt, weight: 5 },
    ];

    let progress = 0;
    for (const { fn, weight } of inits) {
      try { fn(); } catch (e) { console.warn('Init error:', e); }
      progress += weight;
      updateLoadingProgress(progress);
    }

    updateLoadingProgress(100);

    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => { loading.style.display = 'none'; }, 500);
      }, 300);
    }
  } catch (err) {
    console.error('App init error:', err);
    if (loading) {
      loading.innerHTML = `<div class="loading-error"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar</p><button onclick="location.reload()">Reintentar</button></div>`;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// DOM READY
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initRgChat();
  initMetrics();
  initScrollReveal();
  initEcfToast();

  // Terminal animation
  const terminalOutput = document.querySelector('.hero .terminal-output');
  if (terminalOutput) {
    const isLowEnd = (navigator.hardwareConcurrency || 2) <= 2 || window.innerWidth <= 360;
    if (isLowEnd) {
      terminalOutput.textContent = 'RENACE Tech — Digitaliza tu negocio.\nDesliza para explorar.';
    } else {
      const terminal = new TerminalAnimator(terminalOutput);
      window.heroTerminalInstance = terminal;
      terminal.processInstallation();
    }
  }

  // Hero terminal responsive
  const heroTerminal = document.querySelector('.hero .terminal-window');
  if (heroTerminal) {
    const adjustLayout = () => {
      heroTerminal.classList.toggle('maximized', window.innerWidth <= 768);
    };
    adjustLayout();
    window.addEventListener('resize', adjustLayout);
  }

  // Logo click → scroll to top
  document.querySelectorAll('.logo a, .terminal-header a').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); scrollToTop(); });
  });
});

// Global error handler (simplified)
window.addEventListener('error', (event) => {
  if (!event?.error) return;
  console.error('Global error:', event.error.message);
});

// ═══════════════════════════════════════════════════════════════
// GLOBAL CHAT TOGGLE (For external Call-To-Action buttons)
// ═══════════════════════════════════════════════════════════════
window.openChat = function() {
  const toggle = document.querySelector('.rg-chat-toggle');
  const windowEl = document.querySelector('.rg-chat-window') || document.getElementById('rg-chat-window');
  
  if (windowEl) {
    if (!windowEl.classList.contains('active') && toggle) {
      toggle.click();
    }
    
    // Focus input after a short delay to allow transition
    setTimeout(() => {
      const input = document.getElementById('rg-chat-input');
      if (input) input.focus();
    }, 300);
  }
};
