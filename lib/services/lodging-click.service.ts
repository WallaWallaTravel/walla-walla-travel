import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export interface LodgingClick {
  id: number;
  property_id: number;
  property_slug?: string;
  platform?: string;
  referrer?: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
  created_at: Date;
}

export interface ClickStats {
  property_id: number;
  property_name: string;
  property_slug: string;
  total_clicks: number;
  last_click_at: Date;
}

export interface PlatformBreakdown {
  platform: string;
  click_count: number;
}

export interface ClickTrend {
  date: string;
  click_count: number;
}

// ============================================================================
// Service
// ============================================================================

class LodgingClickService extends BaseService {
  protected get serviceName(): string {
    return 'LodgingClickService';
  }

  /**
   * Record a booking redirect click
   */
  async recordClick(data: {
    property_id: number;
    property_slug?: string;
    platform?: string;
    referrer?: string;
    user_agent?: string;
    ip_address?: string;
    session_id?: string;
  }): Promise<LodgingClick> {
    const result = await this.query<LodgingClick>(
      `INSERT INTO lodging_clicks (
        property_id, property_slug, platform, referrer, user_agent, ip_address, session_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        data.property_id,
        data.property_slug,
        data.platform,
        data.referrer,
        data.user_agent,
        data.ip_address,
        data.session_id,
      ]
    );
    return result.rows[0];
  }

  /**
   * Get click stats per property (for admin analytics)
   */
  async getClickStats(options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ClickStats[]> {
    let sql = `
      SELECT
        lc.property_id,
        lp.name as property_name,
        lp.slug as property_slug,
        COUNT(lc.id)::int as total_clicks,
        MAX(lc.created_at) as last_click_at
      FROM lodging_clicks lc
      JOIN lodging_properties lp ON lp.id = lc.property_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.startDate) {
      sql += ` AND lc.created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      sql += ` AND lc.created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    sql += ` GROUP BY lc.property_id, lp.name, lp.slug
             ORDER BY total_clicks DESC`;

    if (options?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
    }

    const result = await this.query<ClickStats>(sql, params);
    return result.rows;
  }

  /**
   * Get clicks for a specific property
   */
  async getPropertyClicks(propertyId: number, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ clicks: LodgingClick[]; total: number }> {
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM lodging_clicks WHERE property_id = $1`,
      [propertyId]
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const result = await this.query<LodgingClick>(
      `SELECT * FROM lodging_clicks
       WHERE property_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [propertyId, limit, offset]
    );

    return { clicks: result.rows, total };
  }

  /**
   * Get platform breakdown for analytics
   */
  async getPlatformBreakdown(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<PlatformBreakdown[]> {
    let sql = `
      SELECT
        COALESCE(platform, 'direct') as platform,
        COUNT(*)::int as click_count
      FROM lodging_clicks
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.startDate) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    sql += ` GROUP BY platform ORDER BY click_count DESC`;

    const result = await this.query<PlatformBreakdown>(sql, params);
    return result.rows;
  }

  /**
   * Get click trends over time (daily counts)
   */
  async getClickTrends(days: number = 30): Promise<ClickTrend[]> {
    const result = await this.query<ClickTrend>(
      `SELECT
        DATE(created_at)::text as date,
        COUNT(*)::int as click_count
       FROM lodging_clicks
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );
    return result.rows;
  }

  /**
   * Get total click count
   */
  async getTotalClicks(options?: { startDate?: string; endDate?: string }): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM lodging_clicks WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.startDate) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    const result = await this.query<{ count: string }>(sql, params);
    return parseInt(result.rows[0]?.count || '0', 10);
  }
}

export const lodgingClickService = new LodgingClickService();
