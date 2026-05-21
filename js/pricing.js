// Carga dinámica de logos de clientes en carrusel infinito
function loadClientLogos() {
    const container = document.getElementById('clients-logos-container');
    if (!container) return;

    // Cambiar clase para el contenedor del carrusel
    container.className = 'clients-carousel-container';

    // Array de logos detectados
    const clientLogos = [
        'client1.png', 'client2.png', 'client3.png', 'client4.png', 'client5.png',
        'client6.png', 'client7.png', 'client8.png', 'client9.png', 'client10.png', 'client11.png'
    ];

    // Crear el track del carrusel
    const track = document.createElement('div');
    track.className = 'clients-track';

    // Función para crear un elemento de logo
    const createLogoElement = (logo, index) => {
        const logoDiv = document.createElement('div');
        logoDiv.className = 'client-logo';
        
        const img = document.createElement('img');
        img.src = `images/clients/${logo}`;
        img.alt = `Cliente ${index + 1}`;
        
        img.onerror = function() {
            logoDiv.style.display = 'none';
        };
        
        logoDiv.appendChild(img);
        return logoDiv;
    };

    // Añadir logos originales
    clientLogos.forEach((logo, index) => {
        track.appendChild(createLogoElement(logo, index));
    });

    // Duplicar logos para efecto infinito (necesario para la animación de desplazamiento)
    clientLogos.forEach((logo, index) => {
        track.appendChild(createLogoElement(logo, index));
    });

    // Limpiar container y añadir el track
    container.innerHTML = '';
    container.appendChild(track);
}

// Mejorar responsividad móvil
function improveMobileResponsivity() {
    const isMobile = window.matchMedia('(max-width: 768px)');
    
    function adjustForMobile() {
        const pricingCards = document.querySelectorAll('.pricing-card');
        
        if (isMobile.matches) {
            // Ajustes para móviles
            pricingCards.forEach(card => {
                card.style.marginBottom = '1rem';
            });
            
            // Reducir efecto 3D en móviles
            document.body.classList.add('mobile-view');
        } else {
            // Restaurar estilos desktop
            pricingCards.forEach(card => {
                card.style.marginBottom = '';
            });
            
            document.body.classList.remove('mobile-view');
        }
    }
    
    // Ejecutar al cargar y cambiar tamaño
    adjustForMobile();
    isMobile.addListener(adjustForMobile);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    loadClientLogos();
    improveMobileResponsivity();
});

// Recargar logos si cambia el tamaño de ventana
window.addEventListener('resize', () => {
    improveMobileResponsivity();
});
