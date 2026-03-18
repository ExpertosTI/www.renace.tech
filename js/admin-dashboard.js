(() => {
  const emailInput = document.getElementById('email');
  const codeInput = document.getElementById('code');
  const btnRequest = document.getElementById('btn-request');
  const btnVerify = document.getElementById('btn-verify');
  const loginMessage = document.getElementById('login-message');
  const loginStatus = document.getElementById('login-status');
  const statsCard = document.getElementById('stats');
  const lists = document.getElementById('lists');
  const btnNewToken = document.getElementById('btn-new-token');
  const tokensList = document.getElementById('quote-tokens');
  const submissionsList = document.getElementById('quote-submissions');
  const visitsSourceEl = document.getElementById('visits-source');
  const refreshTimeEl = document.getElementById('refresh-time');

  let token = localStorage.getItem('admin_token') || '';
  let autoRefreshTimer = null;

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
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount);
  }

  function formatVisitSource(source) {
    if (source === 'nginx') return 'NGINX';
    if (source === 'live') return 'LIVE';
    return '-';
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
      await loadAnalytics();
      startAutoRefresh();
    } catch (e) {
      setMessage(e.message, 'error');
      token = '';
      localStorage.removeItem('admin_token');
      setLoginStatus('No autenticado');
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
    document.getElementById('visits-total').textContent = visits.total ?? '-';
    document.getElementById('visits-24h').textContent = visits.last24h ? `${visits.last24h} en las últimas 24h` : '-';
    document.getElementById('sales-count').textContent = sales.count ?? '-';
    document.getElementById('sales-total').textContent = sales.totalAmount ? formatMoney(sales.totalAmount) : '-';
    visitsSourceEl.textContent = formatVisitSource(visits.source);
    refreshTimeEl.textContent = `Actualizado ${new Date().toLocaleTimeString()}`;

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
          return `<li>
            <div>
              <strong>${escapeHtml(t.label || 'Token')}</strong>
              <div class="muted">${new Date(t.exp).toLocaleString()}</div>
              <div class="muted">${escapeHtml(t.token)}</div>
            </div>
            <div class="actions">
              <button class="secondary" onclick="navigator.clipboard.writeText('${link}').then(()=>{}).catch(()=>{})">Copiar</button>
              <a class="btn-link secondary" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </li>`;
        }).join('')
      : '<li><span class="muted">Sin tokens</span></li>';

    const submissions = quotes.submissions || data.submissions || [];
    submissionsList.innerHTML = submissions.length
      ? submissions.map(s => `<li><strong>${escapeHtml(s.name)} (${escapeHtml(s.email)})</strong><span class="muted">${new Date(s.createdAt).toLocaleString()}</span></li>`).join('')
      : '<li><span class="muted">Sin solicitudes</span></li>';

    statsCard.style.display = 'block';
    lists.style.display = 'grid';
  }

  btnRequest.addEventListener('click', requestCode);
  btnVerify.addEventListener('click', verifyCode);

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

  // Intentar reusar token guardado
  if (token) {
    setLoginStatus('Autenticado (token guardado)');
    loadAnalytics();
    startAutoRefresh();
  }
})();
