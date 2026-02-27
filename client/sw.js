/* ===============================
   SERVICE WORKER - PWA
=================================*/

const CACHE_NAME = "mr-restaurant-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/offline.html",
    "/css/style.css",
    "/js/script.js",
    "/manifest.json"
];

// Install Service Worker
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch from Cache
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
            .catch(() => caches.match("/offline.html"))
    );
});

// Activate and Clean Old Caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});
