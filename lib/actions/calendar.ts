'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarBooking {
  id: number
  tour_date: string
  customer_name: string
  tour_type: string | null
  driver_name: string | null
  status: string
}

export interface CalendarProposal {
  id: number
  start_date: string
  end_date: string | null
  customer_name: string
  status: string | null
}

export interface CalendarSharedTour {
  id: number
  tour_code: string
  tour_date: string
  title: string
  max_guests: number
  current_guests: number
  status: string | null
}

export interface CalendarData {
  bookings: CalendarBooking[]
  proposals: CalendarProposal[]
  sharedTours: CalendarSharedTour[]
}

// ---------------------------------------------------------------------------
// getCalendarData — Server Action for month navigation
// ---------------------------------------------------------------------------

export async function getCalendarData(
  year: number,
  month: number
): Promise<CalendarData> {
  const session = await getSession()
  if (!session?.user) {
    return { bookings: [], proposals: [], sharedTours: [] }
  }

  // Calculate visible date range (includes partial weeks from prev/next month)
  const firstOfMonth = new Date(year, month - 1, 1)
  const lastOfMonth = new Date(year, month, 0)
  const startDate = new Date(firstOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  const endDate = new Date(lastOfMonth)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  // ---- Bookings (need JOIN for driver name) ----
  const bookingsRaw = await prisma.$queryRaw<
    Array<{
      id: number
      tour_date: Date
      customer_name: string
      tour_type: string | null
      driver_name: string | null
      status: string
    }>
  >`
    SELECT
      b.id,
      b.tour_date,
      b.customer_name,
      b.tour_type,
      u.name as driver_name,
      b.status
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    WHERE b.tour_date >= ${startDate}
      AND b.tour_date <= ${endDate}
      AND b.status != 'cancelled'
    ORDER BY b.tour_date, b.start_time
  `

  const bookings: CalendarBooking[] = bookingsRaw.map((b) => ({
    id: b.id,
    tour_date: b.tour_date.toISOString().split('T')[0],
    customer_name: b.customer_name,
    tour_type: b.tour_type,
    driver_name: b.driver_name,
    status: b.status,
  }))

  // ---- Trip Proposals (Prisma model available) ----
  const proposalsRaw = await prisma.trip_proposals.findMany({
    where: {
      status: { notIn: ['expired', 'declined', 'converted'] },
      OR: [
        { start_date: { gte: startDate, lte: endDate } },
        { end_date: { gte: startDate, lte: endDate } },
      ],
    },
    select: {
      id: true,
      start_date: true,
      end_date: true,
      customer_name: true,
      status: true,
    },
    orderBy: { start_date: 'asc' },
  })

  const proposals: CalendarProposal[] = proposalsRaw.map((p) => ({
    id: p.id,
    start_date: p.start_date.toISOString().split('T')[0],
    end_date: p.end_date ? p.end_date.toISOString().split('T')[0] : null,
    customer_name: p.customer_name,
    status: p.status,
  }))

  // ---- Shared Tours (@@ignore model — need $queryRaw) ----
  let sharedTours: CalendarSharedTour[] = []
  try {
    const sharedToursRaw = await prisma.$queryRaw<
      Array<{
        id: number
        tour_code: string
        tour_date: Date
        title: string
        max_guests: number
        current_guests: number | null
        status: string | null
      }>
    >`
      SELECT id, tour_code, tour_date, title, max_guests,
             COALESCE(current_guests, 0) as current_guests, status
      FROM shared_tours
      WHERE tour_date >= ${startDate}
        AND tour_date <= ${endDate}
        AND status != 'cancelled'
      ORDER BY tour_date
    `

    sharedTours = sharedToursRaw.map((t) => ({
      id: t.id,
      tour_code: t.tour_code,
      tour_date: t.tour_date.toISOString().split('T')[0],
      title: t.title,
      max_guests: t.max_guests,
      current_guests: Number(t.current_guests) || 0,
      status: t.status,
    }))
  } catch {
    // shared_tours table may not exist yet
  }

  return { bookings, proposals, sharedTours }
}
