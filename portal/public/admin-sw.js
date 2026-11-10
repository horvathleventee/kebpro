const OFFLINE = '/partner/assets/offline.html',
  UNAVAILABLE = '/partner/assets/unavailable.html',
  STYLE = '/partner/assets/offline.css',
  CACHE = 'kebpro-admin-shell-v2';
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE, UNAVAILABLE, STYLE]))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('kebpro-admin-shell-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).pathname === STYLE) {
    event.respondWith(fetch(event.request).catch(() => caches.match(STYLE)));
    return;
  }
  if (
    event.request.mode === 'navigate' &&
    new URL(event.request.url).pathname.startsWith('/partner-admin/')
  )
    event.respondWith(
      fetch(event.request)
        .then((r) => (r.status >= 500 ? caches.match(UNAVAILABLE).then((f) => f || r) : r))
        .catch(() => caches.match(OFFLINE)),
    );
});
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {}
  const url =
    typeof data.url === 'string' && data.url.startsWith('/partner-admin/')
      ? data.url
      : '/partner-admin/';
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kebpro Admin', {
      body: data.body || 'Új rendelés érkezett.',
      icon: '/partner/assets/admin-v2-192.png',
      tag: data.id || 'kebpro-admin',
      data: { url },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/partner-admin/'));
});
