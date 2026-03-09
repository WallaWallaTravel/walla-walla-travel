'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CheckAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(0).max(24),
  partySize: z.number().min(1).max(50),
})

export interface AvailableVehicle {
  id: number
  name: string
  capacity: number
  available: boolean
  vehicle_type?: string
}

export interface AvailableDriver {
  id: number
  name: string
  email: string
  phone: string
  available: boolean
}

export interface AvailabilityResult {
  available: boolean
  vehicles: AvailableVehicle[]
  drivers: AvailableDriver[]
  conflicts: string[]
  warnings: string[]
}

export type AvailabilityActionResult =
  | { success: true; data: AvailabilityResult }
  | { success: false; error: string }

export async function checkAvailability(
  input: z.infer<typeof CheckAvailabilitySchema>
): Promise<AvailabilityActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CheckAvailabilitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid request data' }
  }

  const { date, startTime, durationHours, partySize } = parsed.data

  // Calculate end time — Prisma Time fields are Date objects (epoch-based, date portion ignored)
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationHours * 60
  const endHours = Math.floor(totalMinutes / 60)
  const endMins = totalMinutes % 60

  // PostgreSQL TIME columns map to Date in Prisma — use epoch date (1970-01-01) for comparison
  const startTimeDate = new Date(1970, 0, 1, hours, minutes)
  const endTimeDate = new Date(1970, 0, 1, endHours, endMins)

  // Parse tour_date as local date to avoid timezone shift
  const [y, m, d] = date.split('-').map(Number)
  const tourDateValue = new Date(y, m - 1, d)

  // Single query for all booking conflicts on this date/time range
  const conflictingBookings = await prisma.bookings.findMany({
    where: {
      tour_date: tourDateValue,
      status: { notIn: ['cancelled'] },
      AND: [
        { start_time: { lt: endTimeDate } },
        { end_time: { gt: startTimeDate } },
      ],
    },
    select: { vehicle_id: true, driver_id: true },
  })
  const busyVehicleIds = new Set(conflictingBookings.map(b => b.vehicle_id).filter(Boolean))
  const busyDriverIds = new Set(conflictingBookings.map(b => b.driver_id).filter(Boolean))

  // Get all active vehicles
  const allVehicles = await prisma.vehicles.findMany({
    where: { status: 'active' },
    select: { id: true, make: true, model: true, capacity: true, vehicle_type: true },
    orderBy: { capacity: 'asc' },
  })

  const vehicles: AvailableVehicle[] = allVehicles.map(v => ({
    id: v.id,
    name: `${v.make} ${v.model}`,
    capacity: v.capacity ?? 0,
    vehicle_type: v.vehicle_type ?? undefined,
    available: !busyVehicleIds.has(v.id) && (v.capacity ?? 0) >= partySize,
  }))

  // Get active drivers
  const allDrivers = await prisma.users.findMany({
    where: {
      role: { in: ['driver', 'owner'] },
      is_active: true,
    },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: 'asc' },
  })

  const drivers: AvailableDriver[] = allDrivers.map(d => ({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone || '',
    available: !busyDriverIds.has(d.id),
  }))

  // Build warnings
  const warnings: string[] = []
  const conflicts: string[] = []

  // High season check (May-October)
  const month = tourDateValue.getMonth()
  if (month >= 4 && month <= 9) {
    warnings.push('High season - consider confirming availability with driver')
  }

  // Weekend check
  const dayOfWeek = tourDateValue.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
    warnings.push('Weekend booking - expect higher demand')
  }

  // Blackout date check — $queryRaw required because availability_rules has @@ignore
  // in Prisma schema (table lacks a unique identifier / @id column)
  const blackouts = await prisma.$queryRaw<{ reason: string | null }[]>`
    SELECT reason FROM availability_rules
    WHERE rule_type = 'blackout_date'
      AND is_active = true
      AND blackout_date = ${tourDateValue}
    LIMIT 1
  `
  if (blackouts.length > 0) {
    warnings.push(`Blackout date: ${blackouts[0].reason || 'Date blocked'}`)
  }

  // Multi-vehicle warning
  const maxCapacity = Math.max(...vehicles.map(v => v.capacity), 0)
  if (partySize > maxCapacity) {
    warnings.push(`Party size (${partySize}) exceeds single vehicle capacity. Multiple vehicles required.`)
  }

  const anyVehicleAvailable = vehicles.some(v => v.available)
  const anyDriverAvailable = drivers.some(d => d.available)

  return {
    success: true,
    data: {
      available: anyVehicleAvailable && anyDriverAvailable,
      vehicles,
      drivers,
      conflicts,
      warnings,
    },
  }
}
