/**
 * Partner Service
 * Handles partner portal business logic
 */

import { BaseService } from './base.service';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import crypto from 'crypto';

export interface PartnerProfile {
  id: number;
  user_id: number;
  business_name: string;
  business_type: 'winery' | 'hotel' | 'restaurant' | 'activity' | 'other';
  winery_id?: number;
  hotel_id?: number;
  restaurant_id?: number;
  status: 'pending' | 'active' | 'suspended';
  invited_by?: number;
  invited_at?: string;
  setup_completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerDashboardData {
  profile: PartnerProfile | null;
  stats: {
    profile_completion: number;
    total_views: number;
    ai_recommendations: number;
    last_updated: string | null;
  };
}

export interface PartnerInvitation {
  email: string;
  business_name: string;
  business_type: 'winery' | 'hotel' | 'restaurant' | 'activity' | 'other';
  winery_id?: number;
  notes?: string;
}

export class PartnerService extends BaseService {
  protected get serviceName(): string {
    return 'PartnerService';
  }

  /**
   * Get partner profile by user ID
   */
  async getProfileByUserId(userId: number): Promise<PartnerProfile | null> {
    this.log('Getting partner profile', { userId });

    const result = await this.queryOne<PartnerProfile>(
      `SELECT * FROM partner_profiles WHERE user_id = $1`,
      [userId]
    );

    return result;
  }

  /**
   * Get partner dashboard data
   */
  async getDashboardData(userId: number): Promise<PartnerDashboardData> {
    this.log('Getting dashboard data', { userId });

    const profile = await this.getProfileByUserId(userId);

    // Calculate profile completion (basic implementation)
    let profileCompletion = 0;
    if (profile) {
      profileCompletion = 20; // Has profile
      if (profile.setup_completed_at) profileCompletion += 30;
      if (profile.winery_id || profile.hotel_id || profile.restaurant_id) profileCompletion += 30;
      // Add more checks as needed
    }

    // TODO: Get actual stats from analytics tables
    const stats = {
      profile_completion: profileCompletion,
      total_views: 0,
      ai_recommendations: 0,
      last_updated: profile?.updated_at || null,
    };

    return { profile, stats };
  }

  /**
   * Update partner profile
   */
  async updateProfile(userId: number, data: Partial<PartnerProfile>): Promise<PartnerProfile> {
    this.log('Updating partner profile', { userId });

    const profile = await this.getProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Partner profile not found');
    }

    // Only allow certain fields to be updated
    const allowedFields = ['business_name', 'notes'];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return profile;
    }

    values.push(userId);
    const sql = `
      UPDATE partner_profiles 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.queryOne<PartnerProfile>(sql, values);
    if (!result) {
      throw new Error('Failed to update profile');
    }

    return result;
  }

  /**
   * Create partner invitation
   * Called by admin to invite a new partner
   */
  async createInvitation(invitation: PartnerInvitation, invitedBy: number): Promise<{
    user_id: number;
    setup_token: string;
    setup_url: string;
  }> {
    this.log('Creating partner invitation', { email: invitation.email, invitedBy });

    // Check if user already exists
    const existingUser = await this.queryOne<{ id: number }>(
      `SELECT id FROM users WHERE email = $1`,
      [invitation.email.toLowerCase()]
    );

    if (existingUser) {
      throw new BadRequestError('A user with this email already exists');
    }

    // Generate setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user with partner role (no password yet - they'll set it via setup link)
    const tempPassword = crypto.randomBytes(16).toString('hex'); // Temporary, won't be usable
    
    const userResult = await this.queryOne<{ id: number }>(
      `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'partner', true)
       RETURNING id`,
      [invitation.email.toLowerCase(), invitation.business_name, tempPassword]
    );

    if (!userResult) {
      throw new Error('Failed to create user');
    }

    // Create partner profile
    await this.query(
      `INSERT INTO partner_profiles (
        user_id, business_name, business_type, winery_id, status,
        invited_by, setup_token, setup_token_expires_at, notes
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)`,
      [
        userResult.id,
        invitation.business_name,
        invitation.business_type,
        invitation.winery_id || null,
        invitedBy,
        setupToken,
        setupExpires,
        invitation.notes || null,
      ]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const setupUrl = `${appUrl}/partner-setup?token=${setupToken}`;

    return {
      user_id: userResult.id,
      setup_token: setupToken,
      setup_url: setupUrl,
    };
  }

  /**
   * Complete partner setup (set password)
   */
  async completeSetup(setupToken: string, password: string): Promise<{ success: boolean }> {
    this.log('Completing partner setup');

    // Find profile by setup token
    const profile = await this.queryOne<{ id: number; user_id: number; setup_token_expires_at: string }>(
      `SELECT id, user_id, setup_token_expires_at 
       FROM partner_profiles 
       WHERE setup_token = $1 AND status = 'pending'`,
      [setupToken]
    );

    if (!profile) {
      throw new BadRequestError('Invalid or expired setup link');
    }

    if (new Date(profile.setup_token_expires_at) < new Date()) {
      throw new BadRequestError('Setup link has expired. Please contact admin for a new invitation.');
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await this.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, profile.user_id]
    );

    // Mark setup as complete
    await this.query(
      `UPDATE partner_profiles 
       SET status = 'active', 
           setup_completed_at = CURRENT_TIMESTAMP,
           setup_token = NULL,
           setup_token_expires_at = NULL
       WHERE id = $1`,
      [profile.id]
    );

    return { success: true };
  }

  /**
   * Get all partners (for admin)
   */
  async getAllPartners(): Promise<Array<PartnerProfile & { user_email: string; user_name: string }>> {
    this.log('Getting all partners');

    const result = await this.query<PartnerProfile & { user_email: string; user_name: string }>(
      `SELECT pp.*, u.email as user_email, u.name as user_name
       FROM partner_profiles pp
       JOIN users u ON pp.user_id = u.id
       ORDER BY pp.created_at DESC`
    );

    return result.rows;
  }

  /**
   * Log partner activity
   */
  async logActivity(partnerProfileId: number, action: string, details?: object, ipAddress?: string): Promise<void> {
    await this.query(
      `INSERT INTO partner_activity_log (partner_profile_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [partnerProfileId, action, details ? JSON.stringify(details) : null, ipAddress || null]
    );
  }
}

export const partnerService = new PartnerService();




