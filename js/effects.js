/**
 * effects.js - Scripts para los efectos visuales de RENACE Tech
 */

// Esperar a que todo el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar efecto global de partículas flotantes
    initGlobalParticles();

    // Inicializar todos los efectos
    initParallaxEffect();
    initFadeEffects();
    initTypewriterGPTStyle(); // Nueva función para el efecto de tipeo estilo GPT
    initRippleButtons();
    initScrollIndicator();
    initNetworkAnimation();
    initTestimonialChat();
    initShineEffects();
    initAutomationEffects();
    initHeroSvgMovement();
    initMobileMenu(); // Nueva función para el menú móvil
    initTypingText();
    initHeroLogoEffect();
    initChatbot();
    initTypewriterModernStyle(); // Efecto de tipeo moderno
    initMorseCodeLights();      // Luces de código morse para RENACE
    initChatbotTerminal();      // Terminal interactiva con chatbot
    initAllButtonsInteractivity(); // Nueva función para todos los botones
    animarTestimonios(); // Nueva función para animar los testimonios
    initLlmEffect();
    mejorarTestimonios();
    initTypingEffects(); // Nueva función para efectos de escritura en títulos
    initPricing3DDiamonds(); // Diamantes 3D para pricing
    initMaintenance4DSpace(); // Espacio 4D en la página de mantenimiento
    initHeroTerminalTilt(); // Efecto de profundidad en la terminal principal
    // Implementar funcionalidad para el menú contextual en los archivos
    const filesContainer = document.getElementById('files-container');
    const contextMenu = document.getElementById('context-menu');
    const searchInput = document.getElementById('file-search');
    const fileItems = document.querySelectorAll('.file-item');

    // Prevenir el comportamiento 3D/hover cuando se hace click en los archivos
    if (filesContainer) {
        filesContainer.addEventListener('click', function (e) {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                // Eliminar clase active de todos los archivos
                document.querySelectorAll('.file-item').forEach(item => {
                    item.classList.remove('active');
                });

                // Añadir clase active al archivo clickeado
                fileItem.classList.add('active');

                // Bloquear la animación 3D al hacer click
                fileItem.style.transform = 'translateZ(0)';
                fileItem.style.boxShadow = 'none';

                // Restaurar después de 300ms
                setTimeout(() => {
                    fileItem.style.transform = '';
                    fileItem.style.boxShadow = '';
                }, 300);
            }
        });

        // Implementar funcionalidad de búsqueda
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                const searchTerm = this.value.toLowerCase();

                fileItems.forEach(item => {
                    const fileName = item.getAttribute('data-name').toLowerCase();
                    if (fileName.includes(searchTerm)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }

        // Implementar menú contextual para clic derecho
        document.addEventListener('contextmenu', function (e) {
            const fileItem = e.target.closest('.file-item');
            if (fileItem && filesContainer.contains(fileItem)) {
                e.preventDefault();

                // Activar el archivo clickeado
                document.querySelectorAll('.file-item').forEach(item => {
                    item.classList.remove('active');
                });
                fileItem.classList.add('active');

                // Mostrar menú contextual en la posición del clic
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${e.pageX}px`;
                contextMenu.style.top = `${e.pageY}px`;

                // Asegurar que el menú no se salga de la ventana
                const menuRect = contextMenu.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                if (e.clientX + menuRect.width > windowWidth) {
                    contextMenu.style.left = `${e.pageX - menuRect.width}px`;
                }

                if (e.clientY + menuRect.height > windowHeight) {
                    contextMenu.style.top = `${e.pageY - menuRect.height}px`;
                }
            }
        });

        // Cerrar menú contextual al hacer clic fuera de él
        document.addEventListener('click', function (e) {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });

        // Acciones del menú contextual
        const contextMenuItems = document.querySelectorAll('.context-menu-item');
        contextMenuItems.forEach(item => {
            item.addEventListener('click', function () {
                const action = this.getAttribute('data-action');
                const activeFile = document.querySelector('.file-item.active');

                if (activeFile) {
                    const fileName = activeFile.getAttribute('data-name');
                    const fileType = activeFile.getAttribute('data-type');

                    switch (action) {
                        case 'open':
                            alert(`Abriendo: ${fileName}`);
                            break;
                        case 'download':
                            alert(`Descargando: ${fileName}`);
                            break;
                        case 'copy':
                            navigator.clipboard.writeText(fileName)
                                .then(() => {
                                    alert(`Nombre de archivo copiado al portapapeles: ${fileName}`);
                                })
                                .catch(err => {
                                    console.error('Error al copiar:', err);
                                });
                            break;
                        case 'preview':
                            alert(`Vista previa de: ${fileName}`);
                            break;
                        case 'share':
                            alert(`Compartiendo: ${fileName}`);
                            break;
                    }

                    // Cerrar menú después de la acción
                    contextMenu.style.display = 'none';
                }
            });
        });
    }

    // Implementar funcionalidad para el chat en la sección de contacto
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const messageInput = this.querySelector('textarea');
            const name = this.querySelector('input[type="text"]').value;

            if (messageInput && messageInput.value.trim() !== '') {
                alert(`Gracias ${name}, tu mensaje ha sido enviado. Nos pondremos en contacto contigo pronto.`);
                this.reset();
            }
        });
    }
});

// Efecto global de partículas flotantes tipo Google Antigravity
// En temporada de invierno (dic-ene) se adapta a copos de nieve
function initGlobalParticles() {

    const now = new Date();
    const month = now.getMonth(); // 0 = enero, 11 = diciembre
    const isSnowSeason = (month === 11 || month === 0 || month === 1);

    const particleCount = isSnowSeason ? 70 : 50; // un poco más de partículas en modo nieve
    const container = document.body;

    // Crear contenedor de partículas
    const particlesContainer = document.createElement('div');
    particlesContainer.id = 'global-particles';
    particlesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
    `;

    container.insertBefore(particlesContainer, container.firstChild);

    // Crear partículas
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('global-particle');

        // Propiedades aleatorias
        const size = isSnowSeason ? (Math.random() * 4 + 2) : (Math.random() * 3 + 1);
        const startX = Math.random() * 100;
        const startY = isSnowSeason ? (Math.random() * -20) : (Math.random() * 100);
        const duration = isSnowSeason ? (Math.random() * 20 + 20) : (Math.random() * 30 + 20);
        const delay = Math.random() * 10;
        const opacity = isSnowSeason ? (Math.random() * 0.6 + 0.2) : (Math.random() * 0.4 + 0.1);

        const bgColor = isSnowSeason
            ? `radial-gradient(circle, rgba(255,255,255,${opacity}), rgba(148,163,184,${opacity * 0.7}))`
            : `radial-gradient(circle, rgba(0,212,255,${opacity}), rgba(56,189,248,${opacity * 0.5}))`;

        const boxShadow = isSnowSeason
            ? `0 0 ${size * 2}px rgba(148,163,184,${opacity * 0.8})`
            : `0 0 ${size * 2}px rgba(0,212,255,${opacity * 0.5})`;

        const animationName = isSnowSeason ? 'snowParticleFall' : 'floatParticle';

        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${bgColor};
            border-radius: 50%;
            top: ${startY}%;
            left: ${startX}%;
            animation: ${animationName} ${duration}s infinite ${delay}s ease-in-out;
            box-shadow: ${boxShadow};
        `;

        particlesContainer.appendChild(particle);
    }

    // Agregar animaciones CSS si no existen
    if (!document.getElementById('particle-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'particle-animation-styles';
        style.textContent = `
            @keyframes floatParticle {
                0%, 100% {
                    transform: translate(0, 0) scale(1);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                50% {
                    transform: translate(30px, -150px) scale(1.1);
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    transform: translate(-40px, -320px) scale(0.6);
                    opacity: 0;
                }
            }

            @keyframes snowParticleFall {
                0% {
                    transform: translate3d(0, -10vh, 0) scale(0.8);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                50% {
                    transform: translate3d(10px, 50vh, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate3d(-10px, 110vh, 0) scale(1.05);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Efecto de parallax
function initParallaxEffect() {
    window.addEventListener('scroll', () => {
        const elements = document.querySelectorAll('.parallax');
        elements.forEach(element => {
            const speed = element.getAttribute('data-speed') || 0.5;
            const yPos = -(window.pageYOffset * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Efecto de fade-in al hacer scroll
function initFadeEffects() {
    const fadeElements = document.querySelectorAll('.fade-in-element');
    const options = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    fadeElements.forEach(element => {
        fadeObserver.observe(element);
    });
}

// Efecto de máquina de escribir estilo GPT/Grok
function initTypewriterGPTStyle() {
    const textElement = document.getElementById('typing-text');
    const cursorIndicator = document.querySelector('.cursor-indicator');

    if (!textElement || !cursorIndicator) return;

    // Mostrar el texto completo de inmediato
    textElement.style.opacity = '1';

    // Activar el cursor
    cursorIndicator.style.opacity = '1';
}

// Efecto de brillo al hacer scroll
function initShineEffects() {
    const shineElements = document.querySelectorAll('.shine-effect');
    const options = {
        threshold: 0.3,
        rootMargin: '0px'
    };

    const shineObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                setTimeout(() => {
                    entry.target.classList.remove('animate');
                }, 2000);
            }
        });
    }, options);

    shineElements.forEach(element => {
        shineObserver.observe(element);
    });

    // También activamos el brillo cuando se hace hover
    shineElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.classList.add('animate');
            setTimeout(() => {
                element.classList.remove('animate');
            }, 2000);
        });
    });
}

// Efecto de movimiento del SVG en hero al hacer scroll
function initHeroSvgMovement() {
    const heroSvg = document.querySelector('.hero-svg');
    if (!heroSvg) return;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const heroHeight = document.querySelector('.hero').offsetHeight;
        const percentage = Math.min(scrollY / heroHeight, 1);

        // Mover el SVG hacia el centro cuando se hace scroll
        heroSvg.style.transform = `translateX(${-percentage * 30}%)`;
    });
}

// Efecto de tilt/parallax para la terminal principal del hero
function initHeroTerminalTilt() {
    // Solo activar en dispositivos de escritorio / alta gama
    const isSmallScreen = window.innerWidth < 1024;
    const hasFinePointer = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
    const cores = navigator.hardwareConcurrency || 2;
    const isLowCore = cores < 6; // considerar "última generación" como >= 6 núcleos lógicos

    if (isSmallScreen || !hasFinePointer || isLowCore) {
        return;
    }

    const terminal = document.querySelector('.hero .terminal-window');
    if (!terminal) return;

    // Límite de inclinación vertical y giro sobre eje Z.
    // El eje Y (horizontal) puede girar prácticamente libre para simular 360°.
    const maxRotateX = 35;   // límite de inclinación vertical
    const maxRotateZ = 20;   // límite de giro sobre su eje

    let currentRotX = 0;
    let currentRotY = 0;
    let currentRotZ = 0;

    let velX = 0;
    let velY = 0;
    let velZ = 0;

    let isDragging = false;
    let lastClientX = 0;
    let lastClientY = 0;

    function onPointerDown(event) {
        isDragging = true;
        lastClientX = event.clientX;
        lastClientY = event.clientY;
    }

    function onPointerMove(event) {
        if (!isDragging) return;

        const dx = event.clientX - lastClientX;
        const dy = event.clientY - lastClientY;
        lastClientX = event.clientX;
        lastClientY = event.clientY;

        // Añadir inercia de rotación como si fuera una esfera 3D
        velY += dx * 0.08;   // giro horizontal
        velX -= dy * 0.08;   // inclinación vertical
        velZ += dx * 0.03;   // ligero giro sobre su propio eje
    }

    function onPointerUp() {
        isDragging = false;
    }

    function animateTilt() {
        // Integrar velocidades
        currentRotX += velX;
        currentRotY += velY;
        currentRotZ += velZ;

        // Limitar inclinación vertical y giro Z para que no se deforme demasiado
        currentRotX = Math.max(-maxRotateX, Math.min(maxRotateX, currentRotX));
        currentRotZ = Math.max(-maxRotateZ, Math.min(maxRotateZ, currentRotZ));

        // Evitar que el ángulo Y crezca infinito: mantener en rango [-360, 360]
        if (currentRotY > 360 || currentRotY < -360) {
            currentRotY = currentRotY % 360;
        }

        // Cuando no se está arrastrando, aplicar un "resorte" que lo lleve de vuelta al centro
        if (!isDragging) {
            const spring = 0.03; // fuerza del resorte hacia 0
            velX += -currentRotX * spring;
            velY += -currentRotY * spring;
            velZ += -currentRotZ * spring;
        }

        // Fricción suave para que el movimiento se detenga de forma natural
        const friction = isDragging ? 0.9 : 0.96;
        velX *= friction;
        velY *= friction;
        velZ *= friction;

        // Limitar velocidades máximas
        const maxVel = 2.2;
        velX = Math.max(-maxVel, Math.min(maxVel, velX));
        velY = Math.max(-maxVel, Math.min(maxVel, velY));
        velZ = Math.max(-maxVel, Math.min(maxVel, velZ));

        terminal.style.transform =
            `perspective(1200px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg) rotateZ(${currentRotZ}deg)`;

        requestAnimationFrame(animateTilt);
    }

    terminal.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    animateTilt();
}

// Efecto de ripple para botones
function initRippleButtons() {
    const rippleButtons = document.querySelectorAll('.ripple-button');

    rippleButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Indicador de scroll
function initScrollIndicator() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const scrollIndicator = document.createElement('div');
    scrollIndicator.classList.add('scroll-indicator', 'fade-in-element');
    scrollIndicator.innerHTML = `
        <div class="mouse">
            <div class="wheel"></div>
        </div>
        <div class="arrow">
            <span></span>
        </div>
    `;

    hero.appendChild(scrollIndicator);

    // Quitar el indicador cuando se scrollea
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            scrollIndicator.classList.add('hidden');
        } else {
            scrollIndicator.classList.remove('hidden');
        }
    });
}

// Animación de la red neuronal
function initNetworkAnimation() {
    const canvas = document.getElementById('network-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const networkSection = document.getElementById('ia');
    const resizeCanvas = () => {
        canvas.width = networkSection.offsetWidth;
        canvas.height = networkSection.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Configuración de nodos
    const nodes = [];
    const numNodes = 30;
    const connectionDistance = 150;
    const nodeRadius = 5;

    // Crear nodos
    for (let i = 0; i < numNodes; i++) {
        nodes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            radius: Math.random() * 2 + nodeRadius,
            active: Math.random() > 0.6,
            color: '#00B5FF',
            pulsePhase: Math.random() * Math.PI * 2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Actualizar y dibujar nodos
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            // Actualizar posición
            node.x += node.vx;
            node.y += node.vy;

            // Rebotar en los bordes
            if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

            // Mantener dentro del canvas
            node.x = Math.max(0, Math.min(canvas.width, node.x));
            node.y = Math.max(0, Math.min(canvas.height, node.y));

            // Actualizar fase del pulso
            node.pulsePhase += 0.03;

            // Cambiar el estado activo aleatoriamente
            if (Math.random() < 0.001) node.active = !node.active;

            // Dibujar conexiones
            for (let j = i + 1; j < nodes.length; j++) {
                const otherNode = nodes[j];
                const dx = otherNode.x - node.x;
                const dy = otherNode.y - node.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < connectionDistance) {
                    const opacity = (1 - distance / connectionDistance) * 0.8;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 181, 255, ${opacity})`;
                    ctx.lineWidth = opacity * 2;
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(otherNode.x, otherNode.y);
                    ctx.stroke();

                    // Animación de pulso a lo largo de la conexión
                    if (node.active && otherNode.active && Math.random() < 0.02) {
                        const pulse = {
                            x: node.x,
                            y: node.y,
                            targetX: otherNode.x,
                            targetY: otherNode.y,
                            progress: 0,
                            speed: 0.05
                        };

                        const animatePulse = () => {
                            pulse.progress += pulse.speed;

                            if (pulse.progress >= 1) return;

                            const x = node.x + (otherNode.x - node.x) * pulse.progress;
                            const y = node.y + (otherNode.y - node.y) * pulse.progress;

                            ctx.beginPath();
                            ctx.arc(x, y, 3, 0, Math.PI * 2);
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                            ctx.fill();

                            requestAnimationFrame(animatePulse);
                        };

                        animatePulse();
                    }
                }
            }

            // Dibujar el nodo
            ctx.beginPath();
            const glow = Math.sin(node.pulsePhase) * 0.5 + 0.5;
            const radius = node.radius * (node.active ? (1 + glow * 0.5) : 1);
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = node.active ? node.color : '#3A3A3A';
            ctx.fill();

            // Agregar brillo a nodos activos
            if (node.active) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 181, 255, ${0.2 * glow})`;
                ctx.fill();
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}

// Efectos para los testimonios tipo chat
function initTestimonialChat() {
    const chat = document.getElementById('testimonials-chat');
    if (!chat) return;

    const testimonials = chat.querySelectorAll('.testimonial-item');
    let delay = 0;

    // Configurar visibilidad inicial
    testimonials.forEach(testimonial => {
        testimonial.style.opacity = '0';
        testimonial.style.transform = 'translateY(20px)';
    });

    // Función para animar los mensajes secuencialmente con efecto de tipeo
    function animateTestimonial(testimonial, index) {
        setTimeout(() => {
            // Mostrar el mensaje
            testimonial.style.opacity = '1';
            testimonial.style.transform = 'translateY(0)';
            testimonial.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

            // Animar el contenido como si se estuviera escribiendo
            const content = testimonial.querySelector('.testimonial-content p');
            if (content) {
                const text = content.textContent;
                content.textContent = '';
                let charIndex = 0;

                // Escribir cada carácter con un retraso
                function typeChar() {
                    if (charIndex < text.length) {
                        content.textContent += text.charAt(charIndex);
                        charIndex++;
                        setTimeout(typeChar, Math.random() * 15 + 15); // Velocidad de tipeo variable
                    }
                }

                typeChar();
            }

            // Animar el siguiente mensaje después de un retraso
            if (index < testimonials.length - 1) {
                const nextDelay = text ? text.length * 30 + 1000 : 1500; // Tiempo basado en la longitud del mensaje
                setTimeout(() => {
                    animateTestimonial(testimonials[index + 1], index + 1);
                }, nextDelay);
            }
        }, delay);

        delay = 800; // Espacio entre mensajes subsiguientes
    }

    // Observar cuando la sección de testimonios esté visible
    const testimonialsSection = document.querySelector('.testimonials-section');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Comenzar la animación para el primer testimonial
                setTimeout(() => {
                    animateTestimonial(testimonials[0], 0);
                }, 500);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    if (testimonialsSection) {
        observer.observe(testimonialsSection);
    }
}

// Efectos avanzados para la sección de automatización
function initAutomationEffects() {
    const automationSection = document.querySelector('#automatizacion');
    if (!automationSection) return;

    // Efecto de partículas de fondo
    createParticleBackground(automationSection);

    // Efectos para el código con tipografía de LLM
    const codeView = document.querySelector('.cyberpunk-code');
    if (codeView) {
        const codePre = codeView.querySelector('pre.llm-typing');
        const codeElement = codePre?.querySelector('code');

        if (codePre && codeElement) {
            const codeText = codeElement.textContent;
            const codeObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Limpiamos el contenido para el efecto de tipeo
                        codeElement.textContent = '';
                        codePre.classList.add('active');

                        // Aplicar colores a las palabras clave para el efecto de resaltado de sintaxis
                        const processedCode = processCodeForHighlighting(codeText);

                        // Efecto de tipeo con velocidades variables como un LLM real
                        let index = 0;
                        let lastPauseTime = 0;

                        function typeNextCharacter() {
                            if (index < processedCode.length) {
                                // Añadir el siguiente carácter o bloque HTML
                                if (processedCode[index] === '<') {
                                    // Encontrar el final de la etiqueta HTML
                                    const endTagIndex = processedCode.indexOf('>', index);
                                    if (endTagIndex !== -1) {
                                        const entireTag = processedCode.substring(index, endTagIndex + 1);
                                        codeElement.innerHTML += entireTag;
                                        index = endTagIndex + 1;
                                    } else {
                                        codeElement.innerHTML += processedCode[index];
                                        index++;
                                    }
                                } else {
                                    codeElement.innerHTML += processedCode[index];
                                    index++;
                                }

                                // Velocidad variable para simular pensamiento de LLM
                                let typeSpeed;

                                // Hacer pausa en signos de puntuación o nuevas líneas
                                if (['.', ',', ';', ':', '\n'].includes(processedCode[index - 1])) {
                                    typeSpeed = Math.random() * 150 + 100;
                                }
                                // Tipeo más rápido para código básico
                                else if (index % 5 === 0) {
                                    typeSpeed = Math.random() * 30 + 10;
                                }
                                // A veces hacer una pausa más larga como pensando
                                else if (Math.random() > 0.97 && (Date.now() - lastPauseTime > 3000)) {
                                    typeSpeed = Math.random() * 700 + 300;
                                    lastPauseTime = Date.now();
                                }
                                // Velocidad normal
                                else {
                                    typeSpeed = Math.random() * 50 + 10;
                                }

                                setTimeout(typeNextCharacter, typeSpeed);
                            }
                        }

                        // Iniciar efecto después de una pausa inicial
                        setTimeout(typeNextCharacter, 800);
                        codeObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });

            codeObserver.observe(codeView);
        }
    }

    // Efecto para la terminal con respuesta LLM
    const terminal = document.querySelector('.neo-terminal');
    if (terminal) {
        const terminalContent = terminal.querySelector('.terminal-content');
        const outputElement = terminalContent?.querySelector('.llm-response');

        if (outputElement) {
            const outputText = outputElement.innerHTML;

            const terminalObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Limpiar para el efecto de tipeo
                        outputElement.textContent = '';

                        let outputIndex = 0;
                        const lines = outputText.split('\n');
                        let currentLine = 0;

                        function typeTerminalOutput() {
                            if (currentLine < lines.length) {
                                const line = lines[currentLine];

                                // Si es una línea completa, añadirla con efecto de escritura
                                if (line.includes('<span')) {
                                    outputElement.innerHTML += line + '\n';
                                    currentLine++;
                                    setTimeout(typeTerminalOutput, Math.random() * 300 + 200);
                                } else {
                                    // Añadir carácter por carácter
                                    let lineIndex = 0;

                                    function typeLineCharacters() {
                                        if (lineIndex < line.length) {
                                            outputElement.innerHTML += line[lineIndex];
                                            lineIndex++;
                                            setTimeout(typeLineCharacters, Math.random() * 30 + 10);
                                        } else {
                                            outputElement.innerHTML += '\n';
                                            currentLine++;
                                            setTimeout(typeTerminalOutput, Math.random() * 100 + 50);
                                        }
                                    }

                                    typeLineCharacters();
                                }
                            }
                        }

                        // Comenzar a escribir la salida de la terminal
                        setTimeout(typeTerminalOutput, 1200);
                        terminalObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });

            terminalObserver.observe(terminal);
        }
    }

    // Efecto 3D mejorado para el navegador de archivos
    const fileBrowser = document.querySelector('.file-browser');
    if (fileBrowser) {
        automationSection.addEventListener('mousemove', e => {
            const rect = automationSection.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const moveX = (x - centerX) / 25;
            const moveY = (y - centerY) / 25;

            // Efecto 3D suavizado
            fileBrowser.style.transform = `perspective(2000px) rotateX(${-moveY}deg) rotateY(${moveX}deg) scale3d(0.98, 0.98, 0.98)`;

            // Efecto de luz dinámica que sigue al cursor
            const lightX = (x / rect.width) * 100;
            const lightY = (y / rect.height) * 100;
            fileBrowser.style.background = `
                radial-gradient(circle at ${lightX}% ${lightY}%, rgba(25, 49, 79, 0.7) 0%, rgba(13, 25, 42, 0.7) 50%)
            `;
        });

        automationSection.addEventListener('mouseleave', () => {
            fileBrowser.style.transform = 'perspective(2000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            fileBrowser.style.background = 'rgba(13, 25, 42, 0.7)';
        });
    }
}

// Función para procesar el código y aplicar clases de resaltado
function processCodeForHighlighting(code) {
    // Palabras clave de Python y JS
    const keywords = ['import', 'from', 'def', 'if', 'else', 'return', 'for', 'while', 'class', 'function', 'const', 'let', 'var'];
    const operators = ['+', '-', '*', '/', '=', '==', '!=', '>', '<', '>=', '<=', '&&', '||'];

    // Reemplazar patrones con HTML que contiene clases CSS para resaltado
    let processedCode = code
        // Comentarios
        .replace(/(#.+?)(?:\n|$)/g, '<span class="comment">$1</span>\n')
        // Cadenas
        .replace(/(["'])(?:\\.|[^\\])*?\1/g, '<span class="string">$&</span>')
        // Números
        .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="number">$1</span>');

    // Palabras clave
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
        processedCode = processedCode.replace(regex, '<span class="keyword">$1</span>');
    });

    // Nombre de funciones
    processedCode = processedCode.replace(/\b(\w+)\s*\(/g, '<span class="function">$1</span>(');

    return processedCode;
}

// Crear partículas flotantes en el fondo para efecto futurista
function createParticleBackground(container) {
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        // Posición aleatoria
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const size = Math.random() * 4 + 1;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;

        particle.style.cssText = `
            position: absolute;
            top: ${posY}%;
            left: ${posX}%;
            width: ${size}px;
            height: ${size}px;
            background: rgba(0, 212, 255, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
            animation: particle-animation ${duration}s infinite ${delay}s linear;
        `;

        container.appendChild(particle);
    }
}

// Efecto 3D de diamantes interactivos para pricing
function initPricing3DDiamonds() {
    const pricingPage = document.querySelector('body.pricing-page');
    if (!pricingPage) return;

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', (e) => {
        if (!pricingPage.classList.contains('pricing-page')) return;

        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animateDiamonds() {
        if (!pricingPage.classList.contains('pricing-page')) return;

        targetX += (mouseX - targetX) * 0.1;
        targetY += (mouseY - targetY) * 0.1;

        const rotateX = targetY * 15;
        const rotateY = targetX * 15;
        const translateX = targetX * 20;
        const translateY = targetY * 20;

        // Aplicar transformación al pseudo-elemento ::before
        const style = document.createElement('style');
        style.textContent = `
            body.pricing-page::before {
                transform: perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(${translateX}px) translateY(${translateY}px) translateZ(-50px);
            }
        `;

        // Remover estilo anterior si existe
        const oldStyle = document.getElementById('diamonds-3d-style');
        if (oldStyle) {
            oldStyle.remove();
        }

        style.id = 'diamonds-3d-style';
        document.head.appendChild(style);

        requestAnimationFrame(animateDiamonds);
    }

    animateDiamonds();
}

// Espacio 4D interactivo para la página de mantenimiento
function initMaintenance4DSpace() {
    const scene = document.querySelector('.maintenance-4d-scene');
    const world = scene ? scene.querySelector('.maintenance-4d-world') : null;
    const layers = scene ? scene.querySelectorAll('.maintenance-4d-layer') : null;

    if (!scene || !world || !layers || layers.length === 0) return;

    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

    let currentX = 0.5;
    let currentY = 0.4;
    let targetX = 0.5;
    let targetY = 0.4;
    let lastPointerTime = Date.now();
    let autoMode = true; // controla si el movimiento automático está activo

    // Actualizar la inclinación principal según el scroll sobre la escena
    const handleScroll = () => {
        const rect = scene.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.height;
        const heroHeight = rect.height || viewportHeight;

        // Progreso de scroll del hero: 0 cuando está en la parte superior, 1 cuando se ha desplazado una altura completa
        const rawProgress = -rect.top / heroHeight;
        const progress = Math.min(1, Math.max(0, rawProgress));

        // Usamos el scroll para mover la cámara en el eje vertical (más scroll = más "inmersión")
        targetY = 0.35 + progress * 0.3;
    };

    window.addEventListener('scroll', handleScroll);
    // Ajustar al estado actual de scroll al cargar
    handleScroll();

    const applyTransforms = (xNorm, yNorm) => {
        const mobile = isMobile();
        const rotationFactor = mobile ? 0.45 : 1;
        const depthFactor = mobile ? 0.55 : 1;

        const rotateX = (0.5 - yNorm) * 26 * rotationFactor; // más inclinación vertical
        const rotateY = (xNorm - 0.5) * 32 * rotationFactor; // más giro horizontal

        world.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;

        layers.forEach(layer => {
            let baseDepth;
            if (layer.classList.contains('layer-front')) baseDepth = 140; // terminal más cerca
            else if (layer.classList.contains('layer-mid')) baseDepth = 80; // tarjeta en un plano intermedio
            else baseDepth = 40;

            const depth = baseDepth * depthFactor;
            const moveX = (xNorm - 0.5) * depth;
            const moveY = (yNorm - 0.5) * depth;

            layer.style.transform = `translate3d(${moveX}px, ${moveY}px, ${depth}px)`;
        });
    };

    // Controles de UI para la vista 4D (giro manual, pausa, reset)
    const createControls = () => {
        const controls = document.createElement('div');
        controls.className = 'maintenance-4d-controls';
        controls.innerHTML = `
            <button type="button" data-action="left" title="Girar izquierda">◀</button>
            <button type="button" data-action="center" title="Centrar vista">●</button>
            <button type="button" data-action="right" title="Girar derecha">▶</button>
            <button type="button" data-action="toggle-auto" title="Auto movimiento">⏯</button>
        `;

        scene.appendChild(controls);

        const step = 0.06; // tamaño del giro manual

        controls.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const now = Date.now();

            if (action === 'left') {
                targetX = Math.max(0, targetX - step);
                lastPointerTime = now;
            } else if (action === 'right') {
                targetX = Math.min(1, targetX + step);
                lastPointerTime = now;
            } else if (action === 'center') {
                targetX = 0.5;
                targetY = 0.4;
                lastPointerTime = now;
            } else if (action === 'toggle-auto') {
                autoMode = !autoMode;
                btn.classList.toggle('paused', !autoMode);
                lastPointerTime = now;
            }
        });
    };

    const animate = () => {
        const now = Date.now();
        const idle = now - lastPointerTime > 2500;

        // Movimiento suave automático cuando nadie mueve el cursor
        if (idle && autoMode) {
            const t = now / 4000;
            targetX = 0.5 + Math.sin(t) * 0.08;
            targetY = 0.42 + Math.cos(t * 1.2) * 0.05;
        }

        // Interpolación suave hacia el objetivo
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;

        applyTransforms(currentX, currentY);

        requestAnimationFrame(animate);
    };

    const handlePointer = (clientX, clientY) => {
        const rect = scene.getBoundingClientRect();
        const xNorm = (clientX - rect.left) / rect.width;
        const yNorm = (clientY - rect.top) / rect.height;

        // Limitar entre 0 y 1
        targetX = Math.min(1, Math.max(0, xNorm));
        targetY = Math.min(1, Math.max(0, yNorm));
        lastPointerTime = Date.now();
    };

    scene.addEventListener('mousemove', (e) => {
        handlePointer(e.clientX, e.clientY);
    });

    scene.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        if (touch) {
            handlePointer(touch.clientX, touch.clientY);
        }
    }, { passive: true });

    // Arrancar animación continua (respiración del espacio)
    animate();

    // Crear controles visuales
    createControls();
}

// Función para inicializar el menú móvil moderno
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.modern-nav');

    if (!menuToggle || !nav) return;

    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        menuToggle.classList.toggle('active');

        // Cambiar el ícono según el estado
        const icon = menuToggle.querySelector('i');
        if (icon) {
            if (nav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });

    // Cerrar menú al hacer clic en un enlace
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');

            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });

    // Cerrar menú al hacer clic fuera de él
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('active') &&
            !nav.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');

            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
}

// Función para inicializar el efecto de texto que se escribe
function initTypingText() {
    const typingElement = document.getElementById('typing-text');
    if (!typingElement) return;

    const phrases = [
        "Optimizamos sus operaciones con automatización inteligente.",
        "Reducimos costos operativos hasta un 60%.",
        "Aumentamos productividad con soluciones personalizadas.",
        "Integramos IA para decisiones más efectivas.",
        "Transformamos datos en ventajas competitivas reales."
    ];

    let currentPhraseIndex = 0;
    const typeSpeed = 50; // velocidad de escritura
    const eraseSpeed = 30; // velocidad de borrado
    const pauseTime = 2000; // tiempo de pausa entre frases

    function typePhrase() {
        const currentPhrase = phrases[currentPhraseIndex];
        let charIndex = 0;
        typingElement.textContent = "";

        function type() {
            if (charIndex < currentPhrase.length) {
                typingElement.textContent += currentPhrase.charAt(charIndex);
                charIndex++;
                setTimeout(type, typeSpeed);
            } else {
                setTimeout(erasePhrase, pauseTime);
            }
        }

        type();
    }

    function erasePhrase() {
        let currentText = typingElement.textContent;

        function erase() {
            if (currentText.length > 0) {
                currentText = currentText.substring(0, currentText.length - 1);
                typingElement.textContent = currentText;
                setTimeout(erase, eraseSpeed);
            } else {
                currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
                setTimeout(typePhrase, 500);
            }
        }

        erase();
    }

    // Iniciar el efecto de tipeo
    typePhrase();
}

// Función para inicializar el menú móvil
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!menuToggle || !mobileMenu) return;

    menuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        menuToggle.classList.toggle('active');

        if (menuToggle.classList.contains('active')) {
            menuToggle.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });

    // Cerrar el menú al hacer clic en un enlace
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            menuToggle.classList.remove('active');

            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });

    // Cerrar el menú al hacer clic fuera de él
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active') &&
            !mobileMenu.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            mobileMenu.classList.remove('active');
            menuToggle.classList.remove('active');

            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
}

// Función para mover el logo del hero al centro mientras se hace scroll
function initHeroLogoEffect() {
    const heroLogo = document.querySelector('.hero-logo');
    if (!heroLogo) return;

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const viewportHeight = window.innerHeight;

        // Calcular cuánto debe moverse el logo basado en el scroll
        if (scrollPosition > 0 && scrollPosition < viewportHeight) {
            const scrollRatio = scrollPosition / (viewportHeight / 2);

            if (scrollRatio < 1) {
                heroLogo.style.transform = `translateY(${scrollRatio * 20}px) scale(${1 + scrollRatio * 0.2})`;
                if (scrollRatio > 0.3) {
                    heroLogo.classList.add('logo-centered');
                } else {
                    heroLogo.classList.remove('logo-centered');
                }
            }
        } else if (scrollPosition === 0) {
            heroLogo.style.transform = 'translateY(0) scale(1)';
            heroLogo.classList.remove('logo-centered');
        }
    });
}

// Función para inicializar el chatbot interactivo
function initChatbot() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    if (!chatInput || !chatMessages) return;

    // Respuestas predefinidas para simular conexión con n8n
    const botResponses = {
        "hola": "¡Hola! Soy el asistente virtual de RENACE Tech. ¿En qué puedo ayudarte hoy?",
        "servicios": "Ofrecemos servicios de desarrollo de software, implementación de IA, automatización de procesos y consultoría tecnológica. ¿Sobre cuál te gustaría saber más?",
        "ia": "Nuestra tecnología de IA permite automatizar tareas repetitivas, analizar grandes volúmenes de datos y generar insights valiosos para tu negocio. Implementamos soluciones de machine learning, procesamiento del lenguaje natural y visión por computadora.",
        "precios": "Nuestros precios varían según el alcance del proyecto. Podemos ofrecerte un presupuesto personalizado. Por favor, cuéntanos más sobre tu proyecto para darte información más precisa.",
        "contacto": "Puedes contactarnos a través del formulario en nuestra página web, por teléfono al +1-234-567-8900 o por email a info@renace.tech. Estaremos encantados de atenderte.",
        "gracias": "¡De nada! Estamos aquí para ayudarte. Si tienes más preguntas, no dudes en consultarnos."
    };

    function getBotResponse(userMessage) {
        userMessage = userMessage.toLowerCase();

        for (const keyword in botResponses) {
            if (userMessage.includes(keyword)) {
                return botResponses[keyword];
            }
        }

        // Respuesta por defecto si no coincide con ninguna palabra clave
        return "Gracias por tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo pronto. Si tienes una consulta específica sobre nuestros servicios de IA o automatización, no dudes en preguntar.";
    }

    function addMessage(message, isUser) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');

        const messageContent = document.createElement('div');
        messageContent.classList.add(isUser ? 'message-user' : 'message-bot');

        const prefix = isUser ? 'Tú: ' : 'Asistente: ';
        messageContent.textContent = prefix + message;

        messageElement.appendChild(messageContent);
        chatMessages.appendChild(messageElement);

        // Hacer scroll hacia abajo para mostrar el último mensaje
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Simulación de conexión con n8n
    function sendToChatbot(message) {
        // Aquí se implementaría la conexión real con n8n
        setTimeout(() => {
            const response = getBotResponse(message);
            addMessage(response, false);
        }, 500);
    }

    chatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            const userMessage = chatInput.value.trim();
            addMessage(userMessage, true);
            chatInput.value = '';

            // Enviar el mensaje al chatbot (simulado)
            sendToChatbot(userMessage);
        }
    });
}

/**
 * Inicializa el efecto de tipeo moderno en el hero
 */
function initTypewriterModernStyle() {
    const textElement = document.getElementById('typing-text');
    if (!textElement) return;

    const originalText = textElement.innerText;
    textElement.innerText = '';
    let index = 0;
    let isDeleting = false;
    let typingSpeed = 50; // Velocidad base de tipeo (ms)

    const type = () => {
        // Texto actual
        const currentText = originalText.substring(0, index);
        textElement.innerHTML = currentText;

        // Determinar próxima acción
        if (!isDeleting && index < originalText.length) {
            // Incrementar índice para mostrar próximo caracter
            index++;
            // Pequeña variación aleatoria en la velocidad para hacerlo más humano
            typingSpeed = Math.max(30, Math.min(80, 50 + Math.random() * 30 - 15));
        } else if (!isDeleting && index >= originalText.length) {
            // Esperar antes de empezar a borrar
            typingSpeed = 3000; // 3 segundos de pausa
            isDeleting = false; // No borramos, mantenemos el texto completo
        }

        // Programar próxima actualización
        setTimeout(type, typingSpeed);
    };

    // Iniciar el efecto de tipeo
    setTimeout(type, 1200); // Pequeña pausa inicial
}

/**
 * Inicializa el menú móvil
 */
function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu a');

    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });

        // Cerrar el menú cuando se hace clic en un enlace
        mobileMenuLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
    }
}

/**
 * Animación de código morse para las luces que deletrean RENACE
 * R: .-. (corto-largo-corto)
 * E: . (corto)
 * N: -. (largo-corto)
 * A: .- (corto-largo)
 * C: -.-. (largo-corto-largo-corto)
 * E: . (corto)
 */
function initMorseCodeLights() {
    const morseLights = document.getElementById('morse-lights');
    if (!morseLights) return;

    const dots = morseLights.querySelectorAll('.morse-dot');
    if (dots.length === 0) return;

    // Código morse para RENACE
    const renaceMorse = [
        // R: .-.
        { type: 'dot', duration: 200 },   // corto
        { type: 'dash', duration: 600 },  // largo
        { type: 'dot', duration: 200 },   // corto
        { type: 'pause', duration: 600 }, // pausa entre letras

        // E: .
        { type: 'dot', duration: 200 },   // corto
        { type: 'pause', duration: 600 }, // pausa entre letras

        // N: -.
        { type: 'dash', duration: 600 },  // largo
        { type: 'dot', duration: 200 },   // corto
        { type: 'pause', duration: 600 }, // pausa entre letras

        // A: .-
        { type: 'dot', duration: 200 },   // corto
        { type: 'dash', duration: 600 },  // largo
        { type: 'pause', duration: 600 }, // pausa entre letras

        // C: -.-.
        { type: 'dash', duration: 600 },  // largo
        { type: 'dot', duration: 200 },   // corto
        { type: 'dash', duration: 600 },  // largo
        { type: 'dot', duration: 200 },   // corto
        { type: 'pause', duration: 600 }, // pausa entre letras

        // E: .
        { type: 'dot', duration: 200 },   // corto
        { type: 'pause', duration: 1200 } // pausa larga antes de repetir
    ];

    // Función para activar y desactivar luces según el código morse
    const playMorseSequence = async () => {
        let currentDotIndex = 0;

        for (const signal of renaceMorse) {
            if (signal.type === 'pause') {
                // Pausa: todas las luces apagadas
                dots.forEach(dot => dot.classList.remove('active', 'dash'));
            } else {
                // Activar la luz actual
                const dot = dots[currentDotIndex % dots.length];
                dot.classList.add('active');

                // Si es un guión, añadir clase adicional
                if (signal.type === 'dash') {
                    dot.classList.add('dash');
                } else {
                    dot.classList.remove('dash');
                }

                // Avanzar al siguiente punto
                currentDotIndex++;
            }

            // Esperar la duración indicada
            await new Promise(resolve => setTimeout(resolve, signal.duration));
        }

        // Recursivamente continuar la secuencia
        playMorseSequence();
    };

    // Iniciar la secuencia
    playMorseSequence();
}

/**
 * Efecto de logo que se mueve al centro al hacer scroll
 */
function initHeroLogoScrollEffect() {
    const logoText = document.querySelector('.logo-text');
    const hero = document.querySelector('.hero');

    if (!logoText || !hero) return;

    // Guardar la posición original del logo
    const originalLogoPosition = {
        top: logoText.offsetTop,
        left: logoText.offsetLeft,
        fontSize: parseFloat(window.getComputedStyle(logoText).fontSize)
    };

    // Calcular la posición central
    const heroRect = hero.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const targetPosition = {
        top: windowHeight / 2 - 30, // Ajuste para centrar verticalmente
        left: windowWidth / 2,
        fontSize: originalLogoPosition.fontSize * 0.7 // Reducir tamaño al 70%
    };

    window.addEventListener('scroll', () => {
        const scrollProgress = Math.min(window.scrollY / (windowHeight * 0.5), 1);

        if (scrollProgress > 0 && scrollProgress <= 1) {
            // Interpolar entre la posición original y la central
            const currentTop = originalLogoPosition.top + (targetPosition.top - originalLogoPosition.top) * scrollProgress;
            const currentLeft = originalLogoPosition.left + (targetPosition.left - originalLogoPosition.left) * scrollProgress;
            const currentFontSize = originalLogoPosition.fontSize - (originalLogoPosition.fontSize - targetPosition.fontSize) * scrollProgress;

            // Aplicar transformación
            logoText.style.position = 'fixed';
            logoText.style.top = `${currentTop}px`;
            logoText.style.left = `${currentLeft}px`;
            logoText.style.transform = `translateX(-50%) scale(${1 - 0.3 * scrollProgress})`;
            logoText.style.zIndex = '1000';

            // Ajustar opacidad de otros elementos del hero
            const otherElements = hero.querySelectorAll('.hero-content > *:not(.hero-title)');
            otherElements.forEach(el => {
                el.style.opacity = 1 - scrollProgress;
            });
        } else if (scrollProgress === 0) {
            // Restablecer posición original
            logoText.style.position = '';
            logoText.style.top = '';
            logoText.style.left = '';
            logoText.style.transform = '';
            logoText.style.fontSize = '';

            // Restablecer opacidad
            const otherElements = hero.querySelectorAll('.hero-content > *:not(.hero-title)');
            otherElements.forEach(el => {
                el.style.opacity = '1';
            });
        }
    });
}

/**
 * Terminal interactiva con chatbot n8n
 */
function initChatbotTerminal() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const terminalContent = document.getElementById('terminal-content');

    if (!chatInput || !chatMessages || !terminalContent) return;

    // Mensaje de bienvenida automático después de 3 segundos
    setTimeout(() => {
        addBotMessage('Hola, soy el asistente virtual de RENACE. ¿En qué puedo ayudarte hoy?');

        // Generar un mensaje automático después de unos segundos
        setTimeout(() => {
            addBotMessage('Puedes preguntarme sobre nuestros servicios de automatización, inteligencia artificial, o desarrollo tecnológico a medida.');
        }, 2500);
    }, 3000);

    // Evento para enviar mensaje al presionar Enter
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            const userMessage = chatInput.value.trim();
            addUserMessage(userMessage);
            processUserMessage(userMessage);
            chatInput.value = '';

            // Scroll al fondo del chat
            setTimeout(() => {
                terminalContent.scrollTop = terminalContent.scrollHeight;
            }, 100);
        }
    });

    // Añadir mensaje del usuario al chat
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.innerHTML = `<span class="message-user">▶ Usuario:</span> ${message}`;
        chatMessages.appendChild(messageElement);
    }

    // Añadir mensaje del bot al chat con efecto de escritura
    function addBotMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');

        // Contenedor para el mensaje del bot
        const botMessageContainer = document.createElement('div');
        botMessageContainer.innerHTML = `<span class="message-bot">▶ RENACE:</span> <span class="bot-message-text"></span>`;
        messageElement.appendChild(botMessageContainer);

        // Añadir al chat
        chatMessages.appendChild(messageElement);

        // Efecto de escritura letra por letra
        const textElement = botMessageContainer.querySelector('.bot-message-text');
        let i = 0;
        const typingSpeed = 30; // ms por caracter

        function typeCharacter() {
            if (i < message.length) {
                textElement.textContent += message.charAt(i);
                i++;
                setTimeout(typeCharacter, typingSpeed);

                // Scroll al fondo mientras escribe
                terminalContent.scrollTop = terminalContent.scrollHeight;
            }
        }

        typeCharacter();
    }

    // Procesar mensaje del usuario y generar respuesta
    function processUserMessage(message) {
        // Convertir mensaje a minúsculas para facilitar comparaciones
        const lowerMessage = message.toLowerCase();

        // Simular tiempo de respuesta para que parezca más natural
        setTimeout(() => {
            // Respuestas basadas en palabras clave
            if (lowerMessage.includes('hola') || lowerMessage.includes('saludos') || lowerMessage.includes('buenos días')) {
                addBotMessage('¡Hola! Bienvenido a RENACE Tech. ¿Cómo puedo ayudarte hoy?');
            }
            else if (lowerMessage.includes('servicios') || lowerMessage.includes('qué hacen') || lowerMessage.includes('que hacen')) {
                addBotMessage('En RENACE Tech ofrecemos servicios de desarrollo tecnológico a medida, automatización de procesos con IA, consultoría tecnológica, y soluciones de software escalables para empresas de todos los tamaños.');
            }
            else if (lowerMessage.includes('ia') || lowerMessage.includes('inteligencia artificial') || lowerMessage.includes('machine learning')) {
                addBotMessage('Nuestra especialidad es la implementación de soluciones de IA para optimizar procesos empresariales. Utilizamos tecnologías de vanguardia como procesamiento del lenguaje natural, visión por computadora y aprendizaje automático para crear sistemas inteligentes que resuelven problemas complejos.');
            }
            else if (lowerMessage.includes('automatización') || lowerMessage.includes('flujos de trabajo') || lowerMessage.includes('n8n')) {
                addBotMessage('Nuestras soluciones de automatización permiten reducir hasta un 60% los costos operativos. Implementamos herramientas como n8n para crear flujos de trabajo inteligentes que conectan sus aplicaciones y servicios, eliminando tareas repetitivas y optimizando sus recursos.');
            }
            else if (lowerMessage.includes('precios') || lowerMessage.includes('costos') || lowerMessage.includes('cuánto cuesta')) {
                addBotMessage('Cada proyecto es único y adaptamos nuestras soluciones a las necesidades específicas de cada cliente. Te invitamos a contactarnos para una evaluación personalizada y presupuesto detallado. Nuestros precios son competitivos y ofrecemos excelente relación calidad-precio.');
            }
            else if (lowerMessage.includes('contacto') || lowerMessage.includes('comunicarme') || lowerMessage.includes('hablar con alguien')) {
                addBotMessage('Puedes contactarnos por email a info@renace.tech o completar el formulario en la sección de contacto de nuestra web. También ofrecemos consultas iniciales gratuitas para entender mejor tus necesidades y explicarte cómo podemos ayudarte.');
            }
            else {
                // Respuesta genérica si no se detectan palabras clave
                addBotMessage('Gracias por tu mensaje. Estamos especializados en desarrollo tecnológico, automatización e inteligencia artificial. ¿Te gustaría conocer más sobre alguno de estos servicios o tienes un proyecto específico en mente?');
            }
        }, 800 + Math.random() * 800); // Tiempo de respuesta entre 800ms y 1600ms
    }
}

// Función para hacer que todos los botones de la página tengan funcionalidad
function initAllButtonsInteractivity() {
    // 1. Botones de navegación
    const navLinks = document.querySelectorAll('nav a, .hero-button, .feature-button, .view-project-btn, .btn, button');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Si es un enlace de anclaje interno, hacer scroll suave
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(href);

                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - 80, // Offset para el header
                        behavior: 'smooth'
                    });

                    // Agregar efecto de destello al llegar a la sección
                    targetSection.classList.add('section-highlight');
                    setTimeout(() => {
                        targetSection.classList.remove('section-highlight');
                    }, 1000);
                }
            }

            // Si es un botón regular sin href, mostrar feedback
            if (!href || href === '#' || href === 'javascript:void(0)') {
                // Obtener el texto del botón para mostrar un mensaje personalizado
                const buttonText = this.textContent.trim();
                this.classList.add('button-clicked');

                setTimeout(() => {
                    this.classList.remove('button-clicked');
                }, 300);

                // Mensaje personalizado basado en el texto del botón
                let message = `Acción '${buttonText}' activada correctamente`;

                if (buttonText.toLowerCase().includes('descargar')) {
                    message = 'Iniciando descarga...';
                } else if (buttonText.toLowerCase().includes('contacto') || buttonText.toLowerCase().includes('mensaje')) {
                    message = 'Abriendo formulario de contacto...';
                } else if (buttonText.toLowerCase().includes('servicio') || buttonText.toLowerCase().includes('cámara')) {
                    message = 'Mostrando información sobre nuestros servicios de Cámaras AI...';
                }

                // Mostrar notificación
                showNotification(message);
            }
        });
    });

    // 2. Botones del terminal
    const terminalButtons = document.querySelectorAll('.terminal-button');
    terminalButtons.forEach(button => {
        button.addEventListener('click', function () {
            const action = this.getAttribute('data-action');
            const terminal = document.querySelector('.terminal-container');

            if (action === 'minimize') {
                terminal.classList.toggle('terminal-minimized');
            } else if (action === 'maximize') {
                terminal.classList.toggle('terminal-fullscreen');
            } else if (action === 'close') {
                terminal.style.display = 'none';
                // Mostrar botón para restaurar el terminal
                const restoreButton = document.createElement('button');
                restoreButton.className = 'restore-terminal-btn';
                restoreButton.innerHTML = '<i class="fas fa-terminal"></i> Abrir Terminal';
                document.querySelector('.resources-section').appendChild(restoreButton);

                restoreButton.addEventListener('click', function () {
                    terminal.style.display = 'block';
                    this.remove();
                });
            }
        });
    });

    // 3. Botones de los proyectos y características
    const projectButtons = document.querySelectorAll('.project-card .btn, .feature-card .btn');
    projectButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const projectName = this.closest('.project-card, .feature-card').querySelector('h3').textContent;
            showNotification(`Explorando proyecto: ${projectName}`);
        });
    });
}

// Función para mostrar notificaciones
function showNotification(message) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        </div>
        <div class="notification-progress"></div>
    `;

    // Agregar al DOM
    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Animar salida y eliminar
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Función para el efecto de movimiento del logo al hacer scroll
function initHeroLogoScrollEffect() {
    const logoText = document.querySelector('.logo-text');
    const hero = document.querySelector('.hero');

    if (!logoText || !hero) return;

    // Guardar la posición original
    const originalPosition = {
        top: logoText.offsetTop,
        left: logoText.offsetLeft,
        fontSize: parseFloat(window.getComputedStyle(logoText).fontSize)
    };

    // Calcular la posición central
    const heroRect = hero.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const targetPosition = {
        top: windowHeight / 2 - 30, // Ajuste para centrar verticalmente
        left: windowWidth / 2,
        fontSize: originalPosition.fontSize * 0.7 // Reducir tamaño al 70%
    };

    window.addEventListener('scroll', () => {
        const scrollProgress = Math.min(window.scrollY / (windowHeight * 0.5), 1);

        if (scrollProgress > 0 && scrollProgress <= 1) {
            // Interpolar entre la posición original y la central
            const currentTop = originalPosition.top + (targetPosition.top - originalPosition.top) * scrollProgress;
            const currentLeft = originalPosition.left + (targetPosition.left - originalPosition.left) * scrollProgress;
            const currentFontSize = originalPosition.fontSize - (originalPosition.fontSize - targetPosition.fontSize) * scrollProgress;

            // Aplicar transformación
            logoText.style.position = 'fixed';
            logoText.style.top = `${currentTop}px`;
            logoText.style.left = `${currentLeft}px`;
            logoText.style.transform = `translateX(-50%) scale(${1 - 0.3 * scrollProgress})`;
            logoText.style.zIndex = '1000';

            // Ajustar opacidad de otros elementos del hero
            const otherElements = hero.querySelectorAll('.hero-content > *:not(.hero-title)');
            otherElements.forEach(el => {
                el.style.opacity = 1 - scrollProgress;
            });
        } else if (scrollProgress === 0) {
            // Restablecer posición original
            logoText.style.position = '';
            logoText.style.top = '';
            logoText.style.left = '';
            logoText.style.transform = '';
            logoText.style.fontSize = '';

            // Restablecer opacidad
            const otherElements = hero.querySelectorAll('.hero-content > *:not(.hero-title)');
            otherElements.forEach(el => {
                el.style.opacity = '1';
            });
        }
    });
}

// Función para corregir y mejorar el funcionamiento del menú móvil
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu a');

    if (!menuToggle || !mobileMenu) return;

    // Función para alternar el menú
    const toggleMenu = () => {
        menuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    };

    // Event listener para el botón de menú
    menuToggle.addEventListener('click', toggleMenu);

    // Event listeners para los enlaces del menú móvil
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            // Si es un enlace interno, hacer scroll suave
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(href);

                if (targetSection) {
                    // Cerrar el menú
                    toggleMenu();

                    // Scroll a la sección
                    setTimeout(() => {
                        window.scrollTo({
                            top: targetSection.offsetTop - 80,
                            behavior: 'smooth'
                        });
                    }, 300); // Pequeño retraso para la animación del menú
                }
            }
        });
    });

    // Cerrar el menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active') &&
            !mobileMenu.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            toggleMenu();
        }
    });
}

// Mejorar la terminal interactiva para que sea más fluida
function initChatbotTerminal() {
    const terminal = document.querySelector('.terminal-content');
    const terminalInput = document.querySelector('.terminal-input');
    const terminalPrompt = document.querySelector('.terminal-prompt');

    if (!terminal || !terminalInput || !terminalPrompt) return;

    // Auto-focus en el input de la terminal
    terminalInput.focus();

    // Mantener el foco en el input al hacer clic en la terminal
    terminal.addEventListener('click', () => {
        terminalInput.focus();
    });

    // Historial de comandos
    const commandHistory = [];
    let historyIndex = -1;

    terminalInput.addEventListener('keydown', function (e) {
        // Navegar por el historial con las flechas arriba y abajo
        if (e.key === 'ArrowUp') {
            e.preventDefault();

            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();

            // Autocompletar comandos básicos
            const commonCommands = ['help', 'clear', 'info', 'services', 'about', 'contact'];
            const currentInput = terminalInput.value.trim();

            if (currentInput) {
                const matchingCommand = commonCommands.find(cmd => cmd.startsWith(currentInput));
                if (matchingCommand) {
                    terminalInput.value = matchingCommand;
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();

            if (historyIndex > 0) {
                historyIndex--;
                terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
            } else if (historyIndex === 0) {
                historyIndex = -1;
                terminalInput.value = '';
            }
        }
    });

    terminalInput.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            const command = terminalInput.value.trim();

            if (command) {
                // Agregar al historial
                commandHistory.push(command);
                historyIndex = -1;

                // Mostrar el comando ingresado
                const commandElement = document.createElement('div');
                commandElement.className = 'terminal-line';
                commandElement.innerHTML = `<span class="terminal-prompt">$ </span>${command}`;
                terminal.appendChild(commandElement);

                // Procesar el comando
                processCommand(command);

                // Limpiar el input
                terminalInput.value = '';

                // Scroll al final
                terminal.scrollTop = terminal.scrollHeight;
            }
        }
    });

    // Función para procesar comandos
    function processCommand(command) {
        command = command.toLowerCase();
        let responseText = '';

        if (command === 'help') {
            responseText = `
                <div class="terminal-help">
                    <p>Comandos disponibles:</p>
                    <ul>
                        <li><span class="command">help</span> - Muestra esta ayuda</li>
                        <li><span class="command">clear</span> - Limpia la terminal</li>
                        <li><span class="command">about</span> - Información sobre RENACE</li>
                        <li><span class="command">services</span> - Nuestros servicios</li>
                        <li><span class="command">contact</span> - Información de contacto</li>
                        <li><span class="command">info</span> - Información del sistema</li>
                    </ul>
                </div>
            `;
        } else if (command === 'clear') {
            // Limpiar la terminal pero mantener la primera línea de bienvenida
            const firstLine = terminal.firstChild;
            terminal.innerHTML = '';
            terminal.appendChild(firstLine);
            return; // No agregar respuesta adicional
        } else if (command === 'about') {
            responseText = `
                <p>RENACE es una empresa de tecnología especializada en soluciones empresariales innovadoras.</p>
                <p>Nuestra misión es transformar y optimizar procesos a través de la inteligencia artificial y automatización avanzada.</p>
            `;
        } else if (command === 'services') {
            responseText = `
                <div class="terminal-services">
                    <p>Nuestros servicios incluyen:</p>
                    <ul>
                        <li>Implementación de sistemas inteligentes</li>
                        <li>Automatización de procesos empresariales</li>
                        <li>Desarrollo de soluciones a medida</li>
                        <li>Consultoría tecnológica estratégica</li>
                        <li>Sistemas CAM con inteligencia artificial</li>
                    </ul>
                </div>
            `;
        } else if (command === 'contact') {
            responseText = `
                <p>Contáctanos:</p>
                <ul>
                    <li>Email: info@renace.tech</li>
                    <li>Teléfono: +1 809 915 2622</li>
                    <li>Ubicación: Santo Domingo, República Dominicana</li>
                </ul>
            `;
        } else if (command === 'info') {
            const now = new Date();
            responseText = `
                <p>Sistema: RENACE Terminal v1.0</p>
                <p>Fecha: ${now.toLocaleDateString()}</p>
                <p>Hora: ${now.toLocaleTimeString()}</p>
                <p>Usuario: Usuario invitado</p>
            `;
        } else {
            responseText = `<p>Comando no reconocido: ${command}. Escribe 'help' para ver los comandos disponibles.</p>`;
        }

        // Simular tiempo de respuesta para una experiencia más realista
        const responseElement = document.createElement('div');
        responseElement.className = 'terminal-response';
        responseElement.innerHTML = responseText;

        // Efecto de escritura para la respuesta
        terminal.appendChild(responseElement);
        terminal.scrollTop = terminal.scrollHeight;
    }
}

/**
 * Menú móvil mejorado y optimizado
 */
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.modern-nav');
    const navLinks = document.querySelectorAll('.modern-nav a');

    if (!menuToggle || !nav) return;

    // Función para cerrar el menú
    const closeMenu = () => {
        nav.classList.remove('active');
        menuToggle.classList.remove('active');
        document.body.style.overflow = ''; // Restaurar scroll
    };

    // Función para abrir el menú
    const openMenu = () => {
        nav.classList.add('active');
        menuToggle.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
    };

    // Toggle de menú móvil
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar propagación al documento

        if (nav.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Cerrar menú al hacer clic en enlaces
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('active') &&
            !nav.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // Prevenir cierre al hacer clic dentro del menú
    nav.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Cerrar menú al cambiar tamaño de ventana a desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992 && nav.classList.contains('active')) {
            closeMenu();
        }
    });
}

/**
 * Efecto para centrar el logo del header al hacer scroll
 */
function initHeaderLogoEffect() {
    const headerLogo = document.querySelector('.logo img'); // Logo de la barra de menu
    const header = document.querySelector('header');

    if (!headerLogo || !header) return;

    // Guardar posiciou00f3n original del logo
    const originalPos = {
        left: headerLogo.getBoundingClientRect().left,
    };

    // Obtener el centro del header
    const getHeaderCenter = () => {
        const headerRect = header.getBoundingClientRect();
        return headerRect.left + headerRect.width / 2;
    };

    window.addEventListener('scroll', () => {
        // Empezar el efecto despuu00e9s de 100px de scroll
        const scrollPos = window.scrollY;
        const scrollProgress = Math.min(scrollPos / 300, 1);

        if (scrollPos > 50) {
            // Centrar el logo
            const targetCenter = getHeaderCenter();
            const currentLeft = originalPos.left + (targetCenter - originalPos.left) * scrollProgress;

            // Aplicar transformaciu00f3n
            headerLogo.style.position = 'absolute';
            headerLogo.style.left = `${currentLeft}px`;
            headerLogo.style.transform = 'translateX(-50%)';
            headerLogo.style.transition = 'all 0.2s ease-out';
        } else {
            // Restaurar posiciu00f3n original
            headerLogo.style.position = '';
            headerLogo.style.left = '';
            headerLogo.style.transform = '';
        }
    });
}

// Función para animar los testimonios como mensajes
function animarTestimonios() {
    const items = document.querySelectorAll('#testimonials-chat .testimonial-item');
    if (!items.length) return;

    // Ocultar todos
    items.forEach(item => item.style.opacity = '0');

    // Mostrar uno a uno
    let i = 0;
    const interval = setInterval(() => {
        if (i >= items.length) {
            clearInterval(interval);
            return;
        }
        items[i].style.opacity = '1';
        document.getElementById('testimonials-chat').scrollTop = 9999;
        i++;
    }, 1000);
}

// Efecto de escritura tipo LLM para el hero
function typeEffect(element, text, speed = 50) {
    let i = 0;
    const timer = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(timer);
        }
    }, speed);
}

function initLlmEffect() {
    const heading = document.getElementById('gpt-heading');
    const paragraph = document.getElementById('gpt-paragraph');

    if (!heading || !paragraph) return;

    // Textos simples y concretos para el hero
    const headingText = 'Desarrollo de software avanzado';
    const paragraphText = 'Automatización, inteligencia artificial e integraciones tecnológicas personalizadas para empresas.';

    // Iniciar el efecto de escritura para el heading
    setTimeout(() => {
        typeEffect(heading, headingText, 60);

        // Cuando termine el heading, iniciar el párrafo
        setTimeout(() => {
            typeEffect(paragraph, paragraphText, 30);
        }, headingText.length * 60 + 300);
    }, 500);
}

// Mejora de los testimoniales para que parezcan iMessage con scroll autu00f3nomo
function mejorarTestimonios() {
    const testimonials = document.querySelectorAll('#testimonials-chat .testimonial-item');
    if (!testimonials.length) return;

    // Ocultar todos los testimonios al inicio
    testimonials.forEach(item => {
        item.style.opacity = '0';
        item.style.display = 'none';
    });

    // Mostrar gradualmente cada testimonio
    let index = 0;
    const chatContainer = document.getElementById('testimonials-chat');

    function mostrarSiguienteTestimonio() {
        if (index >= testimonials.length) return;

        const testimonio = testimonials[index];
        testimonio.style.display = 'block';

        // Pequeu00f1o delay para asegurar que se vea la animaciu00f3n
        setTimeout(() => {
            testimonio.style.opacity = '1';
            testimonio.classList.add('animate-in');

            // Scroll autu00f3nomo al final del chat
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            index++;
            // Preparar el siguiente testimonio
            setTimeout(mostrarSiguienteTestimonio, 1500); // 1.5 segundos entre mensajes
        }, 100);
    }

    // Iniciar la secuencia cuando el contenedor sea visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                mostrarSiguienteTestimonio();
                observer.disconnect(); // Desconectar despuu00e9s de iniciar
            }
        });
    }, { threshold: 0.2 });

    if (chatContainer) {
        observer.observe(chatContainer);
    }
}

// Inicializar efectos cuando la pu00e1gina cargue
document.addEventListener('DOMContentLoaded', () => {
    initLlmEffect();
    mejorarTestimonios();
});

// Efecto de texto escribiu00e9ndose para tu00edtulos
function typeEffect(element, text, speed) {
    let index = 0;
    element.innerHTML = ''; // Limpiar el elemento

    // Efecto de escritura caracter por caracter
    function addChar() {
        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
            setTimeout(addChar, speed);
        } else {
            // Au00f1adir cursor parpadeante al final cuando termine de escribir
            element.innerHTML += '<span class="typing-cursor">|</span>';
        }
    }

    addChar();
}

// Inicializar efectos de escritura para tu00edtulos principales
function initTypingEffects() {
    const elements = document.querySelectorAll('.section-title h2');
    if (!elements.length) return;

    // Configurar el retardo entre cada tu00edtulo
    let delay = 300;

    elements.forEach((element, index) => {
        // Guardar el texto original
        const originalText = element.textContent.trim();
        // Vaciar el elemento para la animaciu00f3n
        element.textContent = '';

        // Iniciar la animaciu00f3n con retardo escalonado
        setTimeout(() => {
            typeEffect(element, originalText, 70);
        }, delay * (index + 1));
    });
}

// Inicializar al cargar la pu00e1gina
document.addEventListener('DOMContentLoaded', function () {
    initTypingEffects();
});

function updateScrollProgress() {
    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    document.documentElement.style.setProperty('--scroll', `${scrollPercent}%`);
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

// Scroll Animations
const scrollRevealElements = document.querySelectorAll('.scroll-reveal');
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

scrollRevealElements.forEach(element => {
    observer.observe(element);
});

// Docker Apps Animation
const dockerItems = document.querySelectorAll('.docker-item');
dockerItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateY(-5px)';
        const icon = item.querySelector('i');
        if (icon) {
            icon.style.transform = 'scale(1.2) rotate(5deg)';
        }
    });

    item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateY(0)';
        const icon = item.querySelector('i');
        if (icon) {
            icon.style.transform = 'scale(1) rotate(0deg)';
        }
    });
});

// Page Transitions
const pageTransition = document.createElement('div');
pageTransition.className = 'page-transition';
document.body.appendChild(pageTransition);

document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.href && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            pageTransition.classList.add('active');
            setTimeout(() => {
                window.location.href = link.href;
            }, 600);
        }
    });
});

// Loading Animation
window.addEventListener('load', () => {
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.classList.add('hidden');
        setTimeout(() => {
            loading.remove();
        }, 500);
    }
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (!targetId) return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Scroll reveal
const scrollReveal = () => {
    const elements = document.querySelectorAll('.reveal');
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;

        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('active');
        }
    });
};

window.addEventListener('scroll', scrollReveal);
scrollReveal(); // Initial check

// Navigation Scroll Effect
function initNavScroll() {
    const nav = document.querySelector('.nav-container');
    if (!nav) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

function scrollToServices() {
    const servicesSection = document.getElementById('servicios');
    if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Inicialización de efectos
document.addEventListener('DOMContentLoaded', () => {
    initParallax();
    initScrollAnimations();
    initTypingEffects();
    // Ocultar pantalla de carga
    setTimeout(() => {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }, 1000);
});

// Typing Effect
function initTypingEffects() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('section-subtitle')) {
                    typeText(entry.target);
                }
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.section-subtitle, .hero-title').forEach(el => {
        observer.observe(el);
    });
}

function typeText(element) {
    const text = element.textContent;
    element.textContent = '';
    let i = 0;

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, 50);
        }
    }

    type();
}

// Scroll Animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });

    // Observar todos los subtítulos y elementos con fade-in
    document.querySelectorAll('.section-subtitle, .fade-in-element').forEach(element => {
        observer.observe(element);
    });
}

// Parallax Effect
function initParallax() {
    window.addEventListener('scroll', () => {
        const parallaxElements = document.querySelectorAll('.parallax');
        parallaxElements.forEach(element => {
            if (!element || !element.style) return;
            const speed = element.dataset && element.dataset.speed ? element.dataset.speed : 0.5;
            const yPos = -(window.pageYOffset * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Animaciones de Servicios
function initServiceAnimations() {
    const serviceCards = document.querySelectorAll('.service-card');

    // Crear un Intersection Observer para las tarjetas de servicios
    const serviceObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    // Observar cada tarjeta de servicio
    serviceCards.forEach(card => {
        serviceObserver.observe(card);
    });

    // Efectos de hover para los iconos
    serviceCards.forEach(card => {
        const icon = card.querySelector('.service-icon');
        if (!icon) return;

        card.addEventListener('mouseenter', () => {
            if (!icon || !icon.style) return;
            icon.style.transform = 'scale(1.1)';
        });

        card.addEventListener('mouseleave', () => {
            if (!icon || !icon.style) return;
            icon.style.transform = 'scale(1)';
        });
    });
}

// Inicializar las animaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initServiceAnimations();
});

// Inicialización de la sección de archivos
function initFilesSection() {
    const finderItems = document.querySelectorAll('.finder-item');
    const finderSearch = document.querySelector('.finder-search');

    finderItems.forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            if (!action) return;

            switch (action) {
                case 'createFolder':
                    createNewFolder();
                    break;
                case 'uploadFile':
                    uploadFile();
                    break;
                case 'openTerminal':
                    openTerminal(item.getAttribute('data-container'));
                    break;
            }
        });
    });

    if (finderSearch) {
        finderSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            finderItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }
}

function createNewFolder() {
    if (!requireLogin()) return;

    const folderName = prompt('Nombre de la nueva carpeta:');
    if (folderName) {
        const newFolder = document.createElement('div');
        newFolder.className = 'finder-item';
        newFolder.innerHTML = `
            <i class="fas fa-folder"></i>
            <span>${folderName}</span>
        `;

        const finderContent = document.querySelector('.finder-content');
        finderContent.appendChild(newFolder);

        showNotification('Carpeta creada correctamente', 'success');
    }
}

function uploadFile() {
    if (!requireLogin()) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const newFile = document.createElement('div');
            newFile.className = 'finder-item';
            newFile.innerHTML = `
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
            `;

            const finderContent = document.querySelector('.finder-content');
            finderContent.appendChild(newFile);
        });

        showNotification(`${files.length} archivo(s) subido(s) correctamente`, 'success');
    };
    input.click();
}

function initDockerContainers() {
    const dockerItems = document.querySelectorAll('.docker-item');

    dockerItems.forEach(item => {
        const startBtn = item.querySelector('.docker-btn.primary');
        const terminalBtn = item.querySelector('.docker-btn.secondary');
        const statusIndicator = item.querySelector('.docker-status');

        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isRunning = statusIndicator.classList.contains('running');

            if (isRunning) {
                statusIndicator.classList.remove('running');
                statusIndicator.classList.add('stopped');
                startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar';
                showNotification('Contenedor detenido');
            } else {
                statusIndicator.classList.remove('stopped');
                statusIndicator.classList.add('running');
                startBtn.innerHTML = '<i class="fas fa-stop"></i> Detener';
                showNotification('Contenedor iniciado');
            }
        });

        terminalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const containerName = item.querySelector('.docker-title').textContent;
            openTerminal(containerName);
        });
    });
}

function openTerminal(containerName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content terminal-modal">
            <div class="modal-header">
                <h3>Terminal - ${containerName}</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="terminal-window">
                    <div class="terminal-header">
                        <div class="terminal-controls">
                            <div class="control red"></div>
                            <div class="control yellow"></div>
                            <div class="control green"></div>
                        </div>
                    </div>
                    <div class="terminal-body">
                        <div class="terminal-output">
                            <div class="terminal-line">
                                <span class="prompt">$</span>
                                <span class="command">docker exec -it ${containerName.toLowerCase().replace(/\s+/g, '-')} /bin/bash</span>
                            </div>
                        </div>
                        <div class="terminal-input">
                            <span class="prompt">$</span>
                            <input type="text" placeholder="Ingresa un comando...">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('.terminal-input input');
    input.focus();

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const command = input.value;
            const output = document.createElement('div');
            output.className = 'terminal-line';
            output.innerHTML = `
                <span class="prompt">$</span>
                <span class="command">${command}</span>
            `;
            modal.querySelector('.terminal-output').appendChild(output);
            input.value = '';

            // Simular respuesta del comando
            setTimeout(() => {
                const response = document.createElement('div');
                response.className = 'terminal-line output';
                response.textContent = `Respuesta del comando: ${command}`;
                modal.querySelector('.terminal-output').appendChild(response);
            }, 500);
        }
    });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initFilesSection();
    initDockerContainers();
});

// Terminal functionality
function initTerminal() {
    const terminalModal = document.getElementById('terminalModal');
    const terminalInput = document.getElementById('terminalInput');
    const terminalOutput = document.getElementById('terminalOutput');

    // Si no existe la terminal modal en esta página, no hacer nada
    if (!terminalModal || !terminalInput || !terminalOutput) {
        return;
    }
    let currentContainer = '';

    function addLine(content, type = 'command') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;

        if (type === 'command') {
            const prompt = document.createElement('span');
            prompt.className = 'prompt';
            prompt.textContent = '$';
            line.appendChild(prompt);

            const command = document.createElement('span');
            command.className = 'command';
            command.textContent = content;
            line.appendChild(command);
        } else {
            line.textContent = content;
        }

        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function handleCommand(command) {
        const cmd = command.toLowerCase().trim();

        // Simulate command responses
        switch (cmd) {
            case 'ls':
                addLine('app.js\nconfig.json\nnode_modules/\npackage.json\nREADME.md', 'output');
                break;
            case 'pwd':
                addLine('/app', 'output');
                break;
            case 'npm start':
                addLine('Starting application...', 'output');
                setTimeout(() => addLine('Application started successfully!', 'output'), 1000);
                break;
            case 'npm stop':
                addLine('Stopping application...', 'output');
                setTimeout(() => addLine('Application stopped successfully!', 'output'), 1000);
                break;
            case 'clear':
                terminalOutput.innerHTML = '';
                break;
            case 'help':
                addLine('Available commands:', 'output');
                addLine('ls - List files', 'output');
                addLine('pwd - Show current directory', 'output');
                addLine('npm start - Start application', 'output');
                addLine('npm stop - Stop application', 'output');
                addLine('clear - Clear terminal', 'output');
                addLine('help - Show this help message', 'output');
                break;
            default:
                addLine(`Command not found: ${command}`, 'output');
        }
    }

    terminalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const command = terminalInput.value;
            if (command.trim()) {
                addLine(command);
                handleCommand(command);
                terminalInput.value = '';
            }
        }
    });

    // Close terminal modal when clicking outside
    terminalModal.addEventListener('click', (e) => {
        if (e.target === terminalModal) {
            terminalModal.style.display = 'none';
        }
    });

    // Close terminal modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && terminalModal.style.display === 'block') {
            terminalModal.style.display = 'none';
        }
    });
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initTerminal();
});

// Asegurar que el módulo está correctamente cerrado

// Efecto de fondo interactivo (ligero, optimizado para scroll suave)
document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    const cores = navigator.hardwareConcurrency || 2;
    const isLowCore = cores < 4;

    // Desactivar completamente este efecto en dispositivos frágiles o usuarios que piden menos movimiento
    if (prefersReducedMotion || isTouchDevice || isLowCore) {
        return;
    }

    const dynamicBg = document.querySelector('.dynamic-bg');

    // Seguimiento del mouse para parallax suave en el fondo
    document.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Actualizar variables CSS para otros efectos
        root.style.setProperty('--mouse-x', mouseX);
        root.style.setProperty('--mouse-y', mouseY);

        if (dynamicBg) {
            const moveX = (mouseX - window.innerWidth / 2) * 0.02;
            const moveY = (mouseY - window.innerHeight / 2) * 0.02;
            dynamicBg.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
    });

    // Efecto de resplandor al mover el mouse (solo variables CSS, muy ligero)
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        root.style.setProperty('--glow-position-x', `${x * 100}%`);
        root.style.setProperty('--glow-position-y', `${y * 100}%`);
    });
});
