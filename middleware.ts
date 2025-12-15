import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from './lib/auth/session';

/**
 * Security headers for all responses
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
    // Force no caching of HTML pages to ensure middleware redirects work
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  };
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Middleware for:
 * 1. Subdomain-based routing (admin/drivers/partners subdomains)
 * 2. Authentication and route protection
 * 3. Test/dev page protection
 * 4. Security headers on all responses
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // ============================================================================
  // SUBDOMAIN ROUTING
  // ============================================================================

  // Extract subdomain (handle localhost:3000, admin.localhost:3000, admin.wallawallatravel.com)
  const hostWithoutPort = hostname.split(':')[0];
  const parts = hostWithoutPort.split('.');

  // Determine subdomain
  // localhost → no subdomain
  // admin.localhost → subdomain = 'admin'
  // admin.wallawallatravel.com → subdomain = 'admin'
  // wallawallatravel.com → no subdomain
  let subdomain: string | null = null;

  if (parts.length >= 2 && parts[0] !== 'www') {
    // Check if first part is a known subdomain
    // Support both singular and plural forms (driver/drivers, partner/partners)
    const subdomainMap: Record<string, string> = {
      admin: 'admin',
      driver: 'drivers',
      drivers: 'drivers',
      partner: 'partners',
      partners: 'partners',
      app: 'app',
      business: 'business',
    };
    if (parts[0] in subdomainMap) {
      subdomain = subdomainMap[parts[0]];
    }
  }

  // ============================================================================
  // SUBDOMAIN ROUTE ENFORCEMENT
  // Block routes that don't belong to this subdomain
  // ============================================================================

  // Define allowed routes per subdomain
  const subdomainAllowedRoutes: Record<string, string[]> = {
    admin: ['/admin', '/login'],
    drivers: ['/driver-portal', '/driver', '/workflow', '/inspections', '/time-clock', '/login'],
    partners: ['/partner-portal', '/partner-setup', '/login'],
    app: ['/book', '/login', '/embed', '/payment'],
    business: ['/contribute', '/login'],
  };

  // Enforce subdomain boundaries
  if (subdomain && subdomain in subdomainAllowedRoutes) {
    const allowedRoutes = subdomainAllowedRoutes[subdomain];
    const isAllowedRoute = allowedRoutes.some(
      route => pathname === route || pathname.startsWith(route + '/') || pathname === '/'
    );

    // Shared routes accessible from any subdomain
    const sharedRoutes = ['/login', '/error', '/404', '/500', '/api'];
    const isSharedRoute = sharedRoutes.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );

    if (!isAllowedRoute && !isSharedRoute) {
      // Redirect to subdomain's appropriate page
      const homeRedirects: Record<string, string> = {
        admin: '/admin/dashboard',
        drivers: '/driver-portal/dashboard',
        partners: '/partner-portal/dashboard',
        app: '/',
        business: '/contribute',
      };
      const redirectTo = homeRedirects[subdomain] || '/';
      const response = NextResponse.redirect(new URL(redirectTo, request.url));
      // Ensure redirect is not cached
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('X-Subdomain-Redirect', `${subdomain}:${pathname}->${redirectTo}`);
      return response;
    }
  }

  // Redirect homepage (/) based on subdomain
  if (pathname === '/') {
    // admin.* → /admin/dashboard (auth check happens below)
    if (subdomain === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // drivers.* → /driver-portal/dashboard
    if (subdomain === 'drivers') {
      return NextResponse.redirect(new URL('/driver-portal/dashboard', request.url));
    }

    // partners.* → /partner-portal/dashboard
    if (subdomain === 'partners') {
      return NextResponse.redirect(new URL('/partner-portal/dashboard', request.url));
    }

    // business.* → /contribute (legacy, for business questionnaire)
    if (subdomain === 'business') {
      return NextResponse.redirect(new URL('/contribute', request.url));
    }

    // app.* or no subdomain → show the portal selector page
  }

  // ============================================================================
  // AUTHENTICATION & ROUTE PROTECTION
  // ============================================================================

  const session = await getSessionFromRequest(request);

  // Protected routes that require authentication
  const protectedRoutes = [
    '/admin',
    '/driver-portal',
    '/partner-portal',
    '/workflow',
    '/inspections',
    '/time-clock',
  ];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If trying to access protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    // Preserve subdomain context for login page styling
    if (subdomain) {
      loginUrl.searchParams.set('portal', subdomain === 'drivers' ? 'driver' : subdomain);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  if (session) {
    // Admin-only routes
    if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/login?error=forbidden', request.url))
      );
    }

    // Driver-only routes (admins can also access for oversight)
    const driverRoutes = ['/driver-portal', '/workflow', '/inspections', '/time-clock'];
    const isDriverRoute = driverRoutes.some(route => pathname.startsWith(route));

    if (isDriverRoute && session.user.role !== 'driver' && session.user.role !== 'admin') {
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/login?error=forbidden', request.url))
      );
    }

    // Partner-only routes (admins can also access for oversight)
    // Note: 'partner' role may not be in the type union - use string comparison
    const role = session.user.role as string;
    if (
      pathname.startsWith('/partner-portal') &&
      role !== 'partner' &&
      session.user.role !== 'admin'
    ) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/login?error=forbidden', request.url))
      );
    }
  }

  // If logged in and trying to access login page, redirect to appropriate dashboard
  if (pathname === '/login' && session) {
    const userRole = session.user.role as string;
    let dashboardUrl = '/admin/dashboard';
    if (session.user.role === 'driver') {
      dashboardUrl = '/driver-portal/dashboard';
    } else if (userRole === 'partner') {
      dashboardUrl = '/partner-portal/dashboard';
    }
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // ============================================================================
  // TEST ROUTE PROTECTION
  // ============================================================================

  const testRoutes = [
    '/test',
    '/test-mobile',
    '/security-test',
    '/payment/test',
    '/payment/simple-test',
    '/ai-directory',
  ];

  const isTestRoute = testRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );

  if (isTestRoute) {
    if (process.env.NODE_ENV === 'production') {
      return addSecurityHeaders(new NextResponse('Not Found', { status: 404 }));
    }
    console.log(`[MIDDLEWARE] Test route accessed: ${pathname}`);
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Debug headers to verify middleware is running (can be removed after debugging)
  response.headers.set('X-Middleware-Subdomain', subdomain || 'none');
  response.headers.set('X-Middleware-Pathname', pathname);
  
  return addSecurityHeaders(response);
}

// Configure which routes should run through middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
