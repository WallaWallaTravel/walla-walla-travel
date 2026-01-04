import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/distance
 * Calculate travel time and distance between two addresses using Google Distance Matrix API
 */
export async function GET(request: NextRequest) {
  try {
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
      // Fallback: estimate 15 minutes per 10 miles
      logger.warn('Google Maps API key not configured, using fallback estimation');
      return NextResponse.json({
        duration: 900, // 15 minutes in seconds
        distance: 16000, // ~10 miles in meters
        estimated: true
      });
    }

    // Call Google Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || data.rows[0].elements[0].status !== 'OK') {
      logger.error('Google Distance Matrix API error', { response: data });
      // Fallback estimation
      return NextResponse.json({
        duration: 900, // 15 minutes
        distance: 16000, // ~10 miles
        estimated: true
      });
    }

    const element = data.rows[0].elements[0];
    
    return NextResponse.json({
      duration: element.duration.value, // in seconds
      distance: element.distance.value, // in meters
      durationText: element.duration.text,
      distanceText: element.distance.text,
      estimated: false
    });

  } catch (error) {
    logger.error('Error calculating distance', { error });
    // Fallback estimation
    return NextResponse.json({
      duration: 900, // 15 minutes
      distance: 16000, // ~10 miles
      estimated: true
    });
  }
}




