import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const StopSchema = z.object({
  winery_id: z.number().int().positive(),
  stop_order: z.number().int().nonnegative(),
  arrival_time: z.string().optional().nullable(),
  departure_time: z.string().optional().nullable(),
  duration_minutes: z.number().int().nonnegative().optional().nullable(),
  drive_time_to_next_minutes: z.number().int().nonnegative().optional().nullable(),
  stop_type: z.string().max(255).optional(),
  reservation_confirmed: z.boolean().optional(),
  special_notes: z.string().max(5000).optional(),
});

const BodySchema = z.object({
  stops: z.array(StopSchema),
});

/**
 * PUT /api/itineraries/[booking_id]/stops
 * Save/update stops for an itinerary
 *
 * Uses withErrorHandling middleware for consistent error handling
 */
export const PUT = withCSRF(
  withErrorHandling<unknown, { booking_id: string }>(
  async (request: NextRequest, context: RouteContext<{ booking_id: string }>) => {
    const { booking_id: bookingId } = await context.params;
    const { stops } = BodySchema.parse(await request.json());

    // Get itinerary ID for this booking
    const itineraryRows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM itineraries WHERE booking_id = ${bookingId}`;

    if (itineraryRows.length === 0) {
      throw new NotFoundError('Itinerary not found');
    }

    const itineraryId = itineraryRows[0].id;

    // Calculate total drive time
    const totalDriveTime = stops.reduce((sum: number, stop) =>
      sum + (stop.drive_time_to_next_minutes ?? 0), 0
    );

    await prisma.$transaction(async (tx) => {
      // Delete all existing stops for this itinerary
      await tx.$executeRaw`DELETE FROM itinerary_stops WHERE itinerary_id = ${itineraryId}`;

      // Insert new stops
      for (const stop of stops) {
        const stopType = stop.stop_type || 'winery';
        const reservationConfirmed = stop.reservation_confirmed || false;
        const specialNotes = stop.special_notes || '';
        const arrivalTime = stop.arrival_time ?? null;
        const departureTime = stop.departure_time ?? null;
        const durationMinutes = stop.duration_minutes ?? null;
        const driveTimeToNext = stop.drive_time_to_next_minutes ?? null;

        await tx.$executeRaw`
          INSERT INTO itinerary_stops (
            itinerary_id,
            winery_id,
            stop_order,
            arrival_time,
            departure_time,
            duration_minutes,
            drive_time_to_next_minutes,
            stop_type,
            reservation_confirmed,
            special_notes
          ) VALUES (${itineraryId}, ${stop.winery_id}, ${stop.stop_order}, ${arrivalTime}, ${departureTime}, ${durationMinutes}, ${driveTimeToNext}, ${stopType}, ${reservationConfirmed}, ${specialNotes})`;
      }

      // Update total drive time
      await tx.$executeRaw`
        UPDATE itineraries
        SET total_drive_time_minutes = ${totalDriveTime}, updated_at = NOW()
        WHERE id = ${itineraryId}`;
    });

    return NextResponse.json({
      success: true,
      message: 'Stops saved successfully',
      stops_count: stops.length,
      total_drive_time: totalDriveTime
    });
  }
)
);
