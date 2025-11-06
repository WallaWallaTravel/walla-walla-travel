'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useServiceWorker } from '@/lib/hooks/useServiceWorker'

interface ServiceWorkerContextType {
  isSupported: boolean
  isRegistered: boolean
  isOnline: boolean
  registration: ServiceWorkerRegistration | null
  error: Error | null
  triggerSync: (tag?: string) => Promise<boolean>
  updateServiceWorker: () => void
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | null>(null)

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  const serviceWorker = useServiceWorker()

  return (
    <ServiceWorkerContext.Provider value={serviceWorker}>
      {children}
      
      {/* Online/Offline indicator */}
      {!serviceWorker.isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white py-2 px-4 text-center text-sm font-medium z-50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            You're offline - Inspections will sync when connection is restored
          </div>
        </div>
      )}

      {/* Service Worker error indicator */}
      {serviceWorker.error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white py-3 px-4 rounded-lg shadow-lg max-w-sm z-50">
          <p className="font-medium">Service Worker Error</p>
          <p className="text-sm mt-1 opacity-90">{serviceWorker.error.message}</p>
        </div>
      )}
    </ServiceWorkerContext.Provider>
  )
}

export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext)
  if (!context) {
    throw new Error('useServiceWorkerContext must be used within ServiceWorkerProvider')
  }
  return context
}

