/**
 * Google Calendar Historical Tour Import Script
 *
 * Imports historical tour data from Google Calendar into the bookings table.
 * Supports dry-run mode for previewing imports before committing.
 *
 * @module scripts/import/google-calendar-import
 *
 * Prerequisites:
 * 1. Create Google Cloud Project with Calendar API enabled
 * 2. Create OAuth2 credentials (Desktop app)
 * 3. Download credentials.json to scripts/import/
 * 4. Run script - first run will open browser for auth
 *
 * Usage:
 *   npx tsx scripts/import/google-calendar-import.ts [options]
 *
 * Options:
 *   --dry-run        Preview imports without committing to database
 *   --verbose        Show detailed output for each event
 *   --calendar-id    Specify calendar ID (default: primary)
 *   --start-date     Start date for import (default: 18 months ago)
 *   --end-date       End date for import (default: today)
 *   --limit          Maximum number of events to process
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { google, calendar_v3 } from 'googleapis';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  CalendarEvent,
  ParsedBooking,
  parseCalendarEvent,
  validateParsedBooking,
  formatBookingPreview,
} from './calendar-parser';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ============================================================================
// Configuration
// ============================================================================

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

function getArgValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

const CALENDAR_ID = getArgValue('--calendar-id') || 'primary';
const LIMIT = getArgValue('--limit') ? parseInt(getArgValue('--limit')!, 10) : undefined;

// Default date range: 18 months ago to today
const defaultStartDate = new Date();
defaultStartDate.setMonth(defaultStartDate.getMonth() - 18);

const START_DATE = getArgValue('--start-date')
  ? new Date(getArgValue('--start-date')!)
  : defaultStartDate;
const END_DATE = getArgValue('--end-date') ? new Date(getArgValue('--end-date')!) : new Date();

// ============================================================================
// OAuth2 Authentication
// ============================================================================

async function authorize(): Promise<ReturnType<typeof google.calendar>> {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`
Credentials file not found at: ${CREDENTIALS_PATH}

To set up Google Calendar API access:

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Application type: Desktop app)
5. Download the credentials JSON file
6. Save it as: ${CREDENTIALS_PATH}

Then run this script again.
`);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have a saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
  } else {
    // Get new token
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\nAuthorize this app by visiting this URL:\n');
    console.log(authUrl);
    console.log('\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise<string>((resolve) => {
      rl.question('Enter the authorization code: ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save token for future runs
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('\nToken saved for future use.\n');
  }

  return google.calendar({ version: 'v3', auth: oAuth2Client });
}

// ============================================================================
// Calendar Event Fetching
// ============================================================================

async function fetchCalendarEvents(
  calendar: calendar_v3.Calendar
): Promise<calendar_v3.Schema$Event[]> {
  console.log(`\nFetching events from ${START_DATE.toISOString().split('T')[0]} to ${END_DATE.toISOString().split('T')[0]}...\n`);

  const allEvents: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: START_DATE.toISOString(),
      timeMax: END_DATE.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });

    if (response.data.items) {
      allEvents.push(...response.data.items);
    }

    pageToken = response.data.nextPageToken || undefined;

    if (VERBOSE) {
      console.log(`  Fetched ${allEvents.length} events so far...`);
    }
  } while (pageToken);

  console.log(`Total events found: ${allEvents.length}\n`);

  return allEvents;
}

/**
 * Filter events to only tour-related ones
 */
function filterTourEvents(events: calendar_v3.Schema$Event[]): calendar_v3.Schema$Event[] {
  const tourKeywords = [
    'tour',
    'wine',
    'party',
    'guests',
    'pax',
    'pickup',
    'winery',
    'tasting',
    'group',
  ];

  const excludeKeywords = ['meeting', 'call', 'interview', 'internal', 'staff', 'office'];

  return events.filter((event) => {
    const text = `${event.summary || ''} ${event.description || ''}`.toLowerCase();

    // Exclude internal events
    if (excludeKeywords.some((keyword) => text.includes(keyword))) {
      return false;
    }

    // Include if it matches tour keywords
    if (tourKeywords.some((keyword) => text.includes(keyword))) {
      return true;
    }

    // Include events with external attendees (likely customers)
    if (event.attendees?.some((a: { email?: string | null }) => !a.email?.includes('nwtouring.com'))) {
      return true;
    }

    return false;
  });
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Generate a unique booking number
 */
async function generateBookingNumber(): Promise<string> {
  const result = await pool.query(
    `SELECT booking_number FROM bookings
     WHERE booking_number LIKE 'HIST-%'
     ORDER BY booking_number DESC LIMIT 1`
  );

  let nextNum = 1;
  if (result.rows.length > 0) {
    const lastNum = parseInt(result.rows[0].booking_number.replace('HIST-', ''), 10);
    nextNum = lastNum + 1;
  }

  return `HIST-${nextNum.toString().padStart(5, '0')}`;
}

/**
 * Check if a booking already exists for this event
 */
async function bookingExists(event: CalendarEvent): Promise<boolean> {
  // Check by date + customer name pattern
  const result = await pool.query(
    `SELECT id FROM bookings
     WHERE tour_date = $1
       AND (customer_name ILIKE $2 OR booking_source = 'calendar_import')
     LIMIT 1`,
    [event.start.date || event.start.dateTime?.split('T')[0], `%${event.summary?.split(/[\s\-\(]/)[0]}%`]
  );

  return result.rows.length > 0;
}

/**
 * Insert a booking record
 */
async function insertBooking(booking: ParsedBooking, calendarEventId: string): Promise<number> {
  const bookingNumber = await generateBookingNumber();

  // Ensure required fields have values
  const customerEmail = booking.customerEmail || `calendar-import-${Date.now()}@historical.local`;
  // Cap party size to 14 (database check constraint), store original in notes if larger
  const partySizeForDb = Math.min(booking.partySize, 14);
  const partySizeNote = booking.partySize > 14
    ? `Original party size: ${booking.partySize}. `
    : '';

  const result = await pool.query(
    `INSERT INTO bookings (
      booking_number,
      customer_name,
      customer_email,
      customer_phone,
      party_size,
      tour_date,
      start_time,
      end_time,
      duration_hours,
      pickup_location,
      special_requests,
      base_price,
      total_price,
      deposit_amount,
      final_payment_amount,
      status,
      booking_source,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $12, $13, $14, 'completed', 'calendar_import',
      NOW(), NOW()
    ) RETURNING id`,
    [
      bookingNumber,
      booking.customerName,
      customerEmail,
      booking.customerPhone || null,
      partySizeForDb,
      booking.tourDate,
      booking.startTime,
      booking.endTime,
      booking.durationHours,
      booking.pickupLocation || null,
      partySizeNote + (booking.specialRequests || ''),
      0, // base_price - historical data, no price
      0, // deposit_amount
      0, // final_payment_amount
    ]
  );

  // Store the calendar event ID in a metadata field or notes
  // Note: booking_timeline.id doesn't have autoincrement, so we generate it manually
  const nextIdResult = await pool.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM booking_timeline`);
  const nextId = nextIdResult.rows[0].next_id;

  await pool.query(
    `INSERT INTO booking_timeline (
      id, booking_id, event_type, event_description, event_data, created_at
    ) VALUES ($1, $2, 'calendar_import', 'Imported from Google Calendar', $3, NOW())`,
    [
      nextId,
      result.rows[0].id,
      JSON.stringify({
        calendar_event_id: calendarEventId,
        import_date: new Date().toISOString(),
        parse_confidence: booking.parseConfidence,
        warnings: booking.parseWarnings,
      }),
    ]
  );

  return result.rows[0].id;
}

// ============================================================================
// Import Statistics
// ============================================================================

interface ImportStats {
  totalEvents: number;
  tourEvents: number;
  alreadyImported: number;
  successfulImports: number;
  failedParses: number;
  needsReview: number;
  errors: Array<{ event: string; error: string }>;
  reviewQueue: Array<{ event: string; reason: string }>;
}

// ============================================================================
// Main Import Logic
// ============================================================================

async function runImport() {
  console.log('='.repeat(70));
  console.log('  Google Calendar Historical Tour Import');
  console.log('='.repeat(70));

  if (DRY_RUN) {
    console.log('\n  DRY RUN MODE - No changes will be made to the database\n');
  }

  const stats: ImportStats = {
    totalEvents: 0,
    tourEvents: 0,
    alreadyImported: 0,
    successfulImports: 0,
    failedParses: 0,
    needsReview: 0,
    errors: [],
    reviewQueue: [],
  };

  try {
    // Authenticate and get calendar client
    const calendar = await authorize();

    // Fetch events
    const allEvents = await fetchCalendarEvents(calendar);
    stats.totalEvents = allEvents.length;

    // Filter to tour-related events
    const tourEvents = filterTourEvents(allEvents);
    stats.tourEvents = tourEvents.length;

    console.log(`Filtered to ${tourEvents.length} tour-related events\n`);

    // Apply limit if specified
    const eventsToProcess = LIMIT ? tourEvents.slice(0, LIMIT) : tourEvents;

    // Process each event
    for (let i = 0; i < eventsToProcess.length; i++) {
      const event = eventsToProcess[i];
      const eventSummary = event.summary || 'Untitled Event';

      if (VERBOSE) {
        console.log(`[${i + 1}/${eventsToProcess.length}] Processing: ${eventSummary}`);
      }

      // Convert to our CalendarEvent type
      const calendarEvent: CalendarEvent = {
        id: event.id || '',
        summary: event.summary || '',
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
          timeZone: event.end?.timeZone || undefined,
        },
        attendees: event.attendees?.map((a: { email?: string | null; displayName?: string | null; responseStatus?: string | null }) => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || undefined,
        })),
        creator: event.creator
          ? {
              email: event.creator.email || '',
              displayName: event.creator.displayName || undefined,
            }
          : undefined,
      };

      // Check if already imported
      if (await bookingExists(calendarEvent)) {
        stats.alreadyImported++;
        if (VERBOSE) {
          console.log(`  -> Already imported, skipping`);
        }
        continue;
      }

      // Parse the event
      const parseResult = parseCalendarEvent(calendarEvent);

      if (!parseResult.success || !parseResult.booking) {
        stats.failedParses++;
        stats.errors.push({
          event: eventSummary,
          error: parseResult.error || 'Unknown parse error',
        });
        if (VERBOSE) {
          console.log(`  -> Parse failed: ${parseResult.error}`);
        }
        continue;
      }

      // Validate the parsed booking
      const validation = validateParsedBooking(parseResult.booking);
      if (!validation.valid) {
        stats.failedParses++;
        stats.errors.push({
          event: eventSummary,
          error: validation.errors.join(', '),
        });
        if (VERBOSE) {
          console.log(`  -> Validation failed: ${validation.errors.join(', ')}`);
        }
        continue;
      }

      // Check if needs manual review
      if (parseResult.needsManualReview) {
        stats.needsReview++;
        stats.reviewQueue.push({
          event: eventSummary,
          reason: parseResult.booking.parseWarnings.join(', '),
        });
        if (VERBOSE) {
          console.log(`  -> Added to review queue: ${parseResult.booking.parseWarnings.join(', ')}`);
        }
      }

      // Insert into database (unless dry run)
      if (!DRY_RUN) {
        try {
          const bookingId = await insertBooking(parseResult.booking, calendarEvent.id);
          stats.successfulImports++;
          if (VERBOSE) {
            console.log(`  -> Imported as booking #${bookingId}`);
          }
        } catch (error) {
          stats.errors.push({
            event: eventSummary,
            error: error instanceof Error ? error.message : 'Database error',
          });
          if (VERBOSE) {
            console.log(`  -> Database error: ${error}`);
          }
        }
      } else {
        stats.successfulImports++;
        if (VERBOSE) {
          console.log(`  -> Would import:`);
          console.log(formatBookingPreview(parseResult.booking).split('\n').map((l) => `       ${l}`).join('\n'));
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('  Import Summary');
    console.log('='.repeat(70));
    console.log(`
  Total calendar events:  ${stats.totalEvents}
  Tour-related events:    ${stats.tourEvents}
  Already imported:       ${stats.alreadyImported}
  Successfully imported:  ${stats.successfulImports}
  Failed to parse:        ${stats.failedParses}
  Needs manual review:    ${stats.needsReview}
`);

    if (stats.errors.length > 0) {
      console.log('  Errors:');
      for (const err of stats.errors.slice(0, 10)) {
        console.log(`    - ${err.event}: ${err.error}`);
      }
      if (stats.errors.length > 10) {
        console.log(`    ... and ${stats.errors.length - 10} more`);
      }
      console.log('');
    }

    if (stats.reviewQueue.length > 0) {
      console.log('  Manual Review Queue:');
      for (const item of stats.reviewQueue.slice(0, 10)) {
        console.log(`    - ${item.event}: ${item.reason}`);
      }
      if (stats.reviewQueue.length > 10) {
        console.log(`    ... and ${stats.reviewQueue.length - 10} more`);
      }
      console.log('');
    }

    if (DRY_RUN) {
      console.log('  Run without --dry-run to apply these changes.\n');
    }

    console.log('  Done!\n');
  } catch (error) {
    console.error('\n  Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import
runImport();
