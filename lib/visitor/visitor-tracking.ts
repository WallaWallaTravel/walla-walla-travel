/**
 * Visitor Tracking & Persistence
 * Tracks anonymous and identified visitors across sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/db';

export interface Visitor {
  id: number;
  visitor_uuid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  first_visit_at: Date;
  last_visit_at: Date;
  visit_count: number;
  total_queries: number;
  referral_source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  landing_page?: string | null;
  user_agent?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  converted_to_booking: boolean;
  total_bookings: number;
  total_revenue: string;
  preferences: Record<string, unknown>;
  gdpr_consent: boolean;
  marketing_consent: boolean;
}

interface VisitorCookieData {
  visitor_uuid: string;
  visit_count: number;
  last_visit: string;
}

const VISITOR_COOKIE_NAME = 'ww_visitor';
const VISITOR_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days

/**
 * Get or create visitor from request
 */
export async function getOrCreateVisitor(request: NextRequest): Promise<Visitor> {
  const cookieData = getVisitorCookie(request);
  
  if (cookieData?.visitor_uuid) {
    // Try to find existing visitor
    const visitor = await getVisitorByUUID(cookieData.visitor_uuid);
    if (visitor) {
      // Update visit tracking
      await updateVisitorVisit(visitor.id);
      return visitor;
    }
  }
  
  // Create new visitor
  return await createNewVisitor(request);
}

/**
 * Get visitor cookie from request
 */
function getVisitorCookie(request: NextRequest): VisitorCookieData | null {
  try {
    const cookie = request.cookies.get(VISITOR_COOKIE_NAME);
    if (!cookie) return null;
    
    return JSON.parse(cookie.value);
  } catch {
    return null;
  }
}

/**
 * Set visitor cookie in response
 */
export function setVisitorCookie(response: NextResponse, visitor: Visitor): void {
  const cookieData: VisitorCookieData = {
    visitor_uuid: visitor.visitor_uuid,
    visit_count: visitor.visit_count,
    last_visit: new Date().toISOString(),
  };
  
  response.cookies.set(VISITOR_COOKIE_NAME, JSON.stringify(cookieData), {
    httpOnly: false, // Allow JavaScript access for cross-tab sync
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get visitor by UUID
 */
export async function getVisitorByUUID(visitor_uuid: string): Promise<Visitor | null> {
  const result = await query(
    'SELECT * FROM visitors WHERE visitor_uuid = $1',
    [visitor_uuid]
  );
  
  return result.rows[0] || null;
}

/**
 * Get visitor by email
 */
export async function getVisitorByEmail(email: string): Promise<Visitor | null> {
  const result = await query(
    'SELECT * FROM visitors WHERE email = $1',
    [email]
  );
  
  return result.rows[0] || null;
}

/**
 * Create new visitor
 */
async function createNewVisitor(request: NextRequest): Promise<Visitor> {
  const visitor_uuid = uuidv4();
  const userAgent = request.headers.get('user-agent') || '';
  const deviceInfo = parseUserAgent(userAgent);
  
  // Get attribution from URL params
  const url = new URL(request.url);
  const attribution = {
    referral_source: request.headers.get('referer') || null,
    utm_source: url.searchParams.get('utm_source'),
    utm_medium: url.searchParams.get('utm_medium'),
    utm_campaign: url.searchParams.get('utm_campaign'),
    landing_page: url.pathname,
  };
  
  const result = await query(
    `INSERT INTO visitors (
      visitor_uuid, user_agent, device_type, browser, os,
      referral_source, utm_source, utm_medium, utm_campaign, landing_page
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      visitor_uuid,
      userAgent,
      deviceInfo.deviceType,
      deviceInfo.browser,
      deviceInfo.os,
      attribution.referral_source,
      attribution.utm_source,
      attribution.utm_medium,
      attribution.utm_campaign,
      attribution.landing_page,
    ]
  );
  
  return result.rows[0];
}

/**
 * Update visitor visit tracking
 */
async function updateVisitorVisit(visitorId: number): Promise<void> {
  await query(
    `UPDATE visitors 
     SET visit_count = visit_count + 1,
         last_visit_at = NOW()
     WHERE id = $1`,
    [visitorId]
  );
}

/**
 * Capture visitor email (progressive capture)
 */
export async function captureVisitorEmail(
  visitorId: number,
  email: string,
  name?: string,
  phone?: string
): Promise<Visitor> {
  const result = await query(
    `UPDATE visitors 
     SET email = $1, 
         name = COALESCE($2, name),
         phone = COALESCE($3, phone),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [email, name, phone, visitorId]
  );
  
  return result.rows[0];
}

/**
 * Log email capture attempt
 */
export async function logEmailCaptureAttempt(
  visitorId: number,
  triggerType: string,
  queryCount: number,
  captured: boolean,
  email?: string
): Promise<void> {
  await query(
    `INSERT INTO email_capture_attempts 
     (visitor_id, trigger_type, query_count_at_prompt, captured, email, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [visitorId, triggerType, queryCount, captured, email, captured ? new Date() : null]
  );
}

/**
 * Get visitor conversation history
 */
export async function getVisitorConversationHistory(
  visitorId: number,
  limit: number = 20
): Promise<Array<{ id: number; query_text: string; response_text: string; model: string; user_rating: number | null; created_at: Date }>> {
  const result = await query(
    `SELECT 
      id,
      query_text,
      response_text,
      model,
      user_rating,
      created_at
     FROM ai_queries
     WHERE visitor_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [visitorId, limit]
  );
  
  return result.rows;
}

/**
 * Update visitor preferences
 */
export async function updateVisitorPreferences(
  visitorId: number,
  preferences: Record<string, unknown>
): Promise<void> {
  await query(
    `UPDATE visitors 
     SET preferences = preferences || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(preferences), visitorId]
  );
}

/**
 * Parse user agent for device info
 */
function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();
  
  // Device type
  let deviceType = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    deviceType = 'mobile';
  }
  
  // Browser
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edge')) browser = 'Edge';
  
  // OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return { deviceType, browser, os };
}

/**
 * Track visitor conversion to booking
 */
export async function trackVisitorConversion(
  visitorId: number,
  bookingId: number,
  amount: number
): Promise<void> {
  await query(
    `UPDATE visitors 
     SET converted_to_booking = TRUE,
         first_booking_id = COALESCE(first_booking_id, $2),
         total_bookings = total_bookings + 1,
         total_revenue = total_revenue + $3,
         updated_at = NOW()
     WHERE id = $1`,
    [visitorId, bookingId, amount]
  );
}

