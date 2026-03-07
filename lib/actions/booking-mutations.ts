'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  UpdateBookingSchema,
  AssignDriverSchema,
  UpdateBookingStatusSchema,
  type UpdateBookingInput,
  type AssignDriverInput,
  type UpdateBookingStatusInput,
} from '@/lib/schemas/booking'

// ============================================================================
// TYPES
// ============================================================================

export type BookingMutationResult = {
  success: boolean
  booking?: {
    id: number
    booking_number: string
    status: string
  }
  error?: string | Record<string, string[]>
}

// ============================================================================
// UPDATE BOOKING — Edit booking fields
// ============================================================================

export async function updateBooking(
  bookingId: number,
  data: UpdateBookingInput
): Promise<BookingMutationResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate
  const parsed = UpdateBookingSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Verify booking exists
    const existing = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    })

    if (!existing) {
      return { success: false, error: 'Booking not found' }
    }

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    }

    if (v.customerName !== undefined) updateData.customer_name = v.customerName
    if (v.customerEmail !== undefined) updateData.customer_email = v.customerEmail
    if (v.customerPhone !== undefined) updateData.customer_phone = v.customerPhone
    if (v.partySize !== undefined) updateData.party_size = v.partySize
    if (v.tourDate !== undefined) updateData.tour_date = new Date(v.tourDate)
    if (v.startTime !== undefined) {
      // Convert HH:MM string to a Time value (Prisma expects Date for @db.Time)
      updateData.start_time = new Date(`1970-01-01T${v.startTime}:00.000Z`)
    }
    if (v.durationHours !== undefined) updateData.duration_hours = v.durationHours
    if (v.pickupLocation !== undefined) updateData.pickup_location = v.pickupLocation
    if (v.dropoffLocation !== undefined) updateData.dropoff_location = v.dropoffLocation
    if (v.specialRequests !== undefined) updateData.special_requests = v.specialRequests
    if (v.tourType !== undefined) updateData.tour_type = v.tourType
    if (v.basePrice !== undefined) updateData.base_price = v.basePrice
    if (v.totalPrice !== undefined) updateData.total_price = v.totalPrice
    if (v.depositAmount !== undefined) updateData.deposit_amount = v.depositAmount

    const booking = await prisma.bookings.update({
      where: { id: bookingId },
      data: updateData,
      select: {
        id: true,
        booking_number: true,
        status: true,
      },
    })

    return {
      success: true,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        status: booking.status,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update booking'
    return { success: false, error: message }
  }
}

// ============================================================================
// ASSIGN DRIVER — Assign driver and optional vehicle to booking
// ============================================================================

export async function assignDriver(
  bookingId: number,
  data: AssignDriverInput
): Promise<BookingMutationResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate
  const parsed = AssignDriverSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Verify booking exists
    const existing = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    })

    if (!existing) {
      return { success: false, error: 'Booking not found' }
    }

    // Verify driver exists and is active
    const driver = await prisma.users.findFirst({
      where: {
        id: v.driverId,
        role: { in: ['driver', 'owner'] },
        is_active: true,
      },
      select: { id: true, name: true },
    })

    if (!driver) {
      return { success: false, error: 'Driver not found or inactive' }
    }

    // Verify vehicle if provided
    if (v.vehicleId) {
      const vehicle = await prisma.vehicles.findFirst({
        where: {
          id: v.vehicleId,
          status: 'active',
        },
        select: { id: true },
      })

      if (!vehicle) {
        return { success: false, error: 'Vehicle not found or inactive' }
      }
    }

    const updateData: Record<string, unknown> = {
      driver_id: v.driverId,
      updated_at: new Date(),
    }

    if (v.vehicleId) {
      updateData.vehicle_id = v.vehicleId
    }

    // If booking was pending, move to assigned status
    if (existing.status === 'pending' || existing.status === 'confirmed') {
      updateData.status = 'assigned'
    }

    const booking = await prisma.bookings.update({
      where: { id: bookingId },
      data: updateData,
      select: {
        id: true,
        booking_number: true,
        status: true,
      },
    })

    return {
      success: true,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        status: booking.status,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to assign driver'
    return { success: false, error: message }
  }
}

// ============================================================================
// UPDATE BOOKING STATUS — Change status with optional reason
// ============================================================================

export async function updateBookingStatus(
  bookingId: number,
  data: UpdateBookingStatusInput
): Promise<BookingMutationResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate
  const parsed = UpdateBookingStatusSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Verify booking exists
    const existing = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    })

    if (!existing) {
      return { success: false, error: 'Booking not found' }
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['assigned', 'in_progress', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Terminal state
      cancelled: ['pending'], // Allow re-opening
    }

    const allowed = validTransitions[existing.status] || []
    if (!allowed.includes(v.status)) {
      return {
        success: false,
        error: `Cannot transition from "${existing.status}" to "${v.status}"`,
      }
    }

    const updateData: Record<string, unknown> = {
      status: v.status,
      updated_at: new Date(),
    }

    // Handle cancellation-specific fields
    if (v.status === 'cancelled') {
      updateData.cancellation_reason = v.reason || null
      updateData.cancelled_at = new Date()
      if (session.user.id) {
        updateData.cancelled_by = parseInt(session.user.id)
      }
    }

    // Handle completion
    if (v.status === 'completed') {
      updateData.completed_at = new Date()
    }

    const booking = await prisma.bookings.update({
      where: { id: bookingId },
      data: updateData,
      select: {
        id: true,
        booking_number: true,
        status: true,
      },
    })

    return {
      success: true,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        status: booking.status,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update status'
    return { success: false, error: message }
  }
}
