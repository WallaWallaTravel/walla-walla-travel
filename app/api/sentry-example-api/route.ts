import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const eventId = Sentry.captureException(
    new Error(`Sentry test error (server) — ${new Date().toISOString()}`)
  );

  return NextResponse.json({ ok: true, eventId });
}
