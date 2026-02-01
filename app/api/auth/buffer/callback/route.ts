/**
 * Buffer OAuth - Callback Handler
 *
 * Handles the callback from Buffer after user authorization.
 * CRITICAL: The authorization code expires in 30 seconds!
 * We must exchange it for an access token immediately.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { bufferService } from '@/lib/services/buffer.service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const settingsUrl = new URL('/admin/marketing/settings', baseUrl)

  // Handle error from Buffer
  if (error) {
    logger.error('Buffer OAuth error', { error })
    settingsUrl.searchParams.set('error', `buffer_auth_denied: ${error}`)
    return NextResponse.redirect(settingsUrl)
  }

  // No code provided
  if (!code) {
    logger.error('Buffer OAuth callback missing code')
    settingsUrl.searchParams.set('error', 'buffer_no_code: No authorization code received')
    return NextResponse.redirect(settingsUrl)
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/buffer/callback`

    // Exchange code for access token - MUST happen within 30 seconds!
    logger.info('Exchanging Buffer authorization code for token')
    const tokenResponse = await bufferService.exchangeCodeForToken(code, redirectUri)

    if (!tokenResponse.access_token) {
      throw new Error('No access token in response')
    }

    // Fetch connected profiles from Buffer
    logger.info('Fetching Buffer profiles')
    const profiles = await bufferService.getProfiles(tokenResponse.access_token)

    if (!profiles || profiles.length === 0) {
      throw new Error('No profiles connected in Buffer account')
    }

    // Store each profile as a social account
    for (const profile of profiles) {
      // Map Buffer service names to our platform names
      const platformMap: Record<string, string> = {
        twitter: 'twitter',
        facebook: 'facebook',
        instagram: 'instagram',
        linkedin: 'linkedin',
        pinterest: 'pinterest',
      }

      const platform = platformMap[profile.service] || profile.service

      // Check if this profile already exists
      const existing = await query(
        'SELECT id FROM social_accounts WHERE buffer_profile_id = $1',
        [profile.id]
      )

      if (existing.rows.length > 0) {
        // Update existing account
        await query(`
          UPDATE social_accounts SET
            account_name = $1,
            account_username = $2,
            access_token_encrypted = $3,
            avatar_url = $4,
            connection_status = 'connected',
            last_error = NULL,
            last_sync_at = NOW(),
            updated_at = NOW()
          WHERE buffer_profile_id = $5
        `, [
          profile.formatted_username,
          profile.service_username,
          tokenResponse.access_token, // In production, encrypt this!
          profile.avatar,
          profile.id,
        ])

        logger.info('Updated existing Buffer profile', { profileId: profile.id, platform })
      } else {
        // Insert new account
        await query(`
          INSERT INTO social_accounts (
            platform,
            account_name,
            account_username,
            buffer_profile_id,
            external_account_id,
            access_token_encrypted,
            avatar_url,
            connection_status,
            is_active,
            last_sync_at,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'connected', true, NOW(), NOW(), NOW())
        `, [
          platform,
          profile.formatted_username,
          profile.service_username,
          profile.id,
          profile.service_id,
          tokenResponse.access_token, // In production, encrypt this!
          profile.avatar,
        ])

        logger.info('Created new Buffer profile', { profileId: profile.id, platform })
      }
    }

    // Success - redirect to settings with success message
    settingsUrl.searchParams.set('success', `buffer_connected: Connected ${profiles.length} profile(s)`)
    return NextResponse.redirect(settingsUrl)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Buffer OAuth callback failed', { error: errorMessage })

    settingsUrl.searchParams.set('error', `buffer_token_error: ${errorMessage}`)
    return NextResponse.redirect(settingsUrl)
  }
}
