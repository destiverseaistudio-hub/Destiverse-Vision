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
  let payload = {}
  try { payload = event.data?.json?.() || {} } catch { /* A malformed push must not prevent notification delivery. */ }
  event.waitUntil(self.registration.showNotification(payload.title || "DestiVerse Vision", {
    body: payload.body || "You have a new DestiVerse notification.",
    icon: "/brand/destiverse-vision-logo.png",
    badge: "/brand/destiverse-vision-logo.png",
    tag: payload.tag || "destiverse-notification",
    data: { url: payload.url || "/dashboard/notifications" },
  }))
})
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/dashboard/notifications", self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url === target || client.url.startsWith(self.location.origin))
    return existing ? existing.focus() : self.clients.openWindow(target)
  }))
})
