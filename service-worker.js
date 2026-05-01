const CACHE_NAME = "skydashboard-v5";
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

function isHtmlRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html")
  );
}

function isMutableAsset(url) {
  return (
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/styles.css") ||
    url.pathname.endsWith("/script.js") ||
    url.pathname.endsWith("/manifest.json")
  );
}

async function networkFirst(request, fallback = "./index.html") {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(fallback);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function precacheExternal(cache) {
  await Promise.all(
    EXTERNAL_PRECACHE.map(async (request) => {
      try {
        const response = await fetch(request);
        await cache.put(request, response);
      } catch {
        // A failed third-party precache should not block service worker installation.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE);
      await precacheExternal(cache);
    })
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
  if (url.pathname.endsWith("/service-worker.js")) return;

  if (isSameOrigin && (isHtmlRequest(event.request) || isMutableAsset(url))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
