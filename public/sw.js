// Keep personal calendar data out of persistent browser caches.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => new Response('<html lang="da"><meta name="viewport" content="width=device-width"><body style="font:18px system-ui;padding:32px"><h1>Du er offline</h1><p>Forbind til internettet for at se jeres fælles kalender.</p><button onclick="location.reload()">Prøv igen</button></body></html>', {headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
