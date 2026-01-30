import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { captureVisitorEmail, logEmailCaptureAttempt, getVisitorByUUID } from '@/lib/visitor/visitor-tracking';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/visitor/capture-email
 * Capture visitor email for progressive identification
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { visitor_uuid, email, name, phone, trigger_type, query_count } = await request.json();

  if (!visitor_uuid || !email) {
    throw new BadRequestError('visitor_uuid and email are required');
  }

  // Get visitor
  const visitor = await getVisitorByUUID(visitor_uuid);
  if (!visitor) {
    throw new NotFoundError('Visitor not found');
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

  logger.info('Email captured', { email, visitorUuid: visitor_uuid, triggerType: trigger_type });

  return NextResponse.json({
    success: true,
    visitor: {
      id: updatedVisitor.id,
      visitor_uuid: updatedVisitor.visitor_uuid,
      email: updatedVisitor.email,
      name: updatedVisitor.name,
    },
  });
});
