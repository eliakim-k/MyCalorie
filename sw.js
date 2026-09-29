/* MyCalorie service worker: lets the app open without a connection.
   It only caches files. It never reads or sends your diary data. */
'use strict';
const SHELL = 'mycalorie-shell-v1';
const LIBS = 'mycalorie-libs-v1';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== LIBS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App files: try the network first so updates arrive, fall back to the cache offline.
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }

  // Open-source libraries and OCR language data from jsDelivr never change at a pinned
  // version, so keep them after the first download. Open Food Facts calls are not cached.
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(LIBS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
  }
});
