import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { SignJWT } from 'jose';

// Use same secret as lib/auth/session.ts (which middleware uses)
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-change-in-production-minimum-32-chars'
);

/**
 * GET /api/auth/dev-login
 * 
 * DEV ONLY - Auto-login for testing/automation
 * Only works in development mode
 * 
 * Usage: http://localhost:4001/api/auth/dev-login?redirect=/admin/dashboard
 * Usage: http://localhost:4001/api/auth/dev-login?role=driver&redirect=/driver-portal/dashboard
 */
export async function GET(request: NextRequest) {
  // SECURITY: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const redirect = searchParams.get('redirect') || '/admin/dashboard';
  const role = searchParams.get('role') || 'admin'; // admin or driver

  try {
    // Find a user with the requested role
    const userResult = await query(
      `SELECT id, email, name, role FROM users WHERE role = $1 AND is_active = true LIMIT 1`,
      [role]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: `No active ${role} user found` },
        { status: 404 }
      );
    }

    const dbUser = userResult.rows[0];

    // Create session token matching lib/auth/session.ts format
    // (which is used by the middleware for route protection)
    const token = await new SignJWT({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      }
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SESSION_SECRET);

    // Create redirect response
    const baseUrl = request.nextUrl.origin;
    const response = NextResponse.redirect(new URL(redirect, baseUrl));
    
    // Set cookie directly on response
    response.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: false, // Dev only
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('[Dev Login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create dev session', details: String(error) },
      { status: 500 }
    );
  }
}
