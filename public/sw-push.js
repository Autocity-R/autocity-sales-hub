/* Autocity CRM — push service worker.
   Doet GEEN app-shell caching: alleen web-push ontvangen en de juiste pagina openen. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: "Autocity CRM", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Autocity CRM";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/apple-touch-icon.png",
    badge: payload.badge || "/apple-touch-icon.png",
    tag: payload.tag || undefined,
    renotify: false,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try { await client.navigate(target); } catch (_e) { /* stil falen */ }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
