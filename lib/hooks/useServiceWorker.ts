'use client'

import { useEffect, useState } from 'react'

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
      console.log('Service Worker disabled in development mode')
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

        console.log('Service Worker registered:', registration)

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }))

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          console.log('Service Worker update found')

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New Service Worker available - reload to update')
              // Optionally show a toast to user about update
            }
          })
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
        setState(prev => ({
          ...prev,
          error: error as Error,
        }))
      }
    }

    registerServiceWorker()

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('App is online')
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
      console.log('App is offline')
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial online state
    setState(prev => ({ ...prev, isOnline: navigator.onLine }))

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      console.log('Message from Service Worker:', event.data)

      if (event.data.type === 'SYNC_COMPLETE') {
        console.log('Sync complete:', event.data.tag)
        // Optionally trigger a UI update
      }

      if (event.data.type === 'SYNC_FAILED') {
        console.error('Sync failed:', event.data.error)
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
      console.warn('Service Worker not registered')
      return false
    }

    try {
      if ('sync' in state.registration) {
        // SyncManager is not in standard TypeScript definitions
        const syncManager = (state.registration as any).sync
        await syncManager.register(tag)
        console.log('Background sync registered:', tag)
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
      console.error('Failed to trigger sync:', error)
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

