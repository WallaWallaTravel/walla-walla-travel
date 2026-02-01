/**
 * Competitor Monitoring Service
 *
 * @module lib/services/competitor-monitoring.service
 * @description Service class for competitor monitoring operations including
 * CRUD for competitors, pricing, changes, SWOT analysis, and AI-powered insights.
 */

import { BaseService } from './base.service';
import type {
  Competitor,
  CompetitorWithChanges,
  CompetitorPricing,
  CompetitorSnapshot,
  CompetitorChange,
  CompetitorChangeWithName,
  CompetitorSwot,
  CompetitiveAdvantage,
  CompetitorAlert,
  CreateCompetitorInput,
  UpdateCompetitorInput,
  CreatePricingInput,
  CreateChangeInput,
  UpdateChangeStatusInput,
  CreateSwotInput,
  CreateAdvantageInput,
  PriceComparisonRow,
  PriorityLevel,
  ChangeStatus,
  SwotCategory,
} from '@/types/competitors';

export class CompetitorMonitoringService extends BaseService {
  protected get serviceName(): string {
    return 'CompetitorMonitoringService';
  }

  // ============================================================================
  // Competitors CRUD
  // ============================================================================

  /**
   * Get all active competitors with unreviewed change counts
   */
  async getCompetitors(options: {
    priority?: PriorityLevel;
    activeOnly?: boolean;
    includeChangeCounts?: boolean;
  } = {}): Promise<CompetitorWithChanges[]> {
    const { priority, activeOnly = true, includeChangeCounts = true } = options;

    let sql = `
      SELECT
        c.*,
        ${includeChangeCounts ? `COALESCE(COUNT(cc.id) FILTER (WHERE cc.status = 'new'), 0)::int as unreviewed_changes` : '0 as unreviewed_changes'}
      FROM competitors c
      ${includeChangeCounts ? `LEFT JOIN competitor_changes cc ON c.id = cc.competitor_id` : ''}
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (activeOnly) {
      sql += ` AND c.is_active = TRUE`;
    }

    if (priority) {
      sql += ` AND c.priority_level = $${paramIndex++}`;
      params.push(priority);
    }

    sql += `
      ${includeChangeCounts ? 'GROUP BY c.id' : ''}
      ORDER BY
        CASE c.priority_level
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        c.name
    `;

    return this.queryMany<CompetitorWithChanges>(sql, params);
  }

  /**
   * Get a single competitor by ID
   */
  async getCompetitorById(id: number): Promise<Competitor | null> {
    return this.findById<Competitor>('competitors', id);
  }

  /**
   * Get competitor with all related data
   */
  async getCompetitorDetail(id: number): Promise<{
    competitor: Competitor;
    pricing: CompetitorPricing[];
    swot: CompetitorSwot[];
    recentChanges: CompetitorChange[];
  } | null> {
    const competitor = await this.findById<Competitor>('competitors', id);
    if (!competitor) return null;

    const [pricing, swot, recentChanges] = await Promise.all([
      this.getCompetitorPricing(id, true),
      this.getCompetitorSwot(id),
      this.getCompetitorChanges(id, 10),
    ]);

    return { competitor, pricing, swot, recentChanges };
  }

  /**
   * Create a new competitor
   */
  async createCompetitor(data: CreateCompetitorInput, createdBy?: number): Promise<Competitor> {
    return this.insert<Competitor>('competitors', {
      ...data,
      monitored_pages: JSON.stringify(data.monitored_pages || ['pricing', 'tours', 'homepage']),
      email_recipients: JSON.stringify(data.email_recipients || []),
      vehicle_types: data.vehicle_types || null,
      created_by: createdBy || null,
    });
  }

  /**
   * Update a competitor
   */
  async updateCompetitor(id: number, data: UpdateCompetitorInput): Promise<Competitor | null> {
    const updateData: Record<string, unknown> = { ...data };

    if (data.monitored_pages) {
      updateData.monitored_pages = JSON.stringify(data.monitored_pages);
    }
    if (data.email_recipients) {
      updateData.email_recipients = JSON.stringify(data.email_recipients);
    }

    return this.update<Competitor>('competitors', id, updateData);
  }

  /**
   * Deactivate a competitor (soft delete)
   */
  async deactivateCompetitor(id: number): Promise<boolean> {
    const result = await this.update('competitors', id, { is_active: false });
    return result !== null;
  }

  /**
   * Update last checked timestamp
   */
  async updateLastChecked(id: number): Promise<void> {
    await this.query(
      'UPDATE competitors SET last_checked_at = NOW(), updated_at = NOW() WHERE id = $1',
      [id]
    );
  }

  // ============================================================================
  // Pricing
  // ============================================================================

  /**
   * Get competitor pricing
   */
  async getCompetitorPricing(competitorId: number, currentOnly = true): Promise<CompetitorPricing[]> {
    let sql = `
      SELECT * FROM competitor_pricing
      WHERE competitor_id = $1
    `;

    if (currentOnly) {
      sql += ` AND is_current = TRUE`;
    }

    sql += ` ORDER BY pricing_type, pricing_name`;

    return this.queryMany<CompetitorPricing>(sql, [competitorId]);
  }

  /**
   * Add new pricing entry
   */
  async addPricing(data: CreatePricingInput): Promise<CompetitorPricing> {
    return this.insert<CompetitorPricing>('competitor_pricing', {
      ...data,
      effective_from: data.effective_from || new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Update pricing (marks old as not current, creates new)
   */
  async updatePricing(id: number, newData: Partial<CreatePricingInput>): Promise<CompetitorPricing> {
    // Get existing pricing
    const existing = await this.findById<CompetitorPricing>('competitor_pricing', id);
    if (!existing) {
      throw new Error('Pricing not found');
    }

    // Mark old as not current
    await this.update('competitor_pricing', id, {
      is_current: false,
      effective_until: new Date().toISOString().split('T')[0],
    });

    // Create new pricing entry
    return this.insert<CompetitorPricing>('competitor_pricing', {
      competitor_id: existing.competitor_id,
      pricing_type: newData.pricing_type || existing.pricing_type,
      pricing_name: newData.pricing_name || existing.pricing_name,
      price_amount: newData.price_amount ?? existing.price_amount,
      price_unit: newData.price_unit || existing.price_unit,
      price_notes: newData.price_notes || existing.price_notes,
      comparable_to_nw_touring: newData.comparable_to_nw_touring ?? existing.comparable_to_nw_touring,
      nw_touring_equivalent: newData.nw_touring_equivalent || existing.nw_touring_equivalent,
      effective_from: new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Get price comparison matrix
   */
  async getPriceComparison(): Promise<PriceComparisonRow[]> {
    const sql = `
      SELECT
        c.id as competitor_id,
        c.name as competitor_name,
        c.priority_level,
        json_agg(
          json_build_object(
            'type', cp.pricing_type,
            'name', cp.pricing_name,
            'amount', cp.price_amount,
            'unit', cp.price_unit,
            'notes', cp.price_notes
          )
          ORDER BY cp.pricing_type, cp.pricing_name
        ) FILTER (WHERE cp.id IS NOT NULL) as pricing
      FROM competitors c
      LEFT JOIN competitor_pricing cp ON c.id = cp.competitor_id AND cp.is_current = TRUE
      WHERE c.is_active = TRUE
        AND c.competitor_type = 'tour_operator'
      GROUP BY c.id, c.name, c.priority_level
      ORDER BY
        CASE c.priority_level
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        c.name
    `;

    const rows = await this.queryMany<{
      competitor_id: number;
      competitor_name: string;
      priority_level: PriorityLevel;
      pricing: string | null;
    }>(sql);

    return rows.map(row => ({
      competitor_id: row.competitor_id,
      competitor_name: row.competitor_name,
      priority_level: row.priority_level,
      pricing: row.pricing ? JSON.parse(row.pricing as string) : [],
    }));
  }

  // ============================================================================
  // Changes
  // ============================================================================

  /**
   * Get changes for a competitor
   */
  async getCompetitorChanges(competitorId: number, limit = 50): Promise<CompetitorChange[]> {
    return this.findWhere<CompetitorChange>(
      'competitor_changes',
      'competitor_id = $1',
      [competitorId],
      '*',
      'detected_at DESC',
      limit
    );
  }

  /**
   * Get all recent changes with competitor names
   */
  async getAllRecentChanges(options: {
    status?: ChangeStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ changes: CompetitorChangeWithName[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    let countSql = `SELECT COUNT(*) as count FROM competitor_changes cc`;
    let sql = `
      SELECT
        cc.*,
        c.name as competitor_name
      FROM competitor_changes cc
      JOIN competitors c ON cc.competitor_id = c.id
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      const whereClause = ` WHERE cc.status = $${paramIndex++}`;
      countSql += whereClause;
      sql += whereClause;
      params.push(status);
    }

    sql += ` ORDER BY cc.detected_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    const queryParams = [...params, limit, offset];

    const [changes, countResult] = await Promise.all([
      this.queryMany<CompetitorChangeWithName>(sql, queryParams),
      this.query<{ count: string }>(countSql, params),
    ]);

    return {
      changes,
      total: parseInt(countResult.rows[0]?.count || '0'),
    };
  }

  /**
   * Get unreviewed changes count
   */
  async getUnreviewedCount(): Promise<number> {
    return this.queryCount(
      `SELECT COUNT(*) as count FROM competitor_changes WHERE status = 'new'`
    );
  }

  /**
   * Create a new change record
   */
  async createChange(data: CreateChangeInput): Promise<CompetitorChange> {
    return this.insert<CompetitorChange>('competitor_changes', {
      ...data,
      recommended_actions: JSON.stringify(data.recommended_actions || []),
    });
  }

  /**
   * Update change status
   */
  async updateChangeStatus(id: number, data: UpdateChangeStatusInput, userId?: number): Promise<CompetitorChange | null> {
    const updateData: Record<string, unknown> = {
      status: data.status,
    };

    if (data.status === 'reviewed' || data.status === 'actioned' || data.status === 'dismissed') {
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = userId || null;
    }

    if (data.status === 'actioned' && data.action_taken) {
      updateData.action_taken = data.action_taken;
      updateData.action_taken_at = new Date().toISOString();
    }

    return this.update<CompetitorChange>('competitor_changes', id, updateData);
  }

  // ============================================================================
  // Snapshots
  // ============================================================================

  /**
   * Get or create snapshot for a competitor page
   */
  async getSnapshot(competitorId: number, pageType: string): Promise<CompetitorSnapshot | null> {
    return this.queryOne<CompetitorSnapshot>(
      'SELECT * FROM competitor_snapshots WHERE competitor_id = $1 AND page_type = $2',
      [competitorId, pageType]
    );
  }

  /**
   * Update or create snapshot
   */
  async upsertSnapshot(data: {
    competitorId: number;
    pageType: string;
    pageUrl: string;
    contentHash: string;
    contentText: string;
    rawHtml?: string;
    httpStatus?: number;
  }): Promise<CompetitorSnapshot> {
    const sql = `
      INSERT INTO competitor_snapshots (competitor_id, page_type, page_url, content_hash, content_text, raw_html, http_status, captured_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (competitor_id, page_type)
      DO UPDATE SET
        page_url = EXCLUDED.page_url,
        content_hash = EXCLUDED.content_hash,
        content_text = EXCLUDED.content_text,
        raw_html = EXCLUDED.raw_html,
        http_status = EXCLUDED.http_status,
        captured_at = NOW()
      RETURNING *
    `;

    const result = await this.query<CompetitorSnapshot>(sql, [
      data.competitorId,
      data.pageType,
      data.pageUrl,
      data.contentHash,
      data.contentText,
      data.rawHtml || null,
      data.httpStatus || null,
    ]);

    return result.rows[0];
  }

  // ============================================================================
  // SWOT Analysis
  // ============================================================================

  /**
   * Get SWOT items for a competitor
   */
  async getCompetitorSwot(competitorId: number, activeOnly = true): Promise<CompetitorSwot[]> {
    let sql = `
      SELECT * FROM competitor_swot
      WHERE competitor_id = $1
    `;

    if (activeOnly) {
      sql += ` AND is_active = TRUE`;
    }

    sql += ` ORDER BY
      CASE category
        WHEN 'strength' THEN 1
        WHEN 'weakness' THEN 2
        WHEN 'opportunity' THEN 3
        WHEN 'threat' THEN 4
      END,
      CASE impact_level
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END
    `;

    return this.queryMany<CompetitorSwot>(sql, [competitorId]);
  }

  /**
   * Get SWOT items grouped by category
   */
  async getCompetitorSwotGrouped(competitorId: number): Promise<Record<SwotCategory, CompetitorSwot[]>> {
    const items = await this.getCompetitorSwot(competitorId);

    const grouped: Record<SwotCategory, CompetitorSwot[]> = {
      strength: [],
      weakness: [],
      opportunity: [],
      threat: [],
    };

    for (const item of items) {
      grouped[item.category].push(item);
    }

    return grouped;
  }

  /**
   * Add SWOT item
   */
  async addSwotItem(data: CreateSwotInput, createdBy?: number): Promise<CompetitorSwot> {
    return this.insert<CompetitorSwot>('competitor_swot', {
      ...data,
      created_by: createdBy || null,
    });
  }

  /**
   * Update SWOT item
   */
  async updateSwotItem(id: number, data: Partial<CreateSwotInput>): Promise<CompetitorSwot | null> {
    return this.update<CompetitorSwot>('competitor_swot', id, data);
  }

  /**
   * Delete SWOT item (soft delete)
   */
  async deleteSwotItem(id: number): Promise<boolean> {
    const result = await this.update('competitor_swot', id, { is_active: false });
    return result !== null;
  }

  // ============================================================================
  // Competitive Advantages
  // ============================================================================

  /**
   * Get all active competitive advantages
   */
  async getAdvantages(activeOnly = true): Promise<CompetitiveAdvantage[]> {
    let sql = `SELECT * FROM competitive_advantages`;

    if (activeOnly) {
      sql += ` WHERE is_active = TRUE`;
    }

    sql += ` ORDER BY
      CASE importance
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      title
    `;

    return this.queryMany<CompetitiveAdvantage>(sql);
  }

  /**
   * Get advantages that apply to a specific competitor
   */
  async getAdvantagesForCompetitor(competitorId: number): Promise<CompetitiveAdvantage[]> {
    const sql = `
      SELECT * FROM competitive_advantages
      WHERE is_active = TRUE
        AND ($1 = ANY(applies_to_competitors) OR applies_to_competitors = ARRAY[]::INT[])
      ORDER BY
        CASE importance
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END
    `;

    return this.queryMany<CompetitiveAdvantage>(sql, [competitorId]);
  }

  /**
   * Create competitive advantage
   */
  async createAdvantage(data: CreateAdvantageInput, createdBy?: number): Promise<CompetitiveAdvantage> {
    return this.insert<CompetitiveAdvantage>('competitive_advantages', {
      ...data,
      applies_to_competitors: data.applies_to_competitors || [],
      created_by: createdBy || null,
    });
  }

  /**
   * Update competitive advantage
   */
  async updateAdvantage(id: number, data: Partial<CreateAdvantageInput>): Promise<CompetitiveAdvantage | null> {
    return this.update<CompetitiveAdvantage>('competitive_advantages', id, data);
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  /**
   * Create alert record
   */
  async createAlert(data: {
    alertType: string;
    competitorId?: number;
    changeId?: number;
    subject: string;
    body: string;
    recipients: string[];
  }): Promise<CompetitorAlert> {
    return this.insert<CompetitorAlert>('competitor_alerts', {
      alert_type: data.alertType,
      competitor_id: data.competitorId || null,
      change_id: data.changeId || null,
      subject: data.subject,
      body: data.body,
      recipients: JSON.stringify(data.recipients),
    });
  }

  /**
   * Mark alert as sent
   */
  async markAlertSent(id: number, error?: string): Promise<void> {
    await this.update('competitor_alerts', id, {
      sent_at: new Date().toISOString(),
      delivery_status: error ? 'failed' : 'sent',
      delivery_error: error || null,
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get monitoring statistics
   */
  async getStatistics(): Promise<{
    totalCompetitors: number;
    activeCompetitors: number;
    totalChanges: number;
    unreviewedChanges: number;
    highThreatChanges: number;
    lastCheckAt: string | null;
  }> {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM competitors) as total_competitors,
        (SELECT COUNT(*) FROM competitors WHERE is_active = TRUE) as active_competitors,
        (SELECT COUNT(*) FROM competitor_changes) as total_changes,
        (SELECT COUNT(*) FROM competitor_changes WHERE status = 'new') as unreviewed_changes,
        (SELECT COUNT(*) FROM competitor_changes WHERE threat_level = 'high' AND status = 'new') as high_threat_changes,
        (SELECT MAX(last_checked_at) FROM competitors) as last_check_at
    `;

    const result = await this.queryOne<{
      total_competitors: string;
      active_competitors: string;
      total_changes: string;
      unreviewed_changes: string;
      high_threat_changes: string;
      last_check_at: string | null;
    }>(sql);

    return {
      totalCompetitors: parseInt(result?.total_competitors || '0'),
      activeCompetitors: parseInt(result?.active_competitors || '0'),
      totalChanges: parseInt(result?.total_changes || '0'),
      unreviewedChanges: parseInt(result?.unreviewed_changes || '0'),
      highThreatChanges: parseInt(result?.high_threat_changes || '0'),
      lastCheckAt: result?.last_check_at || null,
    };
  }
}

// Export singleton instance
export const competitorMonitoringService = new CompetitorMonitoringService();
