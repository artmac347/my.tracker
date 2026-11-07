// I-bump ang number na ito (v4, v5, ...) tuwing may binago ka sa files
const CACHE_NAME = "locked-in-v4";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./icon.svg"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
    );

    self.skipWaiting();

});

self.addEventListener("activate", event => {

    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );

    self.clients.claim();

});

// NETWORK-FIRST: laging kukunin muna ang pinakabagong file.
// Kung offline, saka lang gagamitin ang cache.
self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request)
            .then(response => {

                if (
                    response &&
                    response.status === 200 &&
                    new URL(event.request.url).origin === self.location.origin
                ) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, copy);
                    });
                }

                return response;

            })
            .catch(() =>
                caches.match(event.request).then(cached =>
                    cached || caches.match("./index.html")
                )
            )
    );

});
