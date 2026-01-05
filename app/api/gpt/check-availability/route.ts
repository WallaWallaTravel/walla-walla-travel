/**
 * GPT Store API: Check Availability
 *
 * Allows ChatGPT to check tour availability for specific dates
 * Returns available tour options with pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';

interface BookingRow {
  id: number;
  tour_date: string;
  party_size: number;
}

interface TourOption {
  tour_type: string;
  name: string;
  description: string;
  duration_hours: number;
  price_per_person: number;
  total_price: number;
  includes: string[];
  available_times: string[];
}

// CORS headers for ChatGPT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Tour pricing configuration
const TOUR_OPTIONS: TourOption[] = [
  {
    tour_type: 'wine_tour',
    name: 'Classic Wine Tour',
    description: 'Visit 4-5 handpicked wineries with a knowledgeable driver. Includes transportation and bottled water.',
    duration_hours: 6,
    price_per_person: 125,
    total_price: 0, // Calculated dynamically
    includes: ['Luxury transportation', 'Professional driver', 'Bottled water', 'Cooler for purchases'],
    available_times: ['10:00 AM', '11:00 AM']
  },
  {
    tour_type: 'private_transportation',
    name: 'Private Transportation',
    description: 'Hourly private transportation service. You choose the wineries, we provide the safe ride.',
    duration_hours: 5,
    price_per_person: 85,
    total_price: 0,
    includes: ['Luxury vehicle', 'Professional driver', 'Flexible itinerary', 'Bottled water'],
    available_times: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM']
  },
  {
    tour_type: 'bachelorette',
    name: 'Celebration Package',
    description: 'Perfect for bachelorette parties, birthdays, and special celebrations. Includes champagne toast!',
    duration_hours: 7,
    price_per_person: 165,
    total_price: 0,
    includes: ['Luxury sprinter van', 'Champagne toast', 'Snacks', 'Photo stops', 'Celebration decor'],
    available_times: ['10:00 AM', '11:00 AM']
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const partySizeStr = searchParams.get('party_size');

    // Validate required parameters
    if (!dateStr) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide a tour date (e.g., 2024-06-15).',
          available: false,
          tour_options: []
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!partySizeStr) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide the party size (number of guests).',
          available: false,
          tour_options: []
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const tourDate = new Date(dateStr);
    const partySize = parseInt(partySizeStr);

    // Validate date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tourDate < today) {
      return NextResponse.json(
        {
          success: false,
          message: 'The requested date is in the past. Please choose a future date.',
          available: false,
          tour_options: []
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate party size
    if (partySize < 1 || partySize > 14) {
      return NextResponse.json(
        {
          success: false,
          message: 'Party size must be between 1 and 14 guests. For larger groups, please contact us directly.',
          available: false,
          tour_options: []
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check existing bookings for that date
    const existingBookings = await query<BookingRow>(
      `SELECT id, tour_date, party_size FROM bookings
       WHERE tour_date = $1 AND status NOT IN ('cancelled')`,
      [dateStr]
    );

    // Calculate capacity (simplified - assume 3 vehicles with 14 capacity each)
    const maxDailyCapacity = 42;
    const bookedCapacity = existingBookings.rows.reduce((sum, b) => sum + b.party_size, 0);
    const remainingCapacity = maxDailyCapacity - bookedCapacity;

    const isAvailable = remainingCapacity >= partySize;

    // Prepare tour options with dynamic pricing
    const tourOptions: TourOption[] = isAvailable
      ? TOUR_OPTIONS.map(option => ({
          ...option,
          total_price: option.price_per_person * partySize
        }))
      : [];

    // Find next available date if not available
    let nextAvailableDate: string | null = null;
    if (!isAvailable) {
      // Check next 14 days
      for (let i = 1; i <= 14; i++) {
        const checkDate = new Date(tourDate);
        checkDate.setDate(checkDate.getDate() + i);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        const checkBookings = await query<BookingRow>(
          `SELECT SUM(party_size) as booked FROM bookings
           WHERE tour_date = $1 AND status NOT IN ('cancelled')`,
          [checkDateStr]
        );

        const bookedOnDay = checkBookings.rows[0]?.party_size || 0;
        if ((maxDailyCapacity - bookedOnDay) >= partySize) {
          nextAvailableDate = checkDateStr;
          break;
        }
      }
    }

    // Format date for display
    const formattedDate = tourDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate human-friendly message
    let message: string;
    if (isAvailable) {
      message = `Great news! Wine tours are available on ${formattedDate} for ${partySize} ${partySize === 1 ? 'guest' : 'guests'}. We have ${tourOptions.length} tour options starting from $${Math.min(...tourOptions.map(t => t.price_per_person))} per person.`;
    } else if (nextAvailableDate) {
      const nextDate = new Date(nextAvailableDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      message = `Unfortunately, ${formattedDate} is fully booked for ${partySize} guests. The next available date is ${nextDate}.`;
    } else {
      message = `Unfortunately, ${formattedDate} is fully booked. Please try a different date or contact us for assistance.`;
    }

    return NextResponse.json(
      {
        success: true,
        message,
        date: dateStr,
        party_size: partySize,
        available: isAvailable,
        tour_options: tourOptions,
        next_available_date: nextAvailableDate
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('GPT check-availability error', { error });
    return NextResponse.json(
      {
        success: false,
        message: 'Unable to check availability at this time. Please try again.',
        available: false,
        tour_options: []
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
