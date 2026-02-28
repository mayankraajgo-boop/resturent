/* ===============================
   SERVICE WORKER - FULL PWA SUPPORT
=================================*/

const CACHE_NAME = "mr-restaurant-v2";
const OFFLINE_URL = "/offline.html";

// Files to cache for offline use
const urlsToCache = [
    "/",
    "/index.html",
    "/offline.html",
    "/css/style.css",
    "/js/script.js",
    "/manifest.json",
    "/images/icon-192.png",
    "/images/icon-512.png",
    "/images/img1.png"
];

// Install Service Worker and cache files
self.addEventListener("install", event => {
    console.log("Service Worker: Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log("Service Worker: Caching files");
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker and clean old caches
self.addEventListener("activate", event => {
    console.log("Service Worker: Activating...");
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log("Service Worker: Clearing old cache");
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone response and cache it
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // If not in cache, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});
