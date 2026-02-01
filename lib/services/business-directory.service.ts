/**
 * Business Directory Service
 *
 * @module lib/services/business-directory.service
 * @description Manages the business directory for invitation-only partner onboarding.
 * Handles business import, review, status management, and partner invitations.
 *
 * @features
 * - Import businesses from CSV/JSON
 * - Review and approve/reject businesses
 * - Generate invitation links
 * - Send invitation emails
 * - Track invitation history
 *
 * @security
 * - Admin-only operations
 * - Invite tokens are cryptographically secure
 * - Token expiration enforced
 */

import { BaseService } from './base.service';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export type BusinessType = 'winery' | 'restaurant' | 'hotel' | 'boutique' | 'gallery' | 'activity' | 'other';
export type BusinessStatus = 'imported' | 'approved' | 'invited' | 'active' | 'rejected';

export interface Business {
  id: number;
  name: string;
  business_type: BusinessType;
  address?: string;
  city: string;
  state: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  short_description?: string;
  status: BusinessStatus;
  invite_token?: string;
  invite_token_expires_at?: string;
  invited_at?: string;
  invited_by?: number;
  invitation_email_sent: boolean;
  invitation_email_sent_at?: string;
  partner_profile_id?: number;
  claimed_at?: string;
  claimed_by?: number;
  data_source: string;
  import_batch_id?: string;
  data_confidence: number;
  last_verified_at?: string;
  verified_by?: number;
  winery_id?: number;
  hotel_id?: number;
  restaurant_id?: number;
  notes?: string;
  admin_notes?: string;
  hours_of_operation?: Record<string, unknown>;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

export interface BusinessImportRow {
  name: string;
  business_type: BusinessType;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  short_description?: string;
  latitude?: number;
  longitude?: number;
}

export interface ImportBatch {
  id: number;
  batch_id: string;
  file_name?: string;
  source_type: 'csv' | 'json' | 'manual';
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  duplicate_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back';
  error_details?: Record<string, unknown>;
  imported_by?: number;
  started_at: string;
  completed_at?: string;
  notes?: string;
}

export interface BusinessFilters {
  status?: BusinessStatus | BusinessStatus[];
  business_type?: BusinessType | BusinessType[];
  city?: string;
  search?: string;
  import_batch_id?: string;
}

export interface InvitationResult {
  business_id: number;
  invite_token: string;
  invite_url: string;
  expires_at: string;
  email_sent?: boolean;
}

// ============================================================================
// Service
// ============================================================================

class BusinessDirectoryService extends BaseService {
  protected get serviceName(): string {
    return 'BusinessDirectoryService';
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get all businesses with optional filters
   */
  async getAll(
    filters?: BusinessFilters,
    options?: { limit?: number; offset?: number; orderBy?: string }
  ): Promise<{ businesses: Business[]; total: number }> {
    this.log('Getting businesses', { filters, options });

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Status filter
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(statuses);
      paramIndex++;
    }

    // Business type filter
    if (filters?.business_type) {
      const types = Array.isArray(filters.business_type) ? filters.business_type : [filters.business_type];
      conditions.push(`business_type = ANY($${paramIndex})`);
      params.push(types);
      paramIndex++;
    }

    // City filter
    if (filters?.city) {
      conditions.push(`city ILIKE $${paramIndex}`);
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    // Search filter (name, address, description)
    if (filters?.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR short_description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Import batch filter
    if (filters?.import_batch_id) {
      conditions.push(`import_batch_id = $${paramIndex}`);
      params.push(filters.import_batch_id);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = options?.orderBy || 'created_at DESC';
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Get total count
    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM businesses ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get businesses
    const result = await this.query<Business>(
      `SELECT * FROM businesses ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { businesses: result.rows, total };
  }

  /**
   * Get business by ID
   */
  async getById(id: number): Promise<Business | null> {
    return this.queryOne<Business>('SELECT * FROM businesses WHERE id = $1', [id]);
  }

  /**
   * Get business by invite token
   */
  async getByInviteToken(token: string): Promise<Business | null> {
    return this.queryOne<Business>(
      'SELECT * FROM businesses WHERE invite_token = $1',
      [token]
    );
  }

  /**
   * Get status counts for dashboard
   */
  async getStatusCounts(): Promise<Record<BusinessStatus, number>> {
    const result = await this.query<{ status: BusinessStatus; count: string }>(
      `SELECT status, COUNT(*) as count FROM businesses GROUP BY status`
    );

    const counts: Record<BusinessStatus, number> = {
      imported: 0,
      approved: 0,
      invited: 0,
      active: 0,
      rejected: 0,
    };

    for (const row of result.rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Get type counts for dashboard
   */
  async getTypeCounts(): Promise<Record<BusinessType, number>> {
    const result = await this.query<{ business_type: BusinessType; count: string }>(
      `SELECT business_type, COUNT(*) as count FROM businesses WHERE status != 'rejected' GROUP BY business_type`
    );

    const counts: Record<BusinessType, number> = {
      winery: 0,
      restaurant: 0,
      hotel: 0,
      boutique: 0,
      gallery: 0,
      activity: 0,
      other: 0,
    };

    for (const row of result.rows) {
      counts[row.business_type] = parseInt(row.count, 10);
    }

    return counts;
  }

  // ==========================================================================
  // Import Methods
  // ==========================================================================

  /**
   * Start an import batch
   */
  async startImportBatch(
    fileName: string,
    sourceType: 'csv' | 'json' | 'manual',
    importedBy: number,
    notes?: string
  ): Promise<ImportBatch> {
    const batchId = `import_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const result = await this.queryOne<ImportBatch>(
      `INSERT INTO business_import_batches (batch_id, file_name, source_type, imported_by, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [batchId, fileName, sourceType, importedBy, notes]
    );

    if (!result) {
      throw new Error('Failed to create import batch');
    }

    return result;
  }

  /**
   * Import businesses from parsed data
   */
  async importBusinesses(
    rows: BusinessImportRow[],
    batchId: string,
    _importedBy: number
  ): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
    duplicates: number;
  }> {
    this.log('Importing businesses', { batchId, rowCount: rows.length });

    // Update batch status to processing
    await this.query(
      `UPDATE business_import_batches SET status = 'processing', total_rows = $1 WHERE batch_id = $2`,
      [rows.length, batchId]
    );

    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Validate required fields
        if (!row.name || !row.business_type) {
          errors.push({ row: i + 1, error: 'Missing required fields: name and business_type' });
          continue;
        }

        // Check for duplicate (same name and city)
        const existing = await this.queryOne<{ id: number }>(
          `SELECT id FROM businesses WHERE LOWER(name) = LOWER($1) AND LOWER(city) = LOWER($2)`,
          [row.name, row.city || 'Walla Walla']
        );

        if (existing) {
          duplicates++;
          skipped++;
          continue;
        }

        // Insert business
        await this.query(
          `INSERT INTO businesses (
            name, business_type, address, city, state, zip,
            phone, email, website, short_description,
            latitude, longitude, data_source, import_batch_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'csv_import', $13, 'imported')`,
          [
            row.name,
            row.business_type,
            row.address || null,
            row.city || 'Walla Walla',
            row.state || 'WA',
            row.zip || null,
            row.phone || null,
            row.email || null,
            row.website || null,
            row.short_description || null,
            row.latitude || null,
            row.longitude || null,
            batchId,
          ]
        );

        imported++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ row: i + 1, error: errorMessage });
      }
    }

    // Update batch with results
    await this.query(
      `UPDATE business_import_batches
       SET status = $1, imported_count = $2, skipped_count = $3, error_count = $4,
           duplicate_count = $5, completed_at = CURRENT_TIMESTAMP,
           error_details = $6
       WHERE batch_id = $7`,
      [
        errors.length > 0 ? 'completed' : 'completed',
        imported,
        skipped,
        errors.length,
        duplicates,
        errors.length > 0 ? JSON.stringify(errors) : null,
        batchId,
      ]
    );

    this.log('Import complete', { batchId, imported, skipped, errors: errors.length, duplicates });

    return { imported, skipped, errors, duplicates };
  }

  /**
   * Get import batch by ID
   */
  async getImportBatch(batchId: string): Promise<ImportBatch | null> {
    return this.queryOne<ImportBatch>(
      'SELECT * FROM business_import_batches WHERE batch_id = $1',
      [batchId]
    );
  }

  /**
   * Get all import batches
   */
  async getImportBatches(limit = 20): Promise<ImportBatch[]> {
    const result = await this.query<ImportBatch>(
      'SELECT * FROM business_import_batches ORDER BY started_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  // ==========================================================================
  // Status Management
  // ==========================================================================

  /**
   * Approve a business (mark ready for invitation)
   */
  async approve(id: number, adminUserId: number, notes?: string): Promise<Business> {
    const business = await this.getById(id);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    if (business.status !== 'imported' && business.status !== 'rejected') {
      throw new BadRequestError(`Cannot approve business with status: ${business.status}`);
    }

    const result = await this.queryOne<Business>(
      `UPDATE businesses
       SET status = 'approved', admin_notes = COALESCE($1, admin_notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [notes, id]
    );

    if (!result) {
      throw new Error('Failed to approve business');
    }

    this.log('Business approved', { id, adminUserId });
    return result;
  }

  /**
   * Reject a business (hide but keep for record)
   */
  async reject(id: number, adminUserId: number, notes?: string): Promise<Business> {
    const business = await this.getById(id);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    if (business.status === 'active') {
      throw new BadRequestError('Cannot reject an active partner');
    }

    const result = await this.queryOne<Business>(
      `UPDATE businesses
       SET status = 'rejected', admin_notes = COALESCE($1, admin_notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [notes, id]
    );

    if (!result) {
      throw new Error('Failed to reject business');
    }

    this.log('Business rejected', { id, adminUserId });
    return result;
  }

  /**
   * Restore a rejected business back to imported status
   */
  async restore(id: number, adminUserId: number): Promise<Business> {
    const business = await this.getById(id);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    if (business.status !== 'rejected') {
      throw new BadRequestError('Can only restore rejected businesses');
    }

    const result = await this.queryOne<Business>(
      `UPDATE businesses
       SET status = 'imported', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!result) {
      throw new Error('Failed to restore business');
    }

    this.log('Business restored', { id, adminUserId });
    return result;
  }

  /**
   * Hard delete a business
   */
  async deleteBusiness(id: number, adminUserId: number): Promise<void> {
    const business = await this.getById(id);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    if (business.status === 'active') {
      throw new BadRequestError('Cannot delete an active partner. Deactivate first.');
    }

    await this.query('DELETE FROM businesses WHERE id = $1', [id]);
    this.log('Business deleted', { id, name: business.name, adminUserId });
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(
    ids: number[],
    status: 'approved' | 'rejected',
    adminUserId: number,
    notes?: string
  ): Promise<number> {
    if (ids.length === 0) return 0;

    // Only allow bulk operations on imported/rejected businesses
    const allowedCurrentStatuses = status === 'approved'
      ? ['imported', 'rejected']
      : ['imported', 'approved'];

    const result = await this.query(
      `UPDATE businesses
       SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3) AND status = ANY($4)`,
      [status, notes, ids, allowedCurrentStatuses]
    );

    this.log('Bulk status update', { status, count: result.rowCount, adminUserId });
    return result.rowCount || 0;
  }

  // ==========================================================================
  // Invitation Methods
  // ==========================================================================

  /**
   * Generate an invitation link for a business
   */
  async generateInviteLink(
    id: number,
    adminUserId: number,
    expirationDays = 30
  ): Promise<InvitationResult> {
    const business = await this.getById(id);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    if (business.status !== 'approved' && business.status !== 'invited') {
      throw new BadRequestError(`Business must be approved before inviting. Current status: ${business.status}`);
    }

    // Generate token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    // Update business with invite token
    await this.query(
      `UPDATE businesses
       SET invite_token = $1, invite_token_expires_at = $2, invited_at = CURRENT_TIMESTAMP,
           invited_by = $3, status = 'invited', updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [inviteToken, expiresAt, adminUserId, id]
    );

    // Record in invitation history
    await this.query(
      `INSERT INTO business_invitation_history (business_id, invitation_type, invite_token, created_by)
       VALUES ($1, 'link', $2, $3)`,
      [id, inviteToken, adminUserId]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/partner-invite/${inviteToken}`;

    this.log('Invite link generated', { businessId: id, adminUserId });

    return {
      business_id: id,
      invite_token: inviteToken,
      invite_url: inviteUrl,
      expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Send invitation email to a business
   */
  async sendInviteEmail(
    id: number,
    adminUserId: number,
    recipientEmail?: string
  ): Promise<InvitationResult> {
    const business = await this.getById(id);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const email = recipientEmail || business.email;
    if (!email) {
      throw new BadRequestError('No email address available for this business');
    }

    // Generate invite link if not exists or expired
    let inviteToken = business.invite_token;
    let expiresAt = business.invite_token_expires_at;

    if (!inviteToken || (expiresAt && new Date(expiresAt) < new Date())) {
      const invite = await this.generateInviteLink(id, adminUserId);
      inviteToken = invite.invite_token;
      expiresAt = invite.expires_at;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/partner-invite/${inviteToken}`;

    // Import email service dynamically to avoid circular dependencies
    const { sendEmail, EmailTemplates } = await import('@/lib/email');

    // Send email
    const emailSent = await sendEmail({
      to: email,
      ...EmailTemplates.partnerInvitation({
        business_name: business.name,
        invite_url: inviteUrl,
        expires_in_days: 30,
      }),
    });

    // Update business
    await this.query(
      `UPDATE businesses
       SET invitation_email_sent = true, invitation_email_sent_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Record in invitation history
    await this.query(
      `INSERT INTO business_invitation_history
       (business_id, invitation_type, recipient_email, invite_token, email_sent, email_sent_at, created_by)
       VALUES ($1, 'email', $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
      [id, email, inviteToken, emailSent, adminUserId]
    );

    this.log('Invite email sent', { businessId: id, email, success: emailSent });

    return {
      business_id: id,
      invite_token: inviteToken!,
      invite_url: inviteUrl,
      expires_at: expiresAt!,
      email_sent: emailSent,
    };
  }

  /**
   * Validate an invite token and return business info
   */
  async validateInviteToken(token: string): Promise<{
    valid: boolean;
    business?: Business;
    error?: string;
  }> {
    const business = await this.getByInviteToken(token);

    if (!business) {
      return { valid: false, error: 'Invalid invitation link' };
    }

    if (business.status === 'active') {
      return { valid: false, error: 'This business has already been claimed' };
    }

    if (business.invite_token_expires_at && new Date(business.invite_token_expires_at) < new Date()) {
      return { valid: false, error: 'This invitation link has expired' };
    }

    // Record link access
    await this.query(
      `UPDATE business_invitation_history
       SET link_accessed_at = CURRENT_TIMESTAMP, link_access_count = link_access_count + 1
       WHERE invite_token = $1`,
      [token]
    );

    return { valid: true, business };
  }

  /**
   * Accept an invitation and create partner profile
   */
  async acceptInvitation(
    token: string,
    userId: number,
    partnerProfileId: number
  ): Promise<Business> {
    const validation = await this.validateInviteToken(token);

    if (!validation.valid || !validation.business) {
      throw new BadRequestError(validation.error || 'Invalid invitation');
    }

    const result = await this.queryOne<Business>(
      `UPDATE businesses
       SET status = 'active', partner_profile_id = $1, claimed_at = CURRENT_TIMESTAMP,
           claimed_by = $2, invite_token = NULL, invite_token_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [partnerProfileId, userId, validation.business.id]
    );

    if (!result) {
      throw new Error('Failed to accept invitation');
    }

    this.log('Invitation accepted', { businessId: validation.business.id, userId });
    return result;
  }

  // ==========================================================================
  // CRUD Methods
  // ==========================================================================

  /**
   * Create a business manually
   */
  async create(data: BusinessImportRow, createdBy: number): Promise<Business> {
    const result = await this.queryOne<Business>(
      `INSERT INTO businesses (
        name, business_type, address, city, state, zip,
        phone, email, website, short_description,
        latitude, longitude, data_source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'manual', 'imported')
      RETURNING *`,
      [
        data.name,
        data.business_type,
        data.address || null,
        data.city || 'Walla Walla',
        data.state || 'WA',
        data.zip || null,
        data.phone || null,
        data.email || null,
        data.website || null,
        data.short_description || null,
        data.latitude || null,
        data.longitude || null,
      ]
    );

    if (!result) {
      throw new Error('Failed to create business');
    }

    this.log('Business created', { id: result.id, name: data.name, createdBy });
    return result;
  }

  /**
   * Update a business
   */
  async updateBusiness(id: number, data: Partial<BusinessImportRow>, updatedBy: number): Promise<Business> {
    const business = await this.getById(id);
    if (!business) {
      throw new NotFoundError('Business not found');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'business_type', 'address', 'city', 'state', 'zip',
      'phone', 'email', 'website', 'short_description', 'latitude', 'longitude',
    ];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return business;
    }

    values.push(id);
    const result = await this.queryOne<Business>(
      `UPDATE businesses SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Failed to update business');
    }

    this.log('Business updated', { id, updatedBy });
    return result;
  }
}

export const businessDirectoryService = new BusinessDirectoryService();
