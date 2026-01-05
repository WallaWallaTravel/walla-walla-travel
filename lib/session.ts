import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { query } from './db'

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'development-secret-key-change-in-production'
)

export interface SessionData {
  userId: string
  email: string
  role: string
  isLoggedIn: boolean
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export async function getSession(): Promise<SessionData & { save: () => Promise<void>; destroy: () => Promise<void> }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  let sessionData: SessionData = {
    userId: '',
    email: '',
    role: '',
    isLoggedIn: false,
  }

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret)
      sessionData = payload as unknown as SessionData
    } catch (_error) {
      // Invalid token, use default empty session
    }
  }

  return {
    ...sessionData,
    save: async () => {
      const token = await new SignJWT(sessionData as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(secret)
      
      cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    },
    destroy: async () => {
      cookieStore.delete('session')
    },
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  
  if (!session.isLoggedIn || !session.userId) {
    return null
  }

  try {
    const users = await query(
      'SELECT id, email, name, role FROM drivers WHERE id = $1',
      [session.userId]
    )
    
    if (users.rows.length === 0) {
      return null
    }

    return users.rows[0] as User
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}