import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/distance
 * Calculate travel time and distance between two addresses using Google Distance Matrix API
 * Requires authentication. Rate-limited to protect Google Maps API costs.
 */
export const GET = withRateLimit(rateLimiters.maps)(
  withAuth(async (request: NextRequest, _session) => {
    const { searchParams } = request.nextUrl;
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      logger.warn('Google Maps API key not configured, using fallback estimation');
      return NextResponse.json({
        duration: 900,
        distance: 16000,
        estimated: true,
      });
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || data.rows[0].elements[0].status !== 'OK') {
      logger.error('Google Distance Matrix API error', { response: data });
      return NextResponse.json({
        duration: 900,
        distance: 16000,
        estimated: true,
      });
    }

    const element = data.rows[0].elements[0];

    return NextResponse.json({
      duration: element.duration.value,
      distance: element.distance.value,
      durationText: element.duration.text,
      distanceText: element.distance.text,
      estimated: false,
    });
  })
);
