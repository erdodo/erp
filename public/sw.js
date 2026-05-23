/* ERP Service Worker — network-first for API, cache-first for static assets */
const CACHE_NAME    = "erp-static-v1";
const API_PREFIX    = "/api/";
const STATIC_EXTS   = [".js", ".css", ".woff2", ".woff", ".ttf", ".png", ".svg", ".ico", ".webp"];

// ─── Install: cache static shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/"]).catch(() => {}) // soft fail if offline during install
    )
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const isApi    = url.pathname.startsWith(API_PREFIX);
  const isStatic = STATIC_EXTS.some((ext) => url.pathname.endsWith(ext));

  if (isApi) {
    // Network-first for API: try network, fall back to cache
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then((r) => r ?? new Response(JSON.stringify({ error: "Offline" }), { status: 503, headers: { "Content-Type": "application/json" } })))
    );
    return;
  }

  if (isStatic) {
    // Cache-first for static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Navigation: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match("/").then((r) => r ?? fetch(request)))
  );
});
