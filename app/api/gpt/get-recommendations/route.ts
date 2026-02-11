/**
 * GPT Store API: Get Recommendations
 *
 * Provides personalized winery recommendations based on user preferences
 * Returns matched wineries with reasons and a suggested itinerary
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

interface WineryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  tasting_fee: number | null;
  average_visit_duration: number | null;
  website: string | null;
  reservation_required: boolean;
  specialties: string[] | null;
  features: string[] | null;
}

interface Preferences {
  wine_styles?: string[];
  atmosphere?: 'intimate' | 'lively' | 'rustic' | 'modern' | 'any';
  features?: string[];
  price_range?: 'budget' | 'moderate' | 'premium' | 'luxury';
}

interface WineryRecommendation {
  winery: {
    id: number;
    name: string;
    slug: string;
    description: string;
    address: string;
    city: string;
    tasting_fee: number | null;
    average_visit_duration: number;
    specialties: string[];
    features: string[];
  };
  match_score: number;
  match_reasons: string[];
}

interface ItineraryStop {
  order: number;
  winery_name: string;
  arrival_time: string;
  duration_minutes: number;
}

// CORS headers for ChatGPT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Price ranges for tasting fees
const PRICE_RANGES = {
  budget: { min: 0, max: 15 },
  moderate: { min: 15, max: 30 },
  premium: { min: 30, max: 50 },
  luxury: { min: 50, max: 999 }
};

// Atmosphere keywords mapping
const ATMOSPHERE_KEYWORDS: Record<string, string[]> = {
  intimate: ['boutique', 'small', 'family-owned', 'quiet', 'cozy'],
  lively: ['popular', 'music', 'events', 'groups', 'social'],
  rustic: ['barn', 'farmhouse', 'historic', 'estate', 'vineyard views'],
  modern: ['contemporary', 'sleek', 'urban', 'downtown', 'tasting room']
};

export const POST = withErrorHandling(async (request: NextRequest) => {
  let body = await request.json();

  // Handle case where body is a string (can happen in test environments)
  if (typeof body === 'string') {
    body = JSON.parse(body);
  }

  const {
    preferences = {} as Preferences,
    party_size = 4,
    tour_date,
    number_of_stops = 4
  } = body;

  // Validate number of stops
  const stops = Math.min(Math.max(number_of_stops, 2), 5);

  // Get all active wineries
  const result = await query<WineryRow>(
    `SELECT id, name, slug, description, address, city,
            tasting_fee, average_visit_duration, website,
            reservation_required, specialties, features
     FROM wineries
     WHERE is_active = true
     ORDER BY name`
  );

  // Score each winery based on preferences
  const scoredWineries: WineryRecommendation[] = result.rows.map(winery => {
    let score = 50; // Base score
    const matchReasons: string[] = [];

    // Check wine style preferences
    if (preferences.wine_styles && preferences.wine_styles.length > 0) {
      const winerySpecialties = winery.specialties || [];
      const matchedStyles = preferences.wine_styles.filter((style: string) =>
        winerySpecialties.some((s: string) => s.toLowerCase().includes(style.toLowerCase()))
      );
      if (matchedStyles.length > 0) {
        score += 20 * matchedStyles.length;
        matchReasons.push(`Specializes in ${matchedStyles.join(', ')}`);
      }
    }

    // Check feature preferences
    if (preferences.features && preferences.features.length > 0) {
      const wineryFeatures = winery.features || [];
      const matchedFeatures = preferences.features.filter((feature: string) =>
        wineryFeatures.some((f: string) => f.toLowerCase().includes(feature.toLowerCase())) ||
        (winery.description || '').toLowerCase().includes(feature.toLowerCase())
      );
      if (matchedFeatures.length > 0) {
        score += 15 * matchedFeatures.length;
        matchReasons.push(`Offers ${matchedFeatures.join(', ')}`);
      }
    }

    // Check atmosphere preference
    if (preferences.atmosphere && preferences.atmosphere !== 'any') {
      const keywords = ATMOSPHERE_KEYWORDS[preferences.atmosphere] || [];
      const description = (winery.description || '').toLowerCase();
      const features = (winery.features || []).map((f: string) => f.toLowerCase()).join(' ');
      const hasMatch = keywords.some((k: string) =>
        description.includes(k) || features.includes(k)
      );
      if (hasMatch) {
        score += 15;
        matchReasons.push(`${preferences.atmosphere.charAt(0).toUpperCase() + preferences.atmosphere.slice(1)} atmosphere`);
      }
    }

    // Check price range
    if (preferences.price_range && preferences.price_range in PRICE_RANGES) {
      const range = PRICE_RANGES[preferences.price_range as keyof typeof PRICE_RANGES];
      const fee = winery.tasting_fee || 0;
      if (fee >= range.min && fee <= range.max) {
        score += 10;
        matchReasons.push(`Fits ${preferences.price_range} budget`);
      }
    }

    // Add variety bonus for well-rounded recommendations
    if ((winery.specialties || []).length >= 3) {
      score += 5;
      matchReasons.push('Wide variety of wines');
    }

    // Default reason if no matches
    if (matchReasons.length === 0) {
      matchReasons.push('Highly rated winery in the region');
    }

    return {
      winery: {
        id: winery.id,
        name: winery.name,
        slug: winery.slug,
        description: winery.description || 'A wonderful winery experience.',
        address: winery.address || 'Walla Walla, WA',
        city: winery.city || 'Walla Walla',
        tasting_fee: winery.tasting_fee,
        average_visit_duration: winery.average_visit_duration || 60,
        specialties: winery.specialties || [],
        features: winery.features || []
      },
      match_score: Math.min(score, 100),
      match_reasons: matchReasons
    };
  });

  // Sort by score and take top recommendations
  const topRecommendations = scoredWineries
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, stops);

  // Build suggested itinerary
  const itineraryStops: ItineraryStop[] = [];
  let currentTime = new Date();
  currentTime.setHours(10, 0, 0, 0); // Start at 10 AM

  for (let i = 0; i < topRecommendations.length; i++) {
    const rec = topRecommendations[i];
    const duration = rec.winery.average_visit_duration;

    itineraryStops.push({
      order: i + 1,
      winery_name: rec.winery.name,
      arrival_time: currentTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      duration_minutes: duration
    });

    // Add duration + 20 min travel time
    currentTime = new Date(currentTime.getTime() + (duration + 20) * 60000);
  }

  // Calculate totals
  const totalDuration = topRecommendations.reduce((sum, r) =>
    sum + r.winery.average_visit_duration + 20, 0) / 60;
  const estimatedCostPerPerson = topRecommendations.reduce((sum, r) =>
    sum + (parseFloat(String(r.winery.tasting_fee)) || 20), 0);

  // Generate personalized message
  const hasPreferences = preferences.wine_styles?.length ||
    preferences.features?.length ||
    preferences.atmosphere;

  let message: string;
  if (hasPreferences) {
    const topMatch = topRecommendations[0];
    message = `Based on your preferences, I recommend visiting ${topRecommendations.length} wineries. ` +
      `${topMatch.winery.name} is your top match with a ${topMatch.match_score}% compatibility score. ` +
      `The complete tour would take about ${totalDuration.toFixed(1)} hours.`;
  } else {
    message = `Here are ${topRecommendations.length} highly-rated wineries for your visit. ` +
      `This tour would take approximately ${totalDuration.toFixed(1)} hours with an estimated ` +
      `cost of $${estimatedCostPerPerson} per person in tasting fees.`;
  }

  return NextResponse.json(
    {
      success: true,
      message,
      recommendations: topRecommendations,
      suggested_itinerary: {
        total_duration_hours: parseFloat(totalDuration.toFixed(1)),
        estimated_cost_per_person: estimatedCostPerPerson,
        party_size,
        tour_date: tour_date || 'Date TBD',
        stops: itineraryStops
      }
    },
    { headers: corsHeaders }
  );
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
