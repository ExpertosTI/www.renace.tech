const N8N_METRICS_WEBHOOK = 'https://ai.renace.tech/webhook/6e33280a-faeb-4394-a34c-142fee0ebfc7';

function getN8nSessionId() {
  try {
    let id = localStorage.getItem('n8n_chat_session');
    if (!id) {
      id = 'session-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('n8n_chat_session', id);
    }
    return id;
  } catch (e) {
    return 'temp-' + Math.random().toString(36).substr(2, 9);
  }
}

function sendMetricsEvent(type, data) {
  try {
    if (!N8N_METRICS_WEBHOOK || typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const hostname = window.location && window.location.hostname;
    const allowedHosts = ['renace.tech', 'www.renace.tech'];
    if (!hostname || !allowedHosts.includes(hostname)) {
      return;
    }

    let path = '/';
    let origin = hostname;

    try {
      path = window.location && window.location.pathname ? window.location.pathname : '/';
      origin = window.location && window.location.origin ? window.location.origin : hostname;
    } catch (e) {}

    let referrerDomain = 'Directo';
    try {
      if (document.referrer) {
        const refUrl = new URL(document.referrer, origin);
        referrerDomain = refUrl.hostname;
      }
    } catch (e) {}

    const payload = {
      type,
      sessionId: getN8nSessionId(),
      path,
      origin,
      fullUrl: origin + path,
      referrer: referrerDomain,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      data: data || {},
    };

    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(N8N_METRICS_WEBHOOK, blob);
        return;
      } catch (e) {}
    }

    fetch(N8N_METRICS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (e) {}
}

function initLinksMetrics() {
  try {
    if (typeof window === 'undefined') return;

    try {
      if (typeof sessionStorage !== 'undefined') {
        const key = 'metrics_pageview_' + window.location.pathname;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          sendMetricsEvent('page_view');
        }
      } else {
        sendMetricsEvent('page_view');
      }
    } catch (e) {
      sendMetricsEvent('page_view');
    }

    document.addEventListener(
      'click',
      (e) => {
        const target = e.target.closest('a, button, .linktree-link');
        if (!target) return;

        const buttonText = (target.innerText || target.title || 'Icono').trim().substring(0, 80);

        let safeTargetUrl = 'action';
        try {
          if (target.href) {
            const parsed = new URL(target.href, window.location.href);
            safeTargetUrl = parsed.origin + parsed.pathname;
          }
        } catch (e) {}

        sendMetricsEvent('click', {
          element: target.tagName,
          text: buttonText,
          targetUrl: safeTargetUrl,
        });
      },
      { passive: true }
    );
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    initLinksMetrics();
  } catch (e) {}
});
