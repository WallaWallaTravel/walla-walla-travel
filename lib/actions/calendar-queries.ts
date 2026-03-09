'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { logger } from '@/lib/logger'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CalendarQueryResult<T = Record<string, unknown>> = {
  success: boolean
  data?: T
  error?: string
}

type EventSource =
  | 'proposal'
  | 'corporate_request'
  | 'reservation'
  | 'shared_tour'
  | 'trip_proposal'

interface CalendarEvent {
  id: string
  source: EventSource
  sourceId: number
  title: string
  date: string
  startTime?: string
  status: string
  eventType: 'tentative'
  color: string
  partySize?: number
  customerName?: string
  companyName?: string
  link: string
}

interface CalendarBooking {
  id: number
  booking_number: string
  tour_date: string
  start_time: string | null
  party_size: number
  status: string
  vehicle_id: number | null
  driver_id: number | null
  customer_name: string
  vehicle_name: string | null
  driver_name: string | null
  complianceIssues: string[]
}

interface AvailabilityBlockRow {
  id: number
  vehicle_id: number
  block_date: string
  start_time: string | null
  end_time: string | null
  block_type: string
  reason: string | null
  vehicle_name: string | null
}

interface DailySummary {
  bookings: number
  blockedVehicles: number
  availableVehicles: number
  totalCapacity: number
  bookedCapacity: number
}

interface ComplianceIssue {
  type: 'driver' | 'vehicle'
  entityId: number
  entityName: string
  field: string
  expiryDate: string
  daysUntilExpiry: number
  severity: 'expired' | 'critical' | 'urgent' | 'warning'
  affectedBookings: number[]
}

interface CalendarData {
  bookings: CalendarBooking[]
  blocks: AvailabilityBlockRow[]
  vehicles: { id: number; name: string | null; capacity: number | null; is_active: boolean | null }[]
  drivers: { id: number; name: string; is_active: string }[]
  dailySummaries: Record<string, DailySummary>
  complianceIssues: ComplianceIssue[]
  events: CalendarEvent[]
  eventsByDate: Record<string, CalendarEvent[]>
}

// Compliance thresholds
const COMPLIANCE_WARNING_DAYS = 40
const COMPLIANCE_URGENT_DAYS = 10
const COMPLIANCE_CRITICAL_DAYS = 5

// Event source colors
const EVENT_COLORS: Record<EventSource, string> = {
  proposal: '#3B82F6',
  corporate_request: '#8B5CF6',
  reservation: '#F59E0B',
  shared_tour: '#0EA5E9',
  trip_proposal: '#D97706',
}

// -----------------------------------------------------------------------------
// getCalendarData — returns all bookings, proposals, shared tours, and
// availability blocks in date range via Prisma
// -----------------------------------------------------------------------------

export async function getCalendarData(
  startDate: string,
  endDate: string
): Promise<CalendarQueryResult<CalendarData>> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // ---- Main calendar data (bookings, blocks, vehicles, drivers) ----
    // Use $queryRaw for bookings since we need JOINs with compliance data
    const bookingsRaw = await prisma.$queryRaw<
      Array<{
        id: number
        booking_number: string
        tour_date: Date
        start_time: string | null
        party_size: number
        status: string
        vehicle_id: number | null
        driver_id: number | null
        customer_name: string
        vehicle_name: string | null
        vehicle_insurance_expiry: Date | null
        vehicle_registration_expiry: Date | null
        driver_name: string | null
        driver_license_expiry: Date | null
        driver_medical_expiry: Date | null
      }>
    >`
      SELECT
        b.id,
        b.booking_number,
        b.tour_date,
        b.start_time as start_time,
        b.party_size,
        b.status,
        b.vehicle_id,
        b.driver_id,
        c.name as customer_name,
        v.name as vehicle_name,
        v.insurance_expiry as vehicle_insurance_expiry,
        v.registration_expiry as vehicle_registration_expiry,
        d.name as driver_name,
        d.license_expiry as driver_license_expiry,
        d.medical_cert_expiry as driver_medical_expiry
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users d ON b.driver_id = d.id
      WHERE b.tour_date >= ${new Date(startDate)} AND b.tour_date <= ${new Date(endDate)}
      ORDER BY b.tour_date, b.start_time
    `

    // Availability blocks — @@ignore model, must use $queryRaw
    const blocksRaw = await prisma.$queryRaw<
      Array<{
        id: number
        vehicle_id: number
        block_date: Date
        start_time: string | null
        end_time: string | null
        block_type: string
        reason: string | null
        vehicle_name: string | null
      }>
    >`
      SELECT
        vab.id,
        vab.vehicle_id,
        vab.block_date,
        vab.start_time,
        vab.end_time,
        vab.block_type,
        vab.reason,
        v.name as vehicle_name
      FROM vehicle_availability_blocks vab
      LEFT JOIN vehicles v ON vab.vehicle_id = v.id
      WHERE vab.block_date >= ${new Date(startDate)} AND vab.block_date <= ${new Date(endDate)}
      ORDER BY vab.block_date, vab.start_time
    `

    // Vehicles — has proper model
    const vehicles = await prisma.vehicles.findMany({
      where: { is_active: true },
      select: { id: true, name: true, capacity: true, is_active: true },
      orderBy: { name: 'asc' },
    })

    // Drivers (users with role='driver')
    const driversRaw = await prisma.users.findMany({
      where: { role: 'driver' },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    })

    // ---- Compute daily summaries ----
    const totalVehicles = vehicles.length
    const totalCapacity = vehicles.reduce((sum, v) => sum + (v.capacity || 14), 0)
    const dailySummaries: Record<string, DailySummary> = {}

    const bookingsByDate: Record<string, typeof bookingsRaw> = {}
    for (const b of bookingsRaw) {
      const ds = b.tour_date.toISOString().split('T')[0]
      if (!bookingsByDate[ds]) bookingsByDate[ds] = []
      bookingsByDate[ds].push(b)
    }

    const blocksByDate: Record<string, typeof blocksRaw> = {}
    for (const bl of blocksRaw) {
      const ds = bl.block_date.toISOString().split('T')[0]
      if (!blocksByDate[ds]) blocksByDate[ds] = []
      blocksByDate[ds].push(bl)
    }

    const sd = new Date(startDate)
    const ed = new Date(endDate)
    const cur = new Date(sd)
    while (cur <= ed) {
      const ds = cur.toISOString().split('T')[0]
      const dayBookings = bookingsByDate[ds] || []
      const dayBlocks = blocksByDate[ds] || []
      const blockedIds = new Set(dayBlocks.map((b) => b.vehicle_id))
      const bookedIds = new Set(dayBookings.map((b) => b.vehicle_id).filter(Boolean))
      const unavailable = new Set([...blockedIds, ...bookedIds]).size

      dailySummaries[ds] = {
        bookings: dayBookings.length,
        blockedVehicles: blockedIds.size,
        availableVehicles: Math.max(0, totalVehicles - unavailable),
        totalCapacity,
        bookedCapacity: dayBookings.reduce((sum, b) => sum + (b.party_size || 0), 0),
      }
      cur.setDate(cur.getDate() + 1)
    }

    // ---- Compliance issues ----
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const complianceIssues: ComplianceIssue[] = []
    const driverIssuesMap = new Map<number, ComplianceIssue>()
    const vehicleIssuesMap = new Map<number, ComplianceIssue>()

    const getComplianceInfo = (
      expiryDate: Date | null
    ): { daysUntil: number; severity: 'expired' | 'critical' | 'urgent' | 'warning' } | null => {
      if (!expiryDate) return null
      const expiry = new Date(expiryDate)
      expiry.setHours(0, 0, 0, 0)
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
      if (daysUntil <= 0) return { daysUntil, severity: 'expired' }
      if (daysUntil <= COMPLIANCE_CRITICAL_DAYS) return { daysUntil, severity: 'critical' }
      if (daysUntil <= COMPLIANCE_URGENT_DAYS) return { daysUntil, severity: 'urgent' }
      if (daysUntil <= COMPLIANCE_WARNING_DAYS) return { daysUntil, severity: 'warning' }
      return null
    }

    for (const b of bookingsRaw) {
      if (b.driver_id && b.driver_license_expiry) {
        const info = getComplianceInfo(b.driver_license_expiry)
        if (info) {
          if (!driverIssuesMap.has(b.driver_id)) {
            driverIssuesMap.set(b.driver_id, {
              type: 'driver',
              entityId: b.driver_id,
              entityName: b.driver_name || `Driver ${b.driver_id}`,
              field: 'license_expiry',
              expiryDate: new Date(b.driver_license_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [b.id],
            })
          } else {
            driverIssuesMap.get(b.driver_id)!.affectedBookings.push(b.id)
          }
        }
      }
      if (b.driver_id && b.driver_medical_expiry) {
        const info = getComplianceInfo(b.driver_medical_expiry)
        if (info) {
          const existing = [...complianceIssues, ...driverIssuesMap.values()].find(
            (i) => i.entityId === b.driver_id && i.field === 'medical_cert_expiry'
          )
          if (!existing) {
            complianceIssues.push({
              type: 'driver',
              entityId: b.driver_id,
              entityName: b.driver_name || `Driver ${b.driver_id}`,
              field: 'medical_cert_expiry',
              expiryDate: new Date(b.driver_medical_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [b.id],
            })
          }
        }
      }
      if (b.vehicle_id && b.vehicle_insurance_expiry) {
        const info = getComplianceInfo(b.vehicle_insurance_expiry)
        if (info) {
          if (!vehicleIssuesMap.has(b.vehicle_id)) {
            vehicleIssuesMap.set(b.vehicle_id, {
              type: 'vehicle',
              entityId: b.vehicle_id,
              entityName: b.vehicle_name || `Vehicle ${b.vehicle_id}`,
              field: 'insurance_expiry',
              expiryDate: new Date(b.vehicle_insurance_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [b.id],
            })
          } else {
            vehicleIssuesMap.get(b.vehicle_id)!.affectedBookings.push(b.id)
          }
        }
      }
      if (b.vehicle_id && b.vehicle_registration_expiry) {
        const info = getComplianceInfo(b.vehicle_registration_expiry)
        if (info) {
          const existing = [...complianceIssues, ...vehicleIssuesMap.values()].find(
            (i) => i.entityId === b.vehicle_id && i.field === 'registration_expiry'
          )
          if (!existing) {
            complianceIssues.push({
              type: 'vehicle',
              entityId: b.vehicle_id,
              entityName: b.vehicle_name || `Vehicle ${b.vehicle_id}`,
              field: 'registration_expiry',
              expiryDate: new Date(b.vehicle_registration_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [b.id],
            })
          }
        }
      }
    }

    complianceIssues.push(...driverIssuesMap.values())
    complianceIssues.push(...vehicleIssuesMap.values())
    const severityOrder: Record<string, number> = { expired: 0, critical: 1, urgent: 2, warning: 3 }
    complianceIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    // Build booking compliance issue labels
    const bookingComplianceIssues: Record<number, string[]> = {}
    for (const issue of complianceIssues) {
      for (const bookingId of issue.affectedBookings) {
        if (!bookingComplianceIssues[bookingId]) bookingComplianceIssues[bookingId] = []
        const label =
          issue.type === 'driver'
            ? `Driver ${issue.field.replace('_expiry', '').replace('_', ' ')} ${issue.severity}`
            : `Vehicle ${issue.field.replace('_expiry', '').replace('_', ' ')} ${issue.severity}`
        if (!bookingComplianceIssues[bookingId].includes(label)) {
          bookingComplianceIssues[bookingId].push(label)
        }
      }
    }

    // ---- Tentative events ----
    const events: CalendarEvent[] = []

    // 1. Old-style proposals (proposals table)
    const proposals = await prisma.proposals.findMany({
      where: {
        status: { in: ['sent', 'viewed', 'accepted'] },
        service_items: { not: Prisma.JsonNull },
      },
      select: {
        id: true,
        proposal_number: true,
        uuid: true,
        client_name: true,
        client_company: true,
        status: true,
        service_items: true,
      },
      orderBy: { created_at: 'desc' },
    })

    for (const p of proposals) {
      const items = p.service_items as unknown as Array<{ date?: string; party_size?: number }>
      if (!Array.isArray(items)) continue
      const datesInRange = new Set<string>()
      for (const item of items) {
        if (item.date && typeof item.date === 'string') {
          const d = item.date.split('T')[0]
          if (d >= startDate && d <= endDate) datesInRange.add(d)
        }
      }
      for (const date of datesInRange) {
        const itemsOnDate = items.filter((i) => i.date && i.date.split('T')[0] === date)
        events.push({
          id: `proposal-${p.id}-${date}`,
          source: 'proposal',
          sourceId: p.id,
          title: `${p.client_name}${p.client_company ? ` (${p.client_company})` : ''}`,
          date,
          status: p.status ?? 'draft',
          eventType: 'tentative',
          color: EVENT_COLORS.proposal,
          partySize: itemsOnDate[0]?.party_size,
          customerName: p.client_name,
          companyName: p.client_company ?? undefined,
          link: `/admin/proposals/${p.uuid || p.id}`,
        })
      }
    }

    // 2. Corporate requests
    const corporateRequests = await prisma.corporate_requests.findMany({
      where: {
        status: { notIn: ['won', 'lost', 'cancelled'] },
        preferred_date: { not: null },
      },
      select: {
        id: true,
        company_name: true,
        contact_name: true,
        expected_attendees: true,
        preferred_date: true,
        alternate_dates: true,
        status: true,
      },
      orderBy: { created_at: 'desc' },
    })

    for (const cr of corporateRequests) {
      const dates: string[] = []
      if (cr.preferred_date) {
        const d = cr.preferred_date.toISOString().split('T')[0]
        if (d >= startDate && d <= endDate) dates.push(d)
      }
      // alternate_dates is a text field, try to parse
      if (cr.alternate_dates) {
        try {
          const parsed = JSON.parse(cr.alternate_dates)
          if (Array.isArray(parsed)) {
            for (const ad of parsed) {
              if (typeof ad === 'string') {
                const d = ad.split('T')[0]
                if (d >= startDate && d <= endDate) dates.push(d)
              }
            }
          }
        } catch {
          // Not JSON, might be comma-separated or single date
          const d = cr.alternate_dates.split('T')[0]
          if (d >= startDate && d <= endDate) dates.push(d)
        }
      }

      for (const date of dates) {
        events.push({
          id: `corporate-${cr.id}-${date}`,
          source: 'corporate_request',
          sourceId: cr.id,
          title: cr.company_name || cr.contact_name,
          date,
          status: cr.status ?? 'pending',
          eventType: 'tentative',
          color: EVENT_COLORS.corporate_request,
          partySize: cr.expected_attendees ?? undefined,
          customerName: cr.contact_name,
          companyName: cr.company_name,
          link: `/admin/corporate/${cr.id}`,
        })
      }
    }

    // 3. Reservations — @@ignore model, must use $queryRaw
    try {
      const reservationsRaw = await prisma.$queryRaw<
        Array<{
          id: number
          reservation_number: string
          party_size: number
          preferred_date: Date | null
          alternate_date: Date | null
          tour_start_date: Date | null
          tour_end_date: Date | null
          status: string | null
          customer_name: string | null
        }>
      >`
        SELECT
          r.id, r.reservation_number, r.party_size,
          r.preferred_date, r.alternate_date,
          r.tour_start_date, r.tour_end_date,
          r.status,
          c.name as customer_name
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE r.status NOT IN ('booked', 'cancelled', 'expired')
          AND r.booking_id IS NULL
          AND (
            (r.preferred_date >= ${new Date(startDate)} AND r.preferred_date <= ${new Date(endDate)})
            OR (r.alternate_date >= ${new Date(startDate)} AND r.alternate_date <= ${new Date(endDate)})
            OR (r.tour_start_date >= ${new Date(startDate)} AND r.tour_start_date <= ${new Date(endDate)})
            OR (r.tour_end_date >= ${new Date(startDate)} AND r.tour_end_date <= ${new Date(endDate)})
          )
        ORDER BY r.preferred_date
      `

      for (const r of reservationsRaw) {
        const dates = new Set<string>()
        for (const d of [r.preferred_date, r.alternate_date, r.tour_start_date, r.tour_end_date]) {
          if (d) {
            const ds = new Date(d).toISOString().split('T')[0]
            if (ds >= startDate && ds <= endDate) dates.add(ds)
          }
        }
        for (const date of dates) {
          events.push({
            id: `reservation-${r.id}-${date}`,
            source: 'reservation',
            sourceId: r.id,
            title: r.customer_name || `Reservation ${r.reservation_number}`,
            date,
            status: r.status ?? 'pending',
            eventType: 'tentative',
            color: EVENT_COLORS.reservation,
            partySize: r.party_size,
            customerName: r.customer_name ?? undefined,
            link: `/admin/reservations/${r.reservation_number}`,
          })
        }
      }
    } catch {
      // reservations table may not exist — skip gracefully
    }

    // 4. Shared tours — @@ignore model, must use $queryRaw
    try {
      const sharedToursRaw = await prisma.$queryRaw<
        Array<{
          id: number
          tour_code: string
          title: string
          tour_date: Date
          start_time: string | null
          max_guests: number
          current_guests: number | null
          status: string | null
        }>
      >`
        SELECT id, tour_code, title, tour_date, start_time, max_guests,
               current_guests, status
        FROM shared_tours
        WHERE tour_date >= ${new Date(startDate)} AND tour_date <= ${new Date(endDate)}
          AND status NOT IN ('cancelled', 'completed')
        ORDER BY tour_date, start_time
      `

      for (const tour of sharedToursRaw) {
        const date = tour.tour_date.toISOString().split('T')[0]
        const spotsRemaining = (tour.max_guests || 14) - (tour.current_guests || 0)
        events.push({
          id: `shared-tour-${tour.id}`,
          source: 'shared_tour',
          sourceId: tour.id,
          title: `${tour.title} (${spotsRemaining} spots)`,
          date,
          startTime: tour.start_time ?? undefined,
          status: tour.status ?? 'scheduled',
          eventType: 'tentative',
          color: EVENT_COLORS.shared_tour,
          partySize: tour.current_guests ?? 0,
          link: `/admin/shared-tours/${tour.tour_code}`,
        })
      }
    } catch {
      // shared_tours table may not exist
    }

    // 5. Trip proposals (new system)
    try {
      const tripProposals = await prisma.trip_proposals.findMany({
        where: {
          status: { notIn: ['expired', 'declined', 'converted'] },
          OR: [
            { start_date: { gte: new Date(startDate), lte: new Date(endDate) } },
            { end_date: { gte: new Date(startDate), lte: new Date(endDate) } },
          ],
        },
        select: {
          id: true,
          proposal_number: true,
          trip_title: true,
          customer_name: true,
          start_date: true,
          end_date: true,
          party_size: true,
          status: true,
        },
        orderBy: { start_date: 'asc' },
      })

      for (const tp of tripProposals) {
        const startDt = tp.start_date
        const endDt = tp.end_date ?? startDt
        const current = new Date(startDt)
        while (current <= endDt) {
          const date = current.toISOString().split('T')[0]
          if (date >= startDate && date <= endDate) {
            events.push({
              id: `trip-proposal-${tp.id}-${date}`,
              source: 'trip_proposal',
              sourceId: tp.id,
              title: tp.customer_name + (tp.trip_title ? ` \u2014 ${tp.trip_title}` : ''),
              date,
              status: tp.status ?? 'draft',
              eventType: 'tentative',
              color: EVENT_COLORS.trip_proposal,
              partySize: tp.party_size,
              customerName: tp.customer_name,
              link: `/admin/trip-proposals/${tp.id}`,
            })
          }
          current.setDate(current.getDate() + 1)
        }
      }
    } catch {
      // trip_proposals table may not exist
    }

    // Sort events by date
    events.sort((a, b) => a.date.localeCompare(b.date))

    // Group by date
    const eventsByDate: Record<string, CalendarEvent[]> = {}
    for (const event of events) {
      if (!eventsByDate[event.date]) eventsByDate[event.date] = []
      eventsByDate[event.date].push(event)
    }

    // ---- Assemble response ----
    return {
      success: true,
      data: {
        bookings: bookingsRaw.map((b) => ({
          id: b.id,
          booking_number: b.booking_number,
          tour_date: b.tour_date.toISOString().split('T')[0],
          start_time: b.start_time,
          party_size: b.party_size,
          status: b.status,
          vehicle_id: b.vehicle_id,
          driver_id: b.driver_id,
          customer_name: b.customer_name,
          vehicle_name: b.vehicle_name,
          driver_name: b.driver_name,
          complianceIssues: bookingComplianceIssues[b.id] || [],
        })),
        blocks: blocksRaw.map((bl) => ({
          id: bl.id,
          vehicle_id: bl.vehicle_id,
          block_date: bl.block_date.toISOString().split('T')[0],
          start_time: bl.start_time,
          end_time: bl.end_time,
          block_type: bl.block_type,
          reason: bl.reason,
          vehicle_name: bl.vehicle_name,
        })),
        vehicles: vehicles.map((v) => ({
          id: v.id,
          name: v.name,
          capacity: v.capacity,
          is_active: v.is_active,
        })),
        drivers: driversRaw.map((d) => ({
          id: d.id,
          name: d.name,
          is_active: d.role,
        })),
        dailySummaries,
        complianceIssues,
        events,
        eventsByDate,
      },
    }
  } catch (error) {
    logger.error('Failed to get calendar data', { error, startDate, endDate })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load calendar data',
    }
  }
}

// -----------------------------------------------------------------------------
// getDateDetails — returns detailed breakdown for a specific date
// -----------------------------------------------------------------------------

export async function getDateDetails(
  date: string
): Promise<
  CalendarQueryResult<{
    bookings: CalendarBooking[]
    blocks: AvailabilityBlockRow[]
    events: CalendarEvent[]
  }>
> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  // Re-use getCalendarData with a single-day range
  const result = await getCalendarData(date, date)
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? 'Failed to load date details' }
  }

  return {
    success: true,
    data: {
      bookings: result.data.bookings,
      blocks: result.data.blocks,
      events: result.data.events,
    },
  }
}
