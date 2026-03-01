import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { captureVisitorEmail, logEmailCaptureAttempt, getVisitorByUUID } from '@/lib/visitor/visitor-tracking';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';

const BodySchema = z.object({
  visitor_uuid: z.string().min(1).max(255),
  email: z.string().email().max(255),
  name: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  trigger_type: z.string().max(100).optional(),
  query_count: z.number().int().nonnegative().optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/visitor/capture-email
 * Capture visitor email for progressive identification
 */
export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
  const { visitor_uuid, email, name, phone, trigger_type, query_count } = BodySchema.parse(await request.json());

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
})
);
