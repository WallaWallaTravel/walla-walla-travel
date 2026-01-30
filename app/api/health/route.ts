import { successResponse } from '@/app/api/utils';
import { healthCheck } from '@/lib/db';
import { withErrorHandling, ServiceUnavailableError } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async () => {
  // Check database connection
  const dbHealthy = await healthCheck();

  if (!dbHealthy) {
    throw new ServiceUnavailableError('Database connection failed');
  }

  return successResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    version: '1.0.0',
    message: 'Travel Suite API is running'
  }, 'API is healthy', 10); // Cache for 10 seconds
});