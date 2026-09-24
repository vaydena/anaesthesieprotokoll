/* Anästhesieprotokoll – Service Worker
   Offline-first für eine token-gated Doku-PWA.
   BYTE-DIFF-MARKER (bei jedem Release hochzählen, damit hCDN einen frischen 200 liefert): aprot-sw-2
   Konservativ: fasst NUR eigene GET-Anfragen an. POST/cross-origin (Supabase) laufen
   immer direkt ins Netz – Metering und Token-Prüfung dürfen nie aus dem Cache kommen. */
const CACHE = "aprot-app-v6";
const SHELL = [
  "/app.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/assets/jsQR.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // reload umgeht den HTTP-Cache, damit die Shell wirklich frisch precacht.
      Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Nur GET, nur same-origin. Alles andere (POST, Supabase-Funktionsaufrufe,
  // Fremd-Hosts) unberührt ans Netz weiterreichen.
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  // Navigationen (Seitenaufrufe): Cache zuerst, sonst Netz, sonst App-Shell.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match("/app.html"))
      )
    );
    return;
  }

  // Statische Assets: Cache zuerst, sonst Netz (und gültige Antwort nachlegen).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit)
    )
  );
});
