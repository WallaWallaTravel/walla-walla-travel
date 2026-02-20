/**
 * Buffer OAuth - Authorization Initiation
 *
 * Redirects user to Buffer's authorization page to connect their account.
 * After authorization, Buffer redirects back to /api/auth/buffer/callback
 */

import { NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'
import { bufferService } from '@/lib/services/buffer.service'

export const GET = withErrorHandling(async () => {
  try {
    // Construct the callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/auth/buffer/callback`

    // Get the authorization URL from Buffer
    const authUrl = bufferService.getAuthorizationUrl(redirectUri)

    // Redirect to Buffer's authorization page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // If there's a configuration error, redirect to settings with error
    const settingsUrl = new URL('/admin/marketing/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    settingsUrl.searchParams.set('error', `buffer_config_error: ${errorMessage}`)

    return NextResponse.redirect(settingsUrl)
  }
})
