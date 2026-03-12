import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';

const BodySchema = z.object({
  booking_id: z.number().int().positive().optional(),
  proposal_id: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  client_name: z.string().max(255).optional(),
  client_email: z.string().email().max(255).optional(),
  party_size: z.number().int().positive().optional(),
  start_date: z.string().min(1).max(50),
  end_date: z.string().min(1).max(50),
  internal_notes: z.string().max(5000).optional(),
  client_notes: z.string().max(5000).optional(),
});

// GET /api/itineraries - List all itineraries
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const result = await prisma.$queryRaw`
    SELECT
      i.*,
      COUNT(DISTINCT d.id) as day_count,
      COUNT(a.id) as activity_count
    FROM itineraries i
    LEFT JOIN itinerary_days d ON i.id = d.itinerary_id
    LEFT JOIN itinerary_activities a ON d.id = a.itinerary_day_id
    GROUP BY i.id
    ORDER BY i.created_at DESC` as Record<string, any>[];

  return NextResponse.json({ itineraries: result });
});

// POST /api/itineraries - Create new itinerary
export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
  const body = BodySchema.parse(await request.json());
  const {
    booking_id,
    proposal_id,
    title,
    client_name,
    client_email,
    party_size,
    start_date,
    end_date,
    internal_notes,
    client_notes
  } = body;

  // Validate required fields
  if (!title || !start_date || !end_date) {
    throw new BadRequestError('Title, start_date, and end_date are required');
  }

  const itinerary = await prisma.$transaction(async (tx) => {
    // Create itinerary
    const itineraryResult = await tx.$queryRawUnsafe(
      `INSERT INTO itineraries
       (booking_id, proposal_id, title, client_name, client_email, party_size,
        start_date, end_date, status, internal_notes, client_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10)
       RETURNING *`,
      booking_id,
      proposal_id,
      title,
      client_name,
      client_email,
      party_size,
      start_date,
      end_date,
      internal_notes,
      client_notes
    ) as Record<string, any>[];

    const newItinerary = itineraryResult[0];

    // Create default days based on date range
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const dayCount = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount; i++) {
      const dayDate = new Date(startDateObj);
      dayDate.setDate(startDateObj.getDate() + i);

      await tx.$queryRawUnsafe(
        `INSERT INTO itinerary_days
         (itinerary_id, day_number, date, title, display_order)
         VALUES ($1, $2, $3, $4, $5)`,
        newItinerary.id,
        i + 1,
        dayDate.toISOString().split('T')[0],
        `Day ${i + 1}`,
        i
      );
    }

    return newItinerary;
  });

  return NextResponse.json({ itinerary });
})
);
