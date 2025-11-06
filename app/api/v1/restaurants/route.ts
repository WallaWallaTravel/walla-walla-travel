/**
 * API v1 - Restaurants
 * GET /api/v1/restaurants
 */

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  menu_url: string;
  is_partner: boolean;
  is_active: boolean;
}

export const GET = withErrorHandling(async () => {
  const restaurants = await queryMany<Restaurant>(`
    SELECT 
      id,
      name,
      cuisine_type,
      address,
      phone,
      email,
      website,
      menu_url,
      is_partner,
      is_active
    FROM restaurants
    WHERE is_active = true
    ORDER BY name
  `);

  return NextResponse.json({
    version: 'v1',
    data: restaurants,
    count: restaurants.length,
  }, {
    headers: {
      'X-API-Version': 'v1',
    }
  });
});

