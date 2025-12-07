/**
 * Simple test endpoint to verify API routes are working
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API routes are working!",
    timestamp: new Date().toISOString(),
    openapi_endpoint: "/api/openapi"
  });
}




