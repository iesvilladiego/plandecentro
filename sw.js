// Agrega al inicio del archivo sw.js
const API_URL = 'https://iesvilladiego.github.io/plandecentro/';

const CACHE_NAME = 'plan-de-centro-v2.5.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Agrega aquí otros recursos si los tienes (CSS, JS, imágenes)
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia: Cache First, luego Network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve la respuesta cacheada o busca en la red
        return response || fetch(event.request);
      }
    )
  );
});

// Función para verificar actualizaciones
async function checkForUpdates() {
  try {
    const response = await fetch(API_URL);
    const text = await response.text();
    
    // Aquí puedes implementar lógica para detectar cambios
    // Por ejemplo, comparar versiones o fechas de modificación
    
    // Notificar a la app sobre nueva versión
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NEW_VERSION_FOUND',
          worker: self
        });
      });
    });
  } catch (error) {
    console.log('Error verificando actualizaciones:', error);
  }
}

// Verificar actualizaciones periódicamente
setInterval(checkForUpdates, 24 * 60 * 60 * 1000); // Cada 24 horas

