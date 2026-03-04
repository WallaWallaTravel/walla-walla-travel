/**
 * Guest Profile Service
 *
 * @module lib/services/guest-profile.service
 * @description Manages persistent guest identities and magic link authentication.
 * Guests are identified by email. A single profile spans all trips.
 */

import crypto from 'crypto';
import { BaseService } from './base.service';

export interface GuestProfile {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  dietary_preferences: string | null;
  crm_contact_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface GuestMagicLink {
  id: number;
  guest_profile_id: number;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

const MAGIC_LINK_EXPIRY_HOURS = 48;

class GuestProfileService extends BaseService {
  protected get serviceName() {
    return 'GuestProfileService';
  }

  /**
   * Find or create a guest profile by email.
   * If the profile exists, optionally updates name/phone if provided and currently null.
   */
  async findOrCreateByEmail(
    email: string,
    data?: { name?: string | null; phone?: string | null }
  ): Promise<GuestProfile> {
    const normalizedEmail = email.toLowerCase().trim();

    // Try to find existing
    const existing = await this.queryOne<GuestProfile>(
      `SELECT * FROM guest_profiles WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (existing) {
      // Backfill name/phone if they were missing and are now provided
      const updates: Record<string, unknown> = {};
      if (data?.name && !existing.name) updates.name = data.name;
      if (data?.phone && !existing.phone) updates.phone = data.phone;

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        return (await this.update<GuestProfile>('guest_profiles', existing.id, updates)) || existing;
      }

      return existing;
    }

    // Create new profile
    return this.insert<GuestProfile>('guest_profiles', {
      email: normalizedEmail,
      name: data?.name || null,
      phone: data?.phone || null,
    });
  }

  /**
   * Get a guest profile by ID.
   */
  async getById(id: number): Promise<GuestProfile | null> {
    return this.queryOne<GuestProfile>(
      `SELECT * FROM guest_profiles WHERE id = $1`,
      [id]
    );
  }

  /**
   * Create a magic link token for a guest.
   * Returns a 64-character hex token.
   */
  async createMagicLink(guestProfileId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + MAGIC_LINK_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString();

    await this.insert('guest_magic_links', {
      guest_profile_id: guestProfileId,
      token,
      expires_at: expiresAt,
    });

    return token;
  }

  /**
   * Verify and consume a magic link token.
   * Returns the guest profile if valid, null if expired/used/not found.
   */
  async verifyMagicLink(token: string): Promise<GuestProfile | null> {
    // Find the link: must be unused and not expired
    const link = await this.queryOne<GuestMagicLink>(
      `SELECT * FROM guest_magic_links
       WHERE token = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [token]
    );

    if (!link) {
      return null;
    }

    // Mark as used
    await this.query(
      `UPDATE guest_magic_links SET used_at = NOW() WHERE id = $1`,
      [link.id]
    );

    // Return the guest profile
    return this.getById(link.guest_profile_id);
  }

  /**
   * Count active (unused, unexpired) magic links for a guest.
   * Used for rate limiting link creation.
   */
  async countActiveLinks(guestProfileId: number): Promise<number> {
    return this.queryCount(
      `SELECT COUNT(*) as count FROM guest_magic_links
       WHERE guest_profile_id = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [guestProfileId]
    );
  }
}

export const guestProfileService = new GuestProfileService();
