const CACHE_VERSION = "alien-arena-v0.1.10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./firebase-config.js",
  "./styles.css",
  "./site.webmanifest",
  "./version.json",
  "./assets/board.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon.ico",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/sprites/alien-blink.png",
  "./assets/sprites/alien-nomi.png",
  "./assets/sprites/alien-zig.png",
  "./assets/sprites/archer-blue.png",
  "./assets/sprites/archer-green.png",
  "./assets/sprites/archer-red.png",
  "./assets/sprites/boy-blue.png",
  "./assets/sprites/boy-green.png",
  "./assets/sprites/boy-red.png",
  "./assets/sprites/evil-bear.png",
  "./assets/sprites/evil-boss.png",
  "./assets/sprites/evil-king-left.png",
  "./assets/sprites/evil-king-right.png",
  "./assets/sprites/evil-king-throw.png",
  "./assets/sprites/evil-king.png",
  "./assets/sprites/peng-blue.png",
  "./assets/sprites/peng-green.png",
  "./assets/sprites/peng-red.png",
  "./assets/sprites/ufo-lime.png",
  "./assets/sprites/ufo-plasma.png",
  "./assets/sprites/ufo-rocket.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("alien-arena-") && key !== CACHE_VERSION)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || refresh;
    })
  );
});
