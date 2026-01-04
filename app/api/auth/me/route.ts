/**
 * Get Current User API
 * GET /api/auth/me
 *
 * Returns current authenticated user or 401
 *
 * ✅ REFACTORED: Structured logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: session.user,
    });
  } catch (error) {
    logger.error('Auth Me error', { error });
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

