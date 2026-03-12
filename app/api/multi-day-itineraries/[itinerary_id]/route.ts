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

  // Get itinerary
  const itineraryRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
    'SELECT * FROM itineraries WHERE id = $1',
    itinerary_id
  );

  if (itineraryRows.length === 0) {
    throw new NotFoundError('Itinerary not found');
  }

  const itinerary = itineraryRows[0];

  // Get days with activities
  const days = await prisma.$queryRawUnsafe<Record<string, any>[]>(
    `SELECT
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
    WHERE d.itinerary_id = $1
    GROUP BY d.id
    ORDER BY d.display_order`,
    itinerary_id
  );

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

  const body = PutBodySchema.parse(await request.json());
  const { itinerary, days } = body;

  await prisma.$transaction(async (tx) => {
    // Update itinerary
    if (itinerary) {
      await tx.$queryRawUnsafe(
        `UPDATE itineraries
         SET title = $1,
             client_name = $2,
             client_email = $3,
             party_size = $4,
             start_date = $5,
             end_date = $6,
             status = $7,
             internal_notes = $8,
             client_notes = $9,
             updated_at = NOW()
         WHERE id = $10`,
        itinerary.title,
        itinerary.client_name,
        itinerary.client_email,
        itinerary.party_size,
        itinerary.start_date,
        itinerary.end_date,
        itinerary.status,
        itinerary.internal_notes,
        itinerary.client_notes,
        itinerary_id
      );
    }

    // Update days and activities
    if (days && Array.isArray(days)) {
      for (const day of days) {
        // Upsert day
        const dayResult = await tx.$queryRawUnsafe<Record<string, any>[]>(
          `INSERT INTO itinerary_days
           (id, itinerary_id, day_number, date, title, description, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             day_number = $3,
             date = $4,
             title = $5,
             description = $6,
             display_order = $7,
             updated_at = NOW()
           RETURNING id`,
          (day.id && day.id > 1000000000000) ? null : (day.id ?? null),
          itinerary_id,
          day.day_number,
          day.date,
          day.title,
          day.description,
          day.display_order
        );

        const dayId = dayResult[0].id;

        // Delete existing activities for this day
        await tx.$queryRawUnsafe(
          'DELETE FROM itinerary_activities WHERE itinerary_day_id = $1',
          dayId
        );

        // Insert activities
        if (day.activities && Array.isArray(day.activities)) {
          for (const activity of day.activities) {
            await tx.$queryRawUnsafe(
              `INSERT INTO itinerary_activities
               (itinerary_day_id, activity_type, start_time, end_time, duration_minutes,
                location_name, location_address, location_type, pickup_location, dropoff_location,
                winery_id, tasting_included, tasting_fee, title, description, notes, display_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
              dayId,
              activity.activity_type,
              activity.start_time,
              activity.end_time,
              activity.duration_minutes,
              activity.location_name,
              activity.location_address,
              activity.location_type,
              activity.pickup_location,
              activity.dropoff_location,
              activity.winery_id,
              activity.tasting_included,
              activity.tasting_fee,
              activity.title,
              activity.description,
              activity.notes,
              activity.display_order
            );
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

  await prisma.$queryRawUnsafe('DELETE FROM itineraries WHERE id = $1', itinerary_id);
  return NextResponse.json({ success: true });
})
);
