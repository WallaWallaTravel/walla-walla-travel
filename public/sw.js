// Service Worker for Offline Inspection Support
// Version 2.0.0 - Fixed to respect subdomain routing

const CACHE_NAME = 'walla-walla-v2';  // Bumped version to clear old caches
const OFFLINE_URL = '/offline';

// Only cache truly static assets, NOT HTML pages
const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
];

// Install event - cache only critical static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v2...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v2...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete ALL old caches to ensure fresh content
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - NETWORK FIRST for HTML, cache-first only for static assets
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

  // API requests: Always use network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML pages (navigation requests): ALWAYS network-first
  // This ensures middleware redirects are respected!
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses, NOT redirects
          if (response.ok && response.status === 200) {
            // Don't cache HTML pages at all to ensure fresh routing
            // Just return the response without caching
          }
          return response;
        })
        .catch(() => {
          // Network failed, show offline page
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Static assets (JS, CSS, images): Cache-first for performance
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            }).catch(() => {});
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return response;
            });
        })
    );
    return;
  }

  // All other requests: Network-first
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
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
    const db = await openDB();
    const tx = db.transaction('pending-inspections', 'readonly');
    const store = tx.objectStore('pending-inspections');
    const pendingInspections = await store.getAll();

    console.log(`[Service Worker] Found ${pendingInspections.length} pending inspections`);

    for (const inspection of pendingInspections) {
      try {
        const response = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inspection.data)
        });

        if (response.ok) {
          const deleteTx = db.transaction('pending-inspections', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending-inspections');
          await deleteStore.delete(inspection.id);
          console.log(`[Service Worker] Synced inspection ${inspection.id}`);
        } else {
          console.error(`[Service Worker] Failed to sync inspection ${inspection.id}:`, response.status);
        }
      } catch (error) {
        console.error(`[Service Worker] Error syncing inspection ${inspection.id}:`, error);
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

  if (event.data.type === 'CLEAR_CACHE') {
    // Clear all caches when requested
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
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

// Push notification support
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
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === event.notification.data && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data);
        }
      })
  );
});

console.log('[Service Worker] v2 loaded and ready');
