/**
 * Unified Availability API
 *
 * Single endpoint for all brands to check vehicle availability.
 * Uses the new vehicle_availability_blocks table with PostgreSQL
 * exclusion constraint for bulletproof double-booking prevention.
 *
 * Endpoints:
 * - GET /api/v1/availability - Check availability for a date/time
 * - GET /api/v1/availability?action=dates - Get available dates for a month
 * - GET /api/v1/availability?action=slots - Get available time slots for a date
 * - GET /api/v1/availability?action=calendar - Get calendar data for date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { vehicleAvailabilityService } from '@/lib/services/vehicle-availability.service';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { addCacheHeaders, CachePresets } from '@/lib/api/middleware/cache';

// ============================================================================
// Validation Schemas
// ============================================================================

const CheckAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  duration_hours: z.coerce.number().min(1).max(12).default(4),
  party_size: z.coerce.number().min(1).max(50).default(1),
  brand_id: z.coerce.number().optional(),
});

const GetDatesSchema = z.object({
  year: z.coerce.number().min(2024).max(2030),
  month: z.coerce.number().min(1).max(12),
  party_size: z.coerce.number().min(1).max(50).default(1),
  brand_id: z.coerce.number().optional(),
});

const GetSlotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  duration_hours: z.coerce.number().min(1).max(12).default(4),
  party_size: z.coerce.number().min(1).max(50).default(1),
  brand_id: z.coerce.number().optional(),
});

const GetCalendarSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  vehicle_id: z.coerce.number().optional(),
});

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'check';

    switch (action) {
      case 'dates':
        return handleGetDates(searchParams);
      case 'slots':
        return handleGetSlots(searchParams);
      case 'calendar':
        return handleGetCalendar(searchParams);
      case 'check':
      default:
        return handleCheckAvailability(searchParams);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('Availability API error', { error });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Check availability for a specific date and optional time
 * Returns: available status, suggested vehicle, available time slots
 */
async function handleCheckAvailability(searchParams: URLSearchParams): Promise<NextResponse> {
  const params = Object.fromEntries(searchParams.entries());
  const validated = CheckAvailabilitySchema.parse(params);

  if (validated.start_time) {
    // Check specific time slot
    const result = await vehicleAvailabilityService.checkAvailability({
      date: validated.date,
      startTime: validated.start_time,
      durationHours: validated.duration_hours,
      partySize: validated.party_size,
      brandId: validated.brand_id,
    });

    // Cache availability checks for 30 seconds (real-time data)
    return addCacheHeaders(
      NextResponse.json({
        available: result.available,
        date: validated.date,
        start_time: validated.start_time,
        duration_hours: validated.duration_hours,
        party_size: validated.party_size,
        vehicle: result.vehicle_id ? {
          id: result.vehicle_id,
          name: result.vehicle_name,
          capacity: result.vehicle_capacity,
        } : null,
        available_vehicles: result.available_vehicles,
        conflicts: result.conflicts,
      }),
      CachePresets.REALTIME
    );
  } else {
    // Get all available slots for the day
    const slots = await vehicleAvailabilityService.getAvailableSlots({
      date: validated.date,
      durationHours: validated.duration_hours,
      partySize: validated.party_size,
      brandId: validated.brand_id,
    });

    const availableSlots = slots.filter(s => s.available);
    const hasAvailability = availableSlots.length > 0;

    // Cache availability checks for 30 seconds (real-time data)
    return addCacheHeaders(
      NextResponse.json({
        available: hasAvailability,
        date: validated.date,
        duration_hours: validated.duration_hours,
        party_size: validated.party_size,
        total_slots: slots.length,
        available_slots_count: availableSlots.length,
        time_slots: slots,
        suggested_time: hasAvailability ? availableSlots[0].start : null,
        suggested_vehicle: hasAvailability && availableSlots[0].vehicle_id ? {
          id: availableSlots[0].vehicle_id,
          name: availableSlots[0].vehicle_name,
        } : null,
      }),
      CachePresets.REALTIME
    );
  }
}

/**
 * Get available dates for a month
 * Returns: array of available date strings
 */
async function handleGetDates(searchParams: URLSearchParams): Promise<NextResponse> {
  const params = Object.fromEntries(searchParams.entries());
  const validated = GetDatesSchema.parse(params);

  // Build date range for the month
  const startDate = new Date(validated.year, validated.month - 1, 1);
  const endDate = new Date(validated.year, validated.month, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Minimum booking window (48 hours)
  const minBookingDate = new Date();
  minBookingDate.setHours(minBookingDate.getHours() + 48);
  minBookingDate.setHours(0, 0, 0, 0);

  const availableDates: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Skip past dates and dates within booking window
    if (currentDate < minBookingDate) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check if any time slot is available
    const slots = await vehicleAvailabilityService.getAvailableSlots({
      date: dateStr,
      durationHours: 4, // Minimum tour duration
      partySize: validated.party_size,
      brandId: validated.brand_id,
    });

    if (slots.some(slot => slot.available)) {
      availableDates.push(dateStr);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return NextResponse.json({
    year: validated.year,
    month: validated.month,
    party_size: validated.party_size,
    brand_id: validated.brand_id,
    available_dates: availableDates,
    total_available_days: availableDates.length,
  });
}

/**
 * Get available time slots for a specific date
 * Returns: array of time slots with availability status
 */
async function handleGetSlots(searchParams: URLSearchParams): Promise<NextResponse> {
  const params = Object.fromEntries(searchParams.entries());
  const validated = GetSlotsSchema.parse(params);

  const slots = await vehicleAvailabilityService.getAvailableSlots({
    date: validated.date,
    durationHours: validated.duration_hours,
    partySize: validated.party_size,
    brandId: validated.brand_id,
  });

  return NextResponse.json({
    date: validated.date,
    duration_hours: validated.duration_hours,
    party_size: validated.party_size,
    brand_id: validated.brand_id,
    time_slots: slots,
    available_count: slots.filter(s => s.available).length,
    total_count: slots.length,
  });
}

/**
 * Get calendar data for a date range
 * Returns: blocks organized by vehicle for calendar/swim lane view
 */
async function handleGetCalendar(searchParams: URLSearchParams): Promise<NextResponse> {
  const params = Object.fromEntries(searchParams.entries());
  const validated = GetCalendarSchema.parse(params);

  // Validate date range
  const start = new Date(validated.start_date);
  const end = new Date(validated.end_date);

  if (end < start) {
    return NextResponse.json(
      { error: 'End date must be after start date' },
      { status: 400 }
    );
  }

  // Limit range to 90 days
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    return NextResponse.json(
      { error: 'Date range cannot exceed 90 days' },
      { status: 400 }
    );
  }

  const blocks = await vehicleAvailabilityService.getBlocksInRange(
    validated.start_date,
    validated.end_date,
    validated.vehicle_id
  );

  // Group blocks by vehicle for swim lane view
  const blocksByVehicle: Record<number, typeof blocks> = {};
  for (const block of blocks) {
    if (!blocksByVehicle[block.vehicle_id]) {
      blocksByVehicle[block.vehicle_id] = [];
    }
    blocksByVehicle[block.vehicle_id].push(block);
  }

  return NextResponse.json({
    start_date: validated.start_date,
    end_date: validated.end_date,
    vehicle_id: validated.vehicle_id,
    blocks,
    blocks_by_vehicle: blocksByVehicle,
    total_blocks: blocks.length,
  });
}
