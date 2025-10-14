import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Check for session cookie
  const sessionCookie = req.cookies.get('session')
  const hasSession = !!sessionCookie
  
  // Protected routes
  const protectedPaths = [
    '/workflow',
    '/inspections',
    '/dashboard'
  ]
  
  const path = req.nextUrl.pathname
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p))
  
  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  // Redirect to workflow if accessing login with active session
  if (path === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/workflow', req.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/workflow/:path*',
    '/inspections/:path*',
    '/dashboard/:path*',
    '/login'
  ],
}
