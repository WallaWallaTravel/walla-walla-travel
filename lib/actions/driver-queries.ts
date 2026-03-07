'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────

export type DriverQueryResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// ─── Auth Helper ────────────────────────────────────────────

async function requireDriverAuth(): Promise<{ userId: number; role: string } | null> {
  const session = await auth()
  if (!session?.user) return null
  const role = session.user.role
  if (role !== 'driver' && role !== 'admin') return null
  return { userId: parseInt(session.user.id), role }
}

// ─── Dashboard ──────────────────────────────────────────────

export async function getDriverDashboard(driverId?: number): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId

  // Only allow admin to view other driver dashboards
  if (id !== driver.userId && driver.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Get active time card (clock status)
    const activeTimeCard = await prisma.time_cards.findFirst({
      where: {
        driver_id: id,
        clock_out_time: null,
      },
      orderBy: { clock_in_time: 'desc' },
    })

    // Get vehicle info if clocked in
    let vehicleInfo = null
    if (activeTimeCard?.vehicle_id) {
      vehicleInfo = await prisma.vehicles.findUnique({
        where: { id: activeTimeCard.vehicle_id },
        select: {
          id: true,
          vehicle_number: true,
          make: true,
          model: true,
        },
      })
    }

    // Get today's inspection status
    const todayPreTrip = await prisma.inspections.findFirst({
      where: {
        driver_id: id,
        type: 'pre_trip',
        created_at: { gte: todayStart },
      },
    })

    // Get upcoming bookings (next 7 days)
    const weekFromNow = new Date(todayStart)
    weekFromNow.setUTCDate(weekFromNow.getUTCDate() + 7)

    const upcomingBookings = await prisma.bookings.findMany({
      where: {
        driver_id: id,
        tour_date: {
          gte: todayStart,
          lte: weekFromNow,
        },
        status: { in: ['confirmed', 'pending'] },
      },
      orderBy: { tour_date: 'asc' },
      take: 10,
      select: {
        id: true,
        booking_number: true,
        customer_name: true,
        tour_date: true,
        start_time: true,
        party_size: true,
        pickup_location: true,
        dropoff_location: true,
        status: true,
        special_requests: true,
      },
    })

    // Calculate weekly hours
    const weekStart = new Date(todayStart)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()) // Start of week (Sunday)

    const weeklyCards = await prisma.time_cards.findMany({
      where: {
        driver_id: id,
        date: { gte: weekStart },
        status: 'completed',
      },
    })

    const weeklyHours = weeklyCards.reduce((sum, card) => {
      return sum + (Number(card.on_duty_hours) || 0)
    }, 0)

    // Calculate today's hours
    let todayHours = 0
    if (activeTimeCard) {
      todayHours = (now.getTime() - activeTimeCard.clock_in_time.getTime()) / (1000 * 60 * 60)
    }

    // Get active break
    let activeBreak = null
    if (activeTimeCard) {
      activeBreak = await prisma.break_records.findFirst({
        where: {
          time_card_id: activeTimeCard.id,
          break_end: null,
        },
      })
    }

    return {
      success: true,
      data: {
        clockStatus: {
          isClockedIn: !!activeTimeCard,
          timeCard: activeTimeCard,
          vehicle: vehicleInfo,
          todayHours: parseFloat(todayHours.toFixed(2)),
          onBreak: !!activeBreak,
          activeBreak,
        },
        compliance: {
          preTripCompleted: !!todayPreTrip,
          weeklyHours: parseFloat(weeklyHours.toFixed(2)),
          weeklyLimit: 60,
          dailyDrivingLimit: 10,
          dailyOnDutyLimit: 15,
        },
        upcomingBookings,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard'
    return { success: false, error: message }
  }
}

// ─── Schedule ───────────────────────────────────────────────

export async function getDriverSchedule(
  driverId?: number,
  dateRange?: { start: string; end: string }
): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId
  if (id !== driver.userId && driver.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const now = new Date()
    const start = dateRange?.start
      ? new Date(dateRange.start)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const end = dateRange?.end
      ? new Date(dateRange.end)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const bookings = await prisma.bookings.findMany({
      where: {
        driver_id: id,
        tour_date: {
          gte: start,
          lte: end,
        },
        status: { in: ['confirmed', 'pending'] },
      },
      orderBy: { tour_date: 'asc' },
      select: {
        id: true,
        booking_number: true,
        customer_name: true,
        tour_date: true,
        start_time: true,
        end_time: true,
        duration_hours: true,
        party_size: true,
        pickup_location: true,
        dropoff_location: true,
        status: true,
        special_requests: true,
        vehicle_id: true,
      },
    })

    return { success: true, data: { bookings } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load schedule'
    return { success: false, error: message }
  }
}

// ─── Offers ─────────────────────────────────────────────────

export async function getDriverOffers(driverId?: number): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId
  if (id !== driver.userId && driver.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // tour_offers is @@ignore, use raw SQL
    const offers = await prisma.$queryRawUnsafe<Array<{
      id: number
      booking_id: number
      status: string
      offered_at: Date
      expires_at: Date | null
      notes: string | null
      customer_name: string
      tour_date: Date
      party_size: number
      pickup_location: string | null
    }>>(
      `SELECT
        o.id, o.booking_id, o.status, o.offered_at, o.expires_at, o.notes,
        b.customer_name, b.tour_date, b.party_size, b.pickup_location
       FROM tour_offers o
       JOIN bookings b ON o.booking_id = b.id
       WHERE o.driver_id = $1
         AND o.status = 'pending'
         AND (o.expires_at IS NULL OR o.expires_at > NOW())
       ORDER BY o.offered_at DESC`,
      id,
    )

    return { success: true, data: { offers } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load offers'
    return { success: false, error: message }
  }
}

// ─── Tour Details ───────────────────────────────────────────

export async function getTourDetails(tourId: number, driverId?: number): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId

  try {
    const booking = await prisma.bookings.findFirst({
      where: {
        id: tourId,
        driver_id: id,
      },
      select: {
        id: true,
        booking_number: true,
        customer_name: true,
        customer_phone: true,
        tour_date: true,
        start_time: true,
        end_time: true,
        duration_hours: true,
        party_size: true,
        pickup_location: true,
        dropoff_location: true,
        status: true,
        special_requests: true,
        vehicle_id: true,
      },
    })

    if (!booking) {
      return { success: false, error: 'Tour not found or not assigned to you' }
    }

    // Get stops for this booking (booking_wineries is @@ignore, use raw SQL)
    const stops = await prisma.$queryRawUnsafe<Array<{
      id: number
      winery_id: number
      visit_order: number
      estimated_arrival_time: string | null
      estimated_duration_minutes: number | null
      notes: string | null
      winery_name: string | null
      address: string | null
    }>>(
      `SELECT
        bw.id, bw.winery_id, bw.visit_order,
        bw.estimated_arrival_time, bw.estimated_duration_minutes, bw.notes,
        w.name as winery_name, w.address
       FROM booking_wineries bw
       LEFT JOIN wineries w ON bw.winery_id = w.id
       WHERE bw.booking_id = $1
       ORDER BY bw.visit_order ASC`,
      tourId,
    )

    return {
      success: true,
      data: { booking, stops },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load tour details'
    return { success: false, error: message }
  }
}

// ─── Clock Status ───────────────────────────────────────────

export async function getClockStatus(driverId?: number): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId
  if (id !== driver.userId && driver.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const activeCard = await prisma.time_cards.findFirst({
      where: {
        driver_id: id,
        clock_out_time: null,
      },
      orderBy: { clock_in_time: 'desc' },
    })

    if (!activeCard) {
      return {
        success: true,
        data: {
          status: 'not_clocked_in',
          canClockIn: true,
          canClockOut: false,
        },
      }
    }

    const now = new Date()
    const hoursWorked = (now.getTime() - activeCard.clock_in_time.getTime()) / (1000 * 60 * 60)

    // Get vehicle info
    let vehicle = null
    if (activeCard.vehicle_id) {
      vehicle = await prisma.vehicles.findUnique({
        where: { id: activeCard.vehicle_id },
        select: { vehicle_number: true, make: true, model: true },
      })
    }

    // Check for active break
    const activeBreak = await prisma.break_records.findFirst({
      where: {
        time_card_id: activeCard.id,
        break_end: null,
      },
    })

    return {
      success: true,
      data: {
        status: activeBreak ? 'on_break' : 'clocked_in',
        timeCard: activeCard,
        vehicle,
        hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        canClockIn: false,
        canClockOut: true,
        activeBreak,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load clock status'
    return { success: false, error: message }
  }
}

// ─── HOS Compliance ─────────────────────────────────────────

export async function getHOSCompliance(driverId?: number): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId
  if (id !== driver.userId && driver.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Get today's on-duty hours
    const todayCards = await prisma.time_cards.findMany({
      where: {
        driver_id: id,
        date: todayStart,
      },
    })

    let todayOnDutyHours = 0
    for (const card of todayCards) {
      const clockOut = card.clock_out_time || now
      const hours = (clockOut.getTime() - card.clock_in_time.getTime()) / (1000 * 60 * 60)
      todayOnDutyHours += hours
    }

    // Get today's break hours
    const todayBreaks = await prisma.break_records.findMany({
      where: {
        driver_id: id,
        break_start: { gte: todayStart },
      },
    })

    const todayBreakMinutes = todayBreaks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0)

    // Get 7-day/8-day rolling hours
    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)

    const weeklyCards = await prisma.time_cards.findMany({
      where: {
        driver_id: id,
        clock_in_time: { gte: sevenDaysAgo },
      },
    })

    let weeklyHours = 0
    const daysWorked = new Set<string>()

    for (const card of weeklyCards) {
      const clockOut = card.clock_out_time || now
      const hours = (clockOut.getTime() - card.clock_in_time.getTime()) / (1000 * 60 * 60)
      weeklyHours += hours
      daysWorked.add(card.date.toISOString().split('T')[0])
    }

    const consecutiveDays = daysWorked.size
    const weeklyLimit = consecutiveDays > 7 ? 70 : 60

    const violations: Array<{ type: string; message: string }> = []
    const warnings: Array<{ type: string; message: string }> = []

    // Daily driving check
    if (todayOnDutyHours > 10) {
      violations.push({ type: 'daily_driving', message: 'Exceeded 10-hour driving limit' })
    } else if (todayOnDutyHours > 9) {
      warnings.push({ type: 'daily_driving', message: 'Approaching 10-hour driving limit' })
    }

    // Daily on-duty check
    if (todayOnDutyHours > 15) {
      violations.push({ type: 'daily_on_duty', message: 'Exceeded 15-hour on-duty limit' })
    } else if (todayOnDutyHours > 14) {
      warnings.push({ type: 'daily_on_duty', message: 'Approaching 15-hour on-duty limit' })
    }

    // Weekly check
    if (weeklyHours > weeklyLimit) {
      violations.push({ type: 'weekly', message: `Exceeded ${weeklyLimit}-hour weekly limit` })
    } else if (weeklyHours > weeklyLimit - 5) {
      warnings.push({ type: 'weekly', message: `Approaching ${weeklyLimit}-hour weekly limit` })
    }

    // Break requirement (30 min after 8 hours)
    if (todayOnDutyHours >= 8 && todayBreakMinutes < 30) {
      violations.push({ type: 'break', message: 'Required 30-minute break not taken after 8 hours' })
    }

    return {
      success: true,
      data: {
        isCompliant: violations.length === 0,
        violations,
        warnings,
        daily: {
          onDutyHours: parseFloat(todayOnDutyHours.toFixed(2)),
          breakMinutes: todayBreakMinutes,
          remainingDriveTime: Math.max(0, 10 - todayOnDutyHours),
          remainingDutyTime: Math.max(0, 15 - todayOnDutyHours),
        },
        weekly: {
          totalHours: parseFloat(weeklyHours.toFixed(2)),
          consecutiveDays,
          weeklyLimit,
          remainingHours: Math.max(0, weeklyLimit - weeklyHours),
        },
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load HOS compliance'
    return { success: false, error: message }
  }
}

// ─── Driver Documents ───────────────────────────────────────

export async function getDriverDocuments(driverId?: number): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId
  if (id !== driver.userId && driver.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const documents = await prisma.driver_documents.findMany({
      where: {
        driver_id: id,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        document_type: true,
        document_subtype: true,
        document_name: true,
        document_url: true,
        issue_date: true,
        expiry_date: true,
        verified: true,
        verified_at: true,
        notes: true,
        created_at: true,
      },
    })

    // Determine status for each document
    const now = new Date()
    const thirtyDaysFromNow = new Date(now)
    thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30)

    const documentsWithStatus = documents.map(doc => {
      let status: 'current' | 'expiring' | 'expired' | 'unknown' = 'unknown'
      if (doc.expiry_date) {
        if (doc.expiry_date < now) {
          status = 'expired'
        } else if (doc.expiry_date < thirtyDaysFromNow) {
          status = 'expiring'
        } else {
          status = 'current'
        }
      } else {
        status = doc.verified ? 'current' : 'unknown'
      }
      return { ...doc, status }
    })

    return { success: true, data: { documents: documentsWithStatus } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load documents'
    return { success: false, error: message }
  }
}

// ─── Inspection History ─────────────────────────────────────

export async function getInspectionHistory(driverId?: number): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  const id = driverId || driver.userId
  if (id !== driver.userId && driver.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const inspections = await prisma.inspections.findMany({
      where: { driver_id: id },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        vehicle_id: true,
        type: true,
        status: true,
        issues_found: true,
        defects_found: true,
        defect_severity: true,
        start_mileage: true,
        end_mileage: true,
        created_at: true,
      },
    })

    return { success: true, data: { inspections } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load inspection history'
    return { success: false, error: message }
  }
}

// ─── Vehicles for Clock-In ──────────────────────────────────

export async function getVehiclesForClockIn(): Promise<DriverQueryResult> {
  const driver = await requireDriverAuth()
  if (!driver) return { success: false, error: 'Unauthorized' }

  try {
    const vehicles = await prisma.vehicles.findMany({
      where: {
        is_active: true,
        status: { in: ['active', 'available'] },
      },
      orderBy: { vehicle_number: 'asc' },
      select: {
        id: true,
        vehicle_number: true,
        make: true,
        model: true,
        capacity: true,
        current_mileage: true,
      },
    })

    // Check which vehicles are currently in use
    const activeTimeCards = await prisma.time_cards.findMany({
      where: {
        clock_out_time: null,
        vehicle_id: { not: null },
      },
      select: { vehicle_id: true, driver_id: true },
    })

    const inUseVehicleIds = new Set(activeTimeCards.map(tc => tc.vehicle_id))

    const vehiclesWithAvailability = vehicles.map(v => ({
      ...v,
      in_use: inUseVehicleIds.has(v.id),
      in_use_by_me: activeTimeCards.some(
        tc => tc.vehicle_id === v.id && tc.driver_id === driver.userId
      ),
    }))

    return { success: true, data: { vehicles: vehiclesWithAvailability } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load vehicles'
    return { success: false, error: message }
  }
}
