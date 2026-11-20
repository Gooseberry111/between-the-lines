// Service worker: makes the app installable and keeps poems you've read
// (and everything on your Saved page) available offline.
//
// - App shell & built assets: cached, served instantly
// - Supabase reads: network first, cached copy when offline
// - Fonts: cached after first use
// Bump VERSION to force clients onto a fresh shell cache.

const VERSION = "v1";
const SHELL = `btl-shell-${VERSION}`;
const API = "btl-api"; // cleared on logout (see useAuth.signOut)
const FONTS = "btl-fonts";
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("btl-shell-") && k !== SHELL)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(fallbackUrl ?? request);
    if (cached) return cached;
    throw new Error("offline and not cached");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Page loads: always try the network, fall back to the cached shell
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL, "/index.html"));
    return;
  }

  // Hashed build assets never change
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  // Poems, lines, profiles… from Supabase
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/")) {
    event.respondWith(networkFirst(request, API));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request, FONTS));
  }
});
