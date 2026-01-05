'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isOnline: boolean
  registration: ServiceWorkerRegistration | null
  error: Error | null
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    registration: null,
    error: null,
  })

  useEffect(() => {
    // Skip service worker registration in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Service Worker disabled in development mode')
      setState(prev => ({ ...prev, isSupported: false }))
      return
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, isSupported: false }))
      return
    }

    setState(prev => ({ ...prev, isSupported: true }))

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        logger.info('Service Worker registered', { scope: registration.scope })

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }))

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          logger.info('Service Worker update found')

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.info('New Service Worker available - reload to update')
              // Optionally show a toast to user about update
            }
          })
        })
      } catch (error) {
        logger.error('Service Worker registration failed', { error })
        setState(prev => ({
          ...prev,
          error: error as Error,
        }))
      }
    }

    registerServiceWorker()

    // Listen for online/offline events
    const handleOnline = () => {
      logger.info('App is online')
      setState(prev => ({ ...prev, isOnline: true }))
      
      // Trigger sync when coming back online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TRIGGER_SYNC',
          tag: 'inspections',
        })
      }
    }

    const handleOffline = () => {
      logger.info('App is offline')
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial online state
    setState(prev => ({ ...prev, isOnline: navigator.onLine }))

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      logger.debug('Message from Service Worker', { data: event.data })

      if (event.data.type === 'SYNC_COMPLETE') {
        logger.info('Sync complete', { tag: event.data.tag })
        // Optionally trigger a UI update
      }

      if (event.data.type === 'SYNC_FAILED') {
        logger.error('Sync failed', { error: event.data.error })
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  // Method to manually trigger sync
  const triggerSync = async (tag: string = 'inspections') => {
    if (!state.registration) {
      logger.warn('Service Worker not registered')
      return false
    }

    try {
      if ('sync' in state.registration) {
        // SyncManager is not in standard TypeScript definitions
        const syncManager = (state.registration as { sync: { register: (tag: string) => Promise<void> } }).sync
        await syncManager.register(tag)
        logger.info('Background sync registered', { tag })
        return true
      } else {
        // Fallback: manual sync via message
        navigator.serviceWorker.controller?.postMessage({
          type: 'TRIGGER_SYNC',
          tag,
        })
        return true
      }
    } catch (error) {
      logger.error('Failed to trigger sync', { error })
      return false
    }
  }

  // Method to update service worker
  const updateServiceWorker = () => {
    if (state.registration) {
      state.registration.update()
    }
  }

  return {
    ...state,
    triggerSync,
    updateServiceWorker,
  }
}

