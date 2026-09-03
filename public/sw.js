// public/sw.js — minimal service worker for installability + faster repeat loads.
//
// Scope is deliberately narrow: this precaches a short list of genuinely static,
// non-navigational same-origin assets (manifest + icons) and serves them cache-first.
// Everything else — every navigation request (including "/" itself), every /api/**
// call, every Supabase call, every Next.js build-hashed JS/CSS chunk, any cross-origin
// request — falls through to a plain network fetch, untouched.
//
// "/" is deliberately NOT precached/intercepted, even though that's the more obvious
// way to speed up repeat loads: this is a client-hydrated Next.js app, and cache-first
// serving the HTML document risks replaying a stale shell against a newer JS bundle
// after a deploy, or against a differently-mocked/differently-authed request — a real
// bug found while building this (a second navigation to "/" within one browser session
// started returning a cached response that a specific button's click handler silently
// stopped working against; e2e/smoke.mjs's "preferences panel opens" check is what
// caught it). Next.js's own hashed build assets already get long-lived caching from
// the browser's normal HTTP cache (content-hashed, safe to cache-first) — this service
// worker doesn't need to duplicate that, and isn't worth the risk for the HTML shell.
//
// CACHE_VERSION bump = old caches are dropped on the next activate. Bump this on any
// change to PRECACHE_URLS.
const CACHE_VERSION = 'myoffice-shell-v2';
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only ever intercept same-origin GETs to the precached list above — everything
  // else (API calls, Supabase, cross-origin, non-GET, anything not in the list)
  // passes straight through to the network untouched.
  if (request.method !== 'GET' || url.origin !== self.location.origin || !PRECACHE_URLS.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request)),
  );
});
