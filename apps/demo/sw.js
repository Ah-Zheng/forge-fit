const CACHE_NAME = 'forge-fit-v1'
const ASSETS_TO_CACHE = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'logo.svg',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Outfit:wght@300;400;600;800&display=swap',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/chart.js'
]

// Service Worker Install Event - Cache Core Assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching App Shell Assets')
                return cache.addAll(ASSETS_TO_CACHE)
            })
            .then(() => self.skipWaiting())
    )
})

// Service Worker Activate Event - Clean Up Old Caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches
            .keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => {
                        if (cache !== CACHE_NAME) {
                            console.log('[Service Worker] Clearing Old Caches:', cache)
                            return caches.delete(cache)
                        }
                    })
                )
            })
            .then(() => self.clients.claim())
    )
})

// Cache First / Network Fallback Fetch Strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse // Return cached asset instantly
            }

            // Fetch from network if not cached
            return fetch(event.request)
                .then(networkResponse => {
                    // Do not cache third-party CDNs dynamically in this basic setup
                    return networkResponse
                })
                .catch(err => {
                    console.log('[Service Worker] Resource fetch failed and not cached:', err)
                })
        })
    )
})
