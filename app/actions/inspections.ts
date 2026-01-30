'use server'

import { query } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

interface InspectionData {
  vehicleId: string
  type: 'pre_trip' | 'post_trip'
  mileage: number
  checklist: Record<string, boolean>
  notes?: string
  timeCardId?: number
}

/**
 * Get the active time card for the current user
 * This links inspections to specific shifts
 */
export async function getActiveTimeCardId(): Promise<number | null> {
  try {
    const user = (await getSession())?.user ?? null
    if (!user) return null

    const result = await query(`
      SELECT id FROM time_cards
      WHERE driver_id = $1
        AND clock_out_time IS NULL
      ORDER BY clock_in_time DESC
      LIMIT 1
    `, [user.id])

    return result.rows[0]?.id || null
  } catch (error) {
    logger.error('Get active time card error', { error })
    return null
  }
}

export async function savePreTripInspection(data: InspectionData) {
  try {
    // Get current user
    const user = (await getSession())?.user ?? null
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

    // Get active time card ID if not provided
    const timeCardId = data.timeCardId || await getActiveTimeCardId()

    // Save to database (with time_card_id for per-shift tracking)
    const result = await query(
      `INSERT INTO inspections
       (driver_id, vehicle_id, type, mileage, checklist, notes, time_card_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        user.id,
        data.vehicleId,
        'pre_trip',
        data.mileage,
        JSON.stringify(data.checklist),
        data.notes || '',
        timeCardId
      ]
    )

    return {
      success: true,
      inspectionId: result.rows[0].id
    }
  } catch (error: unknown) {
    logger.error('Save pre-trip inspection error', { error })

    // Handle missing column error (migration not run yet)
    const dbError = error as { code?: string }
    if (dbError.code === '42703') {
      return {
        success: false,
        error: 'Database schema update required. Please contact administrator.'
      }
    }

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
  timeCardId?: number
}) {
  try {
    // Get current user
    const user = (await getSession())?.user ?? null
    if (!user || String(user.id) !== data.driverId) {
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

    // Get active time card ID if not provided
    const timeCardId = data.timeCardId || await getActiveTimeCardId()

    // Save to database (with time_card_id for per-shift tracking)
    const result = await query(
      `INSERT INTO inspections
       (driver_id, vehicle_id, type, mileage, checklist, notes, signature, time_card_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        user.id,
        data.vehicleId,
        data.type,
        mileage,
        JSON.stringify(data.items),
        data.notes || '',
        data.signature || null,
        timeCardId
      ]
    )

    return {
      success: true,
      inspectionId: result.rows[0].id
    }
  } catch (error: unknown) {
    logger.error('Save inspection error', { error })

    // Handle missing column error (migration not run yet)
    const dbError = error as { code?: string }
    if (dbError.code === '42703') {
      return {
        success: false,
        error: 'Database schema update required. Please contact administrator.'
      }
    }

    return {
      success: false,
      error: 'Failed to save inspection'
    }
  }
}

export async function savePostTripInspection(data: InspectionData & { signature?: string }) {
  try {
    // Get current user
    const user = (await getSession())?.user ?? null
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

    // Get active time card ID if not provided
    const timeCardId = data.timeCardId || await getActiveTimeCardId()

    // Save to database (with time_card_id for per-shift tracking)
    const result = await query(
      `INSERT INTO inspections
       (driver_id, vehicle_id, type, mileage, checklist, notes, signature, time_card_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        user.id,
        data.vehicleId,
        'post_trip',
        data.mileage,
        JSON.stringify(data.checklist),
        data.notes || '',
        data.signature || null,
        timeCardId
      ]
    )

    return {
      success: true,
      inspectionId: result.rows[0].id
    }
  } catch (error: unknown) {
    logger.error('Save post-trip inspection error', { error })

    // Handle missing column error (migration not run yet)
    const dbError = error as { code?: string }
    if (dbError.code === '42703') {
      return {
        success: false,
        error: 'Database schema update required. Please contact administrator.'
      }
    }

    return {
      success: false,
      error: 'Failed to save inspection'
    }
  }
}