/**
 * Admin: Invite Business
 * Create a new business and generate unique code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBusiness } from '@/lib/business-portal/business-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/businesses/invite
 * Invite a new business to the portal
 */
export async function POST(request: NextRequest) {
  try {
    const {
      business_type,
      name,
      contact_name,
      contact_email,
      contact_phone,
      website
    } = await request.json();
    
    // Validation
    if (!business_type || !name || !contact_email) {
      return NextResponse.json(
        { error: 'business_type, name, and contact_email are required' },
        { status: 400 }
      );
    }
    
    if (!['winery', 'restaurant', 'hotel', 'activity', 'other'].includes(business_type)) {
      return NextResponse.json(
        { error: 'Invalid business_type' },
        { status: 400 }
      );
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // Create business
    const business = await createBusiness({
      business_type,
      name,
      contact_name,
      contact_email,
      contact_phone,
      website,
      invited_by: 1 // TODO: Get from auth session
    });
    
    // In production: Send invitation email with unique code
    
    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        unique_code: business.unique_code,
        contact_email: business.contact_email,
        portal_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/contribute/${business.unique_code}`
      },
      message: 'Business invited successfully!'
    });
    
  } catch (error: any) {
    console.error('[Admin Invite Business] Error:', error);
    return NextResponse.json(
      { error: 'Failed to invite business', details: error.message },
      { status: 500 }
    );
  }
}

