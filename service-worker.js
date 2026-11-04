/* Scientific Converter SW — offline fallback, no page freeze */
const CACHE_VERSION = "sc-v20261104d";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(["./index.html"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("service-worker.js")) {
    event.respondWith(fetch(req));
    return;
  }

  // Network first, cache fallback — never block more than needed
  event.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && req.method === "GET") {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
