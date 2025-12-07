import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { partnerService } from '@/lib/services/partner.service';

const SetupSchema = z.object({
  token: z.string().min(1, 'Setup token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/partner/setup
 * Complete partner account setup (set password)
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody(request, SetupSchema);

  await partnerService.completeSetup(data.token, data.password);

  return NextResponse.json({
    success: true,
    message: 'Account setup complete. You can now sign in.',
    timestamp: new Date().toISOString(),
  });
});

