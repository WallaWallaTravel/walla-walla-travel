import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';

const ActivitySchema = z.object({
  activity_type: z.string().min(1).max(100),
  start_time: z.string().max(50).nullable().optional(),
  end_time: z.string().max(50).nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  location_name: z.string().max(255).nullable().optional(),
  location_address: z.string().max(500).nullable().optional(),
  location_type: z.string().max(100).nullable().optional(),
  pickup_location: z.string().max(500).nullable().optional(),
  dropoff_location: z.string().max(500).nullable().optional(),
  winery_id: z.number().int().positive().nullable().optional(),
  tasting_included: z.boolean().nullable().optional(),
  tasting_fee: z.number().nonnegative().nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  display_order: z.number().int().nonnegative().optional(),
});

const DaySchema = z.object({
  id: z.number().int().optional(),
  day_number: z.number().int().positive(),
  date: z.string().max(50).nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  display_order: z.number().int().nonnegative(),
  activities: z.array(ActivitySchema).optional(),
});

const PutBodySchema = z.object({
  itinerary: z.object({
    title: z.string().min(1).max(255),
    client_name: z.string().max(255).nullable().optional(),
    client_email: z.string().email().max(255).nullable().optional(),
    party_size: z.number().int().positive().nullable().optional(),
    start_date: z.string().max(50).nullable().optional(),
    end_date: z.string().max(50).nullable().optional(),
    status: z.string().max(50).optional(),
    internal_notes: z.string().max(5000).nullable().optional(),
    client_notes: z.string().max(5000).nullable().optional(),
  }).optional(),
  days: z.array(DaySchema).optional(),
});

// GET /api/multi-day-itineraries/[itinerary_id] - Get itinerary with all days and activities
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ itinerary_id: string }> }
) => {
  const { itinerary_id } = await params;
  const itineraryId = parseInt(itinerary_id);

  // Get itinerary
  const itineraryRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM itineraries WHERE id = ${itineraryId}`;

  if (itineraryRows.length === 0) {
    throw new NotFoundError('Itinerary not found');
  }

  const itinerary = itineraryRows[0];

  // Get days with activities
  const days = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      d.*,
      json_agg(
        json_build_object(
          'id', a.id,
          'itinerary_day_id', a.itinerary_day_id,
          'activity_type', a.activity_type,
          'start_time', a.start_time,
          'end_time', a.end_time,
          'duration_minutes', a.duration_minutes,
          'location_name', a.location_name,
          'location_address', a.location_address,
          'location_type', a.location_type,
          'pickup_location', a.pickup_location,
          'dropoff_location', a.dropoff_location,
          'winery_id', a.winery_id,
          'tasting_included', a.tasting_included,
          'tasting_fee', a.tasting_fee,
          'title', a.title,
          'description', a.description,
          'notes', a.notes,
          'display_order', a.display_order,
          'created_at', a.created_at,
          'updated_at', a.updated_at
        ) ORDER BY a.display_order
      ) FILTER (WHERE a.id IS NOT NULL) as activities
    FROM itinerary_days d
    LEFT JOIN itinerary_activities a ON d.id = a.itinerary_day_id
    WHERE d.itinerary_id = ${itineraryId}
    GROUP BY d.id
    ORDER BY d.display_order`;

  return NextResponse.json({
    itinerary,
    days
  });
});

// PUT /api/multi-day-itineraries/[itinerary_id] - Update itinerary
export const PUT = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ itinerary_id: string }> }
) => {
  const { itinerary_id } = await params;
  const itineraryId = parseInt(itinerary_id);

  const body = PutBodySchema.parse(await request.json());
  const { itinerary, days } = body;

  await prisma.$transaction(async (tx) => {
    // Update itinerary
    if (itinerary) {
      const clientName = itinerary.client_name ?? null;
      const clientEmail = itinerary.client_email ?? null;
      const partySize = itinerary.party_size ?? null;
      const startDate = itinerary.start_date ?? null;
      const endDate = itinerary.end_date ?? null;
      const status = itinerary.status ?? null;
      const internalNotes = itinerary.internal_notes ?? null;
      const clientNotes = itinerary.client_notes ?? null;

      await tx.$executeRaw`
        UPDATE itineraries
        SET title = ${itinerary.title},
            client_name = ${clientName},
            client_email = ${clientEmail},
            party_size = ${partySize},
            start_date = ${startDate},
            end_date = ${endDate},
            status = ${status},
            internal_notes = ${internalNotes},
            client_notes = ${clientNotes},
            updated_at = NOW()
        WHERE id = ${itineraryId}`;
    }

    // Update days and activities
    if (days && Array.isArray(days)) {
      for (const day of days) {
        // Upsert day
        const dayIdValue = (day.id && day.id > 1000000000000) ? null : (day.id ?? null);
        const dayDate = day.date ?? null;
        const dayTitle = day.title ?? null;
        const dayDescription = day.description ?? null;

        const dayResult = await tx.$queryRaw<{ id: number }[]>`
          INSERT INTO itinerary_days
          (id, itinerary_id, day_number, date, title, description, display_order)
          VALUES (${dayIdValue}, ${itineraryId}, ${day.day_number}, ${dayDate}, ${dayTitle}, ${dayDescription}, ${day.display_order})
          ON CONFLICT (id) DO UPDATE SET
            day_number = ${day.day_number},
            date = ${dayDate},
            title = ${dayTitle},
            description = ${dayDescription},
            display_order = ${day.display_order},
            updated_at = NOW()
          RETURNING id`;

        const dayId = dayResult[0].id;

        // Delete existing activities for this day
        await tx.$executeRaw`DELETE FROM itinerary_activities WHERE itinerary_day_id = ${dayId}`;

        // Insert activities
        if (day.activities && Array.isArray(day.activities)) {
          for (const activity of day.activities) {
            const startTime = activity.start_time ?? null;
            const endTime = activity.end_time ?? null;
            const durationMinutes = activity.duration_minutes ?? null;
            const locationName = activity.location_name ?? null;
            const locationAddress = activity.location_address ?? null;
            const locationType = activity.location_type ?? null;
            const pickupLocation = activity.pickup_location ?? null;
            const dropoffLocation = activity.dropoff_location ?? null;
            const wineryId = activity.winery_id ?? null;
            const tastingIncluded = activity.tasting_included ?? null;
            const tastingFee = activity.tasting_fee ?? null;
            const actTitle = activity.title ?? null;
            const actDescription = activity.description ?? null;
            const actNotes = activity.notes ?? null;
            const displayOrder = activity.display_order ?? null;

            await tx.$executeRaw`
              INSERT INTO itinerary_activities
              (itinerary_day_id, activity_type, start_time, end_time, duration_minutes,
               location_name, location_address, location_type, pickup_location, dropoff_location,
               winery_id, tasting_included, tasting_fee, title, description, notes, display_order)
              VALUES (${dayId}, ${activity.activity_type}, ${startTime}, ${endTime}, ${durationMinutes}, ${locationName}, ${locationAddress}, ${locationType}, ${pickupLocation}, ${dropoffLocation}, ${wineryId}, ${tastingIncluded}, ${tastingFee}, ${actTitle}, ${actDescription}, ${actNotes}, ${displayOrder})`;
          }
        }
      }
    }
  });

  return NextResponse.json({ success: true });
})
);

// DELETE /api/multi-day-itineraries/[itinerary_id] - Delete itinerary
export const DELETE = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ itinerary_id: string }> }
) => {
  const { itinerary_id } = await params;
  const itineraryId = parseInt(itinerary_id);

  await prisma.$executeRaw`DELETE FROM itineraries WHERE id = ${itineraryId}`;
  return NextResponse.json({ success: true });
})
);
