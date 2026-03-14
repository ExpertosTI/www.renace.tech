/**
 * Global enhancements for RENACE Tech
 * 14 mejoras JS aplicadas a toda la web (scroll, atajos, WhatsApp, rendimiento, animaciones, etc.)
 */

(function () {
    const WHATSAPP_NUMBER = '8494577463';
    const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    onReady(() => {
        initSmoothScrollProgress();       // t20
        initBackToTopButton();            // t21
        initPricingWhatsAppCTAs();        // t22 + t23 (parte)
        restoreLastSelectedPlan();        // t23 (parte)
        initKeyboardShortcuts();          // t24
        initGlobalErrorHandler();         // t25
        optimizeVisualEffectsForDevice(); // t26 + t31
        enhanceDocumentsSearch();         // t27
        enhanceClientLogosAnimations();   // t28
        initSectionReveal();              // t29
        initMobileHeaderAutoHide();       // t30
    });

    // 1) Barra de progreso global de scroll
    function initSmoothScrollProgress() {
        if (document.getElementById('scroll-progress-bar')) return;

        const progressBar = document.createElement('div');
        progressBar.id = 'scroll-progress-bar';
        Object.assign(progressBar.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '3px',
            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
            transformOrigin: '0 0',
            transform: 'scaleX(0)',
            transition: 'transform 0.1s ease-out, opacity 0.3s ease',
            opacity: '0',
            zIndex: '9999',
            pointerEvents: 'none'
        });
        document.body.appendChild(progressBar);

        function update() {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (docHeight <= 0) {
                progressBar.style.opacity = '0';
                progressBar.style.transform = 'scaleX(0)';
                return;
            }
            const progress = window.scrollY / docHeight;
            progressBar.style.transform = `scaleX(${Math.max(0, Math.min(1, progress)).toFixed(3)})`;
            progressBar.style.opacity = progress > 0.02 ? '1' : '0';
        }

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    // 2) Botón flotante "Volver arriba"
    function initBackToTopButton() {
        if (document.getElementById('back-to-top-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'back-to-top-btn';
        btn.setAttribute('aria-label', 'Volver arriba');
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';

        Object.assign(btn.style, {
            position: 'fixed',
            right: '1.5rem',
            bottom: '5.5rem', // por encima del botón de chat
            width: '44px',
            height: '44px',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            color: '#0b1120',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(15,23,42,0.7)',
            opacity: '0',
            transform: 'translateY(10px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            zIndex: '9999'
        });

        document.body.appendChild(btn);

        const showThreshold = 400;

        function toggleVisibility() {
            if (window.scrollY > showThreshold) {
                btn.style.opacity = '1';
                btn.style.transform = 'translateY(0)';
            } else {
                btn.style.opacity = '0';
                btn.style.transform = 'translateY(10px)';
            }
        }

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        toggleVisibility();
    }

    // 3) CTAs de pricing -> WhatsApp + guardar plan seleccionado
    function initPricingWhatsAppCTAs() {
        const cards = document.querySelectorAll('.pricing-card');
        if (!cards.length) return;

        cards.forEach(card => {
            // Solo en secciones de precios reales (evitar módulo de facturas)
            const pricingRoot = card.closest('#precios, .pricing-hero');
            if (!pricingRoot) return;

            const titleEl = card.querySelector('.plan-name');
            const cta = card.querySelector('.btn-primary, .btn-secondary');
            if (!titleEl || !cta) return;

            const planName = (titleEl.textContent || '').trim();

            cta.addEventListener('click', (event) => {
                // Reemplazar el comportamiento por defecto
                event.preventDefault();

                const page = getPageContext();
                const message = `Hola RENACE Tech, estoy interesado en el plan ${planName} que vi en la página de ${page}. ¿Podemos hablar?`;
                const url = `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank', 'noopener');

                try {
                    localStorage.setItem('renace:lastPlanName', planName);
                } catch (e) {
                    // Ignorar errores de storage
                }

                highlightLastSelectedPlan(card);
            });
        });
    }

    function getPageContext() {
        if (document.body.classList.contains('maintenance-page')) return 'mantenimiento';
        if (document.body.classList.contains('pricing-page')) return 'precios';
        if (window.location.pathname.includes('facturas')) return 'facturación';
        if (window.location.pathname.includes('documentos')) return 'documentos';
        return 'inicio';
    }

    // 4) Restaurar último plan seleccionado
    function restoreLastSelectedPlan() {
        let lastPlan = null;
        try {
            lastPlan = localStorage.getItem('renace:lastPlanName');
        } catch (e) {
            lastPlan = null;
        }

        if (!lastPlan) return;

        const cards = document.querySelectorAll('.pricing-card');
        cards.forEach(card => {
            const root = card.closest('#precios, .pricing-hero');
            if (!root) return;

            const titleEl = card.querySelector('.plan-name');
            if (!titleEl) return;

            const planName = (titleEl.textContent || '').trim();
            if (planName === lastPlan) {
                highlightLastSelectedPlan(card);
            }
        });
    }

    function highlightLastSelectedPlan(card) {
        if (!card || card.dataset.lastSelected === 'true') return;
        card.dataset.lastSelected = 'true';

        card.style.boxShadow = '0 0 0 2px rgba(56,189,248,0.85), 0 25px 50px rgba(15,23,42,0.9)';
        if (!card.style.position) {
            card.style.position = 'relative';
        }

        if (!card.querySelector('.last-plan-badge')) {
            const badge = document.createElement('div');
            badge.className = 'last-plan-badge';
            badge.textContent = 'Tu última elección';
            Object.assign(badge.style, {
                position: 'absolute',
                left: '20px',
                top: '14px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'rgba(15,23,42,0.95)',
                color: '#e0f2fe',
                border: '1px solid rgba(56,189,248,0.9)',
                boxShadow: '0 6px 24px rgba(15,23,42,0.9)',
                zIndex: '12'
            });
            card.appendChild(badge);
        }
    }

    // 5) Atajos de teclado globales
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

            if (!e.altKey) return;
            const key = e.key.toLowerCase();

            if (key === 'p') {
                e.preventDefault();
                goToSectionOrPage('precios', 'index.html');
            } else if (key === 'd') {
                e.preventDefault();
                goToExternalOrSection('documentos.html', 'documentos');
            } else if (key === 'f') {
                e.preventDefault();
                if (!window.location.pathname.includes('facturas')) {
                    window.location.href = 'facturas.html';
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else if (key === 'c') {
                e.preventDefault();
                if (typeof openChat === 'function') {
                    openChat();
                }
            } else if (key === 't') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    function goToSectionOrPage(id, basePath) {
        const target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            const hash = `#${id}`;
            if (!window.location.pathname.endsWith(`/${basePath}`)) {
                window.location.href = `${basePath}${hash}`;
            }
        }
    }

    function goToExternalOrSection(path, id) {
        const target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (!window.location.pathname.includes(path)) {
            window.location.href = path;
        }
    }

    // 6) Gestor global de errores JS con aviso discreto
    function initGlobalErrorHandler() {
        let errorShown = false;

        function showErrorToast(message) {
            if (errorShown) return;
            errorShown = true;

            const toast = document.createElement('div');
            toast.setAttribute('role', 'status');
            toast.textContent = message;

            Object.assign(toast.style, {
                position: 'fixed',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%) translateY(10px)',
                background: 'rgba(15,23,42,0.96)',
                color: '#e5e7eb',
                padding: '0.75rem 1.5rem',
                borderRadius: '999px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 18px 45px rgba(15,23,42,0.9)',
                zIndex: '9999',
                opacity: '0',
                transition: 'opacity 0.3s ease, transform 0.3s ease'
            });

            const icon = document.createElement('span');
            icon.innerHTML = '⚠️';
            icon.style.fontSize = '1rem';
            toast.prepend(icon);

            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(10px)';
                setTimeout(() => toast.remove(), 400);
            }, 4500);
        }

        window.addEventListener('error', (event) => {
            console.error('Error capturado:', event.error || event.message || event);
            showErrorToast('Algo no salió bien en la página. Si ves algo raro, avísanos.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promesa rechazada sin manejar:', event.reason);
            showErrorToast('Detectamos un problema de conexión o proceso. Intenta de nuevo en unos segundos.');
        });
    }

    function optimizeVisualEffectsForDevice() {
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);

        function applyPreferences() {
            const viewportMin = Math.min(
                window.innerWidth || (window.screen && window.screen.width) || 0,
                window.innerHeight || (window.screen && window.screen.height) || 0
            );
            const isVerySmallViewport = viewportMin && viewportMin <= 360;

            const cores = navigator.hardwareConcurrency || 2;
            const isLowCore = cores <= 2;

            const ua = (navigator.userAgent || '').toLowerCase();
            const isWatch = ua.indexOf('watch') !== -1;

            const shouldReduce = (prefersReducedMotion && prefersReducedMotion.matches) || isTouchDevice;
            const ultraLite = isVerySmallViewport || isLowCore || isWatch;

            if (!shouldReduce && !ultraLite) return;

            document.body.classList.add('reduced-motion');
            if (ultraLite) {
                document.body.classList.add('ultra-lite-mode');
                window.RENACE_ULTRA_LITE = true;
            }

            ['.custom-cursor', '.cursor', '.cursor-follower', '.fluid-effect', '.dynamic-bg', '.hero-video'].forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.display = 'none';
                });
            });

            if (window.threeEffects && typeof window.threeEffects.destroy === 'function') {
                try {
                    window.threeEffects.destroy();
                } catch (e) {
                    console.warn('Error al destruir ThreeEffects:', e);
                }
                window.threeEffects = null;
            }

            const immersiveCanvas = document.getElementById('immersive-canvas');
            if (immersiveCanvas) {
                immersiveCanvas.style.display = 'none';
            }
        }

        if (prefersReducedMotion && typeof prefersReducedMotion.addEventListener === 'function') {
            prefersReducedMotion.addEventListener('change', applyPreferences);
        }

        applyPreferences();
    }

    // 8) Buscador de documentos mejorado (filtrado en vivo + contador)
    function enhanceDocumentsSearch() {
        const searchInput = document.querySelector('.finder-search');
        const filesContainer = document.getElementById('files-container');
        if (!searchInput || !filesContainer) return;

        let counter = document.querySelector('.finder-results-count');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'finder-results-count';
            Object.assign(counter.style, {
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginTop: '0.25rem',
                textAlign: 'right'
            });
            const actions = searchInput.closest('.finder-actions') || searchInput.parentElement;
            if (actions) actions.appendChild(counter);
        }

        const items = Array.from(filesContainer.querySelectorAll('.file-item'));

        function updateResults() {
            const term = searchInput.value.trim().toLowerCase();
            let visibleCount = 0;

            items.forEach(item => {
                const nameEl = item.querySelector('.file-name');
                const metaEl = item.querySelector('.file-meta');
                const baseText = `${nameEl ? nameEl.textContent : ''} ${metaEl ? metaEl.textContent : ''}`;
                const dataName = item.getAttribute('data-name') || '';
                const text = `${baseText} ${dataName}`.toLowerCase();

                const match = !term || text.includes(term);
                item.style.display = match ? '' : 'none';
                if (match) visibleCount++;
            });

            const total = items.length;
            if (term) {
                counter.textContent = `${visibleCount} resultado${visibleCount === 1 ? '' : 's'} para "${term}"`;
            } else {
                counter.textContent = `${total} elemento${total === 1 ? '' : 's'} en la carpeta`;
            }
        }

        const handler = (typeof utils !== 'undefined' && typeof utils.debounce === 'function')
            ? utils.debounce(updateResults, 120)
            : updateResults;

        searchInput.addEventListener('input', handler);
        updateResults();
    }

    // 9) Animación mejorada para logos de clientes con IntersectionObserver
    function enhanceClientLogosAnimations() {
        const containers = document.querySelectorAll('#clients-logos-container');
        if (!containers.length || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const container = entry.target;
                const logos = Array.from(container.querySelectorAll('.client-logo'));

                logos.forEach((logo, index) => {
                    logo.style.opacity = '0';
                    logo.style.transform = 'translateY(12px) scale(0.96)';
                    logo.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    setTimeout(() => {
                        logo.style.opacity = '1';
                        logo.style.transform = 'translateY(0) scale(1)';
                    }, index * 80);
                });

                obs.unobserve(container);
            });
        }, { threshold: 0.15 });

        containers.forEach(c => observer.observe(c));
    }

    // 10) Animación de aparición por sección (section reveal)
    function initSectionReveal() {
        if (typeof IntersectionObserver === 'undefined') return;

        const sections = Array.from(document.querySelectorAll('main section'));
        if (!sections.length) return;

        sections.forEach(sec => {
            if (sec.dataset.revealInitialized === 'true') return;
            sec.dataset.revealInitialized = 'true';
            sec.style.opacity = '0';
            sec.style.transform = 'translateY(18px)';
            sec.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        });

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sec = entry.target;
                    sec.style.opacity = '1';
                    sec.style.transform = 'translateY(0)';
                    obs.unobserve(sec);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        sections.forEach(sec => observer.observe(sec));
    }

    // 11) Ocultar header al hacer scroll hacia abajo en mobile y mostrar al subir
    function initMobileHeaderAutoHide() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        function update() {
            const current = window.scrollY;
            const goingDown = current > lastScrollY + 10;
            const goingUp = current < lastScrollY - 10;
            const isMobileWidth = window.innerWidth <= 768;

            if (isMobileWidth) {
                header.style.transition = 'transform 0.25s ease';
                if (goingDown && current > 80) {
                    header.style.transform = 'translateY(-100%)';
                } else if (goingUp || current <= 80) {
                    header.style.transform = 'translateY(0)';
                }
            } else {
                header.style.transform = '';
            }

            lastScrollY = current;
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                header.style.transform = '';
            }
        });
    }
})();
