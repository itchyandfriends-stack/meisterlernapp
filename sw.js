/* Service Worker: macht die App offline nutzbar (Baustelle, schlechtes Netz).
   App-Dateien: sofort aus dem Speicher, im Hintergrund aktualisieren (neue Version beim nächsten Öffnen).
   Bei Änderungen an dieser Datei VERSION erhöhen, dann werden alte Speicher gelöscht. */
const VERSION = "v3";
const CACHE = "meister-lern-app-" + VERSION;
const APP_FILES = ["./", "index.html", "fragen.js", "fonts.css", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png",
  "fonts/barlow-condensed-500.woff2", "fonts/barlow-condensed-600.woff2", "fonts/barlow-condensed-700.woff2", "fonts/jetbrains-mono.woff2", "fonts/source-sans-3.woff2"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // am Browser-Zwischenspeicher vorbei (GitHub Pages erlaubt ihm 10 Minuten), sonst landet eine alte Fassung im Speicher
    await c.addAll(APP_FILES.map(f => new Request(f, {cache: "reload"})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("meister-lern-app-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // alles liegt auf der eigenen Adresse, auch die Schriften
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // Seitenaufrufe (auch mit #bereich oder ?…) immer auf die App-Seite abbilden
    const key = req.mode === "navigate" ? "index.html" : req;
    const hit = await c.match(key, {ignoreSearch: req.mode === "navigate", ignoreVary: true});
    // immer beim Server nachfragen (ist nichts neu, antwortet er kurz mit „unverändert“)
    const net = fetch(req.mode === "navigate" ? req.url : req, {cache: "no-cache"}).then(r => {
      if (r.ok) c.put(key, r.clone());
      return r;
    });
    // Beim Testen auf localhost immer zuerst das Netz, damit Änderungen sofort sichtbar sind
    if (hit && location.hostname === "localhost") return net.catch(() => hit);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })());
});
