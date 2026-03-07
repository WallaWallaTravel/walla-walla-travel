'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { generateSecureString } from '@/lib/utils'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CalendarMutationResult = {
  success: boolean
  data?: Record<string, unknown>
  error?: string | Record<string, string[]>
}

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

const CreateBookingFromCalendarSchema = z.object({
  tourDate: z.string().min(1, 'Date required'),
  customerName: z.string().min(1, 'Customer name required'),
  customerEmail: z.string().email('Valid email required').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  partySize: z.coerce.number().min(1, 'Party size must be at least 1'),
  startTime: z.string().optional().default('10:00'),
  durationHours: z.coerce.number().min(1).optional().default(6),
  notes: z.string().optional(),
})

const MoveBookingSchema = z.object({
  bookingId: z.coerce.number().min(1, 'Booking ID required'),
  newDate: z.string().min(1, 'New date required'),
})

// -----------------------------------------------------------------------------
// createBookingFromCalendar — quick-create from date click
// -----------------------------------------------------------------------------

export async function createBookingFromCalendar(
  data: z.infer<typeof CreateBookingFromCalendarSchema>
): Promise<CalendarMutationResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateBookingFromCalendarSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data
  const userId = session.user.id ? parseInt(session.user.id) : undefined

  try {
    // Generate booking number
    const prefix = 'WWT'
    const year = new Date().getFullYear()
    const timestamp = Date.now().toString().slice(-6)
    const random = generateSecureString(3, '0123456789')
    const bookingNumber = `${prefix}-${year}-${timestamp}${random}`

    // Parse time to a Date object for Prisma Time column
    const [hours, minutes] = (v.startTime || '10:00').split(':').map(Number)
    const timeDate = new Date('1970-01-01')
    timeDate.setHours(hours, minutes, 0, 0)

    const booking = await prisma.bookings.create({
      data: {
        booking_number: bookingNumber,
        customer_name: v.customerName,
        customer_email: v.customerEmail || '',
        customer_phone: v.customerPhone || null,
        party_size: v.partySize,
        tour_date: new Date(v.tourDate),
        start_time: timeDate,
        duration_hours: new Prisma.Decimal(v.durationHours),
        status: 'pending',
        special_requests: v.notes || null,
        booked_by: userId,
      },
    })

    logger.info('Booking created from calendar', {
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      tourDate: v.tourDate,
    })

    return {
      success: true,
      data: {
        id: booking.id,
        booking_number: booking.booking_number,
      },
    }
  } catch (error) {
    logger.error('Failed to create booking from calendar', { error, data: v })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create booking',
    }
  }
}

// -----------------------------------------------------------------------------
// moveBooking — drag-and-drop reschedule
// -----------------------------------------------------------------------------

export async function moveBooking(
  bookingId: number,
  newDate: string
): Promise<CalendarMutationResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = MoveBookingSchema.safeParse({ bookingId, newDate })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    // Verify booking exists
    const existing = await prisma.bookings.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, tour_date: true, booking_number: true },
    })

    if (!existing) {
      return { success: false, error: 'Booking not found' }
    }

    // Don't allow moving completed or cancelled bookings
    if (['completed', 'cancelled'].includes(existing.status)) {
      return {
        success: false,
        error: `Cannot reschedule a ${existing.status} booking`,
      }
    }

    const oldDate = existing.tour_date.toISOString().split('T')[0]

    await prisma.bookings.update({
      where: { id: bookingId },
      data: {
        tour_date: new Date(newDate),
        updated_at: new Date(),
      },
    })

    logger.info('Booking rescheduled from calendar', {
      bookingId,
      bookingNumber: existing.booking_number,
      oldDate,
      newDate,
    })

    return {
      success: true,
      data: {
        booking_id: bookingId,
        old_date: oldDate,
        new_date: newDate,
      },
    }
  } catch (error) {
    logger.error('Failed to move booking', { error, bookingId, newDate })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reschedule booking',
    }
  }
}
