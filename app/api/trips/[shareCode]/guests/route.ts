import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { addGuestSchema } from '@/lib/validation/schemas/trip';

interface RouteParams {
  shareCode: string;
}

// ============================================================================
// POST /api/trips/[shareCode]/guests - Add a guest to the trip
// ============================================================================

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;
    const body = await request.json();
    const validated = addGuestSchema.parse(body);

    // Get trip ID from share code
    const tripRows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM trips WHERE share_code = ${shareCode}
    `;

    if (tripRows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const tripId = tripRows[0].id;

    // Insert the guest
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO trip_guests (
        trip_id, name, email, phone,
        is_organizer, dietary_restrictions, accessibility_needs,
        rsvp_status
      ) VALUES (
        ${tripId}, ${validated.name}, ${validated.email || null}, ${validated.phone || null}, ${validated.is_organizer}, ${validated.dietary_restrictions || null}, ${validated.accessibility_needs || null}, 'pending'
      )
      RETURNING *
    `;

    const guest = rows[0];

    // Update trip activity timestamp
    await prisma.$executeRaw`
      UPDATE trips SET last_activity_at = NOW() WHERE id = ${tripId}
    `;

    // Log activity
    await prisma.$executeRaw`
      INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_type)
       VALUES (${tripId}, 'guest_added', ${`Added guest: ${validated.name}`}, 'owner')
    `;

    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        trip_id: guest.trip_id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        rsvp_status: guest.rsvp_status,
        rsvp_responded_at: guest.rsvp_responded_at,
        rsvp_notes: guest.rsvp_notes,
        is_organizer: guest.is_organizer,
        dietary_restrictions: guest.dietary_restrictions,
        accessibility_needs: guest.accessibility_needs,
        invite_sent_at: guest.invite_sent_at,
        last_viewed_at: guest.last_viewed_at,
        created_at: guest.created_at,
        updated_at: guest.updated_at,
      },
    }, { status: 201 });
  }
);
