const CACHE_NAME = 'traduciamo-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/italian-translator.jsx',
  '/manifest.json'
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache otwarty');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Aktywacja Service Workera
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategia Network First z Fallback do Cache
self.addEventListener('fetch', (event) => {
  // Dla API calls - zawsze próbuj sieci
  if (event.request.url.includes('api.anthropic.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Brak połączenia z internetem' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Dla pozostałych zasobów - Cache First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Sprawdź czy odpowiedź jest poprawna
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Sklonuj odpowiedź
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Synchronizacja w tle
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-translations') {
    event.waitUntil(syncTranslations());
  }
});

async function syncTranslations() {
  // Tutaj możesz dodać logikę synchronizacji
  console.log('Synchronizacja tłumaczeń w tle');
}

// Obsługa notyfikacji push (opcjonalnie)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'TraduciAMO';
  const options = {
    body: data.body || 'Nowa wiadomość',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
