/**
 * iCal Feed API
 *
 * Provides iCalendar feeds for calendar subscription.
 *
 * Endpoints:
 * - /api/calendar/feed/bookings?token=xxx - All confirmed bookings
 * - /api/calendar/feed/driver/[driverId]?token=xxx - Driver's assigned tours
 * - /api/calendar/feed/all?token=xxx - All events (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  generateICalendar,
  createBookingEvent,
  createDriverAssignmentEvent,
  ICalEvent,
} from '@/lib/calendar/ical-generator';
import { logger } from '@/lib/logger';

// Token validation - in production this should use cryptographic tokens
// For now, we use a simple lookup against user tokens stored in database
async function validateFeedToken(token: string): Promise<{
  valid: boolean;
  userId?: number;
  role?: string;
  driverId?: number;
}> {
  if (!token) {
    return { valid: false };
  }

  try {
    // Look up the feed token in the database
    // For simplicity, we'll use a hash of user email + secret as token
    // In production, use proper token generation and storage
    const result = await query(
      `SELECT id, role FROM users
       WHERE MD5(CONCAT(email, $1)) = $2 AND is_active = true`,
      [process.env.CALENDAR_FEED_SECRET || 'calendar-feed-secret', token]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return {
        valid: true,
        userId: user.id,
        role: user.role,
        driverId: user.role === 'driver' ? user.id : undefined,
      };
    }

    return { valid: false };
  } catch (error) {
    logger.error('Error validating feed token', { error });
    return { valid: false };
  }
}

// Get base URL for links
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // Validate token
  const auth = await validateFeedToken(token || '');
  if (!auth.valid) {
    return new NextResponse('Unauthorized - Invalid or missing token', { status: 401 });
  }

  const baseUrl = getBaseUrl(request);
  const feedType = path[0];

  try {
    let events: ICalEvent[] = [];
    let calendarName = 'Walla Walla Travel Calendar';
    let calendarDesc = 'Wine tour bookings and schedule';

    switch (feedType) {
      case 'bookings': {
        // All confirmed bookings (admin only)
        if (auth.role !== 'admin') {
          return new NextResponse('Forbidden - Admin access required', { status: 403 });
        }

        calendarName = 'WWT Bookings';
        calendarDesc = 'All confirmed wine tour bookings';

        const bookingsResult = await query(
          `SELECT
            b.id, b.booking_number, b.tour_date, b.pickup_time, b.end_time,
            b.party_size, b.status, b.pickup_location, b.dropoff_location,
            c.name as customer_name,
            v.name as vehicle_name,
            d.name as driver_name
          FROM bookings b
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          LEFT JOIN users d ON b.driver_id = d.id
          WHERE b.status IN ('confirmed', 'pending')
            AND b.tour_date >= CURRENT_DATE - INTERVAL '30 days'
            AND b.tour_date <= CURRENT_DATE + INTERVAL '90 days'
          ORDER BY b.tour_date`,
          []
        );

        events = bookingsResult.rows.map(booking =>
          createBookingEvent({
            id: booking.id,
            booking_number: booking.booking_number,
            customer_name: booking.customer_name || 'Guest',
            tour_date: booking.tour_date.toISOString().split('T')[0],
            pickup_time: booking.pickup_time || '09:00',
            end_time: booking.end_time || '17:00',
            party_size: booking.party_size,
            status: booking.status,
            driver_name: booking.driver_name,
            vehicle_name: booking.vehicle_name,
            pickup_location: booking.pickup_location,
          }, baseUrl)
        );
        break;
      }

      case 'driver': {
        // Driver's assigned tours
        const driverId = path[1] ? parseInt(path[1], 10) : auth.driverId;

        if (!driverId) {
          return new NextResponse('Driver ID required', { status: 400 });
        }

        // Verify access - driver can only see their own, admin can see any
        if (auth.role !== 'admin' && auth.driverId !== driverId) {
          return new NextResponse('Forbidden - Cannot access other driver schedules', { status: 403 });
        }

        // Get driver name
        const driverResult = await query(
          'SELECT name FROM users WHERE id = $1',
          [driverId]
        );
        const driverName = driverResult.rows[0]?.name || 'Driver';

        calendarName = `${driverName} - Tour Schedule`;
        calendarDesc = `Assigned wine tours for ${driverName}`;

        const bookingsResult = await query(
          `SELECT
            b.id, b.booking_number, b.tour_date, b.pickup_time, b.end_time,
            b.party_size, b.status, b.pickup_location, b.dropoff_location,
            c.name as customer_name,
            v.name as vehicle_name
          FROM bookings b
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.driver_id = $1
            AND b.status IN ('confirmed', 'pending')
            AND b.tour_date >= CURRENT_DATE - INTERVAL '7 days'
            AND b.tour_date <= CURRENT_DATE + INTERVAL '60 days'
          ORDER BY b.tour_date`,
          [driverId]
        );

        events = bookingsResult.rows.map(booking =>
          createDriverAssignmentEvent({
            id: booking.id,
            booking_number: booking.booking_number,
            customer_name: booking.customer_name || 'Guest',
            tour_date: booking.tour_date.toISOString().split('T')[0],
            pickup_time: booking.pickup_time || '09:00',
            end_time: booking.end_time || '17:00',
            party_size: booking.party_size,
            status: booking.status,
            vehicle_name: booking.vehicle_name,
            pickup_location: booking.pickup_location,
            dropoff_location: booking.dropoff_location,
          }, driverName, baseUrl)
        );
        break;
      }

      case 'all': {
        // All events including tentative (admin only)
        if (auth.role !== 'admin') {
          return new NextResponse('Forbidden - Admin access required', { status: 403 });
        }

        calendarName = 'WWT Complete Calendar';
        calendarDesc = 'All bookings, proposals, and requests';

        // Get confirmed bookings
        const bookingsResult = await query(
          `SELECT
            b.id, b.booking_number, b.tour_date, b.pickup_time, b.end_time,
            b.party_size, b.status, b.pickup_location,
            c.name as customer_name,
            v.name as vehicle_name,
            d.name as driver_name
          FROM bookings b
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          LEFT JOIN users d ON b.driver_id = d.id
          WHERE b.tour_date >= CURRENT_DATE - INTERVAL '30 days'
            AND b.tour_date <= CURRENT_DATE + INTERVAL '90 days'
          ORDER BY b.tour_date`,
          []
        );

        events = bookingsResult.rows.map(booking =>
          createBookingEvent({
            id: booking.id,
            booking_number: booking.booking_number,
            customer_name: booking.customer_name || 'Guest',
            tour_date: booking.tour_date.toISOString().split('T')[0],
            pickup_time: booking.pickup_time || '09:00',
            end_time: booking.end_time || '17:00',
            party_size: booking.party_size,
            status: booking.status,
            driver_name: booking.driver_name,
            vehicle_name: booking.vehicle_name,
            pickup_location: booking.pickup_location,
          }, baseUrl)
        );

        // Add tentative events from proposals
        const proposalsResult = await query(
          `SELECT id, proposal_number, client_name, service_items, status
           FROM proposals
           WHERE status IN ('sent', 'viewed', 'accepted')
             AND service_items IS NOT NULL`,
          []
        );

        for (const proposal of proposalsResult.rows) {
          const serviceItems = proposal.service_items;
          if (!Array.isArray(serviceItems)) continue;

          for (const item of serviceItems) {
            if (item.date) {
              const [year, month, day] = item.date.split('T')[0].split('-').map(Number);
              const dtstart = new Date(Date.UTC(year, month - 1, day, 9, 0));
              const dtend = new Date(Date.UTC(year, month - 1, day, 17, 0));

              events.push({
                uid: `proposal-${proposal.id}-${item.date}@wallawalla.travel`,
                summary: `[PROPOSAL] ${proposal.client_name}${item.party_size ? ` (${item.party_size})` : ''}`,
                description: `Proposal: ${proposal.proposal_number}\\nStatus: ${proposal.status}`,
                dtstart,
                dtend,
                categories: ['Proposal', 'Tentative'],
                status: 'TENTATIVE',
                url: `${baseUrl}/admin/proposals/${proposal.id}`,
              });
            }
          }
        }
        break;
      }

      default:
        return new NextResponse('Invalid feed type', { status: 400 });
    }

    // Generate iCalendar content
    const icalContent = generateICalendar({
      name: calendarName,
      description: calendarDesc,
      prodId: '-//Walla Walla Travel//Calendar Feed//EN',
      events,
      timezone: 'America/Los_Angeles',
    });

    // Return as iCalendar file
    return new NextResponse(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${feedType}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Error generating calendar feed', { error, feedType });
    return new NextResponse('Internal server error', { status: 500 });
  }
}
