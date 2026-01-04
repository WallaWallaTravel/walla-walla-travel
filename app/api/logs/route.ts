import { NextRequest, NextResponse } from 'next/server';

/**
 * Development-only endpoint for viewing application logs
 * GET /api/logs - Get recent logs
 * DELETE /api/logs - Clear log buffer
 *
 * Note: Log buffering not implemented - logs go directly to console.
 * Use your terminal or log aggregation service to view logs.
 */

export async function GET(_request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: 'Log buffering not implemented. Logs are sent directly to console.',
    hint: 'View logs in your terminal or configure a log aggregation service.',
    development_tip: 'Run `npm run dev` and watch the terminal output',
  });
}

export async function DELETE(_request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: 'Log buffering not implemented. Nothing to clear.',
  });
}
