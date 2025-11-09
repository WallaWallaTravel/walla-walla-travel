'use client'

import React, { useEffect, useState } from 'react'
import { getPendingInspections, isOnline } from '@/lib/offline-storage'

export function OfflineSyncIndicator() {
  const [mounted, setMounted] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const updatePendingCount = async () => {
    try {
      const pending = await getPendingInspections()
      setPendingCount(pending.length)
    } catch (error) {
      console.error('Failed to get pending count:', error)
    }
  }

  useEffect(() => {
    // Prevent hydration errors by only running on client
    setMounted(true)
    setOnline(isOnline())
    updatePendingCount()

    const handleOnline = () => {
      setOnline(true)
      setSyncing(true)
      // Give time for service worker to sync
      setTimeout(() => {
        setSyncing(false)
        updatePendingCount()
      }, 3000)
    }

    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Poll for updates every 30 seconds
    const interval = setInterval(updatePendingCount, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  // Don't render anything during SSR to prevent hydration errors
  if (!mounted) {
    return null
  }

  // Don't show if online and nothing pending
  if (online && pendingCount === 0 && !syncing) {
    return null
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {syncing ? (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium">Syncing...</span>
        </div>
      ) : !online ? (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Offline Mode</span>
          </div>
          {pendingCount > 0 && (
            <p className="text-xs mt-1 opacity-90">
              {pendingCount} inspection{pendingCount !== 1 ? 's' : ''} pending
            </p>
          )}
        </div>
      ) : pendingCount > 0 ? (
        <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              {pendingCount} pending sync{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

