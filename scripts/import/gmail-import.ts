/**
 * Gmail Historical Data Import Script
 *
 * Imports tour-related emails from Gmail to enrich booking records.
 * Extracts booking confirmations, customer communications, and special requests.
 *
 * @module scripts/import/gmail-import
 *
 * Prerequisites:
 * 1. Create Google Cloud Project with Gmail API enabled
 * 2. Create OAuth2 credentials (Desktop app)
 * 3. Download credentials.json to scripts/import/
 * 4. Run script - first run will open browser for auth
 *
 * Usage:
 *   npx tsx scripts/import/gmail-import.ts [options]
 *
 * Options:
 *   --dry-run        Preview matches without updating database
 *   --verbose        Show detailed output for each email
 *   --start-date     Start date for search (default: 18 months ago)
 *   --end-date       End date for search (default: today)
 *   --limit          Maximum number of emails to process
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Pool } from 'pg';
import { google, gmail_v1 } from 'googleapis';

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
const GMAIL_TOKEN_PATH = path.join(__dirname, 'gmail-token.json');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

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

const LIMIT = getArgValue('--limit') ? parseInt(getArgValue('--limit')!, 10) : 500;

// Default date range: 18 months ago to today
const defaultStartDate = new Date();
defaultStartDate.setMonth(defaultStartDate.getMonth() - 18);

const START_DATE = getArgValue('--start-date') || defaultStartDate.toISOString().split('T')[0];
const END_DATE = getArgValue('--end-date') || new Date().toISOString().split('T')[0];

// ============================================================================
// Types
// ============================================================================

interface EmailRecord {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  snippet: string;
  body: string;
  labels: string[];
}

interface BookingMatch {
  booking_id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  tour_date: string;
  match_confidence: 'high' | 'medium' | 'low';
  match_reason: string;
}

interface ImportStats {
  emailsProcessed: number;
  tourRelatedEmails: number;
  matchedToBookings: number;
  unmatchedEmails: number;
  duplicatesSkipped: number;
  errors: Array<{ email: string; error: string }>;
}

// ============================================================================
// OAuth2 Authentication
// ============================================================================

async function authorize(): Promise<ReturnType<typeof google.gmail>> {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`
Credentials file not found at: ${CREDENTIALS_PATH}

To set up Gmail API access:

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable the Gmail API
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
  if (fs.existsSync(GMAIL_TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(GMAIL_TOKEN_PATH, 'utf-8'));
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
    fs.writeFileSync(GMAIL_TOKEN_PATH, JSON.stringify(tokens));
    console.log('\nToken saved for future use.\n');
  }

  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

// ============================================================================
// Email Fetching and Parsing
// ============================================================================

/**
 * Build Gmail search query for tour-related emails
 */
function buildSearchQuery(): string {
  const terms = [
    'subject:(tour OR booking OR confirmation OR reservation OR winery)',
    `after:${START_DATE.replace(/-/g, '/')}`,
    `before:${END_DATE.replace(/-/g, '/')}`,
    '-category:social',
    '-category:promotions',
  ];

  return terms.join(' ');
}

/**
 * Fetch emails from Gmail
 */
async function fetchEmails(gmail: gmail_v1.Gmail): Promise<gmail_v1.Schema$Message[]> {
  console.log(`\nSearching emails from ${START_DATE} to ${END_DATE}...\n`);

  const query = buildSearchQuery();
  if (VERBOSE) {
    console.log(`Search query: ${query}\n`);
  }

  const allMessages: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(100, LIMIT - allMessages.length),
      pageToken,
    });

    if (response.data.messages) {
      allMessages.push(...response.data.messages);
    }

    pageToken = response.data.nextPageToken || undefined;

    if (VERBOSE) {
      console.log(`  Fetched ${allMessages.length} messages so far...`);
    }
  } while (pageToken && allMessages.length < LIMIT);

  console.log(`Total messages found: ${allMessages.length}\n`);

  return allMessages.slice(0, LIMIT);
}

/**
 * Parse email message to extract relevant data
 */
async function parseEmail(gmail: gmail_v1.Gmail, messageId: string): Promise<EmailRecord | null> {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const message = response.data;
    if (!message.payload) return null;

    // Extract headers
    const headers = message.payload.headers || [];
    const getHeader = (name: string): string => {
      const header = headers.find((h: { name?: string | null; value?: string | null }) => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || '';
    };

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const dateStr = getHeader('Date');

    // Extract body
    let body = '';
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }

    return {
      id: messageId,
      threadId: message.threadId || '',
      subject,
      from,
      to,
      date: new Date(dateStr),
      snippet: message.snippet || '',
      body,
      labels: message.labelIds || [],
    };
  } catch (error) {
    console.error(`Error parsing email ${messageId}:`, error);
    return null;
  }
}

// ============================================================================
// Booking Matching
// ============================================================================

/**
 * Extract email address from "Name <email>" format
 */
function extractEmail(fromField: string): string {
  const match = fromField.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  return fromField.toLowerCase().trim();
}

/**
 * Extract name from "Name <email>" format
 */
function extractName(fromField: string): string {
  const match = fromField.match(/^([^<]+)/);
  if (match) return match[1].trim().replace(/"/g, '');
  return fromField.split('@')[0];
}

/**
 * Find booking that matches this email
 */
async function findMatchingBooking(email: EmailRecord): Promise<BookingMatch | null> {
  const senderEmail = extractEmail(email.from);
  const senderName = extractName(email.from);

  // First try: exact email match
  let result = await pool.query<{
    id: number;
    booking_number: string;
    customer_name: string;
    customer_email: string;
    tour_date: string;
  }>(
    `SELECT id, booking_number, customer_name, customer_email, tour_date::text
     FROM bookings
     WHERE LOWER(customer_email) = $1
       AND tour_date >= $2::date - INTERVAL '30 days'
       AND tour_date <= $2::date + INTERVAL '30 days'
     ORDER BY ABS(tour_date - $2::date)
     LIMIT 1`,
    [senderEmail, email.date.toISOString().split('T')[0]]
  );

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      booking_id: row.id,
      booking_number: row.booking_number,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      tour_date: row.tour_date,
      match_confidence: 'high',
      match_reason: 'Exact email match',
    };
  }

  // Second try: name match in subject or body
  const searchText = `${email.subject} ${email.body}`.toLowerCase();
  const dateMatch = searchText.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})|\w+\s+(\d{1,2}),?\s+(\d{4})/
  );

  result = await pool.query<{
    id: number;
    booking_number: string;
    customer_name: string;
    customer_email: string;
    tour_date: string;
  }>(
    `SELECT id, booking_number, customer_name, customer_email, tour_date::text
     FROM bookings
     WHERE (
       LOWER(customer_name) LIKE $1
       OR LOWER(customer_name) LIKE $2
     )
     AND tour_date >= $3::date - INTERVAL '30 days'
     AND tour_date <= $3::date + INTERVAL '30 days'
     ORDER BY ABS(tour_date - $3::date)
     LIMIT 1`,
    [`%${senderName.toLowerCase()}%`, `%${senderName.split(' ')[0].toLowerCase()}%`, email.date.toISOString().split('T')[0]]
  );

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      booking_id: row.id,
      booking_number: row.booking_number,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      tour_date: row.tour_date,
      match_confidence: 'medium',
      match_reason: `Name match: "${senderName}"`,
    };
  }

  // Third try: booking number in email
  const bookingNumMatch = email.body.match(/\b(WWT|HIST|NWT)-?\d{4,6}\b/i);
  if (bookingNumMatch) {
    result = await pool.query<{
      id: number;
      booking_number: string;
      customer_name: string;
      customer_email: string;
      tour_date: string;
    }>(
      `SELECT id, booking_number, customer_name, customer_email, tour_date::text
       FROM bookings
       WHERE booking_number ILIKE $1
       LIMIT 1`,
      [`%${bookingNumMatch[0]}%`]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        booking_id: row.id,
        booking_number: row.booking_number,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        tour_date: row.tour_date,
        match_confidence: 'high',
        match_reason: `Booking number in email: ${bookingNumMatch[0]}`,
      };
    }
  }

  return null;
}

/**
 * Check if email is already linked to a booking
 */
async function isEmailAlreadyLinked(emailId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM booking_timeline
     WHERE event_data->>'gmail_message_id' = $1
     LIMIT 1`,
    [emailId]
  );
  return result.rows.length > 0;
}

/**
 * Link email to booking in database
 */
async function linkEmailToBooking(email: EmailRecord, booking: BookingMatch): Promise<void> {
  await pool.query(
    `INSERT INTO booking_timeline (
      booking_id, event_type, event_description, event_data, created_at
    ) VALUES ($1, 'email', $2, $3, $4)`,
    [
      booking.booking_id,
      `Email: ${email.subject.substring(0, 100)}`,
      JSON.stringify({
        gmail_message_id: email.id,
        gmail_thread_id: email.threadId,
        from: email.from,
        subject: email.subject,
        snippet: email.snippet,
        match_confidence: booking.match_confidence,
        match_reason: booking.match_reason,
        import_date: new Date().toISOString(),
      }),
      email.date,
    ]
  );
}

// ============================================================================
// Main Import Logic
// ============================================================================

async function runImport(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  Gmail Historical Email Import');
  console.log('='.repeat(70));

  if (DRY_RUN) {
    console.log('\n  DRY RUN MODE - No changes will be made to the database\n');
  }

  const stats: ImportStats = {
    emailsProcessed: 0,
    tourRelatedEmails: 0,
    matchedToBookings: 0,
    unmatchedEmails: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  try {
    // Authenticate and get Gmail client
    const gmail = await authorize();

    // Fetch emails
    const messages = await fetchEmails(gmail);
    stats.emailsProcessed = messages.length;

    console.log(`Processing ${messages.length} emails...\n`);

    // Process each email
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message.id) continue;

      if (VERBOSE && i % 10 === 0) {
        console.log(`Processing email ${i + 1}/${messages.length}...`);
      }

      try {
        // Check if already linked
        if (await isEmailAlreadyLinked(message.id)) {
          stats.duplicatesSkipped++;
          continue;
        }

        // Parse email
        const email = await parseEmail(gmail, message.id);
        if (!email) {
          continue;
        }

        stats.tourRelatedEmails++;

        // Try to find matching booking
        const booking = await findMatchingBooking(email);

        if (booking) {
          if (!DRY_RUN) {
            await linkEmailToBooking(email, booking);
          }
          stats.matchedToBookings++;

          if (VERBOSE) {
            console.log(`  Matched: "${email.subject.substring(0, 50)}..." -> ${booking.booking_number} (${booking.match_confidence})`);
          }
        } else {
          stats.unmatchedEmails++;

          if (VERBOSE) {
            console.log(`  Unmatched: "${email.subject.substring(0, 50)}..." from ${extractEmail(email.from)}`);
          }
        }
      } catch (error) {
        stats.errors.push({
          email: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('  Import Summary');
    console.log('='.repeat(70));
    console.log(`
  Emails processed:      ${stats.emailsProcessed}
  Tour-related emails:   ${stats.tourRelatedEmails}
  Matched to bookings:   ${stats.matchedToBookings}
  Unmatched emails:      ${stats.unmatchedEmails}
  Duplicates skipped:    ${stats.duplicatesSkipped}
  Errors:                ${stats.errors.length}
`);

    if (stats.errors.length > 0) {
      console.log('  Errors:');
      for (const err of stats.errors.slice(0, 5)) {
        console.log(`    - ${err.email}: ${err.error}`);
      }
      if (stats.errors.length > 5) {
        console.log(`    ... and ${stats.errors.length - 5} more`);
      }
      console.log('');
    }

    // Calculate match rate
    const matchRate =
      stats.tourRelatedEmails > 0
        ? Math.round((stats.matchedToBookings / stats.tourRelatedEmails) * 100)
        : 0;

    console.log(`  Match Rate: ${matchRate}%\n`);

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
