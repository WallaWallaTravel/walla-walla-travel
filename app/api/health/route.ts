import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/app/api/utils';
import { healthCheck } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const dbHealthy = await healthCheck();
    
    if (!dbHealthy) {
      return errorResponse('Database connection failed', 503);
    }

    return successResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0',
      message: 'Travel Suite API is running'
    }, 'API is healthy');
    
  } catch (error) {
    console.error('Health check failed:', error);
    return errorResponse('Health check failed', 503);
  }
}