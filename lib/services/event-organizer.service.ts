/**
 * Event Organizer Service
 *
 * Manages organizer portal functionality: invitations, setup,
 * profile management, event submissions, and dashboard data.
 *
 * Follows the same patterns as partner.service.ts.
 */

import { BaseService } from './base.service';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import crypto from 'crypto';
import type {
  EventOrganizer,
  EventOrganizerWithUser,
  OrganizerDashboardData,
  OrganizerInvitation,
  UpdateOrganizerProfileData,
  EventWithCategory,
  CreateEventData,
} from '@/lib/types/events';

export class EventOrganizerService extends BaseService {
  protected get serviceName(): string {
    return 'EventOrganizerService';
  }

  // ============================================================================
  // Profile Management
  // ============================================================================

  /**
   * Get organizer profile by user ID
   */
  async getByUserId(userId: number): Promise<EventOrganizer | null> {
    this.log('Getting organizer profile', { userId });
    return this.queryOne<EventOrganizer>(
      `SELECT * FROM event_organizers WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Get organizer by ID
   */
  async getById(id: number): Promise<EventOrganizerWithUser | null> {
    this.log('Getting organizer by ID', { id });
    return this.queryOne<EventOrganizerWithUser>(
      `SELECT eo.*, u.email as user_email, u.name as user_name
       FROM event_organizers eo
       JOIN users u ON eo.user_id = u.id
       WHERE eo.id = $1`,
      [id]
    );
  }

  /**
   * Get dashboard data for an organizer
   */
  async getDashboard(userId: number): Promise<OrganizerDashboardData> {
    this.log('Getting organizer dashboard', { userId });

    const profile = await this.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Organizer profile not found');
    }

    // Get event stats
    const statsResult = await this.queryOne<{
      total_events: string;
      published_events: string;
      pending_events: string;
      draft_events: string;
      total_views: string;
    }>(
      `SELECT
        COUNT(*)::text as total_events,
        COUNT(*) FILTER (WHERE status = 'published')::text as published_events,
        COUNT(*) FILTER (WHERE status = 'pending_review')::text as pending_events,
        COUNT(*) FILTER (WHERE status = 'draft')::text as draft_events,
        COALESCE(SUM(view_count), 0)::text as total_views
       FROM events
       WHERE organizer_id = $1`,
      [profile.id]
    );

    const upcomingResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM events
       WHERE organizer_id = $1
         AND status = 'published'
         AND start_date >= CURRENT_DATE`,
      [profile.id]
    );

    return {
      profile,
      stats: {
        total_events: parseInt(statsResult?.total_events || '0', 10),
        published_events: parseInt(statsResult?.published_events || '0', 10),
        pending_events: parseInt(statsResult?.pending_events || '0', 10),
        draft_events: parseInt(statsResult?.draft_events || '0', 10),
        total_views: parseInt(statsResult?.total_views || '0', 10),
        upcoming_events: parseInt(upcomingResult?.count || '0', 10),
      },
    };
  }

  /**
   * Update organizer profile
   */
  async updateProfile(userId: number, data: UpdateOrganizerProfileData): Promise<EventOrganizer> {
    this.log('Updating organizer profile', { userId });

    const profile = await this.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Organizer profile not found');
    }

    const allowedFields = ['organization_name', 'contact_name', 'contact_phone', 'website', 'description', 'logo_url'];
    const updates: string[] = [];
    const values: unknown[] = [];
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
    const result = await this.queryOne<EventOrganizer>(
      `UPDATE event_organizers
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Failed to update organizer profile');
    }

    return result;
  }

  /**
   * Validate a setup token (for the setup page)
   */
  async validateSetupToken(token: string): Promise<{ organization_name: string } | null> {
    this.log('Validating setup token');

    const profile = await this.queryOne<{
      organization_name: string;
      setup_token_expires_at: string;
    }>(
      `SELECT organization_name, setup_token_expires_at
       FROM event_organizers
       WHERE setup_token = $1 AND status = 'pending'`,
      [token]
    );

    if (!profile) return null;
    if (new Date(profile.setup_token_expires_at) < new Date()) return null;

    return { organization_name: profile.organization_name };
  }

  // ============================================================================
  // Invitation Flow
  // ============================================================================

  /**
   * Create organizer invitation (admin only)
   */
  async createInvitation(invitation: OrganizerInvitation, invitedBy: number): Promise<{
    organizer_id: number;
    setup_token: string;
    setup_url: string;
  }> {
    this.log('Creating organizer invitation', { email: invitation.contact_email, invitedBy });

    // Check if email already exists
    const existingUser = await this.queryOne<{ id: number }>(
      `SELECT id FROM users WHERE email = $1`,
      [invitation.contact_email.toLowerCase()]
    );

    if (existingUser) {
      throw new BadRequestError('A user with this email already exists');
    }

    // Generate setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user with organizer role (temporary password — set via setup link)
    const tempPassword = crypto.randomBytes(16).toString('hex');

    const userResult = await this.queryOne<{ id: number }>(
      `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'organizer', true)
       RETURNING id`,
      [invitation.contact_email.toLowerCase(), invitation.contact_name, tempPassword]
    );

    if (!userResult) {
      throw new Error('Failed to create user');
    }

    // Create organizer profile
    const organizerResult = await this.queryOne<{ id: number }>(
      `INSERT INTO event_organizers (
        user_id, organization_name, contact_name, contact_email, contact_phone,
        website, status, invited_by, invited_at, setup_token, setup_token_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), $8, $9)
      RETURNING id`,
      [
        userResult.id,
        invitation.organization_name,
        invitation.contact_name,
        invitation.contact_email.toLowerCase(),
        invitation.contact_phone || null,
        invitation.website || null,
        invitedBy,
        setupToken,
        setupExpires,
      ]
    );

    if (!organizerResult) {
      throw new Error('Failed to create organizer profile');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const setupUrl = `${appUrl}/organizer-setup?token=${setupToken}`;

    return {
      organizer_id: organizerResult.id,
      setup_token: setupToken,
      setup_url: setupUrl,
    };
  }

  /**
   * Complete organizer setup (set password)
   */
  async completeSetup(setupToken: string, password: string): Promise<{ success: boolean }> {
    this.log('Completing organizer setup');

    const profile = await this.queryOne<{ id: number; user_id: number; setup_token_expires_at: string }>(
      `SELECT id, user_id, setup_token_expires_at
       FROM event_organizers
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

    // Activate organizer
    await this.query(
      `UPDATE event_organizers
       SET status = 'active',
           setup_completed_at = CURRENT_TIMESTAMP,
           setup_token = NULL,
           setup_token_expires_at = NULL
       WHERE id = $1`,
      [profile.id]
    );

    return { success: true };
  }

  // ============================================================================
  // Organizer Events
  // ============================================================================

  /**
   * Get events for an organizer
   */
  async getOrganizerEvents(userId: number, status?: string): Promise<EventWithCategory[]> {
    this.log('Getting organizer events', { userId, status });

    const profile = await this.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Organizer profile not found');
    }

    let sql = `
      SELECT e.*,
             ec.name as category_name,
             ec.slug as category_slug,
             ec.icon as category_icon
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      WHERE e.organizer_id = $1
    `;
    const params: unknown[] = [profile.id];

    if (status) {
      sql += ` AND e.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY e.created_at DESC`;

    const result = await this.query<EventWithCategory>(sql, params);
    return result.rows;
  }

  /**
   * Create event as organizer
   * Sets status to pending_review (or published if auto_approve)
   */
  async createEventAsOrganizer(userId: number, eventData: CreateEventData): Promise<{ id: number; status: string }> {
    this.log('Organizer creating event', { userId });

    const profile = await this.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Organizer profile not found');
    }

    if (profile.status !== 'active') {
      throw new BadRequestError('Your organizer account is not active');
    }

    // Set organizer fields automatically
    const data: CreateEventData = {
      ...eventData,
      organizer_name: profile.organization_name,
      organizer_email: profile.contact_email,
      organizer_phone: profile.contact_phone,
      organizer_website: profile.website,
    };

    // Import events service dynamically to avoid circular dependency
    const { eventsService } = await import('./events.service');

    const event = await eventsService.create(data, userId);

    // Update the event with organizer_id and auto-approve status
    await this.query(
      `UPDATE events SET organizer_id = $1, status = $2 WHERE id = $3`,
      [profile.id, profile.auto_approve ? 'published' : event.status, event.id]
    );

    return {
      id: event.id,
      status: profile.auto_approve ? 'published' : event.status,
    };
  }

  /**
   * Submit event for review (organizer submits a draft)
   */
  async submitForReview(userId: number, eventId: number): Promise<void> {
    this.log('Submitting event for review', { userId, eventId });

    const profile = await this.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Organizer profile not found');
    }

    // Verify ownership
    const event = await this.queryOne<{ id: number; organizer_id: number; status: string }>(
      `SELECT id, organizer_id, status FROM events WHERE id = $1`,
      [eventId]
    );

    if (!event || event.organizer_id !== profile.id) {
      throw new NotFoundError('Event not found');
    }

    if (event.status !== 'draft') {
      throw new BadRequestError('Only draft events can be submitted for review');
    }

    if (profile.auto_approve) {
      // Trusted organizers skip review
      await this.query(
        `UPDATE events SET status = 'published', published_at = NOW() WHERE id = $1`,
        [eventId]
      );
    } else {
      await this.query(
        `UPDATE events SET status = 'pending_review' WHERE id = $1`,
        [eventId]
      );
    }
  }

  /**
   * Check if organizer owns an event
   */
  async ownsEvent(userId: number, eventId: number): Promise<boolean> {
    const profile = await this.getByUserId(userId);
    if (!profile) return false;

    const event = await this.queryOne<{ id: number }>(
      `SELECT id FROM events WHERE id = $1 AND organizer_id = $2`,
      [eventId, profile.id]
    );

    return !!event;
  }

  // ============================================================================
  // Admin Operations
  // ============================================================================

  /**
   * Get all organizers (admin)
   */
  async getAllOrganizers(): Promise<EventOrganizerWithUser[]> {
    this.log('Getting all organizers');

    const result = await this.query<EventOrganizerWithUser>(
      `SELECT eo.*, u.email as user_email, u.name as user_name
       FROM event_organizers eo
       JOIN users u ON eo.user_id = u.id
       ORDER BY eo.created_at DESC`
    );

    return result.rows;
  }

  /**
   * Update organizer status (admin)
   */
  async updateStatus(id: number, data: {
    status?: string;
    trust_level?: string;
    auto_approve?: boolean;
  }): Promise<EventOrganizer> {
    this.log('Updating organizer status', { id, data });

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }
    if (data.trust_level !== undefined) {
      updates.push(`trust_level = $${paramIndex}`);
      values.push(data.trust_level);
      paramIndex++;
      // Auto-approve for trusted organizers
      if (data.trust_level === 'trusted' && data.auto_approve === undefined) {
        updates.push(`auto_approve = true`);
      }
    }
    if (data.auto_approve !== undefined) {
      updates.push(`auto_approve = $${paramIndex}`);
      values.push(data.auto_approve);
      paramIndex++;
    }

    if (updates.length === 0) {
      const current = await this.queryOne<EventOrganizer>(
        `SELECT * FROM event_organizers WHERE id = $1`,
        [id]
      );
      if (!current) throw new NotFoundError('Organizer not found');
      return current;
    }

    values.push(id);
    const result = await this.queryOne<EventOrganizer>(
      `UPDATE event_organizers
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!result) {
      throw new NotFoundError('Organizer not found');
    }

    return result;
  }

  /**
   * Log organizer activity
   */
  async logActivity(organizerId: number, action: string, details?: object, eventId?: number, ipAddress?: string): Promise<void> {
    await this.query(
      `INSERT INTO event_activity_log (organizer_id, event_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [organizerId, eventId || null, action, details ? JSON.stringify(details) : null, ipAddress || null]
    );
  }
}

export const eventOrganizerService = new EventOrganizerService();
