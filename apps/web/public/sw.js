const CACHE = "destiverse-navigation-v1"
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting() })
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(event.request, copy))
    return response
  }).catch(() => caches.match(event.request)))
})
self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() || {}
  event.waitUntil(self.registration.showNotification(payload.title || "DestiVerse Vision Update", { body: payload.body || "New fixes and improvements are available. Tap to update the app.", icon: "/brand/destiverse-vision-logo.png", data: { url: payload.url || "/dashboard" } }))
})
self.addEventListener("notificationclick", (event) => { event.notification.close(); event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/dashboard")) })
