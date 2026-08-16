const CACHE_NAME = 'casamento-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/rsvp.html',
  '/faq.html',
  '/gifts.html',
  '/organizacao.html',
  '/css/estilos.css',
  '/js/shared.js',
  '/js/sanitize.js',
  '/manifest.json'
];

// Arquivos que SEMPRE devem vir da rede (credenciais/dinâmicos):
const NETWORK_ONLY = ['/js/config.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear config (pode mudar a cada deploy sem novo SW)
  if (NETWORK_ONLY.includes(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para páginas HTML: tenta rede primeiro, cai no cache offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
