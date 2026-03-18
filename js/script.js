// Configuración global
const CONFIG = {
    animationDuration: 300,
    scrollThreshold: 100,
    debounceTime: 150,
    lazyLoadThreshold: 0.1
};

// Sistema de estado global de la aplicación
const AppState = {
    isLoading: true,
    isInitialized: false,
    errors: [],
    components: new Set(),
    initializationProgress: 0
};
const N8N_CHAT_WEBHOOK = 'https://ai.renace.tech/webhook/499666c3-d807-4bb7-8195-43932f64a91f/chat';
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
        console.warn('Almacenamiento bloqueado, usando sesión temporal para n8n chat');
        return 'temp-' + Math.random().toString(36).substr(2, 9);
    }
}

// ICloud Manager Class
class ICloudManager {
    constructor() {
        this.isSignedIn = false;
        this.storageUsed = 0;
        this.storageTotal = 5 * 1024 * 1024 * 1024; // 5GB por defecto
    }

    init() {
        try {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                return false;
            }

            const storageInfo = document.getElementById('storage-info');
            if (!storageInfo) {
                return false;
            }

            this.checkICloudStatus();
            return true;
        } catch (error) {
            console.warn('No se pudo inicializar ICloudManager:', error);
            return false;
        }
    }

    checkICloudStatus() {
        try {
            // Simulación de verificación de estado
            setTimeout(() => {
                this.isSignedIn = true;
                this.updateStorageDisplay();
            }, 1000);
        } catch (error) {
            console.warn('Error al verificar estado de iCloud:', error);
        }
    }

    monitorICloudStorage() {
        try {
            // Verificar si se está ejecutando en un contexto de navegador
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                return;
            }

            // Simulación de monitoreo de almacenamiento
            this.updateStorageDisplay();
        } catch (error) {
            console.warn('Error al monitorear almacenamiento:', error);
        }
    }

    updateStorageDisplay() {
        try {
            // Verificar si se está ejecutando en un contexto de navegador
            if (typeof document === 'undefined') {
                return;
            }

            const storageInfo = document.getElementById('storage-info');
            if (storageInfo) {
                const usedGB = this.formatBytes(this.storageUsed);
                const totalGB = this.formatBytes(this.storageTotal);
                const percentage = ((this.storageUsed / this.storageTotal) * 100).toFixed(1);

                storageInfo.innerHTML = `
                    <div class="storage-bar">
                        <div class="storage-used" style="width: ${percentage}%"></div>
                    </div>
                    <div class="storage-text">
                        ${usedGB} usado de ${totalGB}
                    </div>
                `;
            }
        } catch (error) {
            console.warn('Error al actualizar display de almacenamiento:', error);
        }
    }

    formatBytes(bytes) {
        try {
            if (bytes === 0) return '0 GB';
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
        } catch (error) {
            console.warn('Error al formatear bytes:', error);
            return '0 GB';
        }
    }

    signIn() {
        try {
            this.isSignedIn = true;
            this.updateStorageDisplay();
            return true;
        } catch (error) {
            console.warn('Error al iniciar sesión:', error);
            return false;
        }
    }

    signOut() {
        try {
            this.isSignedIn = false;
            this.storageUsed = 0;
            this.updateStorageDisplay();
            return true;
        } catch (error) {
            console.warn('Error al cerrar sesión:', error);
            return false;
        }
    }
}

// Función simple para bloquear/desbloquear visualmente la edición en el finder
function toggleFileLock(forceState) {
    const btn = document.querySelector('.finder-lock-btn i');
    const finder = document.querySelector('.finder-window');
    if (!btn || !finder) {
        return finder ? finder.classList.contains('locked') : true;
    }

    const current = finder.classList.contains('locked');
    const nextLocked = typeof forceState === 'boolean' ? forceState : !current;

    finder.classList.toggle('locked', nextLocked);
    btn.classList.toggle('fa-lock', nextLocked);
    btn.classList.toggle('fa-lock-open', !nextLocked);

    return nextLocked;
}

// File Manager Class
class FileManager {
    constructor() {
        this.currentPath = '/';
        this.clipboard = null;
        this.initEventListeners();
    }

    initEventListeners() {
        const backBtn = document.querySelector('.nav-item:nth-child(1)');
        const forwardBtn = document.querySelector('.nav-item:nth-child(2)');
        if (backBtn) backBtn.addEventListener('click', () => this.navigateBack());
        if (forwardBtn) forwardBtn.addEventListener('click', () => this.navigateForward());

        const fileOperationBtns = document.querySelectorAll('.file-operation-btn');
        if (fileOperationBtns.length) {
            fileOperationBtns.forEach(btn => {
                btn.addEventListener('click', (e) => this.handleFileOperation(e));
            });
        }

        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        this.initICloudIntegration();
    }

    navigateBack() {
        console.log('Navigating back');
    }

    navigateForward() {
        console.log('Navigating forward');
    }

    handleFileOperation(event) {
        const operation = event.currentTarget.getAttribute('title');
        switch (operation) {
            case 'Nueva Carpeta':
                this.createNewFolder();
                break;
            case 'Subir Archivo':
                this.uploadFile();
                break;
            case 'Copiar':
                this.copySelected();
                break;
            case 'Pegar':
                this.pasteFiles();
                break;
        }
    }

    copySelected() {
        console.log('Copying selected files');
    }

    pasteFiles() {
        if (this.clipboard) {
            console.log('Pasting files from clipboard');
        }
    }

    handleSearch(query) {
        console.log('Searching for:', query);
    }

    initICloudIntegration() {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        const hasICloudUI = document.querySelector('.icloud-storage-bar, .icloud-info')
            || document.getElementById('storage-info');

        if (!hasICloudUI) {
            return;
        }

        this.checkICloudStatus();
        this.monitorICloudStorage();
    }

    checkICloudStatus() {
        setTimeout(() => {
            this.isSignedIn = false;
            this.updateStorageDisplay();
        }, 1000);
    }

    monitorICloudStorage() {
        console.log('Monitoring iCloud storage');
    }

    updateStorageDisplay() {
        const storageBar = document.querySelector('.icloud-storage-bar');
        const storageInfo = document.querySelector('.icloud-info');

        if (storageBar && storageInfo) {
            const percentage = (this.storageUsed / this.storageTotal) * 100;
            storageBar.style.width = `${percentage}%`;
            storageInfo.innerHTML = `
                <span>${this.formatBytes(this.storageUsed)} usado</span>
                <span>${this.formatBytes(this.storageTotal)} total</span>
            `;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Utilidades
const utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
};

// Gestión de navegación
const navigation = {
    init() {
        this.menuToggle = document.querySelector('.menu-toggle');
        this.mainNav = document.querySelector('.modern-nav');
        this.header = document.querySelector('header');

        if (this.header) {
            this.handleScroll();
        }

        this.bindEvents();
    },

    bindEvents() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        const contactForm = document.querySelector('.contact-form form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                showNotification('Mensaje enviado correctamente', 'success');
                contactForm.reset();
            });
        }
    },

    handleScroll() {
        const scrollPosition = window.scrollY;

        if (scrollPosition > CONFIG.scrollThreshold) {
            this.header.classList.add('scrolled');
        } else {
            this.header.classList.remove('scrolled');
        }
    }
};

// Animaciones y efectos
const animations = {
    init() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: CONFIG.lazyLoadThreshold,
                rootMargin: '50px'
            }
        );

        this.observeElements();
    },

    observeElements() {
        document.querySelectorAll('.fade-in-element').forEach(el => {
            this.observer.observe(el);
        });
    }
};

// Gestión de formularios
const forms = {
    init() {
        const contactForm = document.querySelector('.contact-form form');
        if (contactForm) {
            contactForm.addEventListener('submit', this.handleSubmit.bind(this));
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                this.showNotification(result.message || 'Mensaje enviado con éxito', 'success');
                form.reset();
            } else {
                throw new Error(result.error || result.message || 'Error al enviar el mensaje');
            }
        } catch (error) {
            console.error('Error sending form:', error);
            // Fallback for static testing if PHP fails or is not available
            if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
                this.showNotification('Nota: Backend PHP no detectado. Simulación de éxito.', 'info');
                setTimeout(() => form.reset(), 1000);
            } else {
                this.showNotification(error.message, 'error');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    },

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <img src="/images/logo.svg" alt="RENACE.TECH" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">
                <strong style="font-size:0.72rem;letter-spacing:0.04em;">RENACE.TECH</strong>
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <div class="notification-progress"></div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.add('hide');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }
};

function openChat() {
    const chatModal = document.getElementById('chat-modal');
    if (chatModal) {
        chatModal.classList.add('active');
        const toggle = document.querySelector('.ai-chat-toggle');
        if (toggle) {
            toggle.classList.add('ai-chat-toggle-hidden');
        }
        ensureChatViewportHandlers();
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            if (input) input.focus();
            try {
                adjustChatPanelHeight();
            } catch (e) { }
        }, 300);
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.add('ai-chat-open');
        }
    }
}

function closeChat() {
    const chatModal = document.getElementById('chat-modal');
    if (chatModal) {
        chatModal.classList.remove('active');
        const toggle = document.querySelector('.ai-chat-toggle');
        if (toggle) {
            toggle.classList.remove('ai-chat-toggle-hidden');
        }
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.remove('ai-chat-open');
        }
    }
}

const CHAT_MOBILE_BREAKPOINT = 768;

let aiChatViewportHandlerAttached = false;

function ensureChatViewportHandlers() {
    if (aiChatViewportHandlerAttached || typeof window === 'undefined') return;
    aiChatViewportHandlerAttached = true;

    const handler = () => {
        try {
            adjustChatPanelHeight();
        } catch (e) { }
    };

    window.addEventListener('resize', handler);

    if (window.visualViewport && window.visualViewport.addEventListener) {
        window.visualViewport.addEventListener('resize', handler);
    }
}

function adjustChatPanelHeight() {
    const chatPanel = document.querySelector('.ai-chat-panel');
    const chatModal = document.getElementById('chat-modal');
    if (!chatPanel || !chatModal || !chatModal.classList.contains('active')) return;

    // Dejar que el CSS (100vh/100dvh + media queries) gobierne el alto.
    chatPanel.style.height = '';
    chatPanel.style.maxHeight = '';
}

function initAIChat() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    const cameraBtn = document.getElementById('ai-chat-camera');

    if (!messagesContainer || !input || !sendBtn) return;

    if (messagesContainer.children.length === 0) {
        addMessage('bot', '¡Hola! Soy Roberto, de Renace. ¿En qué puedo ayudarte hoy?');
    }
    input.setAttribute('aria-label', 'Escribe tu mensaje para el asistente de Renace');

    function updateSendButtonState() {
        const hasText = input.value && input.value.trim().length > 0;
        sendBtn.disabled = !hasText;
        sendBtn.setAttribute('aria-disabled', hasText ? 'false' : 'true');
    }

    input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        if (this.value === '') this.style.height = '';
        updateSendButtonState();
    });

    input.addEventListener('focus', function () {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        if (viewportWidth > CHAT_MOBILE_BREAKPOINT) {
            setTimeout(() => {
                try {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch (e) { }
            }, 250);
        }
    });

    input.addEventListener('keydown', function (e) {
        const isEnterKey = (e.key === 'Enter' || e.key === 'Return' || e.keyCode === 13);

        if (isEnterKey && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    updateSendButtonState();

    if (cameraBtn && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        cameraBtn.addEventListener('click', openCameraOverlay);
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage('user', text);
        sendMetricsEvent('chat_message', { length: text.length });
        input.value = '';
        input.style.height = '';

        // Actualizar accesibilidad del botón de envío después de limpiar el input
        try {
            updateSendButtonState();
        } catch (e) { }

        if (!N8N_CHAT_WEBHOOK) {
            addMessage('bot', 'El asistente no está disponible en este momento.');
            return;
        }

        await sendMessageToN8n(text);
    }

    async function sendMessageToN8n(userText) {
        showTypingIndicator();

        const sessionId = getN8nSessionId();

        // Payload simplificado - solo lo esencial
        const payload = {
            chatInput: userText,
            sessionId: sessionId
        };

        // Log para debugging
        console.log('📤 Enviando a n8n:', payload);

        try {
            // Timeout de 30 segundos
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(N8N_CHAT_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('📥 Respuesta HTTP:', response.status, response.statusText);

            // Validar respuesta HTTP
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const rawText = await response.text();
            console.log('📥 Respuesta raw:', rawText);

            let data = null;

            // Parsear JSON de forma segura
            try {
                data = rawText && rawText.trim() ? JSON.parse(rawText) : null;
            } catch (parseError) {
                console.warn('⚠️ Respuesta no es JSON válido:', rawText);
                // Si no es JSON, usar el texto plano
                data = { output: rawText };
            }

            removeTypingIndicator();

            // Validar que hay contenido
            if (!data && !rawText) {
                addMessage('bot', 'No recibí respuesta del asistente. Por favor intenta de nuevo.');
                return;
            }

            // Manejar reportes especiales (sales reports)
            if (data && typeof data === 'object' && (data.type === 'sales_report' || data.reportType === 'sales')) {
                const reportHtml = buildSalesReportCard(data);
                if (reportHtml) {
                    addHtmlMessage('bot', reportHtml);
                }
            }

            // Extraer texto de respuesta con múltiples formatos soportados
            const replyText = normalizeN8nReply(data, rawText);

            if (replyText && replyText.trim()) {
                addMessage('bot', String(replyText));
            } else {
                addMessage('bot', 'El asistente respondió sin contenido de texto.');
            }

        } catch (error) {
            console.error('❌ Error enviando mensaje a n8n:', error);
            removeTypingIndicator();

            // Mensajes de error específicos
            let errorMessage = 'Hubo un problema de conexión con el asistente.';

            if (error.name === 'AbortError') {
                errorMessage = 'La solicitud tardó demasiado. Por favor intenta de nuevo.';
            } else if (error.message.includes('HTTP 4')) {
                errorMessage = 'Error en la solicitud. Por favor verifica tu mensaje.';
            } else if (error.message.includes('HTTP 5')) {
                errorMessage = 'El servidor está experimentando problemas. Intenta en unos momentos.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'No se pudo conectar con el asistente. Verifica tu conexión a internet.';
            }

            addMessage('bot', errorMessage + ' Si el problema persiste, contacta a soporte.');
        }
    }

    function normalizeN8nReply(data, rawText) {
        let reply = null;

        if (data && typeof data === 'object') {
            // Soporta formatos típicos: { output }, { reply }, { message }, { text }
            reply =
                data.output ||
                data.reply ||
                data.message ||
                data.text ||
                (Array.isArray(data) && data[0] && (data[0].output || data[0].reply || data[0].message || data[0].text));
        }

        // Si sigue sin reply y el backend envió un string JSON como texto plano
        if (!reply && rawText && typeof rawText === 'string') {
            const trimmed = rawText.trim();
            const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'));
            if (looksLikeJson) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (parsed && typeof parsed === 'object') {
                        reply =
                            parsed.output ||
                            parsed.reply ||
                            parsed.message ||
                            parsed.text ||
                            (Array.isArray(parsed) && parsed[0] && (parsed[0].output || parsed[0].reply || parsed[0].message || parsed[0].text));
                    }
                } catch (e) {
                    // si falla, dejamos reply como null y usamos el texto crudo
                }
            }
        }

        if (!reply && rawText) {
            reply = rawText;
        }

        return reply != null ? String(reply) : null;
    }

    function formatMessageText(text) {
        if (text == null) return '';
        let safe = String(text);

        // Escapar HTML básico para evitar inyecciones
        safe = safe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Negritas estilo Markdown: **texto**
        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');

        // Saltos de línea
        safe = safe.replace(/\n/g, '<br>');

        return safe;
    }

    function addMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-chat-message ai-chat-message-${sender}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-chat-bubble';
        bubble.innerHTML = formatMessageText(text);

        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
    }

    function addHtmlMessage(sender, html) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-chat-message ai-chat-message-${sender}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-chat-bubble';
        bubble.innerHTML = html;

        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
    }

    function buildSalesReportCard(report) {
        if (!report || typeof report !== 'object') return '';

        const escape = (value) => {
            if (value == null) return '';
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        };

        const title = escape(report.title || 'Resumen de ventas');
        const period = escape(report.period || report.range || '');
        const highlight = escape(report.highlight || report.summary || '');

        const rawItems = Array.isArray(report.metrics)
            ? report.metrics
            : Array.isArray(report.items)
                ? report.items
                : [];

        const rowsHtml = rawItems
            .map((item) => {
                if (!item || typeof item !== 'object') return '';
                const label = escape(item.label || item.name || '');
                const value = escape(item.value || item.total || item.amount || '');
                let trendValue = '';
                if (typeof item.trend === 'string') {
                    trendValue = escape(item.trend);
                } else if (typeof item.trend === 'number') {
                    trendValue = (item.trend > 0 ? '+' : '') + item.trend + '%';
                }
                const trendClass = trendValue && trendValue.startsWith('-') ? 'down' : 'up';
                const trendHtml = trendValue
                    ? `<div class="sales-report-trend sales-report-trend-${trendClass}">${trendValue}</div>`
                    : '';

                return `
                    <div class="sales-report-row">
                        <div class="sales-report-label">${label}</div>
                        <div class="sales-report-value">${value}</div>
                        ${trendHtml}
                    </div>
                `;
            })
            .filter(Boolean)
            .join('');

        const bodyHtml = rowsHtml
            ? `<div class="sales-report-body">${rowsHtml}</div>`
            : '';

        const periodHtml = period
            ? `<div class="sales-report-period">${period}</div>`
            : '';

        const highlightHtml = highlight
            ? `<div class="sales-report-highlight">${highlight}</div>`
            : '';

        const headerHtml = `
            <div class="sales-report-header">
                <div class="sales-report-title">${title}</div>
                ${periodHtml}
            </div>
        `;

        const cardHtml = `
            <div class="sales-report-card">
                ${headerHtml}
                ${highlightHtml}
                ${bodyHtml}
            </div>
        `;

        return cardHtml;
    }

    function showTypingIndicator() {
        const existing = document.getElementById('typing-indicator');
        if (existing) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'ai-chat-message ai-chat-message-bot ai-chat-typing';
        msgDiv.id = 'typing-indicator';

        const bubble = document.createElement('div');
        bubble.className = 'ai-chat-bubble';

        bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        try {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        } catch (e) {
            // Fallback para navegadores sin scroll suave programático
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function openCameraOverlay() {
        let stream = null;

        const overlay = document.createElement('div');
        overlay.className = 'ai-camera-overlay';
        overlay.innerHTML = `
            <div class="ai-camera-modal">
                <div class="ai-camera-header">
                    <span>Capturar imagen para revisión</span>
                    <button type="button" class="ai-camera-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="ai-camera-body">
                    <video class="ai-camera-video" autoplay playsinline></video>
                </div>
                <div class="ai-camera-footer">
                    <button type="button" class="ai-camera-capture">Capturar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const video = overlay.querySelector('.ai-camera-video');
        const closeBtn = overlay.querySelector('.ai-camera-close');
        const captureBtn = overlay.querySelector('.ai-camera-capture');

        function stopStream() {
            if (stream) {
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
                stream = null;
            }
        }

        function closeOverlay() {
            stopStream();
            overlay.remove();
        }

        closeBtn.addEventListener('click', () => {
            closeOverlay();
        });

        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                closeOverlay();
            }
        });

        captureBtn.addEventListener('click', async () => {
            if (!video.videoWidth || !video.videoHeight) {
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            closeOverlay();

            addMessage('user', 'He enviado una imagen desde la cámara para revisar condiciones.');
            await sendImageForTerms(dataUrl);
        });

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(mediaStream => {
                stream = mediaStream;
                video.srcObject = stream;
                video.play();
            })
            .catch(() => {
                overlay.remove();
                addMessage('bot', 'No pude acceder a la cámara. Revisa los permisos del navegador.');
            });
    }

    function ensureTesseractLoaded() {
        if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
            return Promise.resolve(true);
        }

        if (window.__tesseractLoader) {
            return window.__tesseractLoader;
        }

        window.__tesseractLoader = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-tesseract]');
            if (existing) {
                existing.addEventListener('load', () => resolve(true), { once: true });
                existing.addEventListener('error', () => reject(new Error('tesseract_load')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            script.async = true;
            script.dataset.tesseract = '1';
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('tesseract_load'));
            document.head.appendChild(script);
        });

        return window.__tesseractLoader;
    }

    async function sendImageForTerms(dataUrl) {
        showTypingIndicator();
        try {
            try {
                await ensureTesseractLoaded();
            } catch (e) {
                removeTypingIndicator();
                addMessage('bot', 'He recibido la imagen, pero no pude cargar el lector de texto en este momento.');
                return;
            }

            if (!window.Tesseract || !Tesseract.recognize) {
                removeTypingIndicator();
                addMessage('bot', 'He recibido la imagen, pero no tengo disponible el lector de texto en este navegador.');
                return;
            }

            const result = await Tesseract.recognize(dataUrl, 'spa+eng');
            removeTypingIndicator();

            const rawText = result && result.data && result.data.text ? result.data.text : '';
            const text = rawText.trim();

            if (!text) {
                addMessage('bot', 'No pude leer texto claro en la imagen. Intenta acercar un poco más el documento o mejorar la iluminación.');
                return;
            }

            const maxChars = 900;
            const preview = text.length > maxChars ? text.slice(0, maxChars) + '…' : text;

            addMessage('bot', 'Esto es lo que leo en la imagen:\n' + preview);
        } catch (e) {
            removeTypingIndicator();
            addMessage('bot', 'Ocurrió un error al procesar la imagen en el navegador.');
        }
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

        const payload = {
            type,
            sessionId: getN8nSessionId(),
            path: window.location.pathname,
            fullUrl: window.location.href,
            referrer: document.referrer || 'Directo',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            data: data || {}
        };

        const body = JSON.stringify(payload);

        let sameOrigin = false;
        try {
            const metricsUrl = new URL(N8N_METRICS_WEBHOOK, window.location.href);
            sameOrigin = metricsUrl.origin === window.location.origin;
        } catch (e) { }

        if (navigator.sendBeacon && sameOrigin) {
            const blob = new Blob([body], { type: 'application/json' });
            navigator.sendBeacon(N8N_METRICS_WEBHOOK, blob);
            return;
        }

        fetch(N8N_METRICS_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true
        }).catch(() => { });
    } catch (e) { }
}

function initMetrics() {
    try {
        if (typeof window === 'undefined') {
            return;
        }

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

        const chatToggle = document.querySelector('.rg-chat-toggle');
        if (chatToggle) {
            chatToggle.addEventListener('click', () => {
                sendMetricsEvent('chat_open');
            });
        }

        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button, .btn');
            if (!target) return;

            const buttonText = (target.innerText || target.title || 'Icono')
                .trim()
                .substring(0, 50);

            sendMetricsEvent('click', {
                element: target.tagName,
                text: buttonText,
                targetUrl: target.href || 'action'
            });
        }, { passive: true });

        if (window && window.addEventListener) {
            window.addEventListener('error', (event) => {
                try {
                    sendMetricsEvent('js_error', {
                        message: event.message,
                        source: event.filename,
                        line: event.lineno,
                        col: event.colno,
                        stack: event.error && event.error.stack
                            ? String(event.error.stack).substring(0, 2000)
                            : undefined
                    });
                } catch (_) { }
            });

            window.addEventListener('unhandledrejection', (event) => {
                try {
                    const reason = event.reason || {};
                    const message = typeof reason === 'string'
                        ? reason
                        : (reason.message || String(event.reason));

                    sendMetricsEvent('js_unhandledrejection', {
                        message,
                        stack: reason && reason.stack
                            ? String(reason.stack).substring(0, 2000)
                            : undefined
                    });
                } catch (_) { }
            });
        }
    } catch (e) { }
}

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

    const HISTORY_STORAGE_KEY = 'rg_chat_dom_v1';

    function scrollToBottom() {
        const bodyEl = root.querySelector('.rg-chat-body');
        const scroller = bodyEl || messagesEl;
        if (!scroller) return;
        scroller.scrollTop = scroller.scrollHeight;
    }

    try {
        const savedHtml = window.localStorage && window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (savedHtml) {
            messagesEl.innerHTML = savedHtml;
            scrollToBottom();
        }
    } catch (e) { }

    function formatMessageText(text) {
        if (text == null) return '';
        let safe = String(text);

        safe = safe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
        safe = safe.replace(/\n/g, '<br>');

        return safe;
    }

    function persistHistoryDom() {
        try {
            if (!window.localStorage) return;
            window.localStorage.setItem(HISTORY_STORAGE_KEY, messagesEl.innerHTML);
        } catch (e) { }
    }

    function addMessage(sender, text) {
        const li = document.createElement('li');
        li.className = 'rg-chat-message ' + (sender === 'user' ? 'rg-chat-user' : 'rg-chat-bot');
        const bubble = document.createElement('div');
        bubble.className = 'rg-chat-bubble';
        bubble.innerHTML = formatMessageText(text);
        li.appendChild(bubble);
        messagesEl.appendChild(li);
        scrollToBottom();
        persistHistoryDom();
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
        persistHistoryDom();
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
        if (typingLi && typingLi.parentNode) {
            typingLi.parentNode.removeChild(typingLi);
        }
        typingLi = null;
    }

    function normalizeReply(data, rawText) {
        let reply = null;

        if (data && typeof data === 'object') {
            reply =
                data.output ||
                data.reply ||
                data.message ||
                data.text ||
                (Array.isArray(data) && data[0] && (data[0].output || data[0].reply || data[0].message || data[0].text));
        }

        if (!reply && rawText && typeof rawText === 'string') {
            const trimmed = rawText.trim();
            const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'));
            if (looksLikeJson) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (parsed && typeof parsed === 'object') {
                        reply =
                            parsed.output ||
                            parsed.reply ||
                            parsed.message ||
                            parsed.text ||
                            (Array.isArray(parsed) && parsed[0] && (parsed[0].output || parsed[0].reply || parsed[0].message || parsed[0].text));
                    }
                } catch (e) { }
            }
        }

        if (!reply && rawText) {
            reply = rawText;
        }

        return reply != null ? String(reply) : null;
    }

    function buildSalesReportCard(report) {
        if (!report || typeof report !== 'object') return '';

        const escape = (value) => {
            if (value == null) return '';
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        };

        const title = escape(report.title || 'Resumen de ventas');
        const period = escape(report.period || report.range || '');
        const highlight = escape(report.highlight || report.summary || '');

        const rawItems = Array.isArray(report.metrics)
            ? report.metrics
            : Array.isArray(report.items)
                ? report.items
                : [];

        const rowsHtml = rawItems
            .map((item) => {
                if (!item || typeof item !== 'object') return '';
                const label = escape(item.label || item.name || '');
                const value = escape(item.value || item.total || item.amount || '');
                let trendValue = '';
                if (typeof item.trend === 'string') {
                    trendValue = escape(item.trend);
                } else if (typeof item.trend === 'number') {
                    trendValue = (item.trend > 0 ? '+' : '') + item.trend + '%';
                }
                const trendClass = trendValue && trendValue.startsWith('-') ? 'down' : 'up';
                const trendHtml = trendValue
                    ? '<div class="sales-report-trend sales-report-trend-' + trendClass + '">' + trendValue + '</div>'
                    : '';

                return (
                    '<div class="sales-report-row">' +
                    '<div class="sales-report-label">' + label + '</div>' +
                    '<div class="sales-report-value">' + value + '</div>' +
                    trendHtml +
                    '</div>'
                );
            })
            .filter(Boolean)
            .join('');

        const bodyHtml = rowsHtml
            ? '<div class="sales-report-body">' + rowsHtml + '</div>'
            : '';

        const periodHtml = period
            ? '<div class="sales-report-period">' + period + '</div>'
            : '';

        const highlightHtml = highlight
            ? '<div class="sales-report-highlight">' + highlight + '</div>'
            : '';

        const headerHtml =
            '<div class="sales-report-header">' +
            '<div class="sales-report-title">' + title + '</div>' +
            periodHtml +
            '</div>';

        const cardHtml =
            '<div class="sales-report-card">' +
            headerHtml +
            highlightHtml +
            bodyHtml +
            '</div>';

        return cardHtml;
    }

    async function sendMessageToN8n(userText) {
        if (!N8N_CHAT_WEBHOOK) {
            addMessage('bot', 'El asistente no está disponible en este momento.');
            return;
        }

        showTyping();

        const sessionId = getN8nSessionId();

        const payload = {
            message: userText,
            sessionId,
            source: 'renace-web-chat',
            metadata: {
                page: window.location.pathname,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            }
        };

        try {
            const response = await fetch(N8N_CHAT_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const rawText = await response.text();
            let data = null;

            try {
                data = rawText ? JSON.parse(rawText) : null;
            } catch (e) {
                data = null;
            }

            removeTyping();

            if (!response.ok && !rawText) {
                addMessage('bot', 'No pude obtener respuesta del asistente en este momento.');
                return;
            }

            if (data && typeof data === 'object' && (data.type === 'sales_report' || data.reportType === 'sales')) {
                const reportHtml = buildSalesReportCard(data);
                if (reportHtml) {
                    addHtmlMessage(reportHtml);
                }
            }

            const replyText = normalizeReply(data, rawText);

            if (replyText) {
                addMessage('bot', String(replyText));
            } else {
                addMessage('bot', 'El asistente respondió sin contenido de texto.');
            }
        } catch (error) {
            console.error('Error enviando mensaje a n8n:', error);
            removeTyping();
            addMessage('bot', 'Hubo un problema de conexión con el asistente. Intenta de nuevo en unos segundos.');
        }
    }

    function updateSendButtonState() {
        const hasText = input.value && input.value.trim().length > 0;
        sendBtn.disabled = !hasText;
    }

    function shouldAutoCloseOnUserMessage(rawText) {
        if (!rawText) return false;
        let t = String(rawText).toLowerCase();
        try {
            t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (e) { }

        const byeKeywords = [
            'adios',
            'hasta luego',
            'nos vemos',
            'me despido',
            'cerrar chat',
            'cerrar el chat',
            'bye',
            'goodbye'
        ];

        const thanksExact = [
            'gracias',
            'muchas gracias',
            'mil gracias'
        ];

        if (byeKeywords.some(k => t.includes(k))) return true;

        const trimmed = t.trim();
        if (thanksExact.includes(trimmed)) return true;

        return false;
    }

    function open() {
        root.classList.add('rg-chat-open');
        windowEl.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        scrollToBottom();
        try {
            input.focus();
        } catch (e) { }
    }

    function close() {
        root.classList.remove('rg-chat-open');
        windowEl.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', open);
    if (closeBtn) {
        closeBtn.addEventListener('click', close);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            if (root.classList.contains('rg-chat-open')) {
                close();
            }
        }
    });

    input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        if (this.value === '') this.style.height = '';
        updateSendButtonState();
    });

    input.addEventListener('keydown', function (e) {
        const isEnterKey = (e.key === 'Enter' || e.key === 'Return' || e.keyCode === 13);
        if (isEnterKey && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage('user', text);
        sendMetricsEvent('chat_message', { length: text.length });
        input.value = '';
        input.style.height = '';
        updateSendButtonState();

        const willAutoClose = shouldAutoCloseOnUserMessage(text);

        await sendMessageToN8n(text);

        if (willAutoClose) {
            setTimeout(() => {
                try {
                    if (root.classList.contains('rg-chat-open')) {
                        close();
                    }
                } catch (e) { }
            }, 1800);
        }
    }

    if (messagesEl.children.length === 0) {
        addMessage('bot', 'Hola, soy Roberto de RENACE. ¿En qué puedo ayudarte hoy?');
    }
}

// Initialize Chat
document.addEventListener('DOMContentLoaded', initRgChat);
document.addEventListener('DOMContentLoaded', initMetrics);
// Login Functions
function toggleLogin() {
    const modal = document.getElementById('loginModal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    if (modal.style.display === 'flex') {
        document.querySelector('.pin-digit').focus();
    }
}

function verifyPin() {
    const digits = document.querySelectorAll('.pin-digit');
    let pin = '';
    digits.forEach(digit => {
        pin += digit.value;
    });

    if (pin === '131415') {
        localStorage.setItem('isLoggedIn', 'true');
        showNotification('¡Acceso concedido!', 'success');
        toggleLogin();

        // Enable file operations
        const fileOperations = document.querySelectorAll('.file-operation-btn');
        fileOperations.forEach(btn => {
            btn.disabled = false;
        });
    } else {
        showNotification('PIN incorrecto. Intenta de nuevo.', 'error');
        digits.forEach(digit => {
            digit.value = '';
        });
        digits[0].focus();
    }
}

// PIN Input Handling
document.querySelectorAll('.pin-digit').forEach((digit, index, digits) => {
    digit.addEventListener('input', function (e) {
        if (this.value.length === 1 && index < digits.length - 1) {
            digits[index + 1].focus();
        }
    });

    digit.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !this.value && index > 0) {
            digits[index - 1].focus();
        }
    });
});

// Navigation helper hacia Documentos
function scrollToFiles() {
    const filesSection = document.querySelector('.files-section');
    if (filesSection) {
        filesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

let DOCUMENTS_DATA = [];

function getSafeDocumentUrl(doc) {
    try {
        if (!doc || typeof doc.file !== 'string') {
            return null;
        }

        const raw = doc.file.trim();
        if (!raw) {
            return null;
        }

        const lower = raw.toLowerCase();

        if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
            console.warn('URL de documento potencialmente insegura bloqueada:', raw);
            return null;
        }

        if (lower.includes('..')) {
            console.warn('Ruta de documento con secuencias no permitidas bloqueada:', raw);
            return null;
        }

        return raw;
    } catch (error) {
        console.warn('Error validando URL de documento:', error);
        return null;
    }
}

function getDocumentIconConfig(doc) {
    try {
        const type = (doc && doc.type ? String(doc.type) : '').toUpperCase();
        const file = (doc && doc.file ? String(doc.file) : '').toLowerCase();

        const isPdf = type.includes('PDF') || file.endsWith('.pdf');
        const isZip = type.includes('ZIP') || file.endsWith('.zip') || file.endsWith('.rar') || file.endsWith('.7z');
        const isExe = type.includes('EXE') || file.endsWith('.exe') || file.endsWith('.msi');
        const isDoc = type.includes('DOC') || type.includes('WORD') || file.endsWith('.doc') || file.endsWith('.docx');
        const isXls = type.includes('XLS') || type.includes('EXCEL') || file.endsWith('.xls') || file.endsWith('.xlsx');
        const isPpt = type.includes('PPT') || file.endsWith('.ppt') || file.endsWith('.pptx');
        const isImage =
            type.includes('IMG') ||
            type.includes('IMAGE') ||
            file.endsWith('.png') ||
            file.endsWith('.jpg') ||
            file.endsWith('.jpeg') ||
            file.endsWith('.gif') ||
            file.endsWith('.webp');

        if (isPdf) {
            return { iconClass: 'fa-file-pdf', iconTypeClass: 'document-icon--pdf' };
        }

        if (isZip) {
            return { iconClass: 'fa-file-archive', iconTypeClass: 'document-icon--zip' };
        }

        if (isExe) {
            return { iconClass: 'fa-microchip', iconTypeClass: 'document-icon--exe' };
        }

        if (isDoc) {
            return { iconClass: 'fa-file-word', iconTypeClass: 'document-icon--doc' };
        }

        if (isXls) {
            return { iconClass: 'fa-file-excel', iconTypeClass: 'document-icon--xls' };
        }

        if (isPpt) {
            return { iconClass: 'fa-file-powerpoint', iconTypeClass: 'document-icon--ppt' };
        }

        if (isImage) {
            return { iconClass: 'fa-file-image', iconTypeClass: 'document-icon--image' };
        }

        return { iconClass: 'fa-file-alt', iconTypeClass: 'document-icon--generic' };
    } catch (error) {
        console.warn('Error determinando icono de documento:', error);
        return { iconClass: 'fa-file-alt', iconTypeClass: 'document-icon--generic' };
    }
}

let documentsViewState = {
    view: 'list',
    filter: 'all',
    search: ''
};

function getDocumentCategory(doc) {
    const name = doc && (doc.name || doc.file) ? String(doc.name || doc.file) : '';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    const image = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico']);
    const video = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']);
    const audio = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a']);
    const archive = new Set(['zip', 'rar', '7z', 'tar', 'gz']);
    const document = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv']);

    if (image.has(ext)) return 'image';
    if (video.has(ext)) return 'video';
    if (audio.has(ext)) return 'audio';
    if (archive.has(ext)) return 'archive';
    if (document.has(ext)) return 'document';
    return 'other';
}

function updateDocumentsFilter() {
    const list = document.getElementById('documents-list');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('.document-item'));
    const query = documentsViewState.search.trim();
    let visibleCount = 0;

    items.forEach(item => {
        const category = item.dataset.category || 'other';
        const name = (item.dataset.name || '').toLowerCase();
        const matchesFilter = documentsViewState.filter === 'all' || category === documentsViewState.filter;
        const matchesSearch = !query || name.includes(query);
        const show = matchesFilter && matchesSearch;
        item.style.display = show ? '' : 'none';
        if (show) {
            visibleCount += 1;
        }
    });

    const emptyFilter = list.querySelector('.document-empty--filter');
    if (emptyFilter) {
        emptyFilter.style.display = items.length && !visibleCount ? 'block' : 'none';
    }
}

function setDocumentsView(viewName) {
    const views = document.querySelectorAll('.documents-view');
    const navButtons = document.querySelectorAll('.finder-nav-btn');
    documentsViewState.view = viewName || 'list';

    views.forEach(view => {
        const isActive = view.dataset.view === documentsViewState.view;
        view.classList.toggle('active', isActive);
    });

    navButtons.forEach(button => {
        const isActive = button.dataset.view === documentsViewState.view;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (documentsViewState.view === 'rar') {
        if (window.renderRarExtractor) {
            window.renderRarExtractor();
        } else {
            const rarBtn = document.getElementById('rar-tool-btn');
            if (rarBtn) rarBtn.click();
        }
    }
}

function initDocumentsNavigation() {
    const navButtons = document.querySelectorAll('.finder-nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            setDocumentsView(button.dataset.view || 'list');
        });
    });

    const sidebarItems = document.querySelectorAll('.finder-sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view || 'list';
            const filter = item.dataset.filter;
            setDocumentsView(view);
            if (filter) {
                documentsViewState.filter = filter;
                updateDocumentsFilter();
            }
        });
    });

    const searchInput = document.querySelector('.finder-search');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            documentsViewState.search = event.target.value.toLowerCase();
            updateDocumentsFilter();
        });
    }

    const activeSidebar = document.querySelector('.finder-sidebar-item.active');
    if (activeSidebar) {
        const view = activeSidebar.dataset.view || 'list';
        documentsViewState.filter = activeSidebar.dataset.filter || 'all';
        setDocumentsView(view);
    } else {
        setDocumentsView('list');
    }
}

function initDocumentsList() {
    const list = document.getElementById('documents-list');
    if (!list || !Array.isArray(DOCUMENTS_DATA)) {
        return;
    }

    list.innerHTML = '';

    if (!DOCUMENTS_DATA.length) {
        const empty = document.createElement('div');
        empty.className = 'document-empty';
        empty.textContent = 'Aún no hay documentos cargados. Sube archivos al servidor y añádelos en data/documents.json.';
        list.appendChild(empty);
        return;
    }

    DOCUMENTS_DATA.forEach(doc => {
        const url = getSafeDocumentUrl(doc);
        const isDisabled = !url;
        const item = document.createElement(isDisabled ? 'div' : 'a');

        item.className = 'document-item';
        item.dataset.category = getDocumentCategory(doc);

        if (!isDisabled) {
            item.href = url;
            item.target = '_blank';
            item.rel = 'noopener noreferrer';
            item.setAttribute('download', '');
        } else {
            item.setAttribute('aria-disabled', 'true');
        }

        const { iconClass, iconTypeClass } = getDocumentIconConfig(doc);

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'document-icon ' + iconTypeClass;

        const icon = document.createElement('i');
        icon.className = 'fas ' + iconClass;
        iconWrapper.appendChild(icon);

        const meta = document.createElement('div');
        meta.className = 'document-meta';

        const nameEl = document.createElement('div');
        nameEl.className = 'document-name';
        nameEl.textContent = doc && doc.name ? String(doc.name) : 'Documento sin nombre';
        item.dataset.name = nameEl.textContent.toLowerCase();

        const infoEl = document.createElement('div');
        infoEl.className = 'document-info';
        const typeLabel = doc && doc.type ? String(doc.type) : '';
        const sizeLabel = doc && doc.size ? String(doc.size) : '';
        infoEl.textContent = typeLabel && sizeLabel ? typeLabel + ' • ' + sizeLabel : (typeLabel || sizeLabel);

        meta.appendChild(nameEl);
        if (infoEl.textContent) {
            meta.appendChild(infoEl);
        }

        const download = document.createElement('div');
        download.className = 'document-download';

        const downloadIcon = document.createElement('i');
        downloadIcon.className = 'fas fa-download';
        download.appendChild(downloadIcon);

        item.appendChild(iconWrapper);
        item.appendChild(meta);
        if (!isDisabled) {
            item.appendChild(download);
        }

        if (nameEl.textContent) {
            const tooltipParts = [];
            tooltipParts.push(nameEl.textContent);
            if (infoEl.textContent) {
                tooltipParts.push(infoEl.textContent);
            }
            item.title = tooltipParts.join(' — ');
        }

        list.appendChild(item);
    });

    const emptyFilter = document.createElement('div');
    emptyFilter.className = 'document-empty document-empty--filter';
    emptyFilter.textContent = 'No hay archivos que coincidan con tu búsqueda o filtro.';
    emptyFilter.style.display = 'none';
    list.appendChild(emptyFilter);

    updateDocumentsFilter();
}

function loadDocuments() {
    // Evitar errores cuando se abre el sitio directamente con file:// en desarrollo
    if (window.location.protocol === 'file:') {
        console.warn('loadDocuments desactivado en modo file://. En servidor real leerá data/documents.json.');
        const list = document.getElementById('documents-list');
        if (list) {
            list.innerHTML = '';
            const info = document.createElement('div');
            info.className = 'document-empty';
            info.textContent = 'Para ver los documentos, abre el sitio con un servidor (http://) en lugar de doble clic.';
            list.appendChild(info);
        }
        return;
    }

    // Fallback: leer desde data/documents.json si el endpoint dinámico falla
    const loadFromJson = () => {
        return fetch('data/documents.json', { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar documents.json');
                }
                return response.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    DOCUMENTS_DATA = data;
                } else {
                    DOCUMENTS_DATA = [];
                }
                initDocumentsList();
            })
            .catch(error => {
                console.warn('Error cargando documentos desde documents.json:', error);
                DOCUMENTS_DATA = [];
                initDocumentsList();
            });
    };

    fetch('/api/documents', { cache: 'no-store' })
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo cargar /api/documents');
            }
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                DOCUMENTS_DATA = data;
            } else {
                DOCUMENTS_DATA = [];
            }
            initDocumentsList();
        })
        .catch(error => {
            console.warn('Error cargando documentos desde /api/documents, intentando fallback JSON:', error);
            loadFromJson();
        });
}
function initDocumentsUpload() {
    const form = document.getElementById('documents-upload-form');
    const input = document.getElementById('documents-upload-input');
    const pinInput = document.getElementById('documents-admin-pin');
    const unlockBtn = document.getElementById('documents-admin-unlock');
    const adminSection = document.querySelector('.documents-upload');
    const lockBtn = document.querySelector('.finder-lock-btn');
    const dropzone = document.getElementById('documents-dropzone');
    const lockBackBtn = document.getElementById('documents-lock-btn');
    let adminUnlocked = false;
    let adminCredential = '';

    if (lockBtn && adminSection) {
        const finderWindow = document.querySelector('.finder-window');
        const uploadView = document.querySelector('.documents-view--upload');
        const uploadNavBtn = document.querySelector('.finder-nav-btn[data-view="upload"]');
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

        const setAdminVisibility = (visible) => {
            if (uploadNavBtn) {
                uploadNavBtn.style.display = visible ? 'inline-flex' : 'none';
            }
            if (uploadView) {
                uploadView.classList.toggle('active', visible);
            }
            if (finderWindow) {
                finderWindow.classList.toggle('documents-admin-visible', visible);
            }
            if (visible) {
                setDocumentsView('upload');
            } else {
                setDocumentsView('list');
            }
        };

        const setAdminUnlocked = (unlocked) => {
            toggleFileLock(!unlocked);
            adminUnlocked = unlocked;
            if (finderWindow) {
                finderWindow.classList.toggle('documents-admin-unlocked', unlocked);
            }
            if (pinInput) {
                pinInput.disabled = unlocked;
            }
            if (unlockBtn) unlockBtn.disabled = unlocked;
            if (submitBtn) submitBtn.disabled = !unlocked;
            if (dropzone) {
                dropzone.classList.toggle('unlocked', unlocked);
                dropzone.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
            }
        };

        const unlockAdmin = () => {
            setAdminUnlocked(true);
            setAdminVisibility(true);
            showNotification('Credencial cargada. Se validará al subir.', 'success');
        };

        const lockAdmin = (notify = true) => {
            setAdminUnlocked(false);
            adminCredential = '';
            if (pinInput) {
                pinInput.value = '';
            }
            if (notify) {
                showNotification('Panel de documentos bloqueado.', 'info');
            }
            setAdminVisibility(false);
        };

        setAdminVisibility(false);
        setAdminUnlocked(false);

        lockBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const finder = document.querySelector('.finder-window');
            const isLockedNow = finder ? finder.classList.contains('locked') : true;

            if (isLockedNow) {
                setAdminVisibility(true);
                if (pinInput) {
                    pinInput.disabled = false;
                    pinInput.focus();
                }
            } else {
                lockAdmin();
            }
        });

        if (unlockBtn && pinInput) {
            unlockBtn.addEventListener('click', () => {
                const nextCredential = pinInput.value.trim();
                if (nextCredential) {
                    adminCredential = nextCredential;
                    unlockAdmin();
                } else {
                    showNotification('Ingresa tu credencial de administrador.', 'error');
                    adminUnlocked = false;
                }
            });
        }

        if (lockBackBtn) {
            lockBackBtn.addEventListener('click', () => {
                lockAdmin(false);
            });
        }
    }

    if (!form || !input) return;

    // Drag & Drop handling
    if (dropzone) {
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('highlight');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('highlight');
            }, false);
        });

        dropzone.addEventListener('click', () => {
            if (!(pinInput && pinInput.disabled)) {
                showNotification('Debes desbloquear con el PIN antes de subir.', 'error');
                return;
            }
            input.click();
        });
        dropzone.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!(pinInput && pinInput.disabled)) {
                    showNotification('Debes desbloquear con el PIN antes de subir.', 'error');
                    return;
                }
                input.click();
            }
        });

        dropzone.addEventListener('drop', (e) => {
            if (!(pinInput && pinInput.disabled)) {
                showNotification('Debes desbloquear con el PIN antes de subir.', 'error');
                return;
            }
            const dt = e.dataTransfer;
            const files = Array.from(dt.files || []);
            if (!files.length) return;
            input.files = dt.files;
            showNotification(`${files.length} archivo(s) listos para subir.`, 'info');
        });
    }

    form.addEventListener('submit', (e) => {
        if (!(pinInput && pinInput.disabled)) {
            e.preventDefault();
            showNotification('Debes desbloquear con el PIN antes de subir.', 'error');
            return;
        }

        const files = Array.from(input.files || []);
        if (!files.length) {
            e.preventDefault();
            showNotification('Selecciona al menos un archivo para subir.', 'error');
            return;
        }
        if (!adminCredential) {
            e.preventDefault();
            showNotification('Ingresa tu credencial de administrador.', 'error');
            return;
        }
        e.preventDefault();

        const formData = new FormData();
        files.forEach(f => formData.append('files', f));

        fetch('/api/documents', {
            method: 'POST',
            headers: { 'x-admin-pin': adminCredential },
            body: formData,
        })
            .then(async (response) => {
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Error al subir archivos');
                }
                return response.json();
            })
            .then((data) => {
                showNotification(data.message || 'Archivos subidos correctamente.', 'success');
                // Limpiar input
                input.value = '';
                // Recargar listado de documentos
                loadDocuments();
            })
            .catch((error) => {
                if ((error.message || '').toLowerCase().includes('no autorizado')) {
                    adminCredential = '';
                    setAdminUnlocked(false);
                    if (pinInput) {
                        pinInput.value = '';
                        pinInput.disabled = false;
                        pinInput.focus();
                    }
                }
                showNotification(error.message || 'No se pudieron subir los archivos.', 'error');
            });
    });
}

function initMaintenanceMobileMessage() {
    try {
        if (!document.body || !document.body.classList.contains('maintenance-page')) {
            return;
        }

        const msg = document.querySelector('.typing-text.maintenance-mobile-fade');
        if (!msg) {
            return;
        }

        msg.addEventListener('animationend', () => {
            msg.classList.add('maintenance-hidden');
        });
    } catch (error) {
        console.warn('Error inicializando mensaje de mantenimiento móvil:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDocuments();
    initDocumentsNavigation();
    initDocumentsUpload();
    initMaintenanceMobileMessage();
});

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <img src="/images/logo.svg" alt="RENACE.TECH" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">
        <strong style="font-size:0.72rem;letter-spacing:0.04em;">RENACE.TECH</strong>
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Search functionality
function initSearch() {
    const searchInput = document.querySelector('.finder-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.finder-item');

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }
}

// Login functionality
function initLogin() {
    const loginBtn = document.querySelector('.login-btn');
    const loginModal = document.getElementById('loginModal');

    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            document.querySelector('.pin-digit').focus();
        });
    }
}

// File operations with login check
function checkLoginStatus() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function requireLogin() {
    if (!checkLoginStatus()) {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'flex';
            document.querySelector('.pin-digit').focus();
        }
        return false;
    }
    return true;
}

// Update file operations to require login
function createNewFolder() {
    if (!requireLogin()) return;
    const folderName = prompt('Nombre de la nueva carpeta:');
    if (folderName) {
        // Implement folder creation logic
        console.log('Creating folder:', folderName);
    }
}

function uploadFile() {
    if (!requireLogin()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
        const files = Array.from(e.target.files);
        // Implement file upload logic
        console.log('Uploading files:', files);
    };
    input.click();
}

// Manejo de errores global mejorado
window.addEventListener('error', (event) => {
    // Evitar procesar errores sin detalles o errores de recursos
    if (!event || event.type !== 'error') return;

    const errorDetails = {
        message: event.error?.message || 'Error desconocido',
        filename: event.filename || 'unknown',
        lineNumber: event.lineno || 0,
        columnNumber: event.colno || 0,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
    };

    // Registrar el error en el estado de la aplicación
    if (typeof AppState !== 'undefined' && AppState.errors) {
        AppState.errors.push(errorDetails);
    }

    // Logging detallado
    console.error('Error global:', errorDetails);

    // Manejo específico según el tipo de error
    try {
        // Verificar que forms exista antes de usarlo
        if (typeof forms === 'undefined' || !forms || typeof forms.showNotification !== 'function') {
            return; // No podemos mostrar notificaciones si forms no está inicializado
        }

        if (event.error instanceof TypeError) {
            forms.showNotification('Error de tipo: Verifique los datos ingresados', 'error');
        } else if (event.error instanceof ReferenceError) {
            forms.showNotification('Error de referencia: Componente no encontrado', 'error');
        } else if (event.error instanceof SyntaxError) {
            forms.showNotification('Error de sintaxis en el código', 'error');
        } else if (event.error && event.error.message) {
            forms.showNotification(`Error: ${event.error.message}`, 'error');
        } else {
            forms.showNotification('Ha ocurrido un error inesperado', 'error');
        }
    } catch (notificationError) {
        console.error('Error al mostrar notificación:', notificationError);
    }

    // Prevenir que el error se propague solo si podemos manejarlo
    if (typeof AppState !== 'undefined' && AppState.isInitialized) {
        event.preventDefault();
    }
});

// Sistema mejorado de carga inicial
async function initializeApp() {
    try {
        AppState.isLoading = true;
        updateLoadingProgress(0);

        // Registro de componentes críticos y su peso en la carga
        const criticalComponents = [
            { name: 'navigation', weight: 20 },
            { name: 'animations', weight: 20 },
            { name: 'forms', weight: 20 },
            { name: 'fileManager', weight: 20 },
            { name: 'iCloudManager', weight: 20 }
        ];

        let progress = 0;

        // Inicialización secuencial de componentes con manejo de progreso
        for (const component of criticalComponents) {
            try {
                await initializeComponent(component.name);
                progress += component.weight;
                updateLoadingProgress(progress);
                AppState.components.add(component.name);
            } catch (componentError) {
                console.error(`Error inicializando ${component.name}:`, componentError);
                forms.showNotification(`Error al inicializar ${component.name}`, 'error');
            }
        }

        // Manejo del loading screen
        const loading = document.querySelector('.loading');
        if (loading) {
            const allComponentsLoaded = criticalComponents.every(
                component => AppState.components.has(component.name)
            );

            if (allComponentsLoaded) {
                updateLoadingProgress(100);
                setTimeout(() => {
                    loading.classList.add('hidden');
                    setTimeout(() => {
                        loading.style.display = 'none';
                        AppState.isLoading = false;
                        AppState.isInitialized = true;
                        document.body.classList.remove('loading-active');
                    }, 500);
                }, 500);
            } else {
                throw new Error('No se pudieron cargar todos los componentes críticos');
            }
        }
    } catch (error) {
        console.error('Error en la inicialización de la aplicación:', error);
        handleInitializationError(error);
    }
}

// Función para actualizar el progreso de carga
function updateLoadingProgress(progress) {
    AppState.initializationProgress = progress;
    const loading = document.querySelector('.loading');
    if (loading) {
        const progressBar = loading.querySelector('.loading-progress-bar');
        const progressText = loading.querySelector('.loading-progress-text');

        if (!progressBar) {
            const progressElement = document.createElement('div');
            progressElement.innerHTML = `
                <div class="loading-progress">
                    <div class="loading-progress-bar" style="width: ${progress}%"></div>
                    <div class="loading-progress-text">${Math.round(progress)}%</div>
                </div>
            `;
            loading.appendChild(progressElement);
        } else {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }
}

// Función para manejar errores de inicialización
function handleInitializationError(error) {
    AppState.isLoading = false;
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.innerHTML = `
            <div class="loading-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar la aplicación</p>
                <p class="error-details">${error.message}</p>
                <button onclick="retryInitialization()">Reintentar</button>
            </div>
        `;
    }
}

// Función para reintentar la inicialización
async function retryInitialization() {
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.innerHTML = `
            <img src="images/logo.svg" alt="RENACE Tech" class="loading-logo">
            <div class="loading-progress">
                <div class="loading-progress-bar" style="width: 0%"></div>
                <div class="loading-progress-text">0%</div>
            </div>
        `;
    }
    await initializeApp();
}

// Función para inicializar componentes individuales
async function initializeComponent(componentName) {
    return new Promise((resolve, reject) => {
        try {
            switch (componentName) {
                case 'navigation':
                    if (typeof navigation !== 'undefined' && navigation && typeof navigation.init === 'function') {
                        navigation.init();
                    }
                    break;
                case 'animations':
                    if (typeof animations !== 'undefined' && animations && typeof animations.init === 'function') {
                        animations.init();
                    }
                    break;
                case 'forms':
                    if (typeof forms !== 'undefined' && forms && typeof forms.init === 'function') {
                        forms.init();
                    }
                    break;
                case 'fileManager':
                    if (typeof FileManager === 'function') {
                        window.fileManager = new FileManager();
                    }
                    break;
                case 'iCloudManager':
                    if (typeof ICloudManager === 'function') {
                        window.iCloudManager = new ICloudManager();
                        if (window.iCloudManager && typeof window.iCloudManager.init === 'function') {
                            window.iCloudManager.init();
                        }
                    }
                    break;
            }
            setTimeout(resolve, 100); // Pequeño delay para visualizar el progreso
        } catch (error) {
            reject(error);
        }
    });
}

// Inicialización de la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loading-active');
    initializeApp();
});

// Función para iniciar el proyecto (arreglada)
function startProject() {
    const terminalOutput = document.querySelector('.terminal-output');
    if (!terminalOutput) return;

    terminalOutput.innerHTML = '';
    const terminal = new TerminalAnimator(terminalOutput);

    (async () => {
        await terminal.addCommand('npm run build', true, 'user@renace.tech');

        const buildSteps = [
            { type: 'output', text: '🚀 Iniciando RENACE Project v2.0' },
            { type: 'output', text: '🤖 Activando Sistema IA' },
            { type: 'progress', text: '⚡ Analizando componentes' },
            { type: 'progress', text: '🔮 Sincronizando servicios' },
            { type: 'output', text: '✨ Inicialización completada' },
            { type: 'output', text: '\n🎯 Configurando módulos...' },
            { type: 'progress', text: '📡 Estableciendo conexiones' },
            { type: 'output', text: '✅ Sistema listo' }
        ];

        for (const step of buildSteps) {
            if (step.type === 'progress') {
                await terminal.addOutput(step.text, true);
            } else {
                await terminal.addOutput(step.text);
            }
            await terminal.wait(100);
        }

        const menuContainer = document.createElement('div');
        menuContainer.className = 'terminal-actions menu-grid';
        menuContainer.innerHTML = `
            <button class="terminal-btn primary" onclick="scrollToTop()">
                <i class="fas fa-home"></i>
                Inicio
            </button>
            <button class="terminal-btn primary" onclick="scrollToFiles()">
                <i class="fas fa-folder"></i>
                Documentos
            </button>
            <button class="terminal-btn primary" onclick="goToPricing()">
                <i class="fas fa-tags"></i>
                Precios
            </button>
            <button class="terminal-btn primary" onclick="goToPrestApp()">
                <i class="fas fa-mobile-alt"></i>
                PrestApp
            </button>
        `;
        terminalOutput.appendChild(menuContainer);
    })();
}

// Función scrollToTop mejorada
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    // Cerrar la terminal si está maximizada
    const terminalWindow = document.querySelector('.terminal-window');
    if (terminalWindow && terminalWindow.classList.contains('maximized')) {
        handleTerminalMaximize(terminalWindow);
    }
}

function goToPricing() {
    const pricingSection = document.getElementById('precios');
    if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Fallback por si en algún contexto sigue existiendo pricing.html
        window.location.href = 'pricing.html';
    }
}

function goToPrestApp() {
    // Navegar al producto PrestApp directamente a su index
    window.location.href = 'PrestApp/index.html';
}

// Agregar event listeners para los logos
document.addEventListener('DOMContentLoaded', () => {
    const logos = document.querySelectorAll('.logo a, .terminal-header a');
    logos.forEach(logo => {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToTop();
        });
    });
});

// Add scrollToContact function
function scrollToContact() {
    const contactSection = document.getElementById('contacto');
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function handleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Animación de envío
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enviando...';
    submitBtn.disabled = true;

    // Simular envío (aquí irá la lógica real de envío)
    setTimeout(() => {
        // Mostrar mensaje de éxito
        submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Enviado!';
        submitBtn.style.background = '#27c93f';

        // Limpiar formulario
        form.reset();

        // Restaurar botón después de 2 segundos
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
        }, 2000);
    }, 1500);

    return false;
}

// Efecto de typing para el terminal
document.addEventListener('DOMContentLoaded', () => {
    const typingTexts = document.querySelectorAll('.typing-text');

    typingTexts.forEach((text, index) => {
        const content = text.textContent;
        text.textContent = '';
        let i = 0;

        setTimeout(() => {
            const interval = setInterval(() => {
                if (i < content.length) {
                    text.textContent += content.charAt(i);
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, 50);
        }, index * 1000);
    });
});

// Floating Carousel
function initFloatingCarousel() {
    const categories = document.querySelectorAll('.tech-category');
    let currentIndex = 0;
    let isAnimating = false;

    function updateCarousel() {
        if (isAnimating) return;
        isAnimating = true;

        categories.forEach((category, index) => {
            category.classList.remove('active');

            if (index === currentIndex) {
                requestAnimationFrame(() => {
                    category.classList.add('active');
                });
            }
        });

        setTimeout(() => {
            isAnimating = false;
        }, 800); // Match transition duration
    }

    function nextSlide() {
        if (isAnimating) return;
        currentIndex = (currentIndex + 1) % categories.length;
        updateCarousel();
    }

    function prevSlide() {
        if (isAnimating) return;
        currentIndex = (currentIndex - 1 + categories.length) % categories.length;
        updateCarousel();
    }

    // Initial setup
    updateCarousel();

    // Auto advance every 5 seconds
    setInterval(nextSlide, 5000);

    // Touch handling
    let touchStartX = 0;
    let touchStartY = 0;
    const techGrid = document.querySelector('.tech-grid');

    if (techGrid) {
        techGrid.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        techGrid.addEventListener('touchend', (e) => {
            if (isAnimating) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchStartX - touchEndX;
            const deltaY = touchStartY - touchEndY;

            // Ensure horizontal swipe
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
        }, { passive: true });
    }

    // Optional: Mouse drag handling
    let isDragging = false;
    let startX = 0;

    if (techGrid) {
        techGrid.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
        });

        techGrid.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
        });

        techGrid.addEventListener('mouseup', (e) => {
            if (!isDragging) return;

            const deltaX = startX - e.clientX;
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
            isDragging = false;
        });

        techGrid.addEventListener('mouseleave', () => {
            isDragging = false;
        });
    }
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initFloatingCarousel();
});

function typeText(element, text, speed = 50) {
    return new Promise(resolve => {
        let i = 0;
        element.textContent = '';
        const interval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

async function simulateCommand(command, output, delay = 500) {
    const terminalLine = document.createElement('div');
    terminalLine.className = 'terminal-line';
    terminalLine.innerHTML = `<span class="prompt">client@renace.tech:~$</span> <span class="command"></span>`;

    const commandSpan = terminalLine.querySelector('.command');
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    commandSpan.appendChild(cursor);

    output.appendChild(terminalLine);
    await typeText(commandSpan, command);

    await new Promise(resolve => setTimeout(resolve, delay));
    cursor.remove();

    return terminalLine;
}

async function simulateOutput(text, output, isProcess = false) {
    const outputElement = document.createElement('div');
    outputElement.classList.add('output-line');

    if (isProcess) {
        outputElement.classList.add('build-output');
        const progressText = document.createElement('span');
        progressText.classList.add('progress-text');
        progressText.textContent = text;
        outputElement.appendChild(progressText);
    } else {
        outputElement.textContent = text;
    }

    output.appendChild(outputElement);
    return new Promise(resolve => setTimeout(resolve, 100));
}

// Terminal Animation System
class TerminalAnimator {
    constructor(container) {
        this.container = container;
        this.typeSpeed = {
            command: 50,
            output: 10
        };
        this.isLoggedIn = false;
        this.setupContainer();
    }

    setupContainer() {
        this.container.innerHTML = '';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async simulateLogin() {
        await this.addOutput('→ Checking system status...');
        await this.wait(300);
        await this.addOutput('→ System check complete');
        await this.wait(200);
        await this.addOutput('✓ Ready to build');
        await this.wait(200);
        this.isLoggedIn = true;
    }

    async type(text, element, speed = this.typeSpeed.command) {
        let delay;
        for (let char of text) {
            if (typeof speed === 'object') {
                if (text.startsWith('→') || text.startsWith('⚡') || text.startsWith('✓')) {
                    delay = 2;
                } else {
                    delay = Math.random() * (speed.max - speed.min) + speed.min;
                }
            } else {
                delay = speed;
            }

            if (['.', '!', '?'].includes(char)) delay += 50;
            if (char === '\n') delay += 30;

            element.textContent += char;
            await this.wait(delay);
        }
    }

    async addCommand(text, showPrompt = true, customPrompt = null) {
        const line = document.createElement('div');
        line.className = 'terminal-line';

        if (showPrompt) {
            const prompt = document.createElement('span');
            prompt.className = 'prompt';
            prompt.textContent = customPrompt ? `${customPrompt}:~$ ` : '$ ';
            line.appendChild(prompt);
        }

        const command = document.createElement('span');
        command.className = 'command';

        line.appendChild(command);
        this.container.appendChild(line);

        await this.type(text, command);
        this.scrollToBottom();
        await this.wait(50);
    }

    async addOutput(text, isProgress = false) {
        const outputElement = document.createElement('div');
        outputElement.classList.add('output-line');

        if (isProgress) {
            outputElement.classList.add('build-output');
            const progressText = document.createElement('span');
            progressText.classList.add('progress-text');
            progressText.textContent = text;
            outputElement.appendChild(progressText);
        } else {
            outputElement.textContent = text;
        }

        this.container.appendChild(outputElement);
        this.scrollToBottom();

        return new Promise(resolve => setTimeout(resolve, 100));
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    async processInstallation() {
        await this.wait(300);
        await this.addCommand('pip install renace-tech', true, 'client@renace.tech');
        await this.wait(200);

        const steps = [
            { type: 'output', text: '⚡ Collecting packages...' },
            { type: 'progress', text: 'Downloading renace-tech-2.0.1.tar.gz (8.4 MB)' },
            { type: 'output', text: '   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 8.4/8.4 MB' },
            { type: 'progress', text: 'Installing collected packages: renace-tech' },
            { type: 'output', text: '→ Verifying dependencies...' },
            { type: 'progress', text: 'Building wheels for collected packages' },
            { type: 'output', text: '✓ Successfully built renace-tech' },
            { type: 'output', text: '\n⚡ Installation complete!' },
            { type: 'output', text: '→ RENACE Tech 2.0.1 is ready to transform your ideas' }
        ];

        for (const step of steps) {
            if (step.type === 'progress') {
                await this.addOutput(step.text, true);
            } else {
                await this.addOutput(step.text);
            }
            await this.wait(50);
        }

        const actions = document.createElement('div');
        actions.className = 'terminal-actions';
        actions.innerHTML = `
            <button class="terminal-btn primary pulse-button" onclick="startProject()">
                <i class="fas fa-rocket"></i>
                Iniciar Proyecto
            </button>
            <button class="terminal-btn secondary" onclick="scrollToFiles()">
                <i class="fas fa-folder"></i>
                Ver Documentos
            </button>
        `;
        this.container.appendChild(actions);
        this.scrollToBottom();
    }
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const heroTerminal = document.querySelector('.hero .terminal-window');
    if (heroTerminal) {
        const applyHeroTerminalLayout = () => {
            const isMobileWidth = window.innerWidth <= 768;
            if (isMobileWidth) {
                heroTerminal.classList.add('maximized');
            } else {
                heroTerminal.classList.remove('maximized');
            }
        };

        applyHeroTerminalLayout();
        window.addEventListener('resize', applyHeroTerminalLayout);
    }

    const terminalOutput = document.querySelector('.hero .terminal-output');
    if (terminalOutput) {
        const viewportMin = Math.min(
            window.innerWidth || (window.screen && window.screen.width) || 0,
            window.innerHeight || (window.screen && window.screen.height) || 0
        );
        const isVerySmallViewport = viewportMin && viewportMin <= 360;

        const cores = navigator.hardwareConcurrency || 2;
        const isLowCore = cores <= 2;

        const ua = (navigator.userAgent || '').toLowerCase();
        const isWatch = ua.indexOf('watch') !== -1;

        const isUltraLite =
            document.body.classList.contains('ultra-lite-mode') ||
            window.RENACE_ULTRA_LITE ||
            isVerySmallViewport ||
            isLowCore ||
            isWatch;
        if (isUltraLite) {
            terminalOutput.textContent = 'RENACE Tech listo para digitalizar tu negocio (modo lite).\nDesliza hacia abajo para ver precios y documentos.';
            return;
        }

        const terminal = new TerminalAnimator(terminalOutput);
        terminal.processInstallation();
    }
});

// Funciones de navegación

// Intersection Observer para animaciones de scroll
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px'
    });

    // Observar el header de la sección
    const sectionHeader = document.querySelector('.services-section .section-header');
    if (sectionHeader) {
        observer.observe(sectionHeader);
    }

    // Observar cada tarjeta de servicio
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
}

// Inicializar animaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    initScrollAnimations();
});

// Tecnologías - Animaciones y Marquee
function initTechSection() {
    const marqueeRows = document.querySelectorAll('.marquee-row');
    const categoryTags = document.querySelectorAll('.category-tag');
    let isHovering = false;
    let selectedCategory = null;

    // Clonar elementos para el efecto marquee infinito
    marqueeRows.forEach(row => {
        const content = row.querySelector('.marquee-content');
        const clone = content.cloneNode(true);
        row.appendChild(clone);

        // Ajustar velocidad basada en la dirección
        const direction = row.dataset.direction;
        const baseSpeed = direction === 'left' ? 25 : 20;
        const speed = window.innerWidth <= 768 ? baseSpeed * 1.5 : baseSpeed;

        [content, clone].forEach(el => {
            el.style.animationDuration = `${speed}s`;
        });
    });

    // Manejo de categorías
    categoryTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const category = tag.dataset.category;

            // Toggle de la categoría seleccionada
            if (selectedCategory === category) {
                selectedCategory = null;
                categoryTags.forEach(t => t.classList.remove('active'));
                marqueeRows.forEach(row => {
                    row.style.opacity = '1';
                    row.style.filter = 'none';
                    row.style.transform = 'none';
                });
            } else {
                selectedCategory = category;
                categoryTags.forEach(t => {
                    t.classList.toggle('active', t.dataset.category === category);
                });

                marqueeRows.forEach(row => {
                    const isSelected = row.dataset.direction === category;
                    row.style.opacity = isSelected ? '1' : '0.3';
                    row.style.filter = isSelected ? 'brightness(1.2)' : 'brightness(0.8)';
                    row.style.transform = isSelected ? 'scale(1.02)' : 'scale(0.95)';
                });
            }
        });

        // Efecto hover
        tag.addEventListener('mouseenter', () => {
            if (!selectedCategory) {
                const category = tag.dataset.category;
                marqueeRows.forEach(row => {
                    const isHovered = row.dataset.direction === category;
                    row.style.opacity = isHovered ? '1' : '0.7';
                    row.style.filter = isHovered ? 'brightness(1.1)' : 'none';
                    row.style.transform = isHovered ? 'scale(1.01)' : 'none';
                });
            }
        });

        tag.addEventListener('mouseleave', () => {
            if (!selectedCategory) {
                marqueeRows.forEach(row => {
                    row.style.opacity = '1';
                    row.style.filter = 'none';
                    row.style.transform = 'none';
                });
            }
        });
    });

    // Pausar animación al hover
    const techContainer = document.querySelector('.tech-marquee-container');
    if (techContainer) {
        techContainer.addEventListener('mouseenter', () => {
            isHovering = true;
            marqueeRows.forEach(row => {
                const contents = row.querySelectorAll('.marquee-content');
                contents.forEach(content => {
                    content.style.animationPlayState = 'paused';
                });
            });
        });

        techContainer.addEventListener('mouseleave', () => {
            isHovering = false;
            marqueeRows.forEach(row => {
                const contents = row.querySelectorAll('.marquee-content');
                contents.forEach(content => {
                    content.style.animationPlayState = 'running';
                });
            });
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initTechSection();
});

// Función para manejar la maximización de la terminal
function handleTerminalMaximize(terminalWindow) {
    if (!terminalWindow) return;

    if (terminalWindow.classList.contains('maximized')) {
        // Restaurar tamaño
        terminalWindow.classList.remove('maximized');
        terminalWindow.style.transform = 'scale(0.98)';
        setTimeout(() => {
            terminalWindow.style.transform = '';
        }, 150);
    } else {
        // Maximizar
        terminalWindow.classList.add('maximized');
        terminalWindow.style.transform = 'scale(1.02)';
        setTimeout(() => {
            terminalWindow.style.transform = '';
        }, 150);
    }
}

// Agregar manejadores para los botones de control
document.addEventListener('DOMContentLoaded', () => {
    const redControl = document.querySelector('.terminal-controls .control.red');
    const yellowControl = document.querySelector('.terminal-controls .control.yellow');
    const greenControl = document.querySelector('.terminal-controls .control.green');
    const terminalWindow = document.querySelector('.terminal-window');

    if (redControl) {
        redControl.addEventListener('click', () => {
            const terminalOutput = document.querySelector('.terminal-output');

            // Si la ventana está maximizada, primero la restauramos
            if (terminalWindow && terminalWindow.classList.contains('maximized')) {
                handleTerminalMaximize(terminalWindow);
            }

            // Luego reiniciamos el output
            if (terminalOutput) {
                terminalOutput.innerHTML = '';
                const terminal = new TerminalAnimator(terminalOutput);
                terminal.processInstallation();
            }
        });
    }

    if (yellowControl) {
        yellowControl.addEventListener('click', () => {
            const terminalOutput = document.querySelector('.terminal-output');

            // Si la ventana está maximizada, primero la restauramos
            if (terminalWindow && terminalWindow.classList.contains('maximized')) {
                handleTerminalMaximize(terminalWindow);
            }

            // Efecto de minimizar
            if (terminalWindow) {
                terminalWindow.style.transform = 'scale(0.95)';
                terminalWindow.style.opacity = '0';

                setTimeout(() => {
                    if (terminalOutput) {
                        terminalOutput.innerHTML = '';
                        const terminal = new TerminalAnimator(terminalOutput);
                        terminal.processInstallation();
                    }

                    // Restaurar ventana
                    setTimeout(() => {
                        terminalWindow.style.transform = '';
                        terminalWindow.style.opacity = '';
                    }, 100);
                }, 300);
            }
        });
    }

    if (greenControl) {
        greenControl.addEventListener('click', () => {
            handleTerminalMaximize(terminalWindow);
        });
    }

    const footerTerminalHeader = document.querySelector('.footer-terminal .terminal-header');
    if (footerTerminalHeader) {
        footerTerminalHeader.addEventListener('dblclick', () => {
            const odooUrl = 'https://renace.tech/web/login?redirect=%2Fodoo%2F%3F';
            window.open(odooUrl, '_blank', 'noopener');
        });
    }
});

// Función para cargar y mostrar archivos
async function loadDataFiles() {
    try {
        // Evitar llamadas en producción (solo usar /api/files en entornos locales con backend)
        const hostname = window.location.hostname;
        const isFileProtocol = window.location.protocol === 'file:';
        const allowedHosts = ['localhost', '127.0.0.1'];
        if (isFileProtocol || !allowedHosts.includes(hostname)) {
            return;
        }

        const response = await fetch('/api/files');

        if (!response.ok) {
            console.warn('API /api/files no disponible. Status:', response.status);
            return;
        }

        const files = await response.json();
        updateFileList(files);
    } catch (error) {
        console.error('Error al cargar archivos:', error);
    }
}

// Función para actualizar la lista de archivos en la interfaz
function updateFileList(files) {
    const finderContent = document.querySelector('.finder-content');
    if (!finderContent) return;

    finderContent.innerHTML = '';

    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'finder-item';

        // Determinar el icono basado en el tipo de archivo
        const icon = getFileIcon(file.type);

        fileItem.innerHTML = `
            <i class="${icon}"></i>
            <span>${file.name}</span>
        `;

        fileItem.addEventListener('click', () => openFile(file.path));
        finderContent.appendChild(fileItem);
    });
}

// Función para determinar el icono según el tipo de archivo
function getFileIcon(type) {
    const icons = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'jpg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'txt': 'fas fa-file-alt',
        'md': 'fas fa-file-code',
        'folder': 'fas fa-folder',
        'default': 'fas fa-file'
    };

    return icons[type] || icons.default;
}

// Función para abrir un archivo
function openFile(path) {
    // Implementar la lógica de apertura de archivos según el tipo
    console.log('Abriendo archivo:', path);
}

// Observador de cambios en la carpeta data
let fileWatcher;

function startFileWatcher() {
    const finderContent = document.querySelector('.finder-content');
    if (!finderContent) {
        // Si no hay UI de archivos, no iniciar el watcher para evitar llamadas innecesarias
        return;
    }

    if (fileWatcher) {
        clearInterval(fileWatcher);
    }

    // Verificar cambios cada 5 segundos
    fileWatcher = setInterval(loadDataFiles, 5000);

    // Carga inicial de archivos
    loadDataFiles();
}

// Iniciar el observador cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    startFileWatcher();
});

// Detener el observador cuando la página se cierre o se oculte
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(fileWatcher);
    } else {
        startFileWatcher();
    }
});

// Funciones de navegación
function scrollToHome() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function initPricingSubtitleTyping() {
    const subtitle = document.querySelector('.pricing-hero .section-subtitle');
    if (!subtitle) return;

    const phrases = [
        'Escala tu negocio con tecnología de punta.',
        'Conecta tus sistemas, datos y equipos con IA.',
        'Automatiza procesos clave sin perder el control.',
        'Haz que tu operación trabaje en piloto asistido.'
    ];

    let index = 0;
    const visibleTime = 2200;   // tiempo visible de cada frase
    const transitionTime = 320; // coordinar con CSS (opacity/transform)

    function showNextPhrase() {
        const phrase = phrases[index % phrases.length];

        // preparar salida suave
        subtitle.style.opacity = '0';
        subtitle.style.transform = 'translateY(6px)';

        setTimeout(() => {
            subtitle.textContent = phrase;
            subtitle.style.opacity = '1';
            subtitle.style.transform = 'translateY(0)';
        }, transitionTime);

        index++;

        setTimeout(showNextPhrase, visibleTime + transitionTime * 2);
    }

    // estado inicial
    subtitle.style.opacity = '0';
    subtitle.style.transition = 'opacity 0.32s ease-out, transform 0.32s ease-out';

    showNextPhrase();
}

document.addEventListener('DOMContentLoaded', () => {
    // Agregar event listeners para la navegación
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Solo interceptar anclas internas (#inicio, #documentos)
            if (href.startsWith('#')) {
                e.preventDefault();

                switch (href) {
                    case '#inicio':
                        scrollToHome();
                        break;
                    case '#documentos':
                        scrollToFiles();
                        break;
                    case '#precios':
                        goToPricing();
                        break;
                }

                // Actualizar clase active solo para navegación interna
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
            // Para enlaces normales (por ejemplo pricing.html, index.html#inicio), dejamos que el navegador navegue
        });
    });

    // Inicializar efecto de escritura en la sección de precios
    initPricingSubtitleTyping();
});
