/**
 * Unified Calendar Events API
 *
 * Returns combined events from multiple sources for calendar display:
 * - Proposals (sent, viewed, accepted) with dates from service_items
 * - Corporate requests with preferred_dates
 * - Reservations with preferred_date, tour_start_date, tour_end_date
 *
 * Each event has a common structure with source type, styling info, and links.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';

// Calendar event types
export type EventSource = 'proposal' | 'corporate_request' | 'reservation' | 'shared_tour' | 'trip_proposal';
export type EventType = 'tentative' | 'task';

export interface CalendarEvent {
  id: string;
  source: EventSource;
  sourceId: number;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: string;
  eventType: EventType;
  color: string;
  partySize?: number;
  customerName?: string;
  companyName?: string;
  link: string;
}

// Color mapping for different event sources
const EVENT_COLORS: Record<EventSource, string> = {
  proposal: '#3B82F6',      // Blue
  corporate_request: '#8B5CF6', // Purple
  reservation: '#F59E0B',   // Amber
  shared_tour: '#0EA5E9',   // Sky blue
  trip_proposal: '#D97706', // Amber-dark
};

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  // Calculate date range for the month (with buffer for calendar display)
  const startDate = new Date(year, month - 1, 1);
  startDate.setDate(startDate.getDate() - 7); // Include previous week
  const endDate = new Date(year, month, 7); // Include first week of next month

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const events: CalendarEvent[] = [];

  // 1. Fetch proposals with service_items containing dates
  const proposals = await prisma.$queryRaw<{ id: number; proposal_number: string; uuid: string; client_name: string; client_company: string; status: string; service_items: any }[]>`
    SELECT
      id,
      proposal_number,
      uuid,
      client_name,
      client_company,
      status,
      service_items
    FROM proposals
    WHERE status IN ('sent', 'viewed', 'accepted')
      AND service_items IS NOT NULL
    ORDER BY created_at DESC`;

  // Extract dates from service_items for each proposal
  for (const proposal of proposals) {
    const serviceItems = proposal.service_items;
    if (!Array.isArray(serviceItems)) continue;

    // Get unique dates from service items
    const datesInRange = new Set<string>();
    for (const item of serviceItems) {
      if (item.date && typeof item.date === 'string') {
        const itemDate = item.date.split('T')[0];
        if (itemDate >= startDateStr && itemDate <= endDateStr) {
          datesInRange.add(itemDate);
        }
      }
    }

    // Create an event for each unique date
    for (const date of datesInRange) {
      // Get party size from first service item on this date
      const itemsOnDate = serviceItems.filter(
        (item: { date?: string }) => item.date && item.date.split('T')[0] === date
      );
      const partySize = itemsOnDate[0]?.party_size || undefined;

      events.push({
        id: `proposal-${proposal.id}-${date}`,
        source: 'proposal',
        sourceId: proposal.id,
        title: `${proposal.client_name}${proposal.client_company ? ` (${proposal.client_company})` : ''}`,
        date,
        status: proposal.status,
        eventType: 'tentative',
        color: EVENT_COLORS.proposal,
        partySize,
        customerName: proposal.client_name,
        companyName: proposal.client_company,
        link: `/admin/proposals/${proposal.uuid || proposal.id}`,
      });
    }
  }

  // 2. Fetch corporate requests with preferred_dates
  const corporateRequests = await prisma.$queryRaw<{ id: number; request_number: string; company_name: string; contact_name: string; party_size: number; event_type: string; preferred_dates: any; status: string }[]>`
    SELECT
      id,
      request_number,
      company_name,
      contact_name,
      party_size,
      event_type,
      preferred_dates,
      status
    FROM corporate_requests
    WHERE status NOT IN ('won', 'lost', 'cancelled')
      AND preferred_dates IS NOT NULL
    ORDER BY created_at DESC`;

  for (const request of corporateRequests) {
    const preferredDates = request.preferred_dates;

    // Handle different formats for preferred_dates (can be array or object)
    let datesToProcess: string[] = [];

    if (Array.isArray(preferredDates)) {
      datesToProcess = preferredDates.filter((d: unknown) => typeof d === 'string');
    } else if (preferredDates && typeof preferredDates === 'object') {
      // Could be { start: 'date', end: 'date' } or { dates: ['date1', 'date2'] }
      if (preferredDates.start) datesToProcess.push(preferredDates.start);
      if (preferredDates.end) datesToProcess.push(preferredDates.end);
      if (Array.isArray(preferredDates.dates)) {
        datesToProcess = [...datesToProcess, ...preferredDates.dates];
      }
    }

    for (const dateStr of datesToProcess) {
      const date = dateStr.split('T')[0];
      if (date >= startDateStr && date <= endDateStr) {
        events.push({
          id: `corporate-${request.id}-${date}`,
          source: 'corporate_request',
          sourceId: request.id,
          title: request.company_name || request.contact_name,
          date,
          status: request.status || 'pending',
          eventType: 'tentative',
          color: EVENT_COLORS.corporate_request,
          partySize: request.party_size,
          customerName: request.contact_name,
          companyName: request.company_name,
          link: `/admin/corporate/${request.request_number}`,
        });
      }
    }
  }

  // 3. Fetch reservations with preferred dates (not yet converted to bookings)
  const reservations = await prisma.$queryRawUnsafe<{ id: number; reservation_number: string; party_size: number; preferred_date: Date | null; alternate_date: Date | null; tour_start_date: Date | null; tour_end_date: Date | null; status: string; event_type: string; customer_name: string }[]>(
    `SELECT
      r.id,
      r.reservation_number,
      r.party_size,
      r.preferred_date,
      r.alternate_date,
      r.tour_start_date,
      r.tour_end_date,
      r.status,
      r.event_type,
      c.name as customer_name
    FROM reservations r
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE r.status NOT IN ('booked', 'cancelled', 'expired')
      AND r.booking_id IS NULL
      AND (
        (r.preferred_date >= $1 AND r.preferred_date <= $2)
        OR (r.alternate_date >= $1 AND r.alternate_date <= $2)
        OR (r.tour_start_date >= $1 AND r.tour_start_date <= $2)
        OR (r.tour_end_date >= $1 AND r.tour_end_date <= $2)
      )
    ORDER BY r.preferred_date`,
    startDateStr, endDateStr
  );

  for (const reservation of reservations) {
    // Collect all relevant dates
    const dates = new Set<string>();

    if (reservation.preferred_date) {
      const d = new Date(reservation.preferred_date).toISOString().split('T')[0];
      if (d >= startDateStr && d <= endDateStr) dates.add(d);
    }
    if (reservation.alternate_date) {
      const d = new Date(reservation.alternate_date).toISOString().split('T')[0];
      if (d >= startDateStr && d <= endDateStr) dates.add(d);
    }
    if (reservation.tour_start_date) {
      const d = new Date(reservation.tour_start_date).toISOString().split('T')[0];
      if (d >= startDateStr && d <= endDateStr) dates.add(d);
    }
    if (reservation.tour_end_date) {
      const d = new Date(reservation.tour_end_date).toISOString().split('T')[0];
      if (d >= startDateStr && d <= endDateStr) dates.add(d);
    }

    for (const date of dates) {
      events.push({
        id: `reservation-${reservation.id}-${date}`,
        source: 'reservation',
        sourceId: reservation.id,
        title: reservation.customer_name || `Reservation ${reservation.reservation_number}`,
        date,
        status: reservation.status || 'pending',
        eventType: 'tentative',
        color: EVENT_COLORS.reservation,
        partySize: reservation.party_size,
        customerName: reservation.customer_name,
        link: `/admin/reservations/${reservation.reservation_number}`,
      });
    }
  }

  // 4. Fetch shared tours with spots remaining
  try {
    const sharedTours = await prisma.$queryRawUnsafe<{ id: number; tour_code: string; title: string; tour_date: Date | string; start_time: string | null; max_guests: number; current_guests: number; status: string; driver_id: number | null }[]>(
      `SELECT id, tour_code, title, tour_date, start_time, max_guests,
              current_guests, status, driver_id
       FROM shared_tours
       WHERE tour_date >= $1 AND tour_date <= $2
         AND status NOT IN ('cancelled', 'completed')
       ORDER BY tour_date, start_time`,
      startDateStr, endDateStr
    );

    for (const tour of sharedTours) {
      const date = tour.tour_date instanceof Date
        ? tour.tour_date.toISOString().split('T')[0]
        : String(tour.tour_date).split('T')[0];
      const spotsRemaining = (tour.max_guests || 14) - (tour.current_guests || 0);

      events.push({
        id: `shared-tour-${tour.id}`,
        source: 'shared_tour',
        sourceId: tour.id,
        title: `${tour.title} (${spotsRemaining} spots)`,
        date,
        startTime: tour.start_time || undefined,
        status: tour.status || 'scheduled',
        eventType: 'tentative',
        color: EVENT_COLORS.shared_tour,
        partySize: tour.current_guests || 0,
        link: `/admin/shared-tours/${tour.tour_code}`,
      });
    }
  } catch {
    // shared_tours table may not exist — skip gracefully
  }

  // 5. Fetch trip proposals (new system) with dates in range
  try {
    const tripProposals = await prisma.$queryRawUnsafe<{ id: number; proposal_number: string; trip_title: string; customer_name: string; start_date: Date | string; end_date: Date | string | null; party_size: number; status: string }[]>(
      `SELECT id, proposal_number, trip_title, customer_name, start_date, end_date,
              party_size, status
       FROM trip_proposals
       WHERE status NOT IN ('expired', 'declined', 'converted')
         AND (
           (start_date >= $1 AND start_date <= $2)
           OR (end_date >= $1 AND end_date <= $2)
           OR (start_date <= $1 AND COALESCE(end_date, start_date) >= $2)
         )
       ORDER BY start_date`,
      startDateStr, endDateStr
    );

    for (const tp of tripProposals) {
      const startDt = tp.start_date instanceof Date
        ? tp.start_date : new Date(tp.start_date);
      const endDt = tp.end_date
        ? (tp.end_date instanceof Date ? tp.end_date : new Date(tp.end_date))
        : startDt;
      const current = new Date(startDt);

      while (current <= endDt) {
        const date = current.toISOString().split('T')[0];
        if (date >= startDateStr && date <= endDateStr) {
          events.push({
            id: `trip-proposal-${tp.id}-${date}`,
            source: 'trip_proposal',
            sourceId: tp.id,
            title: tp.customer_name + (tp.trip_title ? ` — ${tp.trip_title}` : ''),
            date,
            status: tp.status || 'draft',
            eventType: 'tentative',
            color: EVENT_COLORS.trip_proposal,
            partySize: tp.party_size,
            customerName: tp.customer_name,
            link: `/admin/trip-proposals/${tp.id}`,
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }
  } catch {
    // trip_proposals table may not exist — skip gracefully
  }

  // Sort events by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Group events by date for easier consumption
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }
    eventsByDate[event.date].push(event);
  }

  return NextResponse.json({
    events,
    eventsByDate,
    meta: {
      year,
      month,
      startDate: startDateStr,
      endDate: endDateStr,
      totalEvents: events.length,
      sources: {
        proposals: events.filter(e => e.source === 'proposal').length,
        corporateRequests: events.filter(e => e.source === 'corporate_request').length,
        reservations: events.filter(e => e.source === 'reservation').length,
        sharedTours: events.filter(e => e.source === 'shared_tour').length,
        tripProposals: events.filter(e => e.source === 'trip_proposal').length,
      },
    },
  });
});
