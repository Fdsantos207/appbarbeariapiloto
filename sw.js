// sw.js - Service Worker
const CACHE_NAME = 'barbearia-v1';

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalado');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Ativado');
    return self.clients.claim();
});

// Faz o app buscar sempre a versão mais nova na internet
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});