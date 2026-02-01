/**
 * Unsplash API Service
 *
 * Provides fallback image search when the media library doesn't have
 * suitable images. Uses Unsplash's free tier API.
 *
 * API Reference: https://unsplash.com/documentation
 *
 * Rate Limits (Demo):
 * - 50 requests per hour
 *
 * For production, apply for Production access for higher limits.
 */

import { logger } from '@/lib/logger'

const UNSPLASH_API_BASE = 'https://api.unsplash.com'

export interface UnsplashPhoto {
  id: string
  width: number
  height: number
  color: string
  blur_hash: string
  description: string | null
  alt_description: string | null
  urls: {
    raw: string
    full: string
    regular: string  // 1080px wide
    small: string    // 400px wide
    thumb: string    // 200px wide
  }
  links: {
    self: string
    html: string     // Photo page on Unsplash
    download: string
    download_location: string  // Required for tracking downloads
  }
  user: {
    id: string
    username: string
    name: string
    portfolio_url: string | null
    links: {
      html: string  // Photographer's Unsplash profile
    }
  }
}

export interface UnsplashSearchResult {
  total: number
  total_pages: number
  results: UnsplashPhoto[]
}

class UnsplashService {
  private getAccessKey(): string {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      throw new Error('UNSPLASH_ACCESS_KEY environment variable not set')
    }
    return accessKey
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const accessKey = this.getAccessKey()

    const url = new URL(`${UNSPLASH_API_BASE}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Unsplash API error', { status: response.status, error: errorText })
      throw new Error(`Unsplash API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Search for photos
   *
   * @param query Search query (e.g., "walla walla vineyard")
   * @param options Search options
   */
  async searchPhotos(
    query: string,
    options: {
      page?: number
      perPage?: number
      orientation?: 'landscape' | 'portrait' | 'squarish'
      color?: string
    } = {}
  ): Promise<UnsplashSearchResult> {
    const params: Record<string, string> = {
      query,
      page: String(options.page || 1),
      per_page: String(options.perPage || 10),
    }

    if (options.orientation) {
      params.orientation = options.orientation
    }

    if (options.color) {
      params.color = options.color
    }

    return this.makeRequest<UnsplashSearchResult>('/search/photos', params)
  }

  /**
   * Get a random photo
   *
   * @param query Optional search query
   * @param options Options
   */
  async getRandomPhoto(
    query?: string,
    options: {
      orientation?: 'landscape' | 'portrait' | 'squarish'
      count?: number
    } = {}
  ): Promise<UnsplashPhoto | UnsplashPhoto[]> {
    const params: Record<string, string> = {}

    if (query) {
      params.query = query
    }

    if (options.orientation) {
      params.orientation = options.orientation
    }

    if (options.count && options.count > 1) {
      params.count = String(Math.min(options.count, 30))
    }

    return this.makeRequest<UnsplashPhoto | UnsplashPhoto[]>('/photos/random', params)
  }

  /**
   * Get a specific photo by ID
   */
  async getPhoto(photoId: string): Promise<UnsplashPhoto> {
    return this.makeRequest<UnsplashPhoto>(`/photos/${photoId}`)
  }

  /**
   * Track a photo download (required by Unsplash API guidelines)
   *
   * Must be called when a photo is actually used/downloaded.
   */
  async trackDownload(photo: UnsplashPhoto): Promise<void> {
    try {
      const accessKey = this.getAccessKey()

      await fetch(photo.links.download_location, {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
        },
      })

      logger.info('Tracked Unsplash download', { photoId: photo.id })
    } catch (error) {
      // Don't throw - tracking is optional
      logger.warn('Failed to track Unsplash download', { error })
    }
  }

  /**
   * Get attribution text for a photo (required by Unsplash guidelines)
   */
  getAttribution(photo: UnsplashPhoto): string {
    return `Photo by ${photo.user.name} on Unsplash`
  }

  /**
   * Get attribution link for a photo
   */
  getAttributionLink(photo: UnsplashPhoto): string {
    return `${photo.links.html}?utm_source=walla_walla_travel&utm_medium=referral`
  }

  /**
   * Search for wine-related images with sensible defaults
   */
  async searchWineImages(
    query?: string,
    options: {
      count?: number
      orientation?: 'landscape' | 'portrait' | 'squarish'
    } = {}
  ): Promise<UnsplashPhoto[]> {
    // Add wine/winery context to query
    const searchQuery = query
      ? `${query} wine winery`
      : 'wine vineyard walla walla washington'

    const result = await this.searchPhotos(searchQuery, {
      perPage: options.count || 5,
      orientation: options.orientation || 'landscape',
    })

    return result.results
  }
}

export const unsplashService = new UnsplashService()
