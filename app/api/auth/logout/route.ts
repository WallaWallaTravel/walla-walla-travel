import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { successResponse, logApiRequest } from '@/app/api/utils';

export async function POST(request: NextRequest) {
  try {
    logApiRequest('POST', '/api/auth/logout');

    // Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return successResponse(null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, we still want to clear the session
    const cookieStore = await cookies();
    cookieStore.delete('session');
    
    return successResponse(null, 'Logout successful');
  }
}