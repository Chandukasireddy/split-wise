// KILL-SWITCH service worker.
//
// Earlier versions of this service worker intercepted navigation / RSC requests
// and cached JS/CSS chunks. That is a well-known cause of broken Next.js App
// Router navigation and of "stuck on a stale build" bugs, and service workers
// persist across deployments — so a bad one keeps breaking the app long after
// the code is fixed.
//
// This version does the opposite of interfering: it registers NO fetch handler
// (so it can never intercept a request), deletes every cache, and unregisters
// itself. Any browser still running an old service worker will update to this
// one, which then removes itself cleanly. Navigation is guaranteed to always go
// straight to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      // Reload any pages this SW was controlling so they run service-worker-free.
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => {
        try {
          client.navigate(client.url);
        } catch {
          /* ignore */
        }
      });
    })()
  );
});

// NOTE: intentionally NO "fetch" listener — this SW never intercepts requests.
