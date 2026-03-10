'use server'

import { getSession } from '@/lib/auth/session'
import { CreateBookingSchema, type CreateBookingInput } from '@/lib/schemas/booking'
import { bookingService } from '@/lib/services/booking'
import { revalidatePath } from 'next/cache'

export type BookingActionResult = {
  success: boolean
  booking?: { id: number; booking_number: string }
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Create booking from parsed data (used by other actions internally)
 */
export async function createBooking(data: CreateBookingInput): Promise<BookingActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateBookingSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
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

/**
 * Create booking from FormData — for useActionState forms
 */
export async function createBookingAction(
  _prevState: BookingActionResult | null,
  formData: FormData
): Promise<BookingActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const raw = {
    customerFirstName: formData.get('customerFirstName') as string,
    customerLastName: formData.get('customerLastName') as string,
    customerEmail: formData.get('customerEmail') as string,
    customerPhone: formData.get('customerPhone') as string,
    tripDate: formData.get('tripDate') as string,
    tourType: formData.get('tourType') as string,
    duration: formData.get('duration') as string,
    groupSize: formData.get('groupSize') as string,
    pickupLocation: formData.get('pickupLocation') as string,
    dropoffLocation: (formData.get('dropoffLocation') as string) || undefined,
    hourlyRate: formData.get('hourlyRate') as string,
    discountPercent: formData.get('discountPercent') as string,
    discountDollar: formData.get('discountDollar') as string,
    lunchCostPerPerson: formData.get('lunchCostPerPerson') as string,
    totalPrice: formData.get('totalPrice') as string,
    depositAmount: formData.get('depositAmount') as string,
    driverId: (formData.get('driverId') as string) || undefined,
    vehicleId: (formData.get('vehicleId') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    startTime: (formData.get('startTime') as string) || '10:00',
  }

  const parsed = CreateBookingSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const booking = await bookingService.createBooking({
      customerName: `${v.customerFirstName} ${v.customerLastName}`,
      customerEmail: v.customerEmail,
      customerPhone: v.customerPhone,
      partySize: v.groupSize,
      tourDate: v.tripDate,
      startTime: raw.startTime,
      durationHours: v.duration,
      totalPrice: v.totalPrice ?? 0,
      depositPaid: v.depositAmount ?? 0,
    })

    revalidatePath('/admin/bookings')

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
