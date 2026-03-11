'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// =============================================================================
// Historical Inspection
// =============================================================================

const HistoricalInspectionSchema = z.object({
  driverId: z.coerce.number().int().positive('Driver is required'),
  vehicleId: z.coerce.number().int().positive('Vehicle is required'),
  type: z.enum(['pre_trip', 'post_trip', 'dvir']),
  originalDocumentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  startMileage: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  endMileage: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  fuelLevel: z.string().optional(),
  notes: z.string().max(5000).optional(),
  entryNotes: z.string().max(2000).optional(),
  defectsFound: z.coerce.boolean().optional(),
  defectSeverity: z.enum(['none', 'minor', 'critical']).optional(),
  defectDescription: z.string().max(5000).optional(),
})

export async function submitHistoricalInspection(
  prevState: { success?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  // Extract checklist items from formData (prefixed with "check_")
  const checklistItems: Record<string, boolean> = {}
  for (const [key] of formData.entries()) {
    if (key.startsWith('check_')) {
      checklistItems[key.replace('check_', '')] = true
    }
  }

  // Parse form fields
  const raw = Object.fromEntries(formData)
  const parsed = HistoricalInspectionSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
    return { error: firstError || 'Validation failed' }
  }

  const data = parsed.data
  const startMileage = typeof data.startMileage === 'number' ? data.startMileage : undefined
  const endMileage = typeof data.endMileage === 'number' ? data.endMileage : undefined

  try {
    // Check for duplicate entry
    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM inspections
      WHERE driver_id = ${data.driverId}
        AND vehicle_id = ${data.vehicleId}
        AND type = ${data.type}
        AND original_document_date = ${data.originalDocumentDate}::date
        AND is_historical_entry = true
      LIMIT 1
    `

    if (existing.length > 0) {
      return { error: 'A historical inspection with the same driver, vehicle, type, and date already exists.' }
    }

    await prisma.inspections.create({
      data: {
        driver_id: data.driverId,
        vehicle_id: data.vehicleId,
        type: data.type,
        status: 'completed',
        inspection_data: {
          items: checklistItems,
          notes: data.notes || undefined,
          fuelLevel: data.fuelLevel || undefined,
          defectsFound: data.defectsFound || false,
          defectSeverity: data.defectsFound ? data.defectSeverity : 'none',
          defectDescription: data.defectsFound ? data.defectDescription : undefined,
        },
        start_mileage: startMileage ?? null,
        end_mileage: endMileage ?? null,
        defects_found: data.defectsFound || false,
        defect_severity: data.defectsFound ? (data.defectSeverity ?? null) : null,
        defect_description: data.defectsFound ? (data.defectDescription ?? null) : null,
        is_historical_entry: true,
        historical_source: 'manual_entry',
        entered_by: session.user.id,
        entry_notes: data.entryNotes || null,
        original_document_date: new Date(data.originalDocumentDate + 'T12:00:00'),
      },
    })

    return { success: true }
  } catch (err) {
    console.error('Failed to create historical inspection:', err)
    return { error: 'Failed to save inspection record. Please try again.' }
  }
}

// =============================================================================
// Historical Time Card
// =============================================================================

const HistoricalTimeCardSchema = z.object({
  driverId: z.coerce.number().int().positive('Driver is required'),
  vehicleId: z.coerce.number().int().positive().optional().or(z.literal('')),
  bookingId: z.coerce.number().int().positive().optional().or(z.literal('')),
  originalDocumentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
  clockInTime: z.string().min(1, 'Clock in time is required'),
  clockOutTime: z.string().min(1, 'Clock out time is required'),
  workLocation: z.string().max(500).optional(),
  drivingHours: z.coerce.number().nonnegative().max(24).optional().or(z.literal('')),
  onDutyHours: z.coerce.number().nonnegative().max(24).optional().or(z.literal('')),
  entryNotes: z.string().max(2000).optional(),
})

export async function submitHistoricalTimeCard(
  prevState: { success?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const raw = Object.fromEntries(formData)
  const parsed = HistoricalTimeCardSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
    return { error: firstError || 'Validation failed' }
  }

  const data = parsed.data
  const vehicleId = typeof data.vehicleId === 'number' ? data.vehicleId : undefined
  const bookingId = typeof data.bookingId === 'number' ? data.bookingId : undefined
  const drivingHours = typeof data.drivingHours === 'number' ? data.drivingHours : undefined
  const onDutyHours = typeof data.onDutyHours === 'number' ? data.onDutyHours : undefined

  // Build ISO datetime strings
  const clockInDateTime = `${data.originalDocumentDate}T${data.clockInTime}:00`
  let clockOutDate = data.originalDocumentDate

  // Handle overnight shifts
  const clockIn = new Date(clockInDateTime)
  const clockOutCheck = new Date(`${data.originalDocumentDate}T${data.clockOutTime}:00`)
  if (clockOutCheck < clockIn) {
    const nextDay = new Date(data.originalDocumentDate + 'T12:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    clockOutDate = nextDay.toISOString().split('T')[0]
  }
  const clockOutDateTime = `${clockOutDate}T${data.clockOutTime}:00`

  try {
    // Check for duplicate entry
    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM time_cards
      WHERE driver_id = ${data.driverId}
        AND clock_in_time = ${clockInDateTime}::timestamptz
        AND is_historical_entry = true
      LIMIT 1
    `

    if (existing.length > 0) {
      return { error: 'A historical time card with the same driver and clock-in time already exists.' }
    }

    await prisma.time_cards.create({
      data: {
        driver_id: data.driverId,
        vehicle_id: vehicleId ?? null,
        date: new Date(data.originalDocumentDate + 'T12:00:00'),
        clock_in_time: new Date(clockInDateTime),
        clock_out_time: new Date(clockOutDateTime),
        work_reporting_location: data.workLocation || 'Walla Walla Travel Office',
        driving_hours: drivingHours ?? 0,
        on_duty_hours: onDutyHours ?? 0,
        status: 'approved',
        is_historical_entry: true,
        historical_source: 'manual_entry',
        entered_by: session.user.id,
        entry_notes: data.entryNotes || null,
        original_document_date: new Date(data.originalDocumentDate + 'T12:00:00'),
        client_service_id: bookingId ?? null,
      },
    })

    return { success: true }
  } catch (err) {
    console.error('Failed to create historical time card:', err)
    return { error: 'Failed to save time card record. Please try again.' }
  }
}
