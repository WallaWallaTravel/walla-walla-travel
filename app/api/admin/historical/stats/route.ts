/**
 * Historical Import Statistics API
 *
 * GET /api/admin/historical/stats - Get import statistics and compliance status
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, UnauthorizedError, RouteContext } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { inspectionService } from '@/lib/services/inspection.service';
import { timeCardService } from '@/lib/services/timecard.service';
import { query } from '@/lib/db';

// =============================================================================
// Validation Schema
// =============================================================================

const StatsQuerySchema = z.object({
  driverId: z.coerce.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// =============================================================================
// GET - Get historical import statistics
// =============================================================================

export const GET = withErrorHandling(async (request: NextRequest, _context: RouteContext) => {
  // Verify admin authentication
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const filters = StatsQuerySchema.parse(queryParams);

  // Get inspection stats
  const inspectionStats = await inspectionService.getInspectionStats({
    driverId: filters.driverId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    includeHistorical: true,
  });

  // Get time card stats
  const timeCardStats = await timeCardService.getTimeCardStats({
    driverId: filters.driverId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    includeHistorical: true,
  });

  // Get booking stats
  const bookingStatsResult = await query(
    `SELECT
      COUNT(*)::int as total_bookings,
      COUNT(*) FILTER (WHERE booking_source = 'calendar_import')::int as calendar_imports,
      COUNT(*) FILTER (WHERE time_card_id IS NOT NULL)::int as linked_to_time_cards,
      COUNT(*) FILTER (WHERE driver_id IS NOT NULL)::int as has_driver_assigned
    FROM bookings
    WHERE ($1::int IS NULL OR driver_id = $1)
      AND ($2::date IS NULL OR tour_date >= $2)
      AND ($3::date IS NULL OR tour_date <= $3)`,
    [filters.driverId || null, filters.startDate || null, filters.endDate || null]
  );

  const bookingStats = bookingStatsResult.rows[0] || {
    total_bookings: 0,
    calendar_imports: 0,
    linked_to_time_cards: 0,
    has_driver_assigned: 0,
  };

  // Get compliance gaps
  const gapsResult = await query(
    `WITH booking_dates AS (
      SELECT DISTINCT tour_date, driver_id
      FROM bookings
      WHERE driver_id IS NOT NULL
        AND status = 'completed'
        AND ($1::int IS NULL OR driver_id = $1)
        AND ($2::date IS NULL OR tour_date >= $2)
        AND ($3::date IS NULL OR tour_date <= $3)
    ),
    inspection_dates AS (
      SELECT DISTINCT
        COALESCE(original_document_date, DATE(created_at)) as inspection_date,
        driver_id
      FROM inspections
      WHERE ($1::int IS NULL OR driver_id = $1)
    ),
    time_card_dates AS (
      SELECT DISTINCT
        COALESCE(original_document_date, DATE(clock_in_time)) as tc_date,
        driver_id
      FROM time_cards
      WHERE ($1::int IS NULL OR driver_id = $1)
    )
    SELECT
      COUNT(*) FILTER (WHERE id.inspection_date IS NULL)::int as bookings_missing_inspections,
      COUNT(*) FILTER (WHERE td.tc_date IS NULL)::int as bookings_missing_time_cards
    FROM booking_dates bd
    LEFT JOIN inspection_dates id ON bd.tour_date = id.inspection_date AND bd.driver_id = id.driver_id
    LEFT JOIN time_card_dates td ON bd.tour_date = td.tc_date AND bd.driver_id = td.driver_id`,
    [filters.driverId || null, filters.startDate || null, filters.endDate || null]
  );

  const complianceGaps = gapsResult.rows[0] || {
    bookings_missing_inspections: 0,
    bookings_missing_time_cards: 0,
  };

  // Get date range of historical data
  const dateRangeResult = await query(
    `SELECT
      MIN(COALESCE(original_document_date, DATE(created_at)))::text as earliest_inspection,
      MAX(COALESCE(original_document_date, DATE(created_at)))::text as latest_inspection,
      (SELECT MIN(COALESCE(original_document_date, DATE(clock_in_time)))::text FROM time_cards WHERE is_historical_entry = true) as earliest_time_card,
      (SELECT MAX(COALESCE(original_document_date, DATE(clock_in_time)))::text FROM time_cards WHERE is_historical_entry = true) as latest_time_card
    FROM inspections
    WHERE is_historical_entry = true`
  );

  const dateRange = dateRangeResult.rows[0] || {};

  // Calculate compliance score (percentage of bookings with full documentation)
  const totalBookings = bookingStats.total_bookings || 1; // Avoid division by zero
  const fullyDocumented = Math.min(
    bookingStats.linked_to_time_cards,
    totalBookings - complianceGaps.bookings_missing_inspections
  );
  const complianceScore = Math.round((fullyDocumented / totalBookings) * 100);

  return NextResponse.json({
    success: true,
    data: {
      inspections: {
        total: inspectionStats.totalInspections,
        preTrips: inspectionStats.preTrips,
        postTrips: inspectionStats.postTrips,
        defectsFound: inspectionStats.defectsFound,
        criticalDefects: inspectionStats.criticalDefects,
        historicalEntries: inspectionStats.historicalEntries,
      },
      timeCards: {
        total: timeCardStats.totalTimeCards,
        totalDrivingHours: timeCardStats.totalDrivingHours,
        totalOnDutyHours: timeCardStats.totalOnDutyHours,
        averageShiftLength: timeCardStats.averageShiftLength,
        historicalEntries: timeCardStats.historicalEntries,
        linkedToBookings: timeCardStats.linkedToBookings,
      },
      bookings: {
        total: bookingStats.total_bookings,
        calendarImports: bookingStats.calendar_imports,
        linkedToTimeCards: bookingStats.linked_to_time_cards,
        hasDriverAssigned: bookingStats.has_driver_assigned,
      },
      complianceGaps: {
        bookingsMissingInspections: complianceGaps.bookings_missing_inspections,
        bookingsMissingTimeCards: complianceGaps.bookings_missing_time_cards,
      },
      complianceScore,
      dateRange: {
        earliestInspection: dateRange.earliest_inspection,
        latestInspection: dateRange.latest_inspection,
        earliestTimeCard: dateRange.earliest_time_card,
        latestTimeCard: dateRange.latest_time_card,
      },
    },
  });
});
