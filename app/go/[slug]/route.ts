import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /go/[slug]
 *
 * Smart redirect for booking tracking:
 * 1. Looks up winery by slug
 * 2. Logs the click for revenue attribution
 * 3. Redirects to winery's website/booking page
 *
 * Usage: <a href="/go/sleight-of-hand">Book Tasting</a>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Look up winery by slug
    const wineryResult = await query(
      `SELECT id, name, slug, website, is_active
       FROM wineries
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    const winery = wineryResult.rows[0];

    if (!winery) {
      logger.warn(`[Booking Redirect] Winery not found: ${slug}`);
      // Redirect to wineries listing if not found
      return NextResponse.redirect(new URL('/wineries', request.url));
    }

    if (!winery.is_active) {
      logger.warn(`[Booking Redirect] Winery inactive: ${slug}`);
      return NextResponse.redirect(new URL('/wineries', request.url));
    }

    // Get tracking metadata from request
    const referrer = request.headers.get('referer') || null;
    const userAgent = request.headers.get('user-agent') || null;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || null;

    // Log the click for analytics
    try {
      await query(
        `INSERT INTO booking_clicks (
          winery_id, winery_slug, referrer, user_agent, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [winery.id, winery.slug, referrer, userAgent, ip]
      );
    } catch (logError) {
      // Don't block redirect if logging fails - table might not exist yet
      logger.warn(`[Booking Redirect] Failed to log click: ${logError}`);
    }

    logger.info(`[Booking Redirect] ${winery.name} (${slug}) → ${winery.website || 'no website'}`, {
      winery_id: winery.id,
      referrer,
    });

    // Determine destination URL
    const destination = winery.website || `https://wallawalla.travel/wineries/${slug}`;

    // Validate and normalize the URL
    let redirectUrl: string;
    try {
      const normalized = destination.startsWith('http') ? destination : `https://${destination}`;
      const parsed = new URL(normalized);
      // Only allow http/https protocols, block localhost and private IPs
      if (
        (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
        /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)
      ) {
        logger.warn(`[Booking Redirect] Blocked unsafe URL for ${slug}: ${destination}`);
        return NextResponse.redirect(new URL(`/wineries/${slug}`, request.url));
      }
      redirectUrl = parsed.href;
    } catch {
      logger.warn(`[Booking Redirect] Invalid URL for ${slug}: ${destination}`);
      return NextResponse.redirect(new URL(`/wineries/${slug}`, request.url));
    }

    // Redirect to winery's website
    return NextResponse.redirect(redirectUrl, {
      status: 302, // Temporary redirect (allows tracking changes)
    });
  } catch (error) {
    logger.error(`[Booking Redirect] Error for ${slug}:`, { error });
    // On error, redirect to winery page
    return NextResponse.redirect(new URL(`/wineries/${slug}`, request.url));
  }
}
