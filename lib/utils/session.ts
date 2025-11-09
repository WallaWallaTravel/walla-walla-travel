// Session Management Utilities

import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * Get or create a session ID for anonymous users
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('session_id')?.value

  if (!sessionId) {
    sessionId = generateSessionId()
  }

  return sessionId
}

/**
 * Set session ID cookie
 */
export async function setSessionId(sessionId: string): Promise<void> {
  const cookieStore = await cookies()
  
  cookieStore.set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Get session ID from request
 */
export function getSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.startsWith('session_id='))
  
  if (!sessionCookie) return null
  
  return sessionCookie.split('=')[1]
}

