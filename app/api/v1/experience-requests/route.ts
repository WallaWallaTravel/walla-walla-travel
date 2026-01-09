/**
 * Experience Requests API - RESTful Endpoint
 * Concierge-style booking model: "Request This Experience"
 *
 * POST   /api/v1/experience-requests - Create new experience request
 * GET    /api/v1/experience-requests - List requests (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest, ValidationError } from '@/lib/api/validate';
import { rateLimiters } from '@/lib/api/middleware';
import {
  experienceRequestService,
  CreateExperienceRequestSchema,
} from '@/lib/services/experience-request.service';
import { ServiceError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// POST /api/v1/experience-requests - Create new experience request
// ============================================================================

/**
 * Create a new experience request (concierge booking)
 *
 * Body: {
 *   contact_name: string,
 *   contact_email: string,
 *   contact_phone?: string,
 *   party_size: number (1-50),
 *   preferred_date: string (YYYY-MM-DD),
 *   alternate_date?: string,
 *   preferred_time?: 'morning' | 'afternoon' | 'flexible',
 *   winery_ids?: number[],
 *   experience_type?: 'wine_tour' | 'private_tasting' | 'group_event' | 'corporate',
 *   special_requests?: string,
 *   dietary_restrictions?: string,
 *   accessibility_needs?: string,
 *   occasion?: string,
 *   brand?: 'wwt' | 'nwtc' | 'hcwt',
 *   source?: 'website' | 'chatgpt' | 'phone' | 'email' | 'referral',
 *   source_session_id?: string
 * }
 *
 * Response: {
 *   success: true,
 *   data: ExperienceRequest,
 *   meta: {
 *     request_number: string,
 *     message: string,
 *     next_steps: string[]
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting (public endpoint)
  const rateLimitResult = await rateLimiters.public(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Validate request body
    const data = await validateRequest(CreateExperienceRequestSchema, request);

    // Create experience request via service
    const experienceRequest = await experienceRequestService.create(data);

    // Build response with helpful next steps
    const responseData = {
      ...experienceRequest,
      next_steps: [
        'We\'ll contact you within 24 hours to discuss your tour',
        'We\'ll coordinate all winery reservations on your behalf',
        'You\'ll receive a complete itinerary once confirmed',
        'No payment required until your experience is finalized',
      ],
    };

    return APIResponse.success(responseData, {
      request_number: experienceRequest.request_number,
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return APIResponse.validation(error.errors);
    }

    // Handle service errors
    if (error instanceof ServiceError) {
      return APIResponse.error({
        code: error.code,
        message: error.message,
        details: error.details,
      }, 400);
    }

    // Handle unexpected errors
    return APIResponse.internalError(
      'Failed to submit experience request',
      error instanceof Error ? error.message : undefined
    );
  }
}

// ============================================================================
// GET /api/v1/experience-requests - List requests (admin)
// ============================================================================

/**
 * List experience requests with filters (admin only)
 *
 * Query Params:
 * - status: Filter by status (new, contacted, in_progress, confirmed, declined, completed, cancelled)
 * - brand: Filter by brand (wwt, nwtc, hcwt)
 * - source: Filter by source (website, chatgpt, phone, email, referral)
 * - assigned_to: Filter by assigned staff ID
 * - from_date: Filter by preferred_date >= value
 * - to_date: Filter by preferred_date <= value
 * - limit: Results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting (authenticated endpoint)
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters = {
      status: searchParams.get('status') as 'new' | 'contacted' | 'in_progress' | 'confirmed' | 'declined' | 'completed' | 'cancelled' | undefined,
      brand: searchParams.get('brand') as 'wwt' | 'nwtc' | 'hcwt' | undefined,
      source: searchParams.get('source') as 'website' | 'chatgpt' | 'phone' | 'email' | 'referral' | undefined,
      assignedTo: searchParams.get('assigned_to')
        ? parseInt(searchParams.get('assigned_to')!, 10)
        : undefined,
      fromDate: searchParams.get('from_date') || undefined,
      toDate: searchParams.get('to_date') || undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : 0,
    };

    // Get requests from service
    const result = await experienceRequestService.findMany(filters);

    return APIResponse.success(result.requests, {
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
      page: Math.floor(filters.offset / filters.limit) + 1,
      pages: Math.ceil(result.total / filters.limit),
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return APIResponse.error({
        code: error.code,
        message: error.message,
        details: error.details,
      }, 400);
    }

    return APIResponse.internalError(
      'Failed to fetch experience requests',
      error instanceof Error ? error.message : undefined
    );
  }
}
