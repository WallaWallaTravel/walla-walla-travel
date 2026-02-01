/**
 * Calendar Event Parser
 *
 * Parses Google Calendar events into booking records.
 * Handles various event title formats and extracts structured data.
 *
 * @module scripts/import/calendar-parser
 */

// ============================================================================
// Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  summary: string; // Event title
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
}

export interface ParsedBooking {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize: number;
  tourDate: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string;
  durationHours: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  wineries: string[];
  specialRequests?: string;
  driverNotes?: string;
  rawEvent: CalendarEvent;
  parseConfidence: 'high' | 'medium' | 'low';
  parseWarnings: string[];
}

export interface ParseResult {
  success: boolean;
  booking?: ParsedBooking;
  error?: string;
  needsManualReview: boolean;
}

// ============================================================================
// Parser Patterns
// ============================================================================

/**
 * Common patterns for extracting party size from event titles
 * Examples:
 * - "Smith Party - 6 guests"
 * - "Johnson (4 pax)"
 * - "Brown Family, 8 people"
 * - "Tour: Davis, 5"
 */
const PARTY_SIZE_PATTERNS = [
  /(\d+)\s*(?:guests?|pax|people|persons?)/i,
  /(?:party\s*(?:of|-)?\s*)(\d+)/i,
  /,\s*(\d+)\s*$/,
  /\((\d+)\)/,
  /for\s+(\d+)/i,
];

/**
 * Patterns to extract customer name from event titles
 */
const NAME_PATTERNS = [
  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:Party|Family|Group)/i,
  /^(?:Tour|Wine Tour|WT|Trip)[\s:-]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[\(\[\-,]/,
  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
];

/**
 * Winery name patterns (Walla Walla area)
 */
const KNOWN_WINERIES = [
  "L'Ecole No 41",
  'Pepper Bridge',
  'Leonetti Cellar',
  'Woodward Canyon',
  'Seven Hills',
  'Dunham Cellars',
  'Amavi Cellars',
  'Basel Cellars',
  'Saviah Cellars',
  'Long Shadows',
  'Sleight of Hand',
  'Va Piano',
  'Reininger',
  'Gramercy Cellars',
  'Beresan',
  'Foundry Vineyards',
  'Otis Kenyon',
  'Revelry Vintners',
  'Rotie Cellars',
  'Balboa Winery',
  'Charles Smith',
  'K Vintners',
  'Northstar',
  'Canoe Ridge',
  'Waterbrook',
  'Walla Walla Vintners',
];

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Extract party size from event title or description
 */
export function extractPartySize(text: string): number | null {
  for (const pattern of PARTY_SIZE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const size = parseInt(match[1], 10);
      if (size > 0 && size <= 50) {
        // Reasonable party size
        return size;
      }
    }
  }
  return null;
}

/**
 * Extract customer name from event title
 */
export function extractCustomerName(title: string): string | null {
  // Remove common prefixes
  const cleanTitle = title
    .replace(/^(?:Wine Tour|Tour|WT|Trip)[\s:-]*/i, '')
    .replace(/\s*-\s*\d+\s*(?:guests?|pax|people)?\s*$/i, '')
    .trim();

  for (const pattern of NAME_PATTERNS) {
    const match = cleanTitle.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Validate it looks like a name (not a winery or location)
      if (name.length >= 2 && !isKnownWinery(name)) {
        return name;
      }
    }
  }

  // Fallback: use first word if it looks like a name
  const firstWord = cleanTitle.split(/[\s\-\(\[,]/)[0];
  if (firstWord && /^[A-Z][a-z]+$/.test(firstWord) && firstWord.length >= 2) {
    return firstWord;
  }

  return null;
}

/**
 * Check if text matches a known winery
 */
function isKnownWinery(text: string): boolean {
  const lower = text.toLowerCase();
  return KNOWN_WINERIES.some((w) => w.toLowerCase().includes(lower) || lower.includes(w.toLowerCase()));
}

/**
 * Extract wineries mentioned in description
 */
export function extractWineries(description: string): string[] {
  const found: string[] = [];

  for (const winery of KNOWN_WINERIES) {
    if (description.toLowerCase().includes(winery.toLowerCase())) {
      found.push(winery);
    }
  }

  // Also look for generic patterns like "Winery 1:", "Stop 1:", etc.
  const stopPatterns = description.match(/(?:stop|winery|visit)\s*\d+[\s:-]*([A-Za-z\s']+)/gi);
  if (stopPatterns) {
    for (const match of stopPatterns) {
      const name = match.replace(/(?:stop|winery|visit)\s*\d+[\s:-]*/i, '').trim();
      if (name && !found.includes(name)) {
        found.push(name);
      }
    }
  }

  return found;
}

/**
 * Extract phone number from text
 */
export function extractPhone(text: string): string | null {
  const phonePattern = /(?:\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/;
  const match = text.match(phonePattern);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return null;
}

/**
 * Extract email from text
 */
export function extractEmail(text: string): string | null {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailPattern);
  return match ? match[0] : null;
}

/**
 * Parse time string to HH:MM format
 */
function parseTime(dateTimeStr: string | undefined, dateStr: string | undefined): string {
  if (dateTimeStr) {
    const date = new Date(dateTimeStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  // All-day event, default to 10:00 AM
  return '10:00';
}

/**
 * Parse date to ISO format
 */
function parseDate(dateTimeStr: string | undefined, dateStr: string | undefined): string {
  if (dateTimeStr) {
    return new Date(dateTimeStr).toISOString().split('T')[0];
  }
  if (dateStr) {
    return dateStr;
  }
  throw new Error('No date found in event');
}

/**
 * Calculate duration in hours between two times
 */
function calculateDuration(
  startDateTime: string | undefined,
  endDateTime: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
): number {
  if (startDateTime && endDateTime) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10; // Round to 1 decimal
  }
  // All-day event, default to 6 hours
  return 6;
}

/**
 * Extract driver notes from description
 */
export function extractDriverNotes(description: string): string | null {
  const patterns = [
    /driver\s*notes?[\s:-]*(.+?)(?:\n|$)/i,
    /notes?\s*for\s*driver[\s:-]*(.+?)(?:\n|$)/i,
    /special\s*instructions?[\s:-]*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract special requests from description
 */
export function extractSpecialRequests(description: string): string | null {
  const patterns = [
    /special\s*requests?[\s:-]*(.+?)(?:\n|$)/i,
    /requests?[\s:-]*(.+?)(?:\n|$)/i,
    /accessibility[\s:-]*(.+?)(?:\n|$)/i,
    /dietary[\s:-]*(.+?)(?:\n|$)/i,
  ];

  const requests: string[] = [];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      requests.push(match[1].trim());
    }
  }

  return requests.length > 0 ? requests.join('; ') : null;
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse a Google Calendar event into a booking record
 */
export function parseCalendarEvent(event: CalendarEvent): ParseResult {
  const warnings: string[] = [];

  try {
    // Extract customer name
    const customerName = extractCustomerName(event.summary);
    if (!customerName) {
      return {
        success: false,
        error: `Could not extract customer name from: "${event.summary}"`,
        needsManualReview: true,
      };
    }

    // Extract party size
    const searchText = `${event.summary} ${event.description || ''}`;
    let partySize = extractPartySize(searchText);
    if (!partySize) {
      partySize = 2; // Default to 2 if not specified
      warnings.push('Party size not found, defaulting to 2');
    }

    // Parse dates and times
    const tourDate = parseDate(event.start.dateTime, event.start.date);
    const startTime = parseTime(event.start.dateTime, event.start.date);
    const endTime = parseTime(event.end.dateTime, event.end.date);
    const durationHours = calculateDuration(
      event.start.dateTime,
      event.end.dateTime,
      event.start.date,
      event.end.date
    );

    // Extract contact info from description or attendees
    let customerEmail: string | undefined;
    let customerPhone: string | undefined;

    if (event.description) {
      customerEmail = extractEmail(event.description) || undefined;
      customerPhone = extractPhone(event.description) || undefined;
    }

    // Check attendees for customer email
    if (!customerEmail && event.attendees) {
      const customer = event.attendees.find(
        (a) => !a.email.includes('nwtouring.com') && !a.email.includes('wallawalla.travel')
      );
      if (customer) {
        customerEmail = customer.email;
      }
    }

    // Extract wineries from description
    const wineries = event.description ? extractWineries(event.description) : [];

    // Extract other info
    const driverNotes = event.description ? extractDriverNotes(event.description) : null;
    const specialRequests = event.description ? extractSpecialRequests(event.description) : null;

    // Determine parse confidence
    let parseConfidence: 'high' | 'medium' | 'low' = 'high';
    if (warnings.length > 0) {
      parseConfidence = 'medium';
    }
    if (!customerEmail && !customerPhone) {
      parseConfidence = 'low';
      warnings.push('No contact information found');
    }

    const booking: ParsedBooking = {
      customerName,
      customerEmail,
      customerPhone,
      partySize,
      tourDate,
      startTime,
      endTime,
      durationHours,
      pickupLocation: event.location || undefined,
      wineries,
      specialRequests: specialRequests || undefined,
      driverNotes: driverNotes || undefined,
      rawEvent: event,
      parseConfidence,
      parseWarnings: warnings,
    };

    return {
      success: true,
      booking,
      needsManualReview: parseConfidence === 'low',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      needsManualReview: true,
    };
  }
}

/**
 * Validate a parsed booking has minimum required fields
 */
export function validateParsedBooking(booking: ParsedBooking): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!booking.customerName || booking.customerName.length < 2) {
    errors.push('Customer name is required');
  }

  if (booking.partySize < 1 || booking.partySize > 50) {
    errors.push('Party size must be between 1 and 50');
  }

  if (!booking.tourDate || !/^\d{4}-\d{2}-\d{2}$/.test(booking.tourDate)) {
    errors.push('Valid tour date is required');
  }

  if (booking.durationHours < 1 || booking.durationHours > 24) {
    errors.push('Duration must be between 1 and 24 hours');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format a parsed booking for display
 */
export function formatBookingPreview(booking: ParsedBooking): string {
  const lines = [
    `Customer: ${booking.customerName}`,
    `Date: ${booking.tourDate}`,
    `Time: ${booking.startTime} - ${booking.endTime} (${booking.durationHours} hours)`,
    `Party Size: ${booking.partySize}`,
  ];

  if (booking.customerEmail) {
    lines.push(`Email: ${booking.customerEmail}`);
  }

  if (booking.customerPhone) {
    lines.push(`Phone: ${booking.customerPhone}`);
  }

  if (booking.pickupLocation) {
    lines.push(`Pickup: ${booking.pickupLocation}`);
  }

  if (booking.wineries.length > 0) {
    lines.push(`Wineries: ${booking.wineries.join(', ')}`);
  }

  if (booking.parseWarnings.length > 0) {
    lines.push(`Warnings: ${booking.parseWarnings.join(', ')}`);
  }

  return lines.join('\n');
}
