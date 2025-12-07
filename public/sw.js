// Service Worker for Offline Inspection Support
// Version 1.0.0

const CACHE_NAME = 'walla-walla-v1';
const OFFLINE_URL = '/offline';

// Critical assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/inspections/pre-trip',
  '/inspections/post-trip',
  '/driver-portal/dashboard',
  '/manifest.json',
  // Add more critical routes as needed
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline, with network-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests: BYPASS IN DEVELOPMENT - Always use network
  if (url.pathname.startsWith('/api/')) {
    // Don't intercept API calls - let them go directly to network
    // This prevents offline errors during development
    return;
  }

  // Inspection pages and critical routes: Cache-first, then network
  if (
    url.pathname.startsWith('/inspections/') ||
    url.pathname.startsWith('/driver-portal/') ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version and update in background
            fetch(request).then((response) => {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }).catch(() => {
              // Ignore network errors in background update
            });
            return cachedResponse;
          }

          // Not in cache, fetch from network
          return fetch(request)
            .then((response) => {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
              return response;
            })
            .catch(() => {
              // Network failed and not in cache
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // All other requests: Network-first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Background sync for inspection uploads
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-inspections') {
    event.waitUntil(
      syncInspections()
        .then(() => {
          console.log('[Service Worker] Inspection sync complete');
          // Notify clients that sync is complete
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                tag: 'inspections'
              });
            });
          });
        })
        .catch((error) => {
          console.error('[Service Worker] Inspection sync failed:', error);
          // Notify clients of failure
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'SYNC_FAILED',
                tag: 'inspections',
                error: error.message
              });
            });
          });
        })
    );
  }

  if (event.tag === 'sync-photos') {
    event.waitUntil(syncPhotos());
  }
});

// Sync inspections from IndexedDB to server
async function syncInspections() {
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending-inspections', 'readonly');
    const store = tx.objectStore('pending-inspections');
    const pendingInspections = await store.getAll();

    console.log(`[Service Worker] Found ${pendingInspections.length} pending inspections`);

    // Upload each inspection
    for (const inspection of pendingInspections) {
      try {
        const response = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inspection.data)
        });

        if (response.ok) {
          // Remove from IndexedDB after successful upload
          const deleteTx = db.transaction('pending-inspections', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending-inspections');
          await deleteStore.delete(inspection.id);
          console.log(`[Service Worker] Synced inspection ${inspection.id}`);
        } else {
          console.error(`[Service Worker] Failed to sync inspection ${inspection.id}:`, response.status);
        }
      } catch (error) {
        console.error(`[Service Worker] Error syncing inspection ${inspection.id}:`, error);
        // Continue with next inspection
      }
    }

    db.close();
    return true;
  } catch (error) {
    console.error('[Service Worker] Sync inspections error:', error);
    throw error;
  }
}

// Sync photos from IndexedDB to server
async function syncPhotos() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending-photos', 'readonly');
    const store = tx.objectStore('pending-photos');
    const pendingPhotos = await store.getAll();

    console.log(`[Service Worker] Found ${pendingPhotos.length} pending photos`);

    for (const photo of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.blob, photo.filename);
        formData.append('inspection_id', photo.inspection_id);

        const response = await fetch('/api/inspections/photos', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const deleteTx = db.transaction('pending-photos', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending-photos');
          await deleteStore.delete(photo.id);
          console.log(`[Service Worker] Synced photo ${photo.id}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Error syncing photo ${photo.id}:`, error);
      }
    }

    db.close();
    return true;
  } catch (error) {
    console.error('[Service Worker] Sync photos error:', error);
    throw error;
  }
}

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('walla-walla-offline', 1);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('pending-inspections')) {
        db.createObjectStore('pending-inspections', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pending-photos')) {
        db.createObjectStore('pending-photos', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'TRIGGER_SYNC') {
    if (event.data.tag === 'inspections') {
      syncInspections()
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
    }
  }

  if (event.data.type === 'CACHE_URLS') {
    // Cache specific URLs on demand
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urls))
      .then(() => {
        event.ports[0].postMessage({ success: true });
      })
      .catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
});

// Push notification support (for future use)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Walla Walla Travel';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === event.notification.data && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data);
        }
      })
  );
});

console.log('[Service Worker] Loaded and ready');

