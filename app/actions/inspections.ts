'use server'

import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

interface InspectionData {
  vehicleId: string
  type: 'pre_trip' | 'post_trip'
  mileage: number
  checklist: Record<string, boolean>
  notes?: string
}

export async function savePreTripInspection(data: InspectionData) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate data
    if (!data.vehicleId) {
      return { success: false, error: 'Vehicle selection required' }
    }

    if (!data.mileage || data.mileage <= 0) {
      return { success: false, error: 'Valid mileage required' }
    }

    // Save to database
    const result = await query(
      `INSERT INTO inspections 
       (driver_id, vehicle_id, type, mileage, checklist, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [
        user.id,
        data.vehicleId,
        'pre_trip',
        data.mileage,
        JSON.stringify(data.checklist),
        data.notes || ''
      ]
    )

    return {
      success: true,
      inspectionId: result.rows[0].id
    }
  } catch (error) {
    console.error('Save pre-trip inspection error:', error)
    return {
      success: false,
      error: 'Failed to save inspection'
    }
  }
}

export async function saveInspectionAction(data: {
  driverId: string
  vehicleId: string
  type: 'pre_trip' | 'post_trip'
  items: Record<string, boolean>
  notes: string | null
  beginningMileage?: number
  endingMileage?: number
  signature?: string | null
}) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user || user.id !== data.driverId) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate data
    if (!data.vehicleId) {
      return { success: false, error: 'Vehicle selection required' }
    }

    const mileage = data.type === 'pre_trip' ? data.beginningMileage : data.endingMileage
    if (!mileage || mileage <= 0) {
      return { success: false, error: 'Valid mileage required' }
    }

    // Save to database
    const result = await query(
      `INSERT INTO inspections 
       (driver_id, vehicle_id, type, mileage, checklist, notes, signature, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        user.id,
        data.vehicleId,
        data.type,
        mileage,
        JSON.stringify(data.items),
        data.notes || '',
        data.signature || null
      ]
    )

    return {
      success: true,
      inspectionId: result.rows[0].id
    }
  } catch (error) {
    console.error('Save inspection error:', error)
    return {
      success: false,
      error: 'Failed to save inspection'
    }
  }
}

export async function savePostTripInspection(data: InspectionData & { signature?: string }) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate data
    if (!data.vehicleId) {
      return { success: false, error: 'Vehicle selection required' }
    }

    if (!data.mileage || data.mileage <= 0) {
      return { success: false, error: 'Valid mileage required' }
    }

    // Save to database
    const result = await query(
      `INSERT INTO inspections 
       (driver_id, vehicle_id, type, mileage, checklist, notes, signature, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        user.id,
        data.vehicleId,
        'post_trip',
        data.mileage,
        JSON.stringify(data.checklist),
        data.notes || '',
        data.signature || null
      ]
    )

    return {
      success: true,
      inspectionId: result.rows[0].id
    }
  } catch (error) {
    console.error('Save post-trip inspection error:', error)
    return {
      success: false,
      error: 'Failed to save inspection'
    }
  }
}