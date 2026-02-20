import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCode,
  storeTokens,
} from '@/lib/services/search-console.service';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

/**
 * Google Search Console OAuth callback handler.
 * Receives the authorization code from Google, exchanges it for tokens,
 * stores them in the integrations table, and redirects back to the admin SEO page.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle OAuth errors (user denied access, etc.)
  if (error) {
    logger.warn('Google Search Console OAuth denied', { error });
    const redirectUrl = new URL('/admin/marketing/seo', request.url);
    redirectUrl.searchParams.set('oauth_error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    logger.warn('Google Search Console OAuth callback missing code parameter');
    const redirectUrl = new URL('/admin/marketing/seo', request.url);
    redirectUrl.searchParams.set('oauth_error', 'missing_code');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Build the redirect URI (must match what was used in generateAuthUrl)
    const redirectUri = new URL(
      '/api/admin/marketing/seo/oauth',
      request.url
    ).toString();

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCode(
      code,
      redirectUri
    );

    // Store tokens in the integrations table
    await storeTokens(accessToken, refreshToken, expiresAt);

    logger.info('Google Search Console OAuth completed successfully');

    // Redirect back to admin SEO page with success indicator
    const redirectUrl = new URL('/admin/marketing/seo', request.url);
    redirectUrl.searchParams.set('oauth_success', 'true');
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    logger.error('Google Search Console OAuth token exchange failed', {
      error: err,
    });

    const redirectUrl = new URL('/admin/marketing/seo', request.url);
    redirectUrl.searchParams.set(
      'oauth_error',
      err instanceof Error ? err.message : 'token_exchange_failed'
    );
    return NextResponse.redirect(redirectUrl);
  }
});
