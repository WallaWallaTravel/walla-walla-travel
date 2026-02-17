/**
 * Sitemap Ping Service
 *
 * Notifies Google when the sitemap has been updated after content changes.
 * Includes debouncing to prevent excessive pings (max once per hour).
 */

import { logger } from '@/lib/logger'

class SitemapPingService {
  private lastPingAt: Date | null = null
  private readonly DEBOUNCE_MS = 60 * 60 * 1000 // 1 hour

  /**
   * Ping Google with the updated sitemap URL.
   * Returns true if the ping was sent successfully, false if debounced or failed.
   */
  async pingGoogle(): Promise<boolean> {
    // Check debounce - skip if pinged within the last hour
    if (this.lastPingAt) {
      const elapsed = Date.now() - this.lastPingAt.getTime()
      if (elapsed < this.DEBOUNCE_MS) {
        const remainingMin = Math.ceil((this.DEBOUNCE_MS - elapsed) / 60000)
        logger.debug('Sitemap ping debounced', {
          lastPingAt: this.lastPingAt.toISOString(),
          remainingMinutes: remainingMin,
        })
        return false
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
    if (!siteUrl) {
      logger.warn('Sitemap ping skipped: no NEXT_PUBLIC_SITE_URL or GOOGLE_SEARCH_CONSOLE_SITE_URL configured')
      return false
    }

    const sitemapUrl = `${siteUrl}/sitemap.xml`
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`

    try {
      const response = await fetch(pingUrl, { method: 'GET' })

      this.lastPingAt = new Date()

      if (response.ok) {
        logger.info('Sitemap ping sent to Google successfully', {
          sitemapUrl,
          status: response.status,
        })
        return true
      }

      logger.warn('Sitemap ping returned non-OK status', {
        sitemapUrl,
        status: response.status,
        statusText: response.statusText,
      })
      return false
    } catch (error) {
      logger.error('Sitemap ping to Google failed', {
        sitemapUrl: `${siteUrl}/sitemap.xml`,
        error,
      })
      return false
    }
  }

  /**
   * Get time until next ping is allowed, in milliseconds.
   * Returns 0 if a ping can be sent immediately.
   */
  getTimeUntilNextPing(): number {
    if (!this.lastPingAt) return 0
    const elapsed = Date.now() - this.lastPingAt.getTime()
    return Math.max(0, this.DEBOUNCE_MS - elapsed)
  }
}

export const sitemapPingService = new SitemapPingService()
