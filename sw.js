// Agrega al inicio del archivo sw.js
const API_URL = 'https://iesvilladiego.github.io/plandecentro/';

const CACHE_NAME = 'plan-de-centro-v2.5.1';

// Versión "viva" de la app: se extrae de CACHE_NAME.
// Ej.: 'plan-de-centro-v2.5.1' -> 'v2.5.1'
const APP_VERSION = CACHE_NAME.replace(/^plan-de-centro-/, '');

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

// Activación y limpieza de cachés antiguos + notificación de versión viva
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
    }).then(() => self.clients.claim()).then(() => {
      // Nada más activarse, comunicamos a todas las páginas controladas
      // la versión viva de la app.
      return self.clients.matchAll({ includeUncontrolled: true });
    }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'VERSION_INFO',
          version: APP_VERSION
        });
      });
      // Verificamos si hay nueva versión disponible nada más activar.
      checkForUpdates();
    })
  );
});

// Responder a mensajes desde la página
self.addEventListener('message', event => {
  const data = event.data || {};
  // GET_VERSION: la página quiere saber nuestra versión.
  if (data.action === 'GET_VERSION' || data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({
        type: 'VERSION_INFO',
        version: APP_VERSION
      });
    }
  }
  // SKIP_WAITING: la página quiere que activemos el SW nuevo ya.
  if (data.action === 'SKIP_WAITING' || data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
// Compara CACHE_NAME del sw.js servido contra la versión actual.
// Si son distintas, notifica a todas las pestañas con la nueva versión.
async function checkForUpdates() {
  try {
    // Hacemos fetch de sw.js en red, sin pasar por caché.
    const cacheBuster = 'sw.js?t=' + Date.now();
    const response = await fetch(cacheBuster, { cache: 'no-store' });
    if (!response.ok) return;
    const text = await response.text();
    // Extrae CACHE_NAME = 'plan-de-centro-vX.Y.Z';
    const match = text.match(/CACHE_NAME\s*=\s*['"]plan-de-centro-(v[\d.]+)['"]/);
    if (!match || !match[1]) return;
    const remoteVersion = match[1];
    if (remoteVersion === APP_VERSION) return; // misma versión, nada que hacer

    // Hay una nueva versión: notificamos a todas las pestañas.
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => {
      client.postMessage({
        type: 'NEW_VERSION_FOUND',
        currentVersion: APP_VERSION,
        newVersion: remoteVersion
      });
    });
  } catch (error) {
    console.log('Error verificando actualizaciones:', error);
  }
}

// Verificar actualizaciones periódicamente
setInterval(checkForUpdates, 60 * 60 * 1000); // Cada 1 hora (más sensible que 24h)
