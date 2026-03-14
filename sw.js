const CACHE_NAME = 'renace-tech-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/modern-styles.css',
    '/css/effects.css',
    '/js/script.js',
    '/js/effects.js',
    '/images/logo.svg',
    '/images/renace.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Estrategia de caché: Network First, fallback to cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clonar la respuesta para poder usarla múltiples veces
                const responseClone = response.clone();

                // Guardar en caché solo assets estáticos propios (HTML/CSS/JS/imagenes)
                try {
                    const request = event.request;
                    const url = new URL(request.url);

                    const isGet = request.method === 'GET';
                    const isSameOrigin = url.origin === self.location.origin;
                    const isStaticAsset =
                        url.pathname === '/' ||
                        url.pathname === '/index.html' ||
                        url.pathname.startsWith('/css/') ||
                        url.pathname.startsWith('/js/') ||
                        url.pathname.startsWith('/images/');

                    if (isGet && isSameOrigin && isStaticAsset) {
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseClone);
                            });
                    }
                } catch (e) {
                    // En caso de cualquier error al analizar la URL, solo devolvemos la respuesta
                }

                return response;
            })
            .catch(() => {
                // Si falla la red, intentar obtener de la caché
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        // Si no está en caché, mostrar página offline
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Manejo de mensajes del Service Worker
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Manejo de sincronización en segundo plano
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(syncForms());
    }
});

// Función para sincronizar formularios
async function syncForms() {
    const db = await openDB();
    const forms = await db.getAll('forms');
    
    for (const form of forms) {
        try {
            const response = await fetch('/api/forms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form)
            });
            
            if (response.ok) {
                await db.delete('forms', form.id);
            }
        } catch (error) {
            console.error('Error syncing form:', error);
        }
    }
}

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: '/images/logo.svg',
        badge: '/images/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver más',
                icon: '/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: '/images/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('RENACE Tech', options)
    );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
}); 