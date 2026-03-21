(() => {
  const emailInput = document.getElementById('email');
  const codeInput = document.getElementById('code');
  const btnRequest = document.getElementById('btn-request');
  const btnVerify = document.getElementById('btn-verify');
  const btnPresentation = document.getElementById('btn-presentation');
  const loginCard = document.getElementById('login-card');
  const visitsKpi = document.getElementById('visits-kpi');
  const visitModal = document.getElementById('visit-modal');
  const visitModalClose = document.getElementById('visit-modal-close');
  const visitModalMeta = document.getElementById('visit-modal-meta');
  const visitDetailList = document.getElementById('visit-detail-list');
  const loginMessage = document.getElementById('login-message');
  const loginStatus = document.getElementById('login-status');
  const statsCard = document.getElementById('stats');
  const lists = document.getElementById('lists');
  const btnNewToken = document.getElementById('btn-new-token');
  const tokensList = document.getElementById('quote-tokens');
  const submissionsList = document.getElementById('quote-submissions');
  const trackingBoard = document.getElementById('tracking-board');
  const notificationsFeed = document.getElementById('notifications-feed');
  const projectionsBars = document.getElementById('projections-bars');
  const projectionNotes = document.getElementById('projection-notes');
  const visitsSourceEl = document.getElementById('visits-source');
  const refreshTimeEl = document.getElementById('refresh-time');

  let token = localStorage.getItem('admin_token') || '';
  let autoRefreshTimer = null;
  let presentationMode = localStorage.getItem('admin_presentation_mode') === '1';
  let visitDetailsLoading = false;
  let presentationSceneTimer = null;
  let presentationSceneIndex = 0;
  let presentationResizeTimer = null;

  let currentSubmissions = [];

  // Hide login card if already authenticated
  if (token && loginCard) {
    loginCard.classList.add('hidden');
  }

  // User Selection Logic
  const userOptions = document.querySelectorAll('.user-option');
  userOptions.forEach(opt => {
    opt.addEventListener('mousemove', (ev) => {
      const rect = opt.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((ev.clientY - rect.top) / rect.height - 0.5) * -8;
      opt.style.transform = `translateY(-4px) rotateX(${y}deg) rotateY(${x}deg)`;
    });
    opt.addEventListener('mouseleave', () => {
      opt.style.transform = '';
    });
    opt.addEventListener('click', () => {
      userOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      if (emailInput) emailInput.value = opt.dataset.email;
      if (loginStatus) {
        const selectedName = opt.querySelector('.user-name')?.textContent || 'Identidad';
        loginStatus.textContent = `Identidad: ${selectedName}`;
      }
    });
  });
  
  // Expose to window for onclick handlers
  window.openSubmission = function(id) {
    const s = currentSubmissions.find(x => x.id === id || x.token === id);
    if (!s) return;
    
    const content = document.getElementById('submission-detail-content');
    const modal = document.getElementById('submission-modal');
    const waBtn = document.getElementById('submission-whatsapp');
    
    // Format modules
    const modulesList = Array.isArray(s.modules) && s.modules.length 
      ? s.modules.map(m => `<span class="tag">${escapeHtml(m)}</span>`).join(' ')
      : '<span class="muted">Ninguno</span>';

    // Format money
    const revenue = s.revenue ? formatMoney(parseDopRevenue(s.revenue)) : '-';
    const callSchedule = [s.callDate, s.callSlot, s.callTimezone].filter(Boolean).join(' · ');
    
    content.innerHTML = `
      <div class="detail-group">
        <div class="detail-label">Contacto</div>
        <div class="detail-value"><strong>${escapeHtml(s.name)}</strong></div>
        <div class="detail-value">${escapeHtml(s.email)}</div>
        <div class="detail-value">${escapeHtml(s.phone || 'Sin teléfono')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Negocio</div>
        <div class="detail-value">${escapeHtml(s.business)}</div>
        <div class="detail-value">${escapeHtml(getSectorLabel(s.sector))} · ${escapeHtml(s.cashiers || '0')} cajas · ${escapeHtml(s.employees || '0')} empleados</div>
        <div class="detail-value">Facturación: ${revenue}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Proyecto</div>
        <div class="detail-value">${escapeHtml(getObjectiveLabel(s.objective))}</div>
        <div class="detail-value">Timeline: ${escapeHtml(s.timeline || 'No especificado')}</div>
        <div class="detail-value">Arquitectura: ${escapeHtml(s.architecture || 'No especificado')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Llamada</div>
        <div class="detail-value">${escapeHtml(callSchedule || 'No agendada')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Módulos Requeridos</div>
        <div class="detail-value">${modulesList}</div>
      </div>
      <div class="detail-group" style="border:none;">
        <div class="detail-label">Mensaje</div>
        <div class="detail-value" style="white-space:pre-wrap;">${escapeHtml(s.message || 'Sin mensaje adicional.')}</div>
      </div>
      <div class="muted" style="font-size:10px; margin-top:12px;">
        ID: ${escapeHtml(s.id)} · Token: ${escapeHtml(s.token)}<br>
        IP: ${escapeHtml(s.ip)} · ${escapeHtml(s.userAgent)}
      </div>
    `;
    
    // WhatsApp Link
    const text = `Hola ${s.name}, recibimos tu solicitud en RENACE.TECH. Vimos tu disponibilidad ${callSchedule || 'para llamada'}. ¿Confirmamos ese horario para conversar sobre tu proyecto de ${s.business}?`;
    waBtn.href = `https://wa.me/${(s.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    
    modal.classList.add('open');
  };

  // Chat Widget Logic
  const chatWidget = document.getElementById('admin-chat-widget');
  const chatToggle = document.getElementById('chat-toggle');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');
  const chatIcon = document.getElementById('chat-icon');

  if (chatToggle) {
    chatToggle.addEventListener('click', () => {
      chatWidget.classList.toggle('collapsed');
      const isCollapsed = chatWidget.classList.contains('collapsed');
      chatIcon.className = isCollapsed ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
    });
  }

  function addChatMessage(text, type = 'user') {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function addChatMessageHtml(html, type = 'system') {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function handleChatCommand() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    addChatMessage(text, 'user');
    chatInput.value = '';

    const lower = text.toLowerCase();
    
    if (lower.includes('generame') || (lower.includes('solicitud') && lower.includes('link'))) {
      addChatMessage('Generando enlace de solicitud...', 'system');
      try {
        const res = await fetch('/api/admin/quote-tokens', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ label: 'Chat Generated' })
        });
        const data = await res.json();
        if (data.token) {
          const url = `https://renace.tech/cotizacion.html?token=${data.token}`;
          const waText = encodeURIComponent(`Hola, completa esta solicitud de RENACE: ${url}`);
          addChatMessageHtml(`
            <div class="chat-link-card">
              <div>Solicitud generada correctamente.</div>
              <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
              <div class="chat-link-row">
                <button class="chat-link-action" type="button" data-copy-link="${url}">Copiar</button>
                <a class="chat-link-action" href="https://wa.me/?text=${waText}" target="_blank" rel="noopener noreferrer">Compartir WhatsApp</a>
                <a class="chat-link-action" href="${url}" target="_blank" rel="noopener noreferrer">Abrir solicitud</a>
              </div>
            </div>
          `, 'system');
          // Refresh list
          loadAnalytics();
        } else {
          addChatMessage('Error al generar token.', 'system');
        }
      } catch (e) {
        addChatMessage('Error de conexión.', 'system');
      }
    } else if (lower.includes('hola') || lower.includes('ayuda')) {
      addChatMessage('Comandos disponibles: "Generame una solicitud", "Ver últimas ventas", "Estado del sistema".', 'system');
    } else {
      addChatMessage('No reconozco ese comando. Intenta "Generame una solicitud".', 'system');
    }
  }

  if (chatSend) {
    chatSend.addEventListener('click', handleChatCommand);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleChatCommand();
    });
  }
  if (chatMessages) {
    chatMessages.addEventListener('click', async (ev) => {
      const copyBtn = ev.target.closest('[data-copy-link]');
      if (!copyBtn) return;
      const link = copyBtn.dataset.copyLink || '';
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link);
        addChatMessage('Enlace copiado al portapapeles.', 'system');
      } catch {
        addChatMessage('No se pudo copiar el enlace automáticamente.', 'system');
      }
    });
  }
  
  // Close submission modal
  const subModalClose = document.getElementById('submission-modal-close');
  if (subModalClose) {
    subModalClose.addEventListener('click', () => {
      document.getElementById('submission-modal').classList.remove('open');
    });
  }

  function setMessage(text, type = 'muted') {
    loginMessage.textContent = text;
    loginMessage.className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'muted';
  }

  function setLoginStatus(text) {
    loginStatus.textContent = text;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatMoney(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return '-';
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 2
    }).format(amount);
  }

  function formatVisitSource(source) {
    if (source === 'traefik') return 'TRAEFIK';
    if (source === 'nginx') return 'NGINX';
    if (source === 'live') return 'LIVE';
    return '-';
  }

  function clearPresentationScenes() {
    if (presentationSceneTimer) {
      clearInterval(presentationSceneTimer);
      presentationSceneTimer = null;
    }
    document.querySelectorAll('.present-card').forEach(card => card.classList.remove('scene-active'));
  }

  function getPresentationSceneInterval() {
    if (window.matchMedia('(max-width: 760px)').matches) return 6200;
    if (window.matchMedia('(max-width: 1280px)').matches) return 5000;
    return 3800;
  }

  function paintPresentationScene(index) {
    const scenes = Array.from(document.querySelectorAll('.present-card'));
    if (!scenes.length) return;
    scenes.forEach((card, i) => {
      card.classList.toggle('scene-active', i === index);
    });
  }

  function startPresentationScenes() {
    const scenes = Array.from(document.querySelectorAll('.present-card'));
    if (!scenes.length) return;
    clearPresentationScenes();
    presentationSceneIndex = presentationSceneIndex % scenes.length;
    paintPresentationScene(presentationSceneIndex);
    const intervalMs = getPresentationSceneInterval();
    presentationSceneTimer = setInterval(() => {
      if (!presentationMode) return;
      presentationSceneIndex = (presentationSceneIndex + 1) % scenes.length;
      paintPresentationScene(presentationSceneIndex);
    }, intervalMs);
  }

  function formatVisitTime(input) {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  }

  function formatLocation(loc) {
    if (!loc) return 'Sin locación';
    const bits = [loc.city, loc.region, loc.country].filter(Boolean);
    return bits.length ? bits.join(', ') : 'Sin locación';
  }

  function formatUserAgent(ua) {
    const value = String(ua || '').trim();
    if (!value) return 'Sin user-agent';
    if (value.length <= 90) return value;
    return `${value.slice(0, 90)}…`;
  }

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function daysUntil(dateValue) {
    const ms = new Date(dateValue).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  function parseDopRevenue(value) {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const compact = raw.toLowerCase();
    const kMatch = compact.match(/(\d+(?:[.,]\d+)?)\s*k/);
    if (kMatch) {
      const n = Number(kMatch[1].replace(',', '.'));
      if (Number.isFinite(n)) return Math.round(n * 1000);
    }
    const millionMatch = compact.match(/(\d+(?:[.,]\d+)?)\s*(m|mm|mill[oó]n|millones)/);
    if (millionMatch) {
      const n = Number(millionMatch[1].replace(',', '.'));
      if (Number.isFinite(n)) return Math.round(n * 1000000);
    }
    const cleaned = raw.replace(/[^\d]/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function computePipelineHealth(submissions) {
    if (!submissions.length) return 0;
    const score = submissions.reduce((acc, row) => {
      const timeline = String(row.timeline || '');
      if (timeline.includes('urgente')) return acc + 1;
      if (timeline.includes('plan')) return acc + 0.75;
      if (timeline.includes('q_')) return acc + 0.6;
      return acc + 0.35;
    }, 0);
    return Math.round((score / submissions.length) * 100);
  }

  function getPriorityTag(submission) {
    const timeline = String(submission.timeline || '');
    const modules = Array.isArray(submission.modules) ? submission.modules : [];
    if (timeline.includes('urgente') || modules.includes('agentes_ia') || modules.includes('software_medida')) {
      return { label: 'Alta', cls: 'bad' };
    }
    if (timeline.includes('plan') || timeline.includes('q_')) {
      return { label: 'Media', cls: 'warn' };
    }
    return { label: 'Base', cls: 'good' };
  }

  function getTrackingStage(submission) {
    if (submission.callDate && submission.callSlot) return 'Llamada agendada';
    const timeline = String(submission.timeline || '');
    const modules = Array.isArray(submission.modules) ? submission.modules : [];
    if (timeline.includes('urgente')) return 'Onboarding inmediato';
    if (modules.includes('integraciones_api') || modules.includes('software_medida')) return 'Diagnóstico técnico';
    if (timeline.includes('plan') || timeline.includes('q_')) return 'Scoping funcional';
    return 'Exploración';
  }

  function getObjectiveLabel(objective) {
    const labels = {
      orden_operativa: 'Orden operativa',
      automatizar_ventas: 'Automatizar ventas',
      control_inventario: 'Control inventario',
      escalar_sucursales: 'Escalar sucursales',
      software_medida: 'Software a medida',
      agentes_ia: 'Agentes IA'
    };
    return labels[objective] || String(objective || 'Objetivo general').replaceAll('_', ' ');
  }

  function getSectorLabel(sector) {
    const labels = {
      retail: 'Retail',
      distribucion: 'Distribución',
      servicios: 'Servicios',
      manufactura: 'Manufactura',
      tecnologia: 'Tecnología',
      salud: 'Salud',
      educacion: 'Educación',
      construccion: 'Construcción',
      transporte: 'Transporte',
      farmacia: 'Farmacia',
      belleza: 'Belleza',
      supermercado: 'Supermercado',
      ferreteria: 'Ferretería'
    };
    return labels[sector] || String(sector || 'General');
  }

  function formatRelativeDate(input) {
    const ts = new Date(input).getTime();
    if (!Number.isFinite(ts)) return 'Fecha n/d';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${Math.max(mins, 1)} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
  }

  function calculateInsights(data) {
    const visits = data.visits || {};
    const quotes = data.quotes || {};
    const tokens = (quotes.tokens || []).filter(Boolean);
    const submissions = (quotes.submissions || []).filter(Boolean);
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const visits24h = toNumber(visits.last24h);
    const submissions24h = submissions.filter(s => new Date(s.createdAt).getTime() >= dayAgo).length;
    const conversions = visits24h > 0 ? (submissions24h / visits24h) * 100 : 0;
    const activeTokens = tokens.filter(t => new Date(t.exp).getTime() > now);
    const expiringSoon = activeTokens.filter(t => daysUntil(t.exp) <= 2).length;
    const pipelineHealth = computePipelineHealth(submissions);
    const trackedRevenue = submissions.map(s => parseDopRevenue(s.revenue)).filter(v => Number.isFinite(v));
    const avgTicket = trackedRevenue.length ? trackedRevenue.reduce((a, b) => a + b, 0) / trackedRevenue.length : 0;
    const forecast = Math.round((submissions24h * 30 * (avgTicket || 180000)) / 24);

    const modulesCount = {};
    submissions.forEach(s => {
      (Array.isArray(s.modules) ? s.modules : []).forEach(m => {
        modulesCount[m] = (modulesCount[m] || 0) + 1;
      });
    });
    const topModules = Object.entries(modulesCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

    const timelineCount = submissions.reduce((acc, s) => {
      const key = String(s.timeline || 'exploracion');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const objectiveCount = submissions.reduce((acc, s) => {
      const key = String(s.objective || 'orden_operativa');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      visits24h,
      submissions24h,
      conversions,
      activeTokens: activeTokens.length,
      expiringSoon,
      pipelineHealth,
      avgTicket,
      forecast,
      topModules,
      timelineCount,
      objectiveCount,
      submissions,
      tokens
    };
  }

  function renderNotificationList(notifications) {
    notificationsFeed.innerHTML = notifications.length
      ? notifications.map(item => `<li><div><strong><img src="/images/logo.svg" alt="RENACE.TECH" style="width:16px;height:16px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px;">RENACE.TECH · ${escapeHtml(item.title)}</strong><div class="muted">${escapeHtml(item.desc)}</div></div><span class="tag ${item.level}">${escapeHtml(item.levelText)}</span></li>`).join('')
      : '<li><span class="muted">Sin notificaciones</span></li>';
  }

  function renderProjectionBars(insights) {
    const timelineRows = [
      { label: 'Urgente 30d', value: insights.timelineCount.urgente_30 || 0 },
      { label: 'Plan 60-90d', value: insights.timelineCount.plan_60_90 || 0 },
      { label: 'Próximo trimestre', value: insights.timelineCount.q_siguiente || 0 },
      { label: 'Exploración', value: insights.timelineCount.exploracion || 0 }
    ];
    const max = Math.max(1, ...timelineRows.map(r => r.value));
    projectionsBars.innerHTML = timelineRows.map(row => {
      const percent = Math.round((row.value / max) * 100);
      return `<div class="bar-row">
        <div class="bar-top"><span>${escapeHtml(row.label)}</span><span>${row.value}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${percent}%;"></div></div>
      </div>`;
    }).join('');

    const topObjectives = Object.entries(insights.objectiveCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
    projectionNotes.innerHTML = topObjectives.length
      ? topObjectives.map(([objective, count]) => `<li><strong>${escapeHtml(getObjectiveLabel(objective))}</strong><span class="muted">${count} solicitudes</span></li>`).join('')
      : '<li><span class="muted">Sin información de objetivos.</span></li>';
  }

  function renderTracking(submissions) {
    const latest = submissions.slice(0, 16);
    trackingBoard.innerHTML = latest.length
      ? latest.map(s => {
          const p = getPriorityTag(s);
          const stage = getTrackingStage(s);
          const moduleCount = Array.isArray(s.modules) ? s.modules.length : 0;
          const callInfo = s.callDate && s.callSlot ? `${s.callDate} · ${s.callSlot}` : 'Sin horario';
          return `<li onclick="window.openSubmission('${s.id || s.token}')" style="cursor:pointer;" class="clickable-row">
            <div>
              <strong>${escapeHtml(s.name || 'Lead')} · ${escapeHtml(getSectorLabel(s.sector))}</strong>
              <div class="muted">${escapeHtml(stage)} · ${escapeHtml(callInfo)} · ${moduleCount} módulos</div>
            </div>
            <div>
              <span class="tag ${p.cls}">${escapeHtml(p.label)}</span>
              <div class="muted">${escapeHtml(formatRelativeDate(s.createdAt))}</div>
            </div>
          </li>`;
        }).join('')
      : '<li><span class="muted">Sin solicitudes para rastrear</span></li>';
  }

  function renderReports(insights, visitsSource) {
    const conversionNote = insights.conversions >= 3
      ? `${insights.conversions.toFixed(2)}% sólida y estable.`
      : `${insights.conversions.toFixed(2)}% con espacio para subir.`;
    const moduleLead = insights.topModules[0] ? `${insights.topModules[0][0].replaceAll('_', ' ')} (${insights.topModules[0][1]})` : 'sin módulo dominante';
    const demandPeak = Object.entries(insights.timelineCount).sort((a, b) => b[1] - a[1])[0];
    const demandText = demandPeak ? `${String(demandPeak[0]).replaceAll('_', ' ')} lidera (${demandPeak[1]}).` : 'Demanda insuficiente.';
    const riskText = insights.expiringSoon > 0
      ? `${insights.expiringSoon} token(es) vencen en 48h.`
      : 'Sin vencimientos críticos en 48h.';
    document.getElementById('report-conversion').textContent = conversionNote;
    document.getElementById('report-channel').textContent = `${visitsSource} + ${moduleLead}.`;
    document.getElementById('report-demand').textContent = demandText;
    document.getElementById('report-risk').textContent = riskText;
  }

  function renderPresentationDeck(insights, visits) {
    document.getElementById('present-visits').textContent = visits.total ?? '-';
    document.getElementById('present-visits-sub').textContent = `${insights.visits24h} en 24h`;
    document.getElementById('present-submissions').textContent = insights.submissions.length;
    document.getElementById('present-submissions-sub').textContent = `${insights.submissions24h} nuevas en 24h`;
    document.getElementById('present-conversion').textContent = `${insights.conversions.toFixed(2)}%`;
    document.getElementById('present-conversion-sub').textContent = `Fuente ${formatVisitSource(visits.source)}`;
    document.getElementById('present-forecast').textContent = formatMoney(insights.forecast);
    document.getElementById('present-forecast-sub').textContent = `Pipeline ${insights.pipelineHealth}%`;
  }

  function setPresentationMode(enabled) {
    presentationMode = !!enabled;
    localStorage.setItem('admin_presentation_mode', presentationMode ? '1' : '0');
    document.body.classList.toggle('presentation', presentationMode);
    if (presentationMode) {
      startPresentationScenes();
    } else {
      clearPresentationScenes();
    }
    if (btnPresentation) {
      btnPresentation.innerHTML = presentationMode
        ? '<i class="fa-solid fa-grip"></i> Modo completo'
        : '<i class="fa-solid fa-display"></i> Modo presentación';
    }
  }

  function closeVisitModal() {
    visitModal?.classList.remove('open');
  }

  async function openVisitModal() {
    if (!visitModal || !visitDetailList || !token || visitDetailsLoading) return;
    visitModal.classList.add('open');
    visitDetailList.innerHTML = '<div class="muted">Cargando detalle de visitas...</div>';
    visitDetailsLoading = true;
    try {
      const res = await fetch('/api/admin/visit-details?limit=120&detailed=1', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar detalle de visitas');
      const items = Array.isArray(data.items) ? data.items : [];
      visitModalMeta.textContent = `${items.length} registros · fuente ${formatVisitSource(data.source)}`;
      visitDetailList.innerHTML = items.length
        ? items.map(item => {
            const loc = formatLocation(item.location);
            const org = item.location?.org ? ` · ${item.location.org}` : '';
            const ref = item.referrer ? item.referrer : 'Sin referer';
            return `<article class="visit-row">
              <div class="visit-top">
                <strong>${escapeHtml(item.ip || 'IP n/d')} · ${escapeHtml(item.method || 'GET')} ${escapeHtml(item.path || '/')}</strong>
                <span class="tag ${Number(item.status) >= 400 ? 'bad' : Number(item.status) >= 300 ? 'warn' : 'good'}">${escapeHtml(item.status || '-')}</span>
              </div>
              <div class="visit-meta">
                <span>${escapeHtml(formatVisitTime(item.at || item.ts))}</span>
                <span>${escapeHtml(loc)}${escapeHtml(org)}</span>
                <span>${escapeHtml(ref)}</span>
              </div>
              <div class="muted">${escapeHtml(formatUserAgent(item.userAgent))}</div>
            </article>`;
          }).join('')
        : '<div class="muted">Sin visitas disponibles.</div>';
    } catch (e) {
      visitDetailList.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`;
    } finally {
      visitDetailsLoading = false;
    }
  }

  function startAutoRefresh() {
    if (autoRefreshTimer) return;
    autoRefreshTimer = setInterval(() => {
      if (token) loadAnalytics();
    }, 30000);
  }

  async function requestCode() {
    setMessage('Enviando código...');
    btnRequest.disabled = true;
    try {
      const res = await fetch('/api/admin/login/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.value.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar código');
      setMessage('Código enviado. Revisa tu correo.', 'success');
    } catch (e) {
      setMessage(e.message, 'error');
    } finally {
      btnRequest.disabled = false;
    }
  }

  async function hideLoginWithBlur() {
    if (!loginCard) return;
    loginCard.classList.add('hiding');
    setTimeout(() => {
      if (loginCard) loginCard.classList.add('hidden');
    }, 600);
  }

  function showLogin() {
    if (!loginCard) return;
    loginCard.classList.remove('hidden', 'hiding');
  }

  async function verifyCode() {
    setMessage('Validando código...');
    btnVerify.disabled = true;
    try {
      const res = await fetch('/api/admin/login/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.value.trim(), code: codeInput.value.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');
      token = data.token;
      localStorage.setItem('admin_token', token);
      setMessage('Autenticado. Cargando métricas...', 'success');
      setLoginStatus('Autenticado');
      await hideLoginWithBlur();
      await loadAnalytics();
      startAutoRefresh();
    } catch (e) {
      setMessage(e.message, 'error');
      token = '';
      localStorage.removeItem('admin_token');
      setLoginStatus('No autenticado');
      showLogin();
    } finally {
      btnVerify.disabled = false;
    }
  }

  async function loadAnalytics() {
    if (!token) {
      statsCard.style.display = 'none';
      lists.style.display = 'none';
      return;
    }
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        setMessage('Token expirado, solicita un nuevo código.', 'error');
        token = '';
        localStorage.removeItem('admin_token');
        statsCard.style.display = 'none';
        lists.style.display = 'none';
        setLoginStatus('No autenticado');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar métricas');
      renderAnalytics(data);
      setMessage('');
      setLoginStatus('Autenticado');
    } catch (e) {
      setMessage(e.message, 'error');
    }
  }

  function renderAnalytics(data) {
    const visits = data.visits || {};
    const sales = data.sales || {};
    const quotes = data.quotes || {};
    const insights = calculateInsights(data);
    document.getElementById('visits-total').textContent = visits.total ?? '-';
    document.getElementById('visits-24h').textContent = visits.last24h ? `${visits.last24h} en las últimas 24h` : '-';
    document.getElementById('sales-count').textContent = sales.count ?? '-';
    document.getElementById('sales-total').textContent = sales.totalAmount ? formatMoney(sales.totalAmount) : '-';
    visitsSourceEl.textContent = formatVisitSource(visits.source);
    refreshTimeEl.textContent = `Actualizado ${new Date().toLocaleTimeString()}`;
    document.getElementById('submissions-total').textContent = insights.submissions.length;
    document.getElementById('submissions-24h').textContent = `${insights.submissions24h} en las últimas 24h`;
    document.getElementById('conversion-rate').textContent = `${insights.conversions.toFixed(2)}%`;
    document.getElementById('active-tokens').textContent = insights.activeTokens;
    document.getElementById('expiring-tokens').textContent = insights.expiringSoon ? `${insights.expiringSoon} vencen pronto` : 'Sin vencimientos inmediatos';
    document.getElementById('pipeline-health').textContent = `${insights.pipelineHealth}%`;
    document.getElementById('forecast-value').textContent = formatMoney(insights.forecast);
    renderPresentationDeck(insights, visits);

    const topPaths = visits.topPaths || [];
    const tp = document.getElementById('top-paths');
    tp.innerHTML = topPaths.map(p => `<li><strong>${escapeHtml(p.path)}</strong><span class="muted">${p.count}</span></li>`).join('') || '<li><span class="muted">Sin datos</span></li>';

    const byStatus = visits.byStatus || {};
    const sc = document.getElementById('status-codes');
    sc.innerHTML = Object.entries(byStatus)
      .map(([k, v]) => `<li><strong>${escapeHtml(k)}</strong><span class="muted">${v}</span></li>`)
      .join('') || '<li><span class="muted">Sin datos</span></li>';

    const sample = sales.sample || [];
    const ss = document.getElementById('sales-sample');
    ss.innerHTML = sample
      .map(s => `<li><strong>${new Date(s.date).toLocaleString()}</strong><span class="muted">${formatMoney(s.amount)}</span></li>`)
      .join('') || '<li><span class="muted">Sin datos</span></li>';

    const tokens = quotes.tokens || data.tokens || [];
    tokensList.innerHTML = tokens.length
      ? tokens.map(t => {
          const link = `https://renace.tech/cotizacion.html?token=${encodeURIComponent(t.token)}`;
          const wa = `https://wa.me/?text=${encodeURIComponent('Completa la solicitud de cotización aquí: ' + link)}`;
          const days = daysUntil(t.exp);
          const stateClass = days <= 1 ? 'bad' : days <= 3 ? 'warn' : 'good';
          const stateLabel = days <= 1 ? 'Crítico' : days <= 3 ? 'Vence pronto' : 'Activo';
          return `<li>
            <div>
              <strong>${escapeHtml(t.label || 'Token')}</strong>
              <div class="muted">${new Date(t.exp).toLocaleString()}</div>
              <div class="muted">${escapeHtml(t.token)}</div>
            </div>
            <div class="actions">
              <span class="tag ${stateClass}">${stateLabel}</span>
              <button class="secondary copy-token-link" data-link="${escapeHtml(link)}">Copiar</button>
              <a class="btn-link secondary" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </li>`;
        }).join('')
      : '<li><span class="muted">Sin tokens</span></li>';

    const submissions = quotes.submissions || data.submissions || [];
    currentSubmissions = submissions;
    submissionsList.innerHTML = submissions.length
      ? submissions.slice(0, 40).map(s => {
          const p = getPriorityTag(s);
          const modulesCount = Array.isArray(s.modules) ? s.modules.length : 0;
          const callInfo = s.callDate && s.callSlot ? `${s.callDate} · ${s.callSlot}` : 'Sin horario';
          return `<li onclick="window.openSubmission('${s.id || s.token}')" style="cursor:pointer;" class="clickable-row">
            <div>
              <strong>${escapeHtml(s.name)} (${escapeHtml(s.email)})</strong>
              <div class="muted">${escapeHtml(getSectorLabel(s.sector))} · ${escapeHtml(callInfo)} · ${modulesCount} módulos</div>
            </div>
            <div>
              <span class="tag ${p.cls}">${escapeHtml(p.label)}</span>
              <div class="muted">${new Date(s.createdAt).toLocaleString()}</div>
            </div>
          </li>`;
        }).join('')
      : '<li><span class="muted">Sin solicitudes</span></li>';

    const statusErrors = Object.entries(byStatus).filter(([code]) => Number(code) >= 400).reduce((acc, [, value]) => acc + Number(value || 0), 0);
    const trafficSource = formatVisitSource(visits.source);
    const notifications = [
      {
        title: insights.submissions24h > 0 ? 'Nuevas solicitudes detectadas' : 'Sin nuevas solicitudes',
        desc: insights.submissions24h > 0 ? `${insights.submissions24h} registradas en 24h.` : 'Conviene activar campañas para incrementar leads.',
        level: insights.submissions24h > 0 ? 'good' : 'warn',
        levelText: insights.submissions24h > 0 ? 'Operativo' : 'Atención'
      },
      {
        title: 'Rendimiento HTTP',
        desc: statusErrors > 0 ? `${statusErrors} respuestas con error detectadas.` : 'Sin errores HTTP relevantes.',
        level: statusErrors > 0 ? 'bad' : 'good',
        levelText: statusErrors > 0 ? 'Crítico' : 'Estable'
      },
      {
        title: 'Conversión del embudo',
        desc: `${insights.conversions.toFixed(2)}% entre visitas y solicitudes recientes.`,
        level: insights.conversions >= 3 ? 'good' : 'warn',
        levelText: insights.conversions >= 3 ? 'Saludable' : 'Optimizar'
      },
      {
        title: 'Vencimiento de tokens',
        desc: insights.expiringSoon ? `${insights.expiringSoon} tokens vencen en 48h.` : 'No hay vencimientos inmediatos.',
        level: insights.expiringSoon ? 'warn' : 'good',
        levelText: insights.expiringSoon ? 'Monitorear' : 'Controlado'
      }
    ];
    renderNotificationList(notifications);
    renderTracking(submissions);
    renderProjectionBars(insights);
    renderReports(insights, trafficSource);
    if (presentationMode) startPresentationScenes();

    statsCard.style.display = 'block';
    lists.style.display = 'grid';
  }

  btnRequest.addEventListener('click', requestCode);
  btnVerify.addEventListener('click', verifyCode);
  btnPresentation?.addEventListener('click', () => setPresentationMode(!presentationMode));
  window.addEventListener('resize', () => {
    if (!presentationMode) return;
    if (presentationResizeTimer) clearTimeout(presentationResizeTimer);
    presentationResizeTimer = setTimeout(() => {
      startPresentationScenes();
    }, 180);
  });
  visitsKpi?.addEventListener('click', openVisitModal);
  visitModalClose?.addEventListener('click', closeVisitModal);
  visitModal?.addEventListener('click', event => {
    if (event.target === visitModal) closeVisitModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeVisitModal();
  });

  btnNewToken?.addEventListener('click', async () => {
    if (!token) {
      setMessage('Primero autentícate', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/quote-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: 'Cotización' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar token');
      setMessage(`Token generado: ${data.token}`, 'success');
      await loadAnalytics();
    } catch (e) {
      setMessage(e.message, 'error');
    }
  });

  document.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('copy-token-link')) return;
    const link = target.dataset.link || '';
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Enlace copiado al portapapeles.', 'success');
    } catch (e) {
      setMessage('No se pudo copiar el enlace.', 'error');
    }
  });

  setPresentationMode(presentationMode);
  if (token) {
    setLoginStatus('Autenticado (token guardado)');
    loadAnalytics();
    startAutoRefresh();
  }
})();
