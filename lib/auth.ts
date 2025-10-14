import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Simple mock login for testing UI
export async function login(email: string, password: string) {
  // Test credentials
  if (email === 'driver@test.com' && password === 'test123456') {
    // Set a simple session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', JSON.stringify({ 
      email, 
      userId: 'test-driver-1',
      name: 'Test Driver'
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    
    return { success: true }
  }
  
  return { success: false, error: 'Invalid email or password' }
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
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
