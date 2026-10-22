// Service worker приложения «Заявки с точек».
// Держит оболочку страницы в кеше, чтобы приложение открывалось и без связи:
// черновик, фото и «Мои заявки» доступны офлайн, нужна связь только помощнику,
// номеру заявки и отправке. Страницу берём из сети, кеш — запасной вариант,
// поэтому обновления с GitHub Pages приходят сразу.
'use strict';
var CACHE = 'zt-mviytqd0';
var SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/apple-touch-icon.png'];
var EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url === EXCELJS) {
    // Библиотека Excel с фиксированной версией не меняется — сначала кеш.
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return resp;
      });
    }));
    return;
  }
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (resp) {
    if (resp.ok) {
      var copy = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return resp;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      return hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
    });
  }));
});
