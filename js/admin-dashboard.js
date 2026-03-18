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

  let token = localStorage.getItem('admin_token') || '';

  function setMessage(text, type = 'muted') {
    loginMessage.textContent = text;
    loginMessage.className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'muted';
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
      loginStatus.textContent = 'Autenticado';
      await loadAnalytics();
    } catch (e) {
      setMessage(e.message, 'error');
      token = '';
      localStorage.removeItem('admin_token');
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
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar métricas');
      renderAnalytics(data);
      setMessage('');
      loginStatus.textContent = 'Autenticado';
    } catch (e) {
      setMessage(e.message, 'error');
    }
  }

  function renderAnalytics(data) {
    const visits = data.visits || {};
    const sales = data.sales || {};
    const quotes = data.quotes || {};
    document.getElementById('visits-total').textContent = visits.total ?? '-';
    document.getElementById('visits-24h').textContent = visits.last24h ? `${visits.last24h} en 24h` : '-';
    document.getElementById('sales-count').textContent = sales.count ?? '-';
    document.getElementById('sales-total').textContent = sales.totalAmount ? `${sales.totalAmount.toFixed ? sales.totalAmount.toFixed(2) : sales.totalAmount}` : '-';

    const topPaths = visits.topPaths || [];
    const tp = document.getElementById('top-paths');
    tp.innerHTML = topPaths.map(p => `<li><span>${p.path}</span><span class="muted">${p.count}</span></li>`).join('') || '<li><span class="muted">Sin datos</span></li>';

    const byStatus = visits.byStatus || {};
    const sc = document.getElementById('status-codes');
    sc.innerHTML = Object.entries(byStatus)
      .map(([k, v]) => `<li><span>${k}</span><span class="muted">${v}</span></li>`)
      .join('') || '<li><span class="muted">Sin datos</span></li>';

    const sample = sales.sample || [];
    const ss = document.getElementById('sales-sample');
    ss.innerHTML = sample
      .map(s => `<li><span>${new Date(s.date).toLocaleString()}</span><span class="muted">${s.amount}</span></li>`)
      .join('') || '<li><span class="muted">Sin datos</span></li>';

    // Quote tokens
    const tokens = quotes.tokens || data.tokens || [];
    tokensList.innerHTML = tokens.length
      ? tokens.map(t => {
          const link = `https://renace.tech/cotizacion.html?token=${encodeURIComponent(t.token)}`;
          const wa = `https://wa.me/?text=${encodeURIComponent('Completa la solicitud de cotización aquí: ' + link)}`;
          return `<li style="align-items:center; gap:8px; display:flex; justify-content:space-between; flex-wrap:wrap;">
            <span>${t.label || 'Token'}</span>
            <span class="muted">${t.token} · expira ${new Date(t.exp).toLocaleString()}</span>
            <div style="display:flex; gap:6px;">
              <button class="secondary" style="padding:4px 8px;" onclick="navigator.clipboard.writeText('${link}').then(()=>{}).catch(()=>{})">Copiar link</button>
              <a class="secondary" style="padding:6px 8px; text-decoration:none; border-radius:8px; background:#1f2937; color:#d1d5db;" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </li>`;
        }).join('')
      : '<li><span class="muted">Sin tokens</span></li>';

    // Submissions
    const submissions = quotes.submissions || data.submissions || [];
    submissionsList.innerHTML = submissions.length
      ? submissions.map(s => `<li><span>${s.name} (${s.email})</span><span class="muted">${new Date(s.createdAt).toLocaleString()}</span></li>`).join('')
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
    loginStatus.textContent = 'Autenticado (token guardado)';
    loadAnalytics();
  }
})();
