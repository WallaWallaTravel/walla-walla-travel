import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const ReorderStopSchema = z.object({
  id: z.number().int().positive(),
  stop_order: z.number().int().nonnegative(),
});

const BodySchema = z.object({
  stops: z.array(ReorderStopSchema),
});

/**
 * PUT /api/itineraries/[booking_id]/reorder
 * Reorder stops in an itinerary
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

    // Update stop orders in a transaction
    await prisma.$transaction(async (tx) => {
      for (const stop of stops) {
        await tx.$executeRaw`
          UPDATE itinerary_stops
          SET stop_order = ${stop.stop_order}
          WHERE id = ${stop.id} AND itinerary_id = ${itineraryId}`;
      }
    });

    return NextResponse.json({ success: true, message: 'Stops reordered successfully' });
  }
)
);
