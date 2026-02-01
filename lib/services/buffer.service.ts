/**
 * Buffer API Service
 *
 * Handles Buffer OAuth authentication and API interactions for social media posting.
 * Buffer is used to queue posts to Instagram, Facebook, LinkedIn, etc.
 *
 * Buffer API Reference: https://buffer.com/developers/api
 */

import { logger } from '@/lib/logger'

const BUFFER_API_BASE = 'https://api.bufferapp.com/1'
const BUFFER_OAUTH_BASE = 'https://bufferapp.com/oauth2'

export interface BufferProfile {
  id: string
  service: string  // 'instagram', 'facebook', 'linkedin', etc.
  service_id: string
  service_username: string
  formatted_username: string
  avatar: string
  default: boolean
  created_at: number
  schedules: Array<{
    days: string[]
    times: string[]
  }>
}

export interface BufferUpdate {
  id: string
  created_at: number
  day: string
  due_at: number
  due_time: string
  profile_id: string
  profile_service: string
  sent_at?: number
  status: 'buffer' | 'sent' | 'error'
  text: string
  media?: {
    link?: string
    photo?: string
    thumbnail?: string
  }
}

export interface BufferCreateUpdatePayload {
  profile_ids: string[]
  text: string
  media?: {
    link?: string
    photo?: string
  }
  scheduled_at?: number  // Unix timestamp
  now?: boolean
}

export interface BufferTokenResponse {
  access_token: string
  token_type: string
}

class BufferService {
  /**
   * Generate the OAuth authorization URL for Buffer
   */
  getAuthorizationUrl(redirectUri: string): string {
    const clientId = process.env.BUFFER_CLIENT_ID

    if (!clientId) {
      throw new Error('BUFFER_CLIENT_ID environment variable not set')
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
    })

    return `${BUFFER_OAUTH_BASE}/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   * IMPORTANT: The code expires in 30 seconds!
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<BufferTokenResponse> {
    const clientId = process.env.BUFFER_CLIENT_ID
    const clientSecret = process.env.BUFFER_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Buffer OAuth credentials not configured')
    }

    const response = await fetch(`${BUFFER_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Buffer token exchange failed', { status: response.status, error: errorText })
      throw new Error(`Failed to exchange code for token: ${errorText}`)
    }

    const data = await response.json()
    return data as BufferTokenResponse
  }

  /**
   * Get connected profiles for a user
   */
  async getProfiles(accessToken: string): Promise<BufferProfile[]> {
    const response = await fetch(`${BUFFER_API_BASE}/profiles.json?access_token=${accessToken}`)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Failed to fetch Buffer profiles', { status: response.status, error: errorText })
      throw new Error(`Failed to fetch profiles: ${errorText}`)
    }

    const profiles = await response.json()
    return profiles as BufferProfile[]
  }

  /**
   * Get a specific profile by ID
   */
  async getProfile(accessToken: string, profileId: string): Promise<BufferProfile> {
    const response = await fetch(`${BUFFER_API_BASE}/profiles/${profileId}.json?access_token=${accessToken}`)

    if (!response.ok) {
      throw new Error('Failed to fetch profile')
    }

    return response.json()
  }

  /**
   * Create a new update (queued post)
   */
  async createUpdate(accessToken: string, payload: BufferCreateUpdatePayload): Promise<BufferUpdate> {
    const formData = new URLSearchParams()
    formData.append('access_token', accessToken)
    formData.append('text', payload.text)

    // Add profile IDs
    payload.profile_ids.forEach(id => {
      formData.append('profile_ids[]', id)
    })

    // Add media if provided
    if (payload.media?.photo) {
      formData.append('media[photo]', payload.media.photo)
    }
    if (payload.media?.link) {
      formData.append('media[link]', payload.media.link)
    }

    // Schedule or post now
    if (payload.scheduled_at) {
      formData.append('scheduled_at', payload.scheduled_at.toString())
    } else if (payload.now) {
      formData.append('now', 'true')
    }

    const response = await fetch(`${BUFFER_API_BASE}/updates/create.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Failed to create Buffer update', { status: response.status, error: errorText })
      throw new Error(`Failed to create update: ${errorText}`)
    }

    const data = await response.json()

    if (!data.success) {
      logger.error('Buffer create update returned error', { data })
      throw new Error(data.message || 'Failed to create update')
    }

    return data.updates[0] as BufferUpdate
  }

  /**
   * Get pending updates for a profile
   */
  async getPendingUpdates(accessToken: string, profileId: string): Promise<BufferUpdate[]> {
    const response = await fetch(
      `${BUFFER_API_BASE}/profiles/${profileId}/updates/pending.json?access_token=${accessToken}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch pending updates')
    }

    const data = await response.json()
    return data.updates as BufferUpdate[]
  }

  /**
   * Get sent updates for a profile
   */
  async getSentUpdates(accessToken: string, profileId: string, count = 10): Promise<BufferUpdate[]> {
    const response = await fetch(
      `${BUFFER_API_BASE}/profiles/${profileId}/updates/sent.json?access_token=${accessToken}&count=${count}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch sent updates')
    }

    const data = await response.json()
    return data.updates as BufferUpdate[]
  }

  /**
   * Delete an update
   */
  async deleteUpdate(accessToken: string, updateId: string): Promise<boolean> {
    const response = await fetch(`${BUFFER_API_BASE}/updates/${updateId}/destroy.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: accessToken,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to delete update')
    }

    const data = await response.json()
    return data.success === true
  }

  /**
   * Move an update to the top of the queue
   */
  async moveToTop(accessToken: string, updateId: string): Promise<BufferUpdate> {
    const response = await fetch(`${BUFFER_API_BASE}/updates/${updateId}/move_to_top.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: accessToken,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to move update to top')
    }

    const data = await response.json()
    return data.update as BufferUpdate
  }

  /**
   * Upload media to Buffer
   * Returns the URL of the uploaded media
   */
  async uploadMedia(accessToken: string, imageUrl: string): Promise<string> {
    // Buffer accepts image URLs directly in the create update call
    // This method is a placeholder for future direct upload support
    // For now, we pass the image URL directly to createUpdate
    return imageUrl
  }

  /**
   * Verify access token is still valid
   */
  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const profiles = await this.getProfiles(accessToken)
      return Array.isArray(profiles)
    } catch {
      return false
    }
  }
}

export const bufferService = new BufferService()
