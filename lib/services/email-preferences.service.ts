/**
 * Email Preferences Service
 *
 * Centralized service for managing email unsubscribe preferences.
 * Used by all marketing/commercial email senders to:
 *   - Check if a recipient has unsubscribed before sending
 *   - Generate unique unsubscribe tokens per email address
 *   - Process unsubscribe requests from token-based URLs
 *   - Provide List-Unsubscribe headers for CAN-SPAM compliance
 *
 * Transactional emails (booking confirmations, password resets, payment
 * receipts, driver assignments) are legally exempt and should NOT use this.
 *
 * @module lib/services/email-preferences.service
 */

import { query, queryOne } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';

interface EmailPreference {
  unsubscribe_token: string;
  unsubscribed_at: string | null;
}

interface UnsubscribeResult {
  success: boolean;
  email?: string;
  already_unsubscribed?: boolean;
}

class EmailPreferencesService {
  /**
   * Get or create an email preference record.
   * Uses INSERT ... ON CONFLICT to atomically get-or-create.
   * Called before sending any marketing email to obtain the unsubscribe token.
   */
  async getOrCreatePreference(email: string): Promise<EmailPreference> {
    const normalizedEmail = email.toLowerCase().trim();

    // Attempt insert; if email already exists, do nothing
    await query(
      `INSERT INTO email_preferences (email)
       VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [normalizedEmail]
    );

    // Now select (guaranteed to exist)
    const row = await queryOne<{ unsubscribe_token: string; unsubscribed_at: string | null }>(
      `SELECT unsubscribe_token, unsubscribed_at
       FROM email_preferences
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (!row) {
      // Should never happen after the INSERT above, but be defensive
      throw new Error(`Failed to get or create email preference for ${normalizedEmail}`);
    }

    return {
      unsubscribe_token: row.unsubscribe_token,
      unsubscribed_at: row.unsubscribed_at,
    };
  }

  /**
   * Check if an email address has unsubscribed.
   * Returns true if the email exists in preferences AND has unsubscribed_at set.
   */
  async isUnsubscribed(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const row = await queryOne<{ unsubscribed_at: string | null }>(
      `SELECT unsubscribed_at
       FROM email_preferences
       WHERE email = $1`,
      [normalizedEmail]
    );

    return !!row?.unsubscribed_at;
  }

  /**
   * Process an unsubscribe request by token.
   * Sets unsubscribed_at = NOW() and syncs the legacy booking_attempts.unsubscribed flag.
   */
  async unsubscribe(token: string): Promise<UnsubscribeResult> {
    // Look up the preference by token
    const row = await queryOne<{ id: number; email: string; unsubscribed_at: string | null }>(
      `SELECT id, email, unsubscribed_at
       FROM email_preferences
       WHERE unsubscribe_token = $1`,
      [token]
    );

    if (!row) {
      return { success: false };
    }

    if (row.unsubscribed_at) {
      return { success: true, email: row.email, already_unsubscribed: true };
    }

    // Set unsubscribed_at
    await query(
      `UPDATE email_preferences
       SET unsubscribed_at = NOW()
       WHERE id = $1`,
      [row.id]
    );

    // Sync legacy flag: booking_attempts.unsubscribed
    try {
      await query(
        `UPDATE booking_attempts
         SET unsubscribed = TRUE
         WHERE LOWER(email) = $1`,
        [row.email.toLowerCase()]
      );
    } catch {
      // booking_attempts table may not exist or have the column — non-critical
      logger.warn('[EmailPreferences] Failed to sync legacy unsubscribed flag', { email: row.email });
    }

    logger.info('[EmailPreferences] User unsubscribed', { email: row.email });

    return { success: true, email: row.email };
  }

  /**
   * Get the full unsubscribe URL for a given token.
   */
  getUnsubscribeUrl(token: string): string {
    return `${BASE_URL}/unsubscribe/${token}`;
  }

  /**
   * Get List-Unsubscribe headers for CAN-SPAM / RFC 8058 compliance.
   * These headers tell email clients to show a native "Unsubscribe" button.
   */
  getUnsubscribeHeaders(token: string): Record<string, string> {
    const url = this.getUnsubscribeUrl(token);
    return {
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }
}

export const emailPreferencesService = new EmailPreferencesService();
