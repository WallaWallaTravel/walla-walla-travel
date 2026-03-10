'use server'

import { getSession } from '@/lib/auth/session'
import { CreateBookingSchema, type CreateBookingInput } from '@/lib/schemas/booking'
import { bookingService } from '@/lib/services/booking'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type BookingActionResult = {
  success: boolean
  booking?: { id: number; booking_number: string }
  error?: string
  fieldErrors?: Record<string, string[]>
}

export type SimpleActionResult = {
  success: boolean
  error?: string
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

// ---------------------------------------------------------------------------
// updateBookingStatus
// ---------------------------------------------------------------------------

const StatusSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  cancellationReason: z.string().optional(),
})

export async function updateBookingStatus(
  _prev: SimpleActionResult | null,
  formData: FormData
): Promise<SimpleActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = StatusSchema.safeParse({
    bookingId: formData.get('bookingId'),
    status: formData.get('status'),
    cancellationReason: formData.get('cancellationReason') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid status data' }
  }

  const { bookingId, status, cancellationReason } = parsed.data

  try {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    }

    if (status === 'cancelled') {
      updateData.cancelled_at = new Date()
      updateData.cancelled_by = session.user.id
      if (cancellationReason) updateData.cancellation_reason = cancellationReason
    }
    if (status === 'completed') {
      updateData.completed_at = new Date()
    }

    await prisma.bookings.update({
      where: { id: bookingId },
      data: updateData,
    })

    revalidatePath(`/admin/bookings/${bookingId}`)
    revalidatePath('/admin/bookings')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status',
    }
  }
}

// ---------------------------------------------------------------------------
// updateBookingDriver
// ---------------------------------------------------------------------------

const DriverSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  driverId: z.coerce.number().int().nonnegative(),
})

export async function updateBookingDriver(
  _prev: SimpleActionResult | null,
  formData: FormData
): Promise<SimpleActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = DriverSchema.safeParse({
    bookingId: formData.get('bookingId'),
    driverId: formData.get('driverId'),
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid driver data' }
  }

  try {
    await prisma.bookings.update({
      where: { id: parsed.data.bookingId },
      data: {
        driver_id: parsed.data.driverId === 0 ? null : parsed.data.driverId,
        updated_at: new Date(),
      },
    })

    revalidatePath(`/admin/bookings/${parsed.data.bookingId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update driver',
    }
  }
}

// ---------------------------------------------------------------------------
// updateBookingVehicle
// ---------------------------------------------------------------------------

const VehicleSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  vehicleId: z.coerce.number().int().nonnegative(),
})

export async function updateBookingVehicle(
  _prev: SimpleActionResult | null,
  formData: FormData
): Promise<SimpleActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = VehicleSchema.safeParse({
    bookingId: formData.get('bookingId'),
    vehicleId: formData.get('vehicleId'),
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid vehicle data' }
  }

  try {
    await prisma.bookings.update({
      where: { id: parsed.data.bookingId },
      data: {
        vehicle_id: parsed.data.vehicleId === 0 ? null : parsed.data.vehicleId,
        updated_at: new Date(),
      },
    })

    revalidatePath(`/admin/bookings/${parsed.data.bookingId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vehicle',
    }
  }
}

// ---------------------------------------------------------------------------
// addBookingNote
// ---------------------------------------------------------------------------

const NoteSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  note: z.string().min(1, 'Note cannot be empty').max(2000),
})

export async function addBookingNote(
  _prev: SimpleActionResult | null,
  formData: FormData
): Promise<SimpleActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = NoteSchema.safeParse({
    bookingId: formData.get('bookingId'),
    note: formData.get('note'),
  })
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
    return { success: false, error: firstError || 'Invalid note data' }
  }

  try {
    // booking_timeline is @@ignore — use $executeRaw
    await prisma.$executeRaw`
      INSERT INTO booking_timeline (booking_id, event_type, event_description, created_by, created_at)
      VALUES (${parsed.data.bookingId}, 'note', ${parsed.data.note}, ${session.user.id}, NOW())
    `

    revalidatePath(`/admin/bookings/${parsed.data.bookingId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add note',
    }
  }
}
