const CACHE_NAME = 'casamento-v11';
const ASSETS = [
  '/',
  '/index.html',
  '/convite.html',
  '/faq.html',
  '/gifts.html',
  '/gallery.html',
  '/organizacao.html',
  '/css/output.css',
  '/js/shared.js',
  '/js/sanitize.js',
  '/js/countdown.js',
  '/manifest.json'
];

// Arquivos que SEMPRE devem vir da rede (credenciais/dinâmicos):
const NETWORK_ONLY = ['/js/config.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    )
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

  // Deixa requests externos passarem direto (CDN, fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // Nunca cachear config (pode mudar a cada deploy sem novo SW)
  if (NETWORK_ONLY.includes(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para páginas HTML: tenta rede primeiro, cai no cache offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
