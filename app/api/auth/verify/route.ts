import { NextRequest } from 'next/server';
import { 
  successResponse, 
  errorResponse, 
  requireAuth,
  logApiRequest
} from '@/app/api/utils';

export async function GET(request: NextRequest) {
  try {
    logApiRequest('GET', '/api/auth/verify');

    // Check if user has valid session
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult; // This is an error response
    }
    const session = authResult;

    // Session is valid
    return successResponse({
      authenticated: true,
      user: {
        email: session.email,
        userId: session.userId,
        name: session.name,
      }
    }, 'Session is valid');

  } catch (error) {
    console.error('Session verification error:', error);
    return errorResponse('Session verification failed', 500);
  }
}

export async function POST(request: NextRequest) {
  // Alternative POST endpoint for session verification
  return GET(request);
}