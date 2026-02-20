import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { lodgingClickService } from '@/lib/services/lodging-click.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RecordClickSchema = z.object({
  property_id: z.number().int().positive(),
  property_slug: z.string().optional(),
  platform: z.string().optional(),
  referrer: z.string().optional(),
  session_id: z.string().optional(),
});

/**
 * POST /api/lodging/clicks
 * Record a click when a user is redirected to a booking platform.
 * No authentication required -- called from the redirect route.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  const parseResult = RecordClickSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 422 });
  }

  const data = parseResult.data;

  const userAgent = request.headers.get('user-agent') || undefined;
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : undefined;

  const click = await lodgingClickService.recordClick({
    property_id: data.property_id,
    property_slug: data.property_slug,
    platform: data.platform,
    referrer: data.referrer,
    user_agent: userAgent,
    ip_address: ipAddress,
    session_id: data.session_id,
  });

  return NextResponse.json({
    success: true,
    data: {
      click_id: click.id,
    },
    timestamp: new Date().toISOString(),
  });
});
