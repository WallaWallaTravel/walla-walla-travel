'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
  ClockInSchema, type ClockInInput,
  ClockOutSchema, type ClockOutInput,
  PreTripInspectionSchema, type PreTripInspectionInput,
  PostTripInspectionSchema, type PostTripInspectionInput,
  BreakSchema, type BreakInput,
  TourCompletionSchema, type TourCompletionInput,
  OfferResponseSchema, type OfferResponseInput,
} from '@/lib/schemas/driver'

// ─── Types ──────────────────────────────────────────────────

export type DriverActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string | Record<string, string[]>
}

// ─── Auth Helper ────────────────────────────────────────────

async function requireDriverAuth(): Promise<{ userId: number; role: string } | null> {
  const session = await getSession()
  if (!session?.user) return null
  const role = session.user.role
  if (role !== 'driver' && role !== 'admin') return null
  return { userId: session.user.id, role }
}

// ─── HOS Validation Helper ─────────────────────────────────

const HOS_DRIVING_MAX = 10 // hours
const HOS_ON_DUTY_MAX = 15 // hours
const HOS_OFF_DUTY_MIN = 8 // hours

async function checkHOSCompliance(driverId: number): Promise<{
  canDrive: boolean
  warnings: string[]
  violations: string[]
}> {
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  // Get today's time cards
  const todayCards = await prisma.time_cards.findMany({
    where: {
      driver_id: driverId,
      date: todayStart,
    },
  })

  let totalOnDutyHours = 0
  for (const card of todayCards) {
    const clockOut = card.clock_out_time || now
    const hours = (clockOut.getTime() - card.clock_in_time.getTime()) / (1000 * 60 * 60)
    totalOnDutyHours += hours
  }

  // Check last off-duty period (gap between last clock-out and now or last clock-in)
  const lastCompletedCard = await prisma.time_cards.findFirst({
    where: {
      driver_id: driverId,
      clock_out_time: { not: null },
    },
    orderBy: { clock_out_time: 'desc' },
  })

  const warnings: string[] = []
  const violations: string[] = []

  if (totalOnDutyHours >= HOS_ON_DUTY_MAX) {
    violations.push(`On-duty hours (${totalOnDutyHours.toFixed(1)}h) exceed ${HOS_ON_DUTY_MAX}h limit`)
  } else if (totalOnDutyHours >= HOS_ON_DUTY_MAX - 1) {
    warnings.push(`Approaching ${HOS_ON_DUTY_MAX}h on-duty limit (${totalOnDutyHours.toFixed(1)}h)`)
  }

  if (totalOnDutyHours >= HOS_DRIVING_MAX) {
    warnings.push(`Approaching ${HOS_DRIVING_MAX}h driving limit`)
  }

  if (lastCompletedCard?.clock_out_time) {
    const offDutyHours = (now.getTime() - lastCompletedCard.clock_out_time.getTime()) / (1000 * 60 * 60)
    if (offDutyHours < HOS_OFF_DUTY_MIN && totalOnDutyHours > 0) {
      warnings.push(`Only ${offDutyHours.toFixed(1)}h off-duty since last shift (minimum ${HOS_OFF_DUTY_MIN}h)`)
    }
  }

  return {
    canDrive: violations.length === 0,
    warnings,
    violations,
  }
}

// ─── Clock In ───────────────────────────────────────────────

export async function clockIn(data: ClockInInput): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const parsed = ClockInSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Check for active time card
    const activeCard = await prisma.time_cards.findFirst({
      where: {
        driver_id: driver.userId,
        clock_out_time: null,
      },
    })

    if (activeCard) {
      return { success: false, error: 'Already clocked in. Clock out first.' }
    }

    // Check HOS compliance
    const hos = await checkHOSCompliance(driver.userId)
    if (!hos.canDrive) {
      return { success: false, error: `HOS violation: ${hos.violations.join('; ')}` }
    }

    // Validate vehicle if provided
    if (v.vehicle_id) {
      const vehicle = await prisma.vehicles.findFirst({
        where: { id: v.vehicle_id, is_active: true },
      })
      if (!vehicle) {
        return { success: false, error: 'Selected vehicle not found or inactive' }
      }

      // Check vehicle not in use by another driver
      const vehicleInUse = await prisma.time_cards.findFirst({
        where: {
          vehicle_id: v.vehicle_id,
          clock_out_time: null,
          driver_id: { not: driver.userId },
        },
      })
      if (vehicleInUse) {
        return { success: false, error: 'Vehicle is currently in use by another driver' }
      }
    }

    // Create time card
    const now = new Date()
    const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    const workLocation = v.location
      ? `Lat: ${v.location.latitude.toFixed(4)}, Lng: ${v.location.longitude.toFixed(4)}`
      : 'Location not provided'

    const timeCard = await prisma.time_cards.create({
      data: {
        driver_id: driver.userId,
        vehicle_id: v.vehicle_id || null,
        date: todayDate,
        work_reporting_location: workLocation,
        work_reporting_lat: v.location?.latitude,
        work_reporting_lng: v.location?.longitude,
        clock_in_time: now,
        status: 'on_duty',
        notes: v.notes || null,
      },
    })

    return {
      success: true,
      data: {
        timeCard,
        hosWarnings: hos.warnings,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clock in'
    return { success: false, error: message }
  }
}

// ─── Clock Out ──────────────────────────────────────────────

export async function clockOut(data: ClockOutInput): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const parsed = ClockOutSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Find active time card
    const activeCard = await prisma.time_cards.findFirst({
      where: {
        driver_id: driver.userId,
        clock_out_time: null,
      },
      orderBy: { clock_in_time: 'desc' },
    })

    if (!activeCard) {
      return { success: false, error: 'Not currently clocked in' }
    }

    // Check post-trip inspection if vehicle was used
    if (activeCard.vehicle_id) {
      const postTrip = await prisma.inspections.findFirst({
        where: {
          time_card_id: activeCard.id,
          type: 'post_trip',
        },
      })
      if (!postTrip) {
        return { success: false, error: 'Post-trip inspection required before clock out' }
      }
    }

    // Calculate hours
    const clockOutTime = new Date()
    const totalHours = (clockOutTime.getTime() - activeCard.clock_in_time.getTime()) / (1000 * 60 * 60)

    // Update time card
    const updatedCard = await prisma.time_cards.update({
      where: { id: activeCard.id },
      data: {
        clock_out_time: clockOutTime,
        on_duty_hours: totalHours,
        driver_signature: v.signature,
        signature_timestamp: clockOutTime,
        status: 'completed',
        notes: v.notes ? `${activeCard.notes || ''}\n${v.notes}`.trim() : activeCard.notes,
      },
    })

    return {
      success: true,
      data: {
        timeCard: updatedCard,
        totalHours: totalHours.toFixed(2),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clock out'
    return { success: false, error: message }
  }
}

// ─── Start Break ────────────────────────────────────────────

export async function startBreak(data: BreakInput): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const parsed = BreakSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Find active time card
    const activeCard = await prisma.time_cards.findFirst({
      where: {
        driver_id: driver.userId,
        clock_out_time: null,
      },
    })

    if (!activeCard) {
      return { success: false, error: 'Not clocked in. Please clock in before taking a break.' }
    }

    // Check no active break
    const activeBreak = await prisma.break_records.findFirst({
      where: {
        time_card_id: activeCard.id,
        break_end: null,
      },
    })

    if (activeBreak) {
      return { success: false, error: 'Already on break. End current break first.' }
    }

    const breakRecord = await prisma.break_records.create({
      data: {
        time_card_id: activeCard.id,
        driver_id: driver.userId,
        break_start: new Date(),
        break_type: v.break_type,
        notes: v.notes || null,
      },
    })

    // Update time card status
    await prisma.time_cards.update({
      where: { id: activeCard.id },
      data: { status: 'on_break' },
    })

    return { success: true, data: breakRecord }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start break'
    return { success: false, error: message }
  }
}

// ─── End Break ──────────────────────────────────────────────

export async function endBreak(breakId: number): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  try {
    const breakRecord = await prisma.break_records.findFirst({
      where: {
        id: breakId,
        driver_id: driver.userId,
        break_end: null,
      },
    })

    if (!breakRecord) {
      return { success: false, error: 'No active break found' }
    }

    const breakEnd = new Date()
    const durationMinutes = Math.round(
      (breakEnd.getTime() - breakRecord.break_start.getTime()) / (1000 * 60)
    )

    const updatedBreak = await prisma.break_records.update({
      where: { id: breakRecord.id },
      data: {
        break_end: breakEnd,
        duration_minutes: durationMinutes,
      },
    })

    // Update time card status back to on_duty
    await prisma.time_cards.update({
      where: { id: breakRecord.time_card_id },
      data: { status: 'on_duty' },
    })

    return { success: true, data: updatedBreak }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to end break'
    return { success: false, error: message }
  }
}

// ─── Submit Pre-Trip Inspection ─────────────────────────────

export async function submitPreTripInspection(data: PreTripInspectionInput): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const parsed = PreTripInspectionSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Verify vehicle exists
    const vehicle = await prisma.vehicles.findFirst({
      where: { id: v.vehicle_id, is_active: true },
    })
    if (!vehicle) {
      return { success: false, error: 'Vehicle not found or inactive' }
    }

    // Find active time card for linking
    const activeCard = await prisma.time_cards.findFirst({
      where: {
        driver_id: driver.userId,
        clock_out_time: null,
      },
    })

    // Check all items are checked (passed)
    const allChecked = Object.values(v.checklist_items).every(Boolean)

    const inspectionPayload = {
      items: v.checklist_items,
      notes: v.notes || '',
      signature: v.signature,
    }

    const inspection = await prisma.inspections.create({
      data: {
        driver_id: driver.userId,
        vehicle_id: v.vehicle_id,
        type: 'pre_trip',
        inspection_data: inspectionPayload as unknown as Prisma.InputJsonValue,
        start_mileage: v.start_mileage || null,
        status: allChecked ? 'completed' : 'issues_found',
        issues_found: !allChecked,
        time_card_id: activeCard?.id || null,
      },
    })

    // Update vehicle mileage if provided
    if (v.start_mileage) {
      await prisma.vehicles.update({
        where: { id: v.vehicle_id },
        data: {
          current_mileage: v.start_mileage,
          last_inspection_date: new Date(),
        },
      })
    }

    return { success: true, data: inspection }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit inspection'
    return { success: false, error: message }
  }
}

// ─── Submit Post-Trip Inspection ────────────────────────────

export async function submitPostTripInspection(data: PostTripInspectionInput): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const parsed = PostTripInspectionSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Verify vehicle exists
    const vehicle = await prisma.vehicles.findFirst({
      where: { id: v.vehicle_id },
    })
    if (!vehicle) {
      return { success: false, error: 'Vehicle not found' }
    }

    // Find active time card
    const activeCard = await prisma.time_cards.findFirst({
      where: {
        driver_id: driver.userId,
        clock_out_time: null,
      },
    })

    // Determine defect severity
    const hasCriticalDefect = v.defects.some(d => d.severity === 'critical')
    const defectSeverity = !v.defects_found ? 'none' :
      hasCriticalDefect ? 'critical' : 'minor'

    const defectDescription = v.defects.length > 0
      ? v.defects.map(d => `[${d.severity.toUpperCase()}] ${d.description}`).join('\n\n')
      : null

    // Create inspection record
    const postTripPayload = {
      items: v.checklist_items,
      notes: v.notes || '',
      fuel_level: v.fuel_level,
      signature: v.driver_signature,
      defects: v.defects,
      vehicle_safe: v.vehicle_safe,
      mechanic_signature: v.mechanic_signature || null,
    }

    const inspection = await prisma.inspections.create({
      data: {
        driver_id: driver.userId,
        vehicle_id: v.vehicle_id,
        type: 'post_trip',
        inspection_data: postTripPayload as unknown as Prisma.InputJsonValue,
        end_mileage: v.end_mileage,
        status: 'completed',
        defects_found: v.defects_found,
        defect_severity: defectSeverity,
        defect_description: defectDescription,
        time_card_id: activeCard?.id || null,
      },
    })

    // Create DVIR report
    const dvirId = `DVIR-${driver.userId}-${Date.now()}`
    await prisma.dvir_reports.create({
      data: {
        id: dvirId,
        driver_id: driver.userId,
        vehicle_id: v.vehicle_id,
        report_date: new Date(),
        post_trip_inspection_id: inspection.id,
        defects_found: v.defects_found,
        defects_description: v.defects.length > 0 ? (v.defects as unknown as Prisma.InputJsonValue) : undefined,
        driver_signature: v.driver_signature,
        mechanic_signature: v.mechanic_signature || null,
        status: v.defects_found ? 'needs_review' : 'submitted',
      },
    })

    // Update vehicle mileage and fuel level
    await prisma.vehicles.update({
      where: { id: v.vehicle_id },
      data: {
        current_mileage: v.end_mileage,
        fuel_level: v.fuel_level === 'Full' ? 100 :
          v.fuel_level === '3/4' ? 75 :
          v.fuel_level === '1/2' ? 50 :
          v.fuel_level === '1/4' ? 25 : 0,
        last_inspection_date: new Date(),
      },
    })

    return { success: true, data: { inspection, dvirId } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit post-trip inspection'
    return { success: false, error: message }
  }
}

// ─── Complete Tour ──────────────────────────────────────────

export async function completeTour(data: TourCompletionInput): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const parsed = TourCompletionSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Verify booking belongs to this driver
    const booking = await prisma.bookings.findFirst({
      where: {
        id: v.booking_id,
        driver_id: driver.userId,
      },
    })

    if (!booking) {
      return { success: false, error: 'Booking not found or not assigned to you' }
    }

    // Update booking status
    await prisma.bookings.update({
      where: { id: v.booking_id },
      data: {
        status: 'completed',
        special_requests: v.notes
          ? `${booking.special_requests || ''}\n[Driver Notes] ${v.notes}`.trim()
          : booking.special_requests,
      },
    })

    return {
      success: true,
      data: {
        booking_id: v.booking_id,
        actual_hours: v.actual_hours,
        mileage: v.mileage,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete tour'
    return { success: false, error: message }
  }
}

// ─── Respond to Offer ───────────────────────────────────────

export async function respondToOffer(data: OfferResponseInput): Promise<DriverActionResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const parsed = OfferResponseSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // tour_offers is @@ignore in Prisma, so we use raw SQL
    const result = await prisma.$queryRawUnsafe<Array<{ id: number; booking_id: number }>>(
      `UPDATE tour_offers
       SET status = $1,
           response_at = NOW(),
           response_notes = $2
       WHERE id = $3
         AND driver_id = $4
         AND status = 'pending'
       RETURNING id, booking_id`,
      v.response,
      v.notes || null,
      v.offer_id,
      driver.userId,
    )

    if (!result || result.length === 0) {
      return { success: false, error: 'Offer not found or already responded to' }
    }

    // If accepted, assign driver to booking
    if (v.response === 'accept') {
      await prisma.bookings.update({
        where: { id: result[0].booking_id },
        data: {
          driver_id: driver.userId,
          status: 'confirmed',
        },
      })
    }

    return { success: true, data: { offer_id: v.offer_id, response: v.response } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to respond to offer'
    return { success: false, error: message }
  }
}
