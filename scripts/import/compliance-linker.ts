/**
 * Compliance Linker Script
 *
 * Links imported bookings with their associated inspections and time cards.
 * Calculates trip distances for 150-air-mile exemption tracking.
 * Generates a compliance gap report for review.
 *
 * @module scripts/import/compliance-linker
 *
 * Usage:
 *   npx tsx scripts/import/compliance-linker.ts [options]
 *
 * Options:
 *   --dry-run        Preview changes without updating database
 *   --verbose        Show detailed output for each record
 *   --start-date     Start date for analysis (default: 18 months ago)
 *   --end-date       End date for analysis (default: today)
 *   --driver-id      Analyze specific driver only
 *   --report-only    Only generate gap report, no linking
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';

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

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const REPORT_ONLY = args.includes('--report-only');

function getArgValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

const DRIVER_ID = getArgValue('--driver-id') ? parseInt(getArgValue('--driver-id')!, 10) : undefined;

// Default date range: 18 months ago to today
const defaultStartDate = new Date();
defaultStartDate.setMonth(defaultStartDate.getMonth() - 18);

const START_DATE = getArgValue('--start-date') || defaultStartDate.toISOString().split('T')[0];
const END_DATE = getArgValue('--end-date') || new Date().toISOString().split('T')[0];

// ============================================================================
// Types
// ============================================================================

interface BookingRecord {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  driver_id: number | null;
  vehicle_id: number | null;
  time_card_id: number | null;
  pickup_location: string | null;
  status: string;
}

interface TimeCardRecord {
  id: number;
  driver_id: number;
  vehicle_id: number | null;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
}

interface InspectionRecord {
  id: number;
  driver_id: number;
  vehicle_id: number;
  type: string;
  inspection_date: string;
}

interface GapRecord {
  booking_id: number;
  booking_number: string;
  tour_date: string;
  customer_name: string;
  driver_id: number | null;
  driver_name: string | null;
  vehicle_id: number | null;
  vehicle_name: string | null;
  has_time_card: boolean;
  has_pre_trip: boolean;
  has_post_trip: boolean;
  gap_types: string[];
}

interface LinkingStats {
  bookingsAnalyzed: number;
  timeCardsLinked: number;
  inspectionsMatched: number;
  gapsFound: number;
  driversAnalyzed: number;
}

// ============================================================================
// Linking Functions
// ============================================================================

/**
 * Find time cards for a booking based on driver+date match
 */
async function findTimeCardForBooking(booking: BookingRecord): Promise<TimeCardRecord | null> {
  if (!booking.driver_id) return null;

  const result = await pool.query<TimeCardRecord>(
    `SELECT id, driver_id, vehicle_id, DATE(clock_in_time) as date, clock_in_time, clock_out_time
     FROM time_cards
     WHERE driver_id = $1
       AND DATE(clock_in_time) = $2
     ORDER BY clock_in_time DESC
     LIMIT 1`,
    [booking.driver_id, booking.tour_date]
  );

  return result.rows[0] || null;
}

/**
 * Find inspections for a booking based on driver+vehicle+date match
 */
async function findInspectionsForBooking(
  booking: BookingRecord
): Promise<{ preTrip: InspectionRecord | null; postTrip: InspectionRecord | null }> {
  if (!booking.driver_id) {
    return { preTrip: null, postTrip: null };
  }

  const params: (number | string)[] = [booking.driver_id, booking.tour_date];
  let vehicleCondition = '';

  if (booking.vehicle_id) {
    vehicleCondition = 'AND vehicle_id = $3';
    params.push(booking.vehicle_id);
  }

  const result = await pool.query<InspectionRecord>(
    `SELECT id, driver_id, vehicle_id, type, DATE(created_at) as inspection_date
     FROM inspections
     WHERE driver_id = $1
       AND DATE(created_at) = $2
       ${vehicleCondition}
     ORDER BY created_at`,
    params
  );

  const preTrip = result.rows.find((r) => r.type === 'pre_trip') || null;
  const postTrip = result.rows.find((r) => r.type === 'post_trip') || null;

  return { preTrip, postTrip };
}

/**
 * Link a booking to a time card
 */
async function linkBookingToTimeCard(bookingId: number, timeCardId: number): Promise<void> {
  await pool.query('UPDATE bookings SET time_card_id = $1, updated_at = NOW() WHERE id = $2', [
    timeCardId,
    bookingId,
  ]);
}

/**
 * Calculate trip distance for 150-air-mile exemption
 * Note: This is a placeholder - actual implementation would use geocoding
 */
async function calculateTripDistance(
  bookingId: number,
  pickupLocation: string | null
): Promise<number | null> {
  // In a real implementation, this would:
  // 1. Geocode the pickup location
  // 2. Geocode the work reporting location
  // 3. Calculate air-mile distance

  // For now, return null to indicate distance not calculated
  return null;
}

// ============================================================================
// Gap Analysis
// ============================================================================

/**
 * Analyze all bookings and identify compliance gaps
 */
async function analyzeComplianceGaps(): Promise<GapRecord[]> {
  const driverCondition = DRIVER_ID ? 'AND b.driver_id = $3' : '';
  const params: (string | number)[] = [START_DATE, END_DATE];
  if (DRIVER_ID) params.push(DRIVER_ID);

  const result = await pool.query<{
    id: number;
    booking_number: string;
    tour_date: string;
    customer_name: string;
    driver_id: number | null;
    driver_name: string | null;
    vehicle_id: number | null;
    vehicle_name: string | null;
    time_card_id: number | null;
    pre_trip_id: number | null;
    post_trip_id: number | null;
  }>(
    `SELECT
      b.id,
      b.booking_number,
      b.tour_date::text,
      b.customer_name,
      b.driver_id,
      u.name as driver_name,
      b.vehicle_id,
      v.vehicle_number as vehicle_name,
      b.time_card_id,
      (
        SELECT id FROM inspections i
        WHERE i.driver_id = b.driver_id
          AND DATE(i.created_at) = b.tour_date
          AND i.type = 'pre_trip'
        LIMIT 1
      ) as pre_trip_id,
      (
        SELECT id FROM inspections i
        WHERE i.driver_id = b.driver_id
          AND DATE(i.created_at) = b.tour_date
          AND i.type = 'post_trip'
        LIMIT 1
      ) as post_trip_id
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.tour_date >= $1
      AND b.tour_date <= $2
      AND b.status = 'completed'
      ${driverCondition}
    ORDER BY b.tour_date DESC`,
    params
  );

  const gaps: GapRecord[] = [];

  for (const row of result.rows) {
    const gapTypes: string[] = [];

    // Check for missing driver assignment
    if (!row.driver_id) {
      gapTypes.push('no_driver_assigned');
    } else {
      // Check for missing time card
      if (!row.time_card_id) {
        gapTypes.push('missing_time_card');
      }

      // Check for missing pre-trip
      if (!row.pre_trip_id) {
        gapTypes.push('missing_pre_trip');
      }

      // Check for missing post-trip
      if (!row.post_trip_id) {
        gapTypes.push('missing_post_trip');
      }
    }

    if (gapTypes.length > 0) {
      gaps.push({
        booking_id: row.id,
        booking_number: row.booking_number,
        tour_date: row.tour_date,
        customer_name: row.customer_name,
        driver_id: row.driver_id,
        driver_name: row.driver_name,
        vehicle_id: row.vehicle_id,
        vehicle_name: row.vehicle_name,
        has_time_card: !!row.time_card_id,
        has_pre_trip: !!row.pre_trip_id,
        has_post_trip: !!row.post_trip_id,
        gap_types: gapTypes,
      });
    }
  }

  return gaps;
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate and display the compliance gap report
 */
function generateGapReport(gaps: GapRecord[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('  COMPLIANCE GAP REPORT');
  console.log('  ' + START_DATE + ' to ' + END_DATE);
  console.log('='.repeat(80) + '\n');

  if (gaps.length === 0) {
    console.log('  No compliance gaps found!\n');
    return;
  }

  // Group by gap type
  const byType: Record<string, GapRecord[]> = {
    no_driver_assigned: [],
    missing_time_card: [],
    missing_pre_trip: [],
    missing_post_trip: [],
  };

  for (const gap of gaps) {
    for (const gapType of gap.gap_types) {
      if (byType[gapType]) {
        byType[gapType].push(gap);
      }
    }
  }

  // Summary
  console.log('  SUMMARY');
  console.log('  ' + '-'.repeat(40));
  console.log(`  Total bookings with gaps:    ${gaps.length}`);
  console.log(`  No driver assigned:          ${byType.no_driver_assigned.length}`);
  console.log(`  Missing time card:           ${byType.missing_time_card.length}`);
  console.log(`  Missing pre-trip inspection: ${byType.missing_pre_trip.length}`);
  console.log(`  Missing post-trip inspection:${byType.missing_post_trip.length}`);
  console.log('');

  // Detailed listings by gap type
  if (byType.no_driver_assigned.length > 0) {
    console.log('\n  BOOKINGS WITHOUT DRIVER ASSIGNMENT');
    console.log('  ' + '-'.repeat(60));
    for (const gap of byType.no_driver_assigned.slice(0, 20)) {
      console.log(`  ${gap.booking_number}  ${gap.tour_date}  ${gap.customer_name}`);
    }
    if (byType.no_driver_assigned.length > 20) {
      console.log(`  ... and ${byType.no_driver_assigned.length - 20} more`);
    }
  }

  if (byType.missing_time_card.length > 0) {
    console.log('\n  BOOKINGS MISSING TIME CARDS');
    console.log('  ' + '-'.repeat(60));
    for (const gap of byType.missing_time_card.slice(0, 20)) {
      console.log(
        `  ${gap.booking_number}  ${gap.tour_date}  ${gap.driver_name || 'Unknown driver'}  ${gap.customer_name}`
      );
    }
    if (byType.missing_time_card.length > 20) {
      console.log(`  ... and ${byType.missing_time_card.length - 20} more`);
    }
  }

  if (byType.missing_pre_trip.length > 0) {
    console.log('\n  BOOKINGS MISSING PRE-TRIP INSPECTIONS');
    console.log('  ' + '-'.repeat(60));
    for (const gap of byType.missing_pre_trip.slice(0, 20)) {
      console.log(
        `  ${gap.booking_number}  ${gap.tour_date}  ${gap.driver_name || 'Unknown'}  ${gap.vehicle_name || 'No vehicle'}`
      );
    }
    if (byType.missing_pre_trip.length > 20) {
      console.log(`  ... and ${byType.missing_pre_trip.length - 20} more`);
    }
  }

  if (byType.missing_post_trip.length > 0) {
    console.log('\n  BOOKINGS MISSING POST-TRIP INSPECTIONS');
    console.log('  ' + '-'.repeat(60));
    for (const gap of byType.missing_post_trip.slice(0, 20)) {
      console.log(
        `  ${gap.booking_number}  ${gap.tour_date}  ${gap.driver_name || 'Unknown'}  ${gap.vehicle_name || 'No vehicle'}`
      );
    }
    if (byType.missing_post_trip.length > 20) {
      console.log(`  ... and ${byType.missing_post_trip.length - 20} more`);
    }
  }

  console.log('\n');
}

// ============================================================================
// Main Linking Logic
// ============================================================================

async function runLinker(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  Compliance Linker - Booking/Inspection/TimeCard Matcher');
  console.log('='.repeat(70));

  if (DRY_RUN) {
    console.log('\n  DRY RUN MODE - No changes will be made to the database\n');
  }

  if (REPORT_ONLY) {
    console.log('\n  REPORT ONLY MODE - Only generating gap report\n');
  }

  const stats: LinkingStats = {
    bookingsAnalyzed: 0,
    timeCardsLinked: 0,
    inspectionsMatched: 0,
    gapsFound: 0,
    driversAnalyzed: 0,
  };

  try {
    // Get all bookings in date range
    const driverCondition = DRIVER_ID ? 'AND driver_id = $3' : '';
    const params: (string | number)[] = [START_DATE, END_DATE];
    if (DRIVER_ID) params.push(DRIVER_ID);

    const bookingsResult = await pool.query<BookingRecord>(
      `SELECT id, booking_number, customer_name, tour_date::text, driver_id, vehicle_id,
              time_card_id, pickup_location, status
       FROM bookings
       WHERE tour_date >= $1
         AND tour_date <= $2
         AND status = 'completed'
         ${driverCondition}
       ORDER BY tour_date`,
      params
    );

    const bookings = bookingsResult.rows;
    stats.bookingsAnalyzed = bookings.length;

    console.log(`\nAnalyzing ${bookings.length} bookings from ${START_DATE} to ${END_DATE}\n`);

    // Track unique drivers
    const driverIds = new Set<number>();

    if (!REPORT_ONLY) {
      // Process each booking
      for (let i = 0; i < bookings.length; i++) {
        const booking = bookings[i];

        if (booking.driver_id) {
          driverIds.add(booking.driver_id);
        }

        if (VERBOSE) {
          console.log(
            `[${i + 1}/${bookings.length}] ${booking.booking_number} - ${booking.tour_date}`
          );
        }

        // Skip if no driver assigned
        if (!booking.driver_id) {
          if (VERBOSE) {
            console.log(`  -> No driver assigned, skipping`);
          }
          continue;
        }

        // Link time card if not already linked
        if (!booking.time_card_id) {
          const timeCard = await findTimeCardForBooking(booking);
          if (timeCard) {
            if (!DRY_RUN) {
              await linkBookingToTimeCard(booking.id, timeCard.id);
            }
            stats.timeCardsLinked++;
            if (VERBOSE) {
              console.log(`  -> Linked to time card #${timeCard.id}`);
            }
          } else if (VERBOSE) {
            console.log(`  -> No matching time card found`);
          }
        }

        // Find matching inspections
        const { preTrip, postTrip } = await findInspectionsForBooking(booking);
        if (preTrip || postTrip) {
          stats.inspectionsMatched++;
          if (VERBOSE) {
            console.log(
              `  -> Found inspections: pre-trip=${preTrip?.id || 'N/A'}, post-trip=${postTrip?.id || 'N/A'}`
            );
          }
        }
      }

      stats.driversAnalyzed = driverIds.size;
    }

    // Generate gap report
    const gaps = await analyzeComplianceGaps();
    stats.gapsFound = gaps.length;

    generateGapReport(gaps);

    // Print summary
    console.log('='.repeat(70));
    console.log('  Linking Summary');
    console.log('='.repeat(70));
    console.log(`
  Bookings analyzed:      ${stats.bookingsAnalyzed}
  Unique drivers:         ${stats.driversAnalyzed}
  Time cards linked:      ${stats.timeCardsLinked}
  Inspections matched:    ${stats.inspectionsMatched}
  Compliance gaps found:  ${stats.gapsFound}
`);

    if (DRY_RUN && !REPORT_ONLY) {
      console.log('  Run without --dry-run to apply time card links.\n');
    }

    // Calculate compliance percentage
    const compliantBookings = stats.bookingsAnalyzed - stats.gapsFound;
    const compliancePercent =
      stats.bookingsAnalyzed > 0
        ? Math.round((compliantBookings / stats.bookingsAnalyzed) * 100)
        : 100;

    console.log(`  Compliance Rate: ${compliancePercent}%\n`);

    if (compliancePercent < 100) {
      console.log('  RECOMMENDATION: Use the Historical Entry forms to digitize');
      console.log('  missing paper records to improve compliance coverage.\n');
    }

    console.log('  Done!\n');
  } catch (error) {
    console.error('\n  Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the linker
runLinker();
