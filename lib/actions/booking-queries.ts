'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  BookingFiltersSchema,
  type BookingFilters,
} from '@/lib/schemas/booking'
import type { Prisma } from '@/lib/generated/prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export type BookingListItem = {
  id: number
  booking_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  party_size: number
  tour_date: string
  start_time: string | null
  duration_hours: number | null
  status: string
  driver_id: number | null
  driver_name: string | null
  vehicle_id: number | null
  vehicle_number: string | null
  total_price: number | null
  deposit_paid: boolean | null
  booking_source: string | null
  created_at: string
}

export type BookingDetail = {
  id: number
  booking_number: string
  customer_id: number | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  party_size: number
  tour_date: string
  start_time: string | null
  end_time: string | null
  duration_hours: number | null
  pickup_location: string | null
  dropoff_location: string | null
  special_requests: string | null
  status: string
  base_price: number | null
  total_price: number | null
  gratuity: number | null
  taxes: number | null
  deposit_amount: number | null
  deposit_paid: boolean | null
  deposit_paid_at: string | null
  final_payment_amount: number | null
  final_payment_paid: boolean | null
  final_payment_paid_at: string | null
  driver_id: number | null
  driver_name: string | null
  vehicle_id: number | null
  vehicle_number: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  booking_source: string | null
  tour_type: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type DriverOption = {
  id: number
  name: string
}

export type VehicleOption = {
  id: number
  vehicle_number: string | null
  make: string
  model: string
}

export type BookingListResult = {
  success: boolean
  bookings?: BookingListItem[]
  total?: number
  page?: number
  limit?: number
  error?: string
}

export type BookingDetailResult = {
  success: boolean
  booking?: BookingDetail
  error?: string
}

export type DriversResult = {
  success: boolean
  drivers?: DriverOption[]
  error?: string
}

export type VehiclesResult = {
  success: boolean
  vehicles?: VehicleOption[]
  error?: string
}

// ============================================================================
// GET BOOKINGS — Paginated, filtered list
// ============================================================================

export async function getBookings(
  filters?: BookingFilters
): Promise<BookingListResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate filters
  const parsed = BookingFiltersSchema.safeParse(filters || {})
  if (!parsed.success) {
    return { success: false, error: 'Invalid filters' }
  }

  const f = parsed.data

  try {
    // Build where clause
    const where: Prisma.bookingsWhereInput = {}

    if (f.status) {
      where.status = f.status
    }

    if (f.startDate) {
      where.tour_date = {
        ...((where.tour_date as Prisma.DateTimeFilter) || {}),
        gte: new Date(f.startDate),
      }
    }

    if (f.endDate) {
      where.tour_date = {
        ...((where.tour_date as Prisma.DateTimeFilter) || {}),
        lte: new Date(f.endDate),
      }
    }

    if (f.driverId) {
      where.driver_id = f.driverId
    }

    if (f.customerEmail) {
      where.customer_email = { equals: f.customerEmail, mode: 'insensitive' }
    }

    if (f.bookingNumber) {
      where.booking_number = { contains: f.bookingNumber, mode: 'insensitive' }
    }

    if (f.search) {
      where.OR = [
        { customer_name: { contains: f.search, mode: 'insensitive' } },
        { customer_email: { contains: f.search, mode: 'insensitive' } },
        { booking_number: { contains: f.search, mode: 'insensitive' } },
      ]
    }

    const skip = (f.page - 1) * f.limit

    const [bookingsRaw, total] = await Promise.all([
      prisma.bookings.findMany({
        where,
        select: {
          id: true,
          booking_number: true,
          customer_name: true,
          customer_email: true,
          customer_phone: true,
          party_size: true,
          tour_date: true,
          start_time: true,
          duration_hours: true,
          status: true,
          driver_id: true,
          vehicle_id: true,
          total_price: true,
          deposit_paid: true,
          booking_source: true,
          created_at: true,
        },
        orderBy: { tour_date: 'desc' },
        skip,
        take: f.limit,
      }),
      prisma.bookings.count({ where }),
    ])

    // Fetch driver and vehicle names for the bookings that have them
    const driverIds = [...new Set(bookingsRaw.filter(b => b.driver_id).map(b => b.driver_id as number))]
    const vehicleIds = [...new Set(bookingsRaw.filter(b => b.vehicle_id).map(b => b.vehicle_id as number))]

    const [drivers, vehicles] = await Promise.all([
      driverIds.length > 0
        ? prisma.users.findMany({
            where: { id: { in: driverIds } },
            select: { id: true, name: true },
          })
        : [],
      vehicleIds.length > 0
        ? prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, vehicle_number: true },
          })
        : [],
    ])

    const driverMap = new Map(drivers.map(d => [d.id, d.name]))
    const vehicleMap = new Map(vehicles.map(v => [v.id, v.vehicle_number]))

    const bookings: BookingListItem[] = bookingsRaw.map(b => ({
      id: b.id,
      booking_number: b.booking_number,
      customer_name: b.customer_name,
      customer_email: b.customer_email,
      customer_phone: b.customer_phone,
      party_size: b.party_size,
      tour_date: b.tour_date.toISOString(),
      start_time: b.start_time?.toISOString() || null,
      duration_hours: b.duration_hours ? Number(b.duration_hours) : null,
      status: b.status,
      driver_id: b.driver_id,
      driver_name: b.driver_id ? driverMap.get(b.driver_id) || null : null,
      vehicle_id: b.vehicle_id,
      vehicle_number: b.vehicle_id ? vehicleMap.get(b.vehicle_id) || null : null,
      total_price: b.total_price ? Number(b.total_price) : null,
      deposit_paid: b.deposit_paid,
      booking_source: b.booking_source,
      created_at: b.created_at.toISOString(),
    }))

    return {
      success: true,
      bookings,
      total,
      page: f.page,
      limit: f.limit,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch bookings'
    return { success: false, error: message }
  }
}

// ============================================================================
// GET BOOKING BY ID — Single booking with full details
// ============================================================================

export async function getBookingById(
  id: number
): Promise<BookingDetailResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!id || id <= 0) {
    return { success: false, error: 'Invalid booking ID' }
  }

  try {
    const bookingRaw = await prisma.bookings.findUnique({
      where: { id },
      select: {
        id: true,
        booking_number: true,
        customer_id: true,
        customer_name: true,
        customer_email: true,
        customer_phone: true,
        party_size: true,
        tour_date: true,
        start_time: true,
        end_time: true,
        duration_hours: true,
        pickup_location: true,
        dropoff_location: true,
        special_requests: true,
        status: true,
        base_price: true,
        total_price: true,
        gratuity: true,
        taxes: true,
        deposit_amount: true,
        deposit_paid: true,
        deposit_paid_at: true,
        final_payment_amount: true,
        final_payment_paid: true,
        final_payment_paid_at: true,
        driver_id: true,
        vehicle_id: true,
        booking_source: true,
        tour_type: true,
        cancellation_reason: true,
        cancelled_at: true,
        created_at: true,
        updated_at: true,
        completed_at: true,
      },
    })

    if (!bookingRaw) {
      return { success: false, error: 'Booking not found' }
    }

    // Fetch driver and vehicle info
    let driverName: string | null = null
    let vehicleNumber: string | null = null
    let vehicleMake: string | null = null
    let vehicleModel: string | null = null

    if (bookingRaw.driver_id) {
      const driver = await prisma.users.findUnique({
        where: { id: bookingRaw.driver_id },
        select: { name: true },
      })
      driverName = driver?.name || null
    }

    if (bookingRaw.vehicle_id) {
      const vehicle = await prisma.vehicles.findUnique({
        where: { id: bookingRaw.vehicle_id },
        select: { vehicle_number: true, make: true, model: true },
      })
      vehicleNumber = vehicle?.vehicle_number || null
      vehicleMake = vehicle?.make || null
      vehicleModel = vehicle?.model || null
    }

    const booking: BookingDetail = {
      id: bookingRaw.id,
      booking_number: bookingRaw.booking_number,
      customer_id: bookingRaw.customer_id,
      customer_name: bookingRaw.customer_name,
      customer_email: bookingRaw.customer_email,
      customer_phone: bookingRaw.customer_phone,
      party_size: bookingRaw.party_size,
      tour_date: bookingRaw.tour_date.toISOString(),
      start_time: bookingRaw.start_time?.toISOString() || null,
      end_time: bookingRaw.end_time?.toISOString() || null,
      duration_hours: bookingRaw.duration_hours ? Number(bookingRaw.duration_hours) : null,
      pickup_location: bookingRaw.pickup_location,
      dropoff_location: bookingRaw.dropoff_location,
      special_requests: bookingRaw.special_requests,
      status: bookingRaw.status,
      base_price: bookingRaw.base_price ? Number(bookingRaw.base_price) : null,
      total_price: bookingRaw.total_price ? Number(bookingRaw.total_price) : null,
      gratuity: bookingRaw.gratuity ? Number(bookingRaw.gratuity) : null,
      taxes: bookingRaw.taxes ? Number(bookingRaw.taxes) : null,
      deposit_amount: bookingRaw.deposit_amount ? Number(bookingRaw.deposit_amount) : null,
      deposit_paid: bookingRaw.deposit_paid,
      deposit_paid_at: bookingRaw.deposit_paid_at?.toISOString() || null,
      final_payment_amount: bookingRaw.final_payment_amount ? Number(bookingRaw.final_payment_amount) : null,
      final_payment_paid: bookingRaw.final_payment_paid,
      final_payment_paid_at: bookingRaw.final_payment_paid_at?.toISOString() || null,
      driver_id: bookingRaw.driver_id,
      driver_name: driverName,
      vehicle_id: bookingRaw.vehicle_id,
      vehicle_number: vehicleNumber,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      booking_source: bookingRaw.booking_source,
      tour_type: bookingRaw.tour_type,
      cancellation_reason: bookingRaw.cancellation_reason,
      cancelled_at: bookingRaw.cancelled_at?.toISOString() || null,
      created_at: bookingRaw.created_at.toISOString(),
      updated_at: bookingRaw.updated_at.toISOString(),
      completed_at: bookingRaw.completed_at?.toISOString() || null,
    }

    return { success: true, booking }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch booking'
    return { success: false, error: message }
  }
}

// ============================================================================
// GET DRIVERS — Active drivers for dropdown
// ============================================================================

export async function getDrivers(): Promise<DriversResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const drivers = await prisma.users.findMany({
      where: {
        role: { in: ['driver', 'owner'] },
        is_active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      drivers: drivers.map(d => ({ id: d.id, name: d.name })),
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch drivers'
    return { success: false, error: message }
  }
}

// ============================================================================
// GET VEHICLES — Active vehicles for dropdown
// ============================================================================

export async function getVehicles(): Promise<VehiclesResult> {
  // Auth check
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const vehicles = await prisma.vehicles.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        vehicle_number: true,
        make: true,
        model: true,
      },
      orderBy: { vehicle_number: 'asc' },
    })

    return {
      success: true,
      vehicles: vehicles.map(v => ({
        id: v.id,
        vehicle_number: v.vehicle_number,
        make: v.make,
        model: v.model,
      })),
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch vehicles'
    return { success: false, error: message }
  }
}
