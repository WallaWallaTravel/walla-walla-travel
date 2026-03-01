import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const BodySchema = z.object({
  timestamp: z.string().max(100).optional(),
  type: z.string().max(100).optional(),
  url: z.string().max(2000).optional(),
  message: z.string().max(5000).optional(),
  stack: z.string().max(10000).optional(),
});

/**
 * POST /api/log-error
 * Logs client-side errors to a file for debugging
 */
export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
  const error = BodySchema.parse(await request.json());

  // Log to file
  const logPath = join(process.cwd(), 'logs', 'client-errors.log');
  const logEntry = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[${error.timestamp}] ${error.type}
URL: ${error.url}
Message: ${error.message}
${error.stack ? `Stack: ${error.stack}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Create logs directory if it doesn't exist
  const logsDir = join(process.cwd(), 'logs');
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  appendFileSync(logPath, logEntry);

  // Also log to structured logger
  logger.error('Client error', { clientError: error });

  return NextResponse.json({ success: true });
})
);


