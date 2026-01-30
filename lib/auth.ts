import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

// Default timeout for auth API calls (30 seconds)
const AUTH_TIMEOUT_MS = 30000;

// Login function that calls the real API
export async function login(email: string, password: string) {
  // AbortController for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    // Determine the API URL based on environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Call the login API endpoint
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      // Important: include credentials to handle cookies
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Login failed. Please try again.'
      };
    }

    // The API response includes Set-Cookie header with JWT session token
    // No need to set cookie here - it's handled by the API via setSessionCookie()
    // Note: When this is a server action, the cookie from the API response
    // is automatically forwarded to the client via credentials: 'include'

    return { success: true, user: data.data?.user || data.data };

  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout-specific error
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Login request timeout', { timeout: AUTH_TIMEOUT_MS });
      return {
        success: false,
        error: 'Login request timed out. Please try again.'
      };
    }

    logger.error('Login error', { error });
    return {
      success: false,
      error: 'Unable to connect to server. Please try again later.'
    };
  }
}

export async function getServerSession() {
  // Use the canonical session system for JWT verification
  const { getSession } = await import('@/lib/auth/session');
  const session = await getSession();

  if (!session?.user) return null;

  // Return in legacy format for backward compatibility
  return {
    userId: String(session.user.id),
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    redirect('/login')
  }
  return session
}

export async function getUser() {
  const session = await getServerSession();
  if (!session) return null;

  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
}

export async function logout() {
  // AbortController for request timeout (shorter timeout for logout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    // Call the logout API endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    // Continue with logout even if API call fails or times out
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Logout request timeout');
    } else {
      logger.error('Logout API error', { error });
    }
  }

  // Always clear the session cookie locally
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
