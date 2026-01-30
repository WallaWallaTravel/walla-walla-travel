import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

// Login function that calls the real API
export async function login(email: string, password: string) {
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
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { 
        success: false, 
        error: data.error || 'Login failed. Please try again.' 
      };
    }

    // The API sets the session cookie, but we need to set it on the server side too
    // since this is a server action
    if (data.data) {
      const cookieStore = await cookies();
      cookieStore.set('session', JSON.stringify({
        email: data.data.email,
        userId: data.data.id.toString(),
        name: data.data.name,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return { success: true, user: data.data };

  } catch (error) {
    logger.error('Login error', { error });
    return {
      success: false,
      error: 'Unable to connect to server. Please try again later.'
    };
  }
}

export async function getServerSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  
  if (!sessionCookie) return null
  
  try {
    return JSON.parse(sessionCookie.value)
  } catch {
    return null
  }
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    redirect('/login')
  }
  return session
}

export async function getUser() {
  const session = await getServerSession()
  if (!session) return null
  
  return {
    id: session.userId,
    email: session.email,
    name: session.name || 'Test Driver'
  }
}

export async function logout() {
  try {
    // Call the logout API endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    // Continue with logout even if API call fails
    logger.error('Logout API error', { error });
  }

  // Always clear the session cookie locally
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
