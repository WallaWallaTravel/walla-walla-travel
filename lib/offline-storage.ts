/**
 * Offline Storage using IndexedDB
 * Provides local data persistence for offline-first functionality
 */

const DB_NAME = 'walla_walla_travel_db';
const DB_VERSION = 1;

// Object store names
const STORES = {
  PENDING_INSPECTIONS: 'pending_inspections',
  QUEUED_REQUESTS: 'queued_requests',
  CACHED_DATA: 'cached_data',
  SYNC_STATUS: 'sync_status'
} as const;

/**
 * Type definitions for offline storage
 */

/** Base inspection data provided when saving offline */
export interface InspectionInput {
  driverId: string;
  vehicleId: string;
  type: 'pre_trip' | 'post_trip';
  items: Record<string, boolean>;
  notes: string | null;
  beginningMileage?: number;
  endingMileage?: number;
  signature?: string | null;
  timeCardId?: number;
}

/** Stored inspection with metadata */
export interface PendingInspection extends InspectionInput {
  id?: IDBValidKey;
  timestamp: number;
  synced: boolean;
  syncAttempts: number;
}

/** Request queued for retry when offline */
export interface QueuedRequest {
  id?: IDBValidKey;
  endpoint: string;
  method: string;
  body: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  lastAttempt: number | null;
}

/** Cached data entry with expiration */
export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  cachedAt: number;
  expiresAt: number;
}

/** Sync status record */
export interface SyncStatus {
  id: string;
  lastSync: number;
  pending: number;
}

/**
 * Initialize IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PENDING_INSPECTIONS)) {
        const inspectionStore = db.createObjectStore(STORES.PENDING_INSPECTIONS, {
          keyPath: 'id',
          autoIncrement: true
        });
        inspectionStore.createIndex('timestamp', 'timestamp', { unique: false });
        inspectionStore.createIndex('type', 'type', { unique: false });
        inspectionStore.createIndex('driverId', 'driverId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.QUEUED_REQUESTS)) {
        const queueStore = db.createObjectStore(STORES.QUEUED_REQUESTS, {
          keyPath: 'id',
          autoIncrement: true
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('endpoint', 'endpoint', { unique: false });
        queueStore.createIndex('retryCount', 'retryCount', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cacheStore = db.createObjectStore(STORES.CACHED_DATA, {
          keyPath: 'key'
        });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
        db.createObjectStore(STORES.SYNC_STATUS, {
          keyPath: 'id'
        });
      }
    };
  });
}

/**
 * Save inspection locally when offline
 */
export async function saveInspectionOffline(inspection: InspectionInput): Promise<number> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_INSPECTIONS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_INSPECTIONS);

    const data = {
      ...inspection,
      timestamp: Date.now(),
      synced: false,
      syncAttempts: 0
    };

    const request = store.add(data);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all pending inspections that need to be synced
 */
export async function getPendingInspections(): Promise<PendingInspection[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_INSPECTIONS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_INSPECTIONS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete synced inspection from local storage
 */
export async function deleteInspection(id: number): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_INSPECTIONS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_INSPECTIONS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/** Input for queuing a request */
export interface QueueRequestInput {
  endpoint: string;
  method: string;
  body: unknown;
  headers?: Record<string, string>;
}

/**
 * Queue a failed API request for retry
 */
export async function queueRequest(request: QueueRequestInput): Promise<number> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.QUEUED_REQUESTS], 'readwrite');
    const store = transaction.objectStore(STORES.QUEUED_REQUESTS);

    const data = {
      ...request,
      timestamp: Date.now(),
      retryCount: 0,
      lastAttempt: null
    };

    const req = store.add(data);

    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all queued requests
 */
export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.QUEUED_REQUESTS], 'readonly');
    const store = transaction.objectStore(STORES.QUEUED_REQUESTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete queued request after successful sync
 */
export async function deleteQueuedRequest(id: number): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.QUEUED_REQUESTS], 'readwrite');
    const store = transaction.objectStore(STORES.QUEUED_REQUESTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update retry count for queued request
 */
export async function updateRequestRetryCount(id: number): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.QUEUED_REQUESTS], 'readwrite');
    const store = transaction.objectStore(STORES.QUEUED_REQUESTS);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result;
      if (data) {
        data.retryCount += 1;
        data.lastAttempt = Date.now();
        store.put(data);
      }
      resolve();
    };

    getRequest.onerror = () => reject(getRequest.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Cache data with expiration
 */
export async function cacheData<T = unknown>(key: string, data: T, ttlMinutes: number = 60): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_DATA);

    const cacheEntry = {
      key,
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    };

    const request = store.put(cacheEntry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get cached data if not expired
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_DATA], 'readonly');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }

      // Check if expired
      if (Date.now() > result.expiresAt) {
        resolve(null);
        return;
      }

      resolve(result.data);
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const index = store.index('expiresAt');
    const now = Date.now();

    const request = index.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        if (cursor.value.expiresAt < now) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{ lastSync: number; pending: number } | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_STATUS], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_STATUS);
    const request = store.get('sync_status');

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update sync status
 */
export async function updateSyncStatus(lastSync: number, pending: number): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_STATUS], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_STATUS);

    const status = {
      id: 'sync_status',
      lastSync,
      pending
    };

    const request = store.put(status);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function addConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
) {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

