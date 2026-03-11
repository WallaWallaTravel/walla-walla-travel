import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { prisma } from '@/lib/prisma';
import { requestHandoffSchema } from '@/lib/validation/schemas/trip';
import { sendConsultationRequestNotification, sendConsultationConfirmationToCustomer } from '@/lib/email';
import { logger } from '@/lib/logger';
import { crmSyncService } from '@/lib/services/crm-sync.service';

interface RouteParams {
  shareCode: string;
}

// ============================================================================
// POST /api/trips/[shareCode]/handoff - Request handoff to planning team
// ============================================================================

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;
    const body = await request.json();
    const validated = requestHandoffSchema.parse(body);

    // Get trip with full details for notification
    const tripRows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT t.id, t.title, t.owner_name, t.owner_email, t.owner_phone, t.status,
              t.trip_type, t.start_date, t.end_date, t.expected_guests, t.share_code,
              (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id AND stop_type = 'winery') as winery_count
       FROM trips t WHERE t.share_code = ${shareCode}
    `;

    if (tripRows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const trip = tripRows[0];

    // Check if already handed off
    if (trip.status === 'handed_off' || trip.status === 'booked') {
      return NextResponse.json({
        success: false,
        error: 'Trip has already been handed off',
      }, { status: 400 });
    }

    // Update trip status to handed_off
    const updateRows = await prisma.$queryRaw<Record<string, unknown>[]>`
      UPDATE trips
       SET status = 'handed_off',
           handoff_requested_at = NOW(),
           handoff_notes = ${validated.notes || null},
           last_activity_at = NOW()
       WHERE id = ${trip.id as number}
       RETURNING *
    `;

    const updatedTrip = updateRows[0];

    // Log activity
    await prisma.$executeRaw`
      INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_name, metadata)
       VALUES (${trip.id as number}, 'handoff_requested', 'Requested handoff to Walla Walla Travel planning team', ${(trip.owner_name as string) || 'Anonymous'}, ${JSON.stringify({
        notes: validated.notes || null,
        owner_email: trip.owner_email,
      })})
    `;

    // Send notification emails (don't block on failure)
    try {
      // Notify staff
      await sendConsultationRequestNotification({
        tripTitle: trip.title as string,
        shareCode: trip.share_code as string,
        ownerName: trip.owner_name as string,
        ownerEmail: trip.owner_email as string,
        ownerPhone: trip.owner_phone as string,
        expectedGuests: (trip.expected_guests as number) || 2,
        startDate: trip.start_date as string,
        endDate: trip.end_date as string,
        notes: validated.notes,
        tripType: trip.trip_type as string,
        wineryCount: parseInt(trip.winery_count as string) || 0,
      });
      logger.info('Staff notification sent for consultation request', { shareCode, tripId: trip.id });

      // Send confirmation to customer if they provided email
      if (trip.owner_email) {
        await sendConsultationConfirmationToCustomer({
          customerEmail: trip.owner_email as string,
          customerName: trip.owner_name as string,
          tripTitle: trip.title as string,
          shareCode: trip.share_code as string,
        });
        logger.info('Customer confirmation sent for consultation request', { shareCode, email: trip.owner_email });
      }
    } catch (emailError) {
      // Log but don't fail the request if emails fail
      logger.error('Failed to send consultation notification emails', { error: emailError, shareCode });
    }

    // Sync to CRM (create contact + deal)
    if (trip.owner_email) {
      crmSyncService.syncConsultationToContact({
        tripId: trip.id as number,
        shareCode: trip.share_code as string,
        tripTitle: trip.title as string,
        ownerName: (trip.owner_name as string) || 'Unknown',
        ownerEmail: trip.owner_email as string,
        ownerPhone: trip.owner_phone as string,
        tripType: (trip.trip_type as string) || 'wine_tour',
        partySize: (trip.expected_guests as number) || 2,
        startDate: trip.start_date as string,
        endDate: trip.end_date as string,
        notes: validated.notes,
        brand: 'walla_walla_travel',
      }).catch(err => {
        logger.error('Failed to sync consultation to CRM', { error: err, tripId: trip.id, shareCode });
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Handoff request submitted successfully. Our team will be in touch soon!',
      data: {
        id: updatedTrip.id,
        share_code: updatedTrip.share_code,
        title: updatedTrip.title,
        status: updatedTrip.status,
        handoff_requested_at: updatedTrip.handoff_requested_at,
        handoff_notes: updatedTrip.handoff_notes,
      },
    });
  }
);
