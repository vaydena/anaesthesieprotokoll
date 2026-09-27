/* Service Worker: App-Dateien offline verfügbar machen, Kartenkacheln zwischenspeichern */
const VERSION = "korbinian-v1";
const KACHELN = "korbinian-kacheln";
const MAX_KACHELN = 400;
const DATEIEN = [
  "./", "index.html", "style.css", "data.js", "game.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== KACHELN).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Kartenkacheln: erst Netz, bei Funkloch aus dem Speicher
  if (url.hostname === "tile.openstreetmap.org") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const kopie = res.clone();
          caches.open(KACHELN).then(async (c) => {
            await c.put(e.request, kopie);
            const keys = await c.keys();
            for (let i = 0; i < keys.length - MAX_KACHELN; i++) await c.delete(keys[i]);
          });
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Eigene Dateien: erst Netz (damit Updates sofort ankommen), sonst Speicher
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const kopie = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, kopie));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  }
});
