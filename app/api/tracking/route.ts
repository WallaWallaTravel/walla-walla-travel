/**
 * Tracking API
 *
 * Lightweight endpoint for tracking:
 * - Booking attempts (abandoned carts)
 * - Page views
 * - Visitor sessions
 *
 * Called from frontend as user interacts with booking flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { bookingTrackingService } from '@/lib/services/booking-tracking.service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// Schemas
// ============================================================================

const TrackBookingSchema = z.object({
  sessionId: z.string().min(1),
  visitorId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  tourDate: z.string().optional(),
  startTime: z.string().optional(),
  durationHours: z.number().optional(),
  partySize: z.number().optional(),
  pickupLocation: z.string().optional(),
  selectedWineries: z.array(z.number()).optional(),
  stepReached: z.string().optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  brandId: z.number().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  referrer: z.string().optional(),
  landingPage: z.string().optional(),
});

const TrackPageViewSchema = z.object({
  sessionId: z.string().min(1),
  visitorId: z.string().optional(),
  pagePath: z.string().min(1),
  pageTitle: z.string().optional(),
  referrer: z.string().optional(),
});

const TrackSessionSchema = z.object({
  visitorId: z.string().min(1),
  sessionId: z.string().min(1),
  referrer: z.string().optional(),
  landingPage: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const action = body.action || 'booking';

    // Get user agent from headers
    const userAgent = request.headers.get('user-agent') || '';

    switch (action) {
      case 'booking': {
        const data = TrackBookingSchema.parse(body);
        const attempt = await bookingTrackingService.trackBookingAttempt({
          ...data,
          userAgent,
        });
        return NextResponse.json({ success: true, id: attempt.id });
      }

      case 'pageview': {
        const data = TrackPageViewSchema.parse(body);
        await bookingTrackingService.trackPageView(data);
        return NextResponse.json({ success: true });
      }

      case 'session': {
        const data = TrackSessionSchema.parse(body);
        const session = await bookingTrackingService.trackVisitorSession({
          ...data,
          userAgent,
        });
        return NextResponse.json({ success: true, id: session.id });
      }

      case 'booking_started': {
        const { sessionId } = body;
        if (sessionId) {
          await bookingTrackingService.markBookingStarted(sessionId);
        }
        return NextResponse.json({ success: true });
      }

      case 'converted': {
        const { sessionId, bookingId } = body;
        if (sessionId && bookingId) {
          await bookingTrackingService.markConverted(sessionId, bookingId);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    // Log but don't fail - tracking should never break the user experience
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Tracking error', { error: message });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    // Return success anyway - we don't want tracking issues to affect UX
    return NextResponse.json({ success: false, error: 'Tracking failed' });
  }
}
