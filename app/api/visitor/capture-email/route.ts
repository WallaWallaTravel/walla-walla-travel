import { NextRequest, NextResponse } from 'next/server';
import { captureVisitorEmail, logEmailCaptureAttempt, getVisitorByUUID } from '@/lib/visitor/visitor-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/visitor/capture-email
 * Capture visitor email for progressive identification
 */
export async function POST(request: NextRequest) {
  try {
    const { visitor_uuid, email, name, phone, trigger_type, query_count } = await request.json();

    if (!visitor_uuid || !email) {
      return NextResponse.json(
        { error: 'visitor_uuid and email are required' },
        { status: 400 }
      );
    }

    // Get visitor
    const visitor = await getVisitorByUUID(visitor_uuid);
    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    // Capture email
    const updatedVisitor = await captureVisitorEmail(
      visitor.id,
      email,
      name,
      phone
    );

    // Log capture attempt
    await logEmailCaptureAttempt(
      visitor.id,
      trigger_type || 'manual',
      query_count || 0,
      true,
      email
    );

    console.log(`[Email Captured] ${email} for visitor ${visitor_uuid} via ${trigger_type}`);

    return NextResponse.json({
      success: true,
      visitor: {
        id: updatedVisitor.id,
        visitor_uuid: updatedVisitor.visitor_uuid,
        email: updatedVisitor.email,
        name: updatedVisitor.name,
      },
    });
  } catch (error: any) {
    console.error('Error capturing email:', error);
    return NextResponse.json(
      { error: 'Failed to capture email', details: error.message },
      { status: 500 }
    );
  }
}

