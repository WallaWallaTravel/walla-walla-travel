import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { query } from '@/lib/db';
import { requestHandoffSchema } from '@/lib/validation/schemas/trip';
import { sendConsultationRequestNotification, sendConsultationConfirmationToCustomer } from '@/lib/email';
import { logger } from '@/lib/logger';

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
    const tripResult = await query(
      `SELECT t.id, t.title, t.owner_name, t.owner_email, t.owner_phone, t.status,
              t.trip_type, t.start_date, t.end_date, t.expected_guests, t.share_code,
              (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id AND stop_type = 'winery') as winery_count
       FROM trips t WHERE t.share_code = $1`,
      [shareCode]
    );

    if (tripResult.rows.length === 0) {
      throw new NotFoundError('Trip not found');
    }

    const trip = tripResult.rows[0];

    // Check if already handed off
    if (trip.status === 'handed_off' || trip.status === 'booked') {
      return NextResponse.json({
        success: false,
        error: 'Trip has already been handed off',
      }, { status: 400 });
    }

    // Update trip status to handed_off
    const updateResult = await query(
      `UPDATE trips
       SET status = 'handed_off',
           handoff_requested_at = NOW(),
           handoff_notes = $2,
           last_activity_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [trip.id, validated.notes || null]
    );

    const updatedTrip = updateResult.rows[0];

    // Log activity
    await query(
      `INSERT INTO trip_activity_log (trip_id, activity_type, description, actor_name, metadata)
       VALUES ($1, 'handoff_requested', 'Requested handoff to Walla Walla Travel planning team', $2, $3)`,
      [
        trip.id,
        trip.owner_name || 'Anonymous',
        JSON.stringify({
          notes: validated.notes || null,
          owner_email: trip.owner_email,
        }),
      ]
    );

    // Send notification emails (don't block on failure)
    try {
      // Notify staff
      await sendConsultationRequestNotification({
        tripTitle: trip.title,
        shareCode: trip.share_code,
        ownerName: trip.owner_name,
        ownerEmail: trip.owner_email,
        ownerPhone: trip.owner_phone,
        expectedGuests: trip.expected_guests || 2,
        startDate: trip.start_date,
        endDate: trip.end_date,
        notes: validated.notes,
        tripType: trip.trip_type,
        wineryCount: parseInt(trip.winery_count) || 0,
      });
      logger.info('Staff notification sent for consultation request', { shareCode, tripId: trip.id });

      // Send confirmation to customer if they provided email
      if (trip.owner_email) {
        await sendConsultationConfirmationToCustomer({
          customerEmail: trip.owner_email,
          customerName: trip.owner_name,
          tripTitle: trip.title,
          shareCode: trip.share_code,
        });
        logger.info('Customer confirmation sent for consultation request', { shareCode, email: trip.owner_email });
      }
    } catch (emailError) {
      // Log but don't fail the request if emails fail
      logger.error('Failed to send consultation notification emails', { error: emailError, shareCode });
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
