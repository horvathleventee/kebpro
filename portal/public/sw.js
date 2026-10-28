const OFFLINE = "/partner/assets/offline.html";
const CACHE = "kebpro-partner-shell-v1";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("kebpro-partner-shell-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  // Never cache authenticated pages, API responses, orders or partner details.
  if (event.request.mode === "navigate" && new URL(event.request.url).pathname.startsWith("/partner/")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
  }
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data.json(); } catch {}
  const url = typeof data.url === "string" && data.url.startsWith("/partner/") ? data.url : "/partner/";
  event.waitUntil(self.registration.showNotification(data.title || "Kebpro", {
    body: data.body || "Új értesítés érkezett.", icon: "/partner/assets/partner-v2-192.png",
    tag: data.id || "kebpro", data: { url },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/partner/"));
});
