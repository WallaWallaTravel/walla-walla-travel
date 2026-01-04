'use client'

import { useState, useEffect } from 'react'
import {
  saveInspectionOffline,
  getPendingInspections,
  deleteInspection,
  isOnline,
  addConnectivityListeners,
} from '@/lib/offline-storage'

interface InspectionData {
  driverId: string
  vehicleId: string
  type: 'pre_trip' | 'post_trip'
  items: Record<string, boolean>
  notes: string | null
  beginningMileage?: number
  endingMileage?: number
  signature?: string | null
  timeCardId?: number
}

interface UseOfflineInspectionReturn {
  saveInspection: (data: InspectionData) => Promise<{ success: boolean; id?: number; error?: string }>
  syncPending: () => Promise<{ synced: number; failed: number }>
  pendingCount: number
  isOnlineStatus: boolean
  isSyncing: boolean
}

export function useOfflineInspection(): UseOfflineInspectionReturn {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnlineStatus, setIsOnlineStatus] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Update pending count
  const updatePendingCount = async () => {
    try {
      const pending = await getPendingInspections()
      setPendingCount(pending.length)
    } catch (error) {
      console.error('Failed to get pending inspections:', error)
    }
  }

  // Initialize
  useEffect(() => {
    // Set initial online status
    setIsOnlineStatus(isOnline())

    // Update pending count
    updatePendingCount()

    // Listen for connectivity changes
    const cleanup = addConnectivityListeners(
      () => {
        console.log('Device is online')
        setIsOnlineStatus(true)
        // Auto-sync when coming back online
        syncPending()
      },
      () => {
        console.log('Device is offline')
        setIsOnlineStatus(false)
      }
    )

    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Save inspection (online or offline)
   */
  const saveInspection = async (data: InspectionData): Promise<{ success: boolean; id?: number; error?: string }> => {
    try {
      if (isOnline()) {
        // Try to save online first
        try {
          const response = await fetch('/api/inspections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (response.ok) {
            const result = await response.json()
            console.log('Inspection saved online:', result)
            return { success: true, id: result.id }
          } else {
            throw new Error('Failed to save online')
          }
        } catch (error) {
          console.warn('Online save failed, saving offline:', error)
          // Fallback to offline
          const id = await saveInspectionOffline(data)
          await updatePendingCount()
          return { success: true, id, error: 'Saved offline - will sync when online' }
        }
      } else {
        // Save offline
        console.log('Device is offline, saving locally')
        const id = await saveInspectionOffline(data)
        await updatePendingCount()
        return { success: true, id, error: 'Saved offline - will sync when online' }
      }
    } catch (error) {
      console.error('Failed to save inspection:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save inspection'
      }
    }
  }

  /**
   * Sync all pending inspections
   */
  const syncPending = async (): Promise<{ synced: number; failed: number }> => {
    if (!isOnline()) {
      console.log('Device is offline, cannot sync')
      return { synced: 0, failed: 0 }
    }

    setIsSyncing(true)
    let synced = 0
    let failed = 0

    try {
      const pending = await getPendingInspections()
      console.log(`Syncing ${pending.length} pending inspections`)

      for (const inspection of pending) {
        try {
          const { id, synced: _synced, syncAttempts, timestamp, ...data } = inspection

          const response = await fetch('/api/inspections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (response.ok) {
            // Delete from local storage after successful sync
            if (typeof id === 'number') {
              await deleteInspection(id)
            }
            synced++
            console.log(`Synced inspection ${id}`)
          } else {
            failed++
            console.error(`Failed to sync inspection ${id}:`, response.status)
          }
        } catch (error) {
          failed++
          console.error(`Error syncing inspection ${inspection.id}:`, error)
        }
      }

      await updatePendingCount()
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }

    return { synced, failed }
  }

  return {
    saveInspection,
    syncPending,
    pendingCount,
    isOnlineStatus,
    isSyncing,
  }
}

