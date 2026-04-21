const CACHE_NAME = "skydashboard-v3";
const ASTRONOMY_ENGINE_URL =
  "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon.png",
  "./icons/icon.ico",
];
const EXTERNAL_PRECACHE = [
  new Request(ASTRONOMY_ENGINE_URL, { mode: "no-cors" }),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => Promise.all(EXTERNAL_PRECACHE.map((request) => cache.add(request))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAstronomyEngine = event.request.url === ASTRONOMY_ENGINE_URL;
  if (!isSameOrigin && !isAstronomyEngine) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
