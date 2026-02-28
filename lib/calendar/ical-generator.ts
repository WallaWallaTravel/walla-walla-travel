/**
 * iCalendar Generator
 *
 * Generates iCalendar (.ics) format for calendar feeds.
 * Follows RFC 5545 specification.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5545
 */

export interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  categories?: string[];
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  url?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT';
  }>;
  created?: Date;
  lastModified?: Date;
}

export interface ICalCalendar {
  name: string;
  description?: string;
  prodId: string;
  events: ICalEvent[];
  timezone?: string;
}

/**
 * Escape special characters in iCalendar text values
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Format a Date as iCalendar date-time (YYYYMMDDTHHMMSSZ)
 */
function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Format a Date as iCalendar date (YYYYMMDD)
 */
function _formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate())
  );
}

/**
 * Fold long lines according to RFC 5545 (max 75 octets per line)
 */
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) {
    return line;
  }

  const lines: string[] = [];
  let remaining = line;

  while (remaining.length > maxLen) {
    // First line gets full length, continuation lines get space prefix
    const cutAt = lines.length === 0 ? maxLen : maxLen - 1;
    lines.push(remaining.substring(0, cutAt));
    remaining = remaining.substring(cutAt);
  }

  if (remaining.length > 0) {
    lines.push(remaining);
  }

  // Join with CRLF and space for continuation
  return lines.join('\r\n ');
}

/**
 * Generate a single VEVENT component
 */
function generateEvent(event: ICalEvent): string {
  const lines: string[] = ['BEGIN:VEVENT'];

  lines.push(`UID:${event.uid}`);
  lines.push(`DTSTAMP:${formatDateTime(new Date())}`);
  lines.push(`DTSTART:${formatDateTime(event.dtstart)}`);
  lines.push(`DTEND:${formatDateTime(event.dtend)}`);
  lines.push(`SUMMARY:${escapeText(event.summary)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  if (event.categories && event.categories.length > 0) {
    lines.push(`CATEGORIES:${event.categories.map(escapeText).join(',')}`);
  }

  if (event.status) {
    lines.push(`STATUS:${event.status}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`);
  }

  if (event.attendees) {
    for (const attendee of event.attendees) {
      const role = attendee.role || 'REQ-PARTICIPANT';
      lines.push(`ATTENDEE;ROLE=${role};CN=${escapeText(attendee.name)}:mailto:${attendee.email}`);
    }
  }

  if (event.created) {
    lines.push(`CREATED:${formatDateTime(event.created)}`);
  }

  if (event.lastModified) {
    lines.push(`LAST-MODIFIED:${formatDateTime(event.lastModified)}`);
  }

  lines.push('END:VEVENT');

  return lines.map(foldLine).join('\r\n');
}

/**
 * Generate a complete iCalendar document
 */
export function generateICalendar(calendar: ICalCalendar): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${calendar.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
  ];

  if (calendar.description) {
    lines.push(`X-WR-CALDESC:${escapeText(calendar.description)}`);
  }

  if (calendar.timezone) {
    lines.push(`X-WR-TIMEZONE:${calendar.timezone}`);
  }

  // Add events
  for (const event of calendar.events) {
    lines.push(generateEvent(event));
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Create a booking event for iCalendar
 */
export function createBookingEvent(booking: {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  pickup_time: string;
  end_time?: string;
  party_size: number;
  status: string;
  driver_name?: string;
  vehicle_name?: string;
  pickup_location?: string;
}, baseUrl: string): ICalEvent {
  // Parse tour date and times
  const [year, month, day] = booking.tour_date.split('-').map(Number);
  const [startHour, startMinute] = (booking.pickup_time || '09:00').split(':').map(Number);
  const [endHour, endMinute] = (booking.end_time || '17:00').split(':').map(Number);

  const dtstart = new Date(Date.UTC(year, month - 1, day, startHour, startMinute));
  const dtend = new Date(Date.UTC(year, month - 1, day, endHour, endMinute));

  // Build description
  const descParts: string[] = [];
  descParts.push(`Booking: ${booking.booking_number}`);
  descParts.push(`Party Size: ${booking.party_size} guests`);
  descParts.push(`Status: ${booking.status}`);
  if (booking.driver_name) descParts.push(`Driver: ${booking.driver_name}`);
  if (booking.vehicle_name) descParts.push(`Vehicle: ${booking.vehicle_name}`);
  descParts.push(`View: ${baseUrl}/itinerary-builder/${booking.id}`);

  return {
    uid: `booking-${booking.id}@wallawalla.travel`,
    summary: `${booking.customer_name} - Wine Tour (${booking.party_size} guests)`,
    description: descParts.join('\\n'),
    dtstart,
    dtend,
    location: booking.pickup_location,
    categories: ['Wine Tour', 'Booking'],
    status: booking.status === 'confirmed' ? 'CONFIRMED' :
            booking.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE',
    url: `${baseUrl}/itinerary-builder/${booking.id}`,
  };
}

/**
 * Create a driver assignment event for iCalendar
 */
export function createDriverAssignmentEvent(booking: {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  pickup_time: string;
  end_time?: string;
  party_size: number;
  status: string;
  vehicle_name?: string;
  pickup_location?: string;
  dropoff_location?: string;
}, driverName: string, _baseUrl: string): ICalEvent {
  // Parse tour date and times
  const [year, month, day] = booking.tour_date.split('-').map(Number);
  const [startHour, startMinute] = (booking.pickup_time || '09:00').split(':').map(Number);
  const [endHour, endMinute] = (booking.end_time || '17:00').split(':').map(Number);

  const dtstart = new Date(Date.UTC(year, month - 1, day, startHour, startMinute));
  const dtend = new Date(Date.UTC(year, month - 1, day, endHour, endMinute));

  // Build description
  const descParts: string[] = [];
  descParts.push(`Booking: ${booking.booking_number}`);
  descParts.push(`Customer: ${booking.customer_name}`);
  descParts.push(`Party Size: ${booking.party_size} guests`);
  if (booking.vehicle_name) descParts.push(`Vehicle: ${booking.vehicle_name}`);
  if (booking.pickup_location) descParts.push(`Pickup: ${booking.pickup_location}`);
  if (booking.dropoff_location) descParts.push(`Dropoff: ${booking.dropoff_location}`);

  return {
    uid: `driver-${driverName.toLowerCase().replace(/\s/g, '-')}-booking-${booking.id}@wallawalla.travel`,
    summary: `Tour: ${booking.customer_name} (${booking.party_size})`,
    description: descParts.join('\\n'),
    dtstart,
    dtend,
    location: booking.pickup_location,
    categories: ['Tour Assignment', 'Driver Schedule'],
    status: booking.status === 'confirmed' ? 'CONFIRMED' :
            booking.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE',
  };
}
