/**
 * Knowledge Base Draft Booking API
 *
 * POST /api/kb/booking - Create a draft booking from chat session
 * GET /api/kb/booking?id=xxx - Get draft booking details
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { validateBody, validateQuery } from '@/lib/api/middleware/validation';
import { kbService } from '@/lib/services/kb.service';

// ============================================================================
// Request Schemas
// ============================================================================

const CreateDraftBookingSchema = z.object({
  // Required: Chat session to pull data from
  session_id: z.string().uuid(),

  // Customer info
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Valid email is required'),
  customer_phone: z.string().optional(),

  // Optional overrides (if not pulling from trip state)
  trip_start_date: z.string().optional(),
  trip_end_date: z.string().optional(),
  party_size: z.number().int().positive().optional(),
  party_type: z.string().optional(),
  special_occasion: z.string().optional(),
  special_requests: z.string().optional(),
});

const GetDraftBookingSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// POST Handler - Create draft booking
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody(request, CreateDraftBookingSchema);

  // Get chat session
  const session = await kbService.getChatSession(data.session_id);
  if (!session) {
    throw new NotFoundError(`Chat session ${data.session_id} not found`);
  }

  // Get trip state
  const tripState = await kbService.getOrCreateTripState(data.session_id);

  // Determine trip details (from request or trip state)
  const startDate = data.trip_start_date || tripState.start_date?.toISOString().split('T')[0];
  const endDate = data.trip_end_date || tripState.end_date?.toISOString().split('T')[0];
  const partySize = data.party_size || tripState.party_size || 2;
  const partyType = data.party_type || tripState.party_type;
  const specialOccasion = data.special_occasion || tripState.special_occasion;

  if (!startDate || !endDate) {
    throw new BadRequestError('Trip dates are required. Please specify trip_start_date and trip_end_date.');
  }

  // Calculate number of days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (days < 1) {
    throw new BadRequestError('End date must be after start date');
  }

  // Count wineries in selections
  const wineryCount = (tripState.selections || []).filter(
    (s: Record<string, unknown>) => s.type === 'winery'
  ).length;

  // Calculate tour cost
  const costEstimate = await kbService.calculateTourCost(days, partySize, wineryCount);

  // Create draft booking
  const draftBooking = await kbService.createDraftBooking({
    chat_session_id: data.session_id,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone,
    trip_start_date: startDate,
    trip_end_date: endDate,
    party_size: partySize,
    party_type: partyType,
    special_occasion: specialOccasion,
    special_requests: data.special_requests,
    itinerary_summary: {
      wineries: (tripState.selections || [])
        .filter((s: Record<string, unknown>) => s.type === 'winery')
        .map((s: Record<string, unknown>) => s.businessName),
      restaurants: (tripState.selections || [])
        .filter((s: Record<string, unknown>) => s.type === 'restaurant')
        .map((s: Record<string, unknown>) => s.businessName),
      activities: (tripState.selections || [])
        .filter((s: Record<string, unknown>) => s.type === 'activity')
        .map((s: Record<string, unknown>) => s.businessName),
    },
    preferences: tripState.preferences || {},
    cost_transportation: costEstimate.transportation,
    cost_guide: costEstimate.guide,
    cost_activities: 0, // Would be calculated from selections
    cost_tour_total: costEstimate.tourTotal,
    deposit_amount: costEstimate.depositAmount,
  });

  // Update trip state to mark as ready for deposit
  await kbService.updateTripState(data.session_id, {
    ready_for_deposit: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      draft_booking: {
        id: draftBooking.id,
        status: draftBooking.status,
        customer: {
          name: draftBooking.customer_name,
          email: draftBooking.customer_email,
          phone: draftBooking.customer_phone,
        },
        trip: {
          start_date: draftBooking.trip_start_date,
          end_date: draftBooking.trip_end_date,
          days,
          party_size: draftBooking.party_size,
          party_type: draftBooking.party_type,
          special_occasion: draftBooking.special_occasion,
        },
        cost_breakdown: {
          transportation: costEstimate.transportation,
          guide: costEstimate.guide,
          tour_total: costEstimate.tourTotal,
          tbd_tastings: costEstimate.tbdTastings,
          tbd_dining: costEstimate.tbdDining,
        },
        deposit: {
          percentage: 50,
          amount: costEstimate.depositAmount,
        },
        itinerary_summary: draftBooking.itinerary_summary,
      },
    },
    message: 'Draft booking created. Ready for deposit collection.',
  });
});

// ============================================================================
// GET Handler - Get draft booking details
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { id } = validateQuery(request, GetDraftBookingSchema);

  const draftBooking = await kbService.getDraftBooking(id);
  if (!draftBooking) {
    throw new NotFoundError(`Draft booking ${id} not found`);
  }

  // Calculate days
  const start = new Date(draftBooking.trip_start_date);
  const end = new Date(draftBooking.trip_end_date);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return NextResponse.json({
    success: true,
    data: {
      draft_booking: {
        id: draftBooking.id,
        status: draftBooking.status,
        customer: {
          name: draftBooking.customer_name,
          email: draftBooking.customer_email,
          phone: draftBooking.customer_phone,
        },
        trip: {
          start_date: draftBooking.trip_start_date,
          end_date: draftBooking.trip_end_date,
          days,
          party_size: draftBooking.party_size,
          party_type: draftBooking.party_type,
          special_occasion: draftBooking.special_occasion,
        },
        cost_breakdown: {
          transportation: draftBooking.cost_transportation,
          guide: draftBooking.cost_guide,
          activities: draftBooking.cost_activities,
          tour_total: draftBooking.cost_tour_total,
          tbd_tastings: draftBooking.tbd_tastings_estimate,
          tbd_dining: draftBooking.tbd_dining_estimate,
        },
        deposit: {
          percentage: draftBooking.deposit_percentage * 100,
          base_amount: draftBooking.deposit_base_amount,
          amount: draftBooking.deposit_amount,
          status: draftBooking.deposit_paid_at ? 'paid' : 'pending',
          paid_at: draftBooking.deposit_paid_at,
        },
        itinerary_summary: draftBooking.itinerary_summary,
        preferences: draftBooking.preferences,
        special_requests: draftBooking.special_requests,
        created_at: draftBooking.created_at,
        updated_at: draftBooking.updated_at,
      },
    },
  });
});

