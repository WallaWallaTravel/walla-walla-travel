import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /stay/[slug]
 *
 * Smart redirect for lodging booking tracking:
 * 1. Looks up lodging property by slug
 * 2. Logs the click for revenue attribution
 * 3. Redirects to property's booking URL
 *
 * Usage: <a href="/stay/marcus-whitman-hotel">Book Now</a>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Look up lodging property by slug
    const propertyResult = await query(
      `SELECT id, name, slug, booking_url, booking_platform, is_active
       FROM lodging_properties
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    const property = propertyResult.rows[0];

    if (!property) {
      logger.warn(`[Lodging Redirect] Property not found: ${slug}`);
      return NextResponse.redirect(new URL('/stays', request.url));
    }

    if (!property.is_active) {
      logger.warn(`[Lodging Redirect] Property inactive: ${slug}`);
      return NextResponse.redirect(new URL('/stays', request.url));
    }

    // Get tracking metadata from request
    const referrer = request.headers.get('referer') || null;
    const userAgent = request.headers.get('user-agent') || null;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || null;

    // Log the click for analytics (non-blocking)
    try {
      await query(
        `INSERT INTO lodging_clicks (
          property_id, property_slug, platform, referrer, user_agent, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [property.id, property.slug, property.booking_platform || null, referrer, userAgent, ip]
      );
    } catch (logError) {
      // Don't block redirect if logging fails - table might not exist yet
      logger.warn(`[Lodging Redirect] Failed to log click: ${logError}`);
    }

    logger.info(`[Lodging Redirect] ${property.name} (${slug}) -> ${property.booking_url || 'no booking URL'}`, {
      property_id: property.id,
      platform: property.booking_platform,
      referrer,
    });

    // Determine destination URL
    if (!property.booking_url) {
      // No booking URL - redirect to property detail page
      return NextResponse.redirect(new URL(`/stays/${slug}`, request.url), {
        status: 302,
      });
    }

    // Ensure destination is a full URL
    const redirectUrl = property.booking_url.startsWith('http')
      ? property.booking_url
      : `https://${property.booking_url}`;

    // Redirect to property's booking page
    return NextResponse.redirect(redirectUrl, {
      status: 302, // Temporary redirect (allows tracking changes)
    });
  } catch (error) {
    logger.error(`[Lodging Redirect] Error for ${slug}:`, { error });
    // On error, redirect to property page
    return NextResponse.redirect(new URL(`/stays/${slug}`, request.url));
  }
}
