const CACHE_NAME = "spliteasy-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/manifest.json"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First, fallback to cache for static resources)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Skip non-GET requests or requests to APIs/actions
  if (request.method !== "GET" || request.url.includes("/_next/data") || request.url.includes("/api")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache static files
        if (response.status === 200 && (request.url.includes("/_next/static") || request.url.endsWith(".css") || request.url.endsWith(".js") || request.url.endsWith(".png") || request.url.endsWith(".svg"))) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || Response.error();
        });
      })
  );
});
