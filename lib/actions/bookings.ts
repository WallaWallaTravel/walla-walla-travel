'use server'

import { auth } from '@/auth'
import { CreateBookingSchema, type CreateBookingInput } from '@/lib/schemas/booking'
import { bookingService } from '@/lib/services/booking'

export type BookingActionResult = {
  success: boolean
  booking?: { id: number; booking_number: string }
  error?: string | Record<string, string[]>
}

export async function createBooking(data: CreateBookingInput): Promise<BookingActionResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate
  const parsed = CreateBookingSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Use existing booking service — preserves all business logic:
    // capacity check, advisory locks, customer upsert, booking number generation
    const booking = await bookingService.createBooking({
      customerName: `${v.customerFirstName} ${v.customerLastName}`,
      customerEmail: v.customerEmail,
      customerPhone: v.customerPhone,
      partySize: v.groupSize,
      tourDate: v.tripDate,
      startTime: '10:00',
      durationHours: v.duration,
      totalPrice: v.totalPrice ?? 0,
      depositPaid: v.depositAmount ?? 0,
    })

    return {
      success: true,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create booking'
    return { success: false, error: message }
  }
}
