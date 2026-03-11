/**
 * Pipeline Velocity Reporting API
 * GET /api/admin/crm/reports/pipeline-velocity
 *
 * Returns metrics on how fast deals move through pipeline stages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import type { QueryParamValue } from '@/lib/db-helpers';

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  // Build date filters
  const dateConditions: string[] = [];
  const params: QueryParamValue[] = [];

  if (fromDate) {
    params.push(fromDate);
    dateConditions.push(`d.created_at >= $${params.length}`);
  }
  if (toDate) {
    params.push(toDate);
    dateConditions.push(`d.created_at <= $${params.length}`);
  }

  const dateWhereClause = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

  // Get average time to close (for won deals)
  const avgTimeToCloseResult = await query<{
    avg_days_to_close: number;
    deals_won: number;
    total_value_won: number;
  }>(
    `SELECT
       COALESCE(AVG(EXTRACT(EPOCH FROM (won_at - created_at)) / 86400), 0)::numeric(10,1) as avg_days_to_close,
       COUNT(*) as deals_won,
       COALESCE(SUM(actual_value), 0) as total_value_won
     FROM crm_deals d
     JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
     WHERE ps.is_won = true AND d.won_at IS NOT NULL
     ${dateWhereClause}`,
    params
  );

  // Get average time spent in each stage
  const stageVelocityResult = await query<{
    stage_name: string;
    stage_color: string;
    sort_order: number;
    deals_in_stage: number;
    avg_days_in_stage: number;
    deals_moved_through: number;
  }>(
    `WITH stage_durations AS (
       SELECT
         d.id as deal_id,
         ps.name as stage_name,
         ps.color as stage_color,
         ps.sort_order,
         ps.is_won,
         ps.is_lost,
         CASE
           WHEN d.stage_changed_at IS NOT NULL AND d.stage_id = ps.id
           THEN EXTRACT(EPOCH FROM (NOW() - d.stage_changed_at)) / 86400
           ELSE NULL
         END as days_in_current_stage
       FROM crm_deals d
       JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
       WHERE 1=1 ${dateWhereClause}
     )
     SELECT
       stage_name,
       stage_color,
       sort_order,
       COUNT(CASE WHEN days_in_current_stage IS NOT NULL THEN 1 END) as deals_in_stage,
       COALESCE(AVG(days_in_current_stage)::numeric(10,1), 0) as avg_days_in_stage,
       COUNT(*) as deals_moved_through
     FROM stage_durations
     WHERE is_won = false AND is_lost = false
     GROUP BY stage_name, stage_color, sort_order
     ORDER BY sort_order`,
    params
  );

  // Get conversion rate between stages
  const stageConversionResult = await query<{
    from_stage: string;
    to_stage: string;
    conversion_count: number;
  }>(
    `SELECT
       ps_from.name as from_stage,
       ps_to.name as to_stage,
       COUNT(*) as conversion_count
     FROM crm_deals d
     JOIN crm_pipeline_stages ps_to ON d.stage_id = ps_to.id
     JOIN crm_pipeline_stages ps_from ON ps_from.sort_order = ps_to.sort_order - 1
       AND ps_from.template_id = ps_to.template_id
     WHERE d.stage_changed_at IS NOT NULL ${dateWhereClause}
     GROUP BY ps_from.name, ps_to.name, ps_from.sort_order
     ORDER BY ps_from.sort_order`,
    params
  );

  // Get pipeline health metrics
  const healthMetricsResult = await query<{
    total_open_deals: number;
    total_pipeline_value: number;
    deals_created_this_month: number;
    deals_won_this_month: number;
    deals_lost_this_month: number;
    win_rate: number;
    avg_deal_value: number;
  }>(
    `SELECT
       COUNT(CASE WHEN ps.is_won = false AND ps.is_lost = false THEN 1 END) as total_open_deals,
       COALESCE(SUM(CASE WHEN ps.is_won = false AND ps.is_lost = false THEN d.estimated_value END), 0) as total_pipeline_value,
       COUNT(CASE WHEN d.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as deals_created_this_month,
       COUNT(CASE WHEN ps.is_won = true AND d.won_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as deals_won_this_month,
       COUNT(CASE WHEN ps.is_lost = true AND d.lost_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as deals_lost_this_month,
       COALESCE(
         ROUND(
           COUNT(CASE WHEN ps.is_won = true THEN 1 END)::numeric /
           NULLIF(COUNT(CASE WHEN ps.is_won = true OR ps.is_lost = true THEN 1 END), 0) * 100,
           1
         ),
         0
       ) as win_rate,
       COALESCE(AVG(CASE WHEN ps.is_won = true THEN d.actual_value END), 0)::numeric(10,2) as avg_deal_value
     FROM crm_deals d
     JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
     WHERE 1=1 ${dateWhereClause}`,
    params
  );

  // Get deals at risk (stale deals in early stages)
  const staleDealsResult = await query<{
    deal_id: number;
    deal_title: string;
    stage_name: string;
    days_in_stage: number;
    estimated_value: number;
    contact_name: string;
  }>(
    `SELECT
       d.id as deal_id,
       d.title as deal_title,
       ps.name as stage_name,
       EXTRACT(EPOCH FROM (NOW() - COALESCE(d.stage_changed_at, d.created_at))) / 86400 as days_in_stage,
       d.estimated_value,
       c.name as contact_name
     FROM crm_deals d
     JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
     LEFT JOIN crm_contacts c ON d.contact_id = c.id
     WHERE ps.is_won = false AND ps.is_lost = false
       AND EXTRACT(EPOCH FROM (NOW() - COALESCE(d.stage_changed_at, d.created_at))) / 86400 > 14
     ORDER BY days_in_stage DESC
     LIMIT 10`,
    []
  );

  // Get monthly deal flow
  const monthlyFlowResult = await query<{
    month: string;
    deals_created: number;
    deals_won: number;
    deals_lost: number;
    value_won: number;
  }>(
    `SELECT
       TO_CHAR(d.created_at, 'YYYY-MM') as month,
       COUNT(*) as deals_created,
       COUNT(CASE WHEN ps.is_won = true THEN 1 END) as deals_won,
       COUNT(CASE WHEN ps.is_lost = true THEN 1 END) as deals_lost,
       COALESCE(SUM(CASE WHEN ps.is_won = true THEN d.actual_value ELSE 0 END), 0) as value_won
     FROM crm_deals d
     JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
     WHERE d.created_at >= NOW() - INTERVAL '12 months'
     GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
     ORDER BY month ASC`,
    []
  );

  return NextResponse.json({
    success: true,
    data: {
      time_to_close: {
        avg_days: avgTimeToCloseResult.rows[0]?.avg_days_to_close || 0,
        deals_won: avgTimeToCloseResult.rows[0]?.deals_won || 0,
        total_value: avgTimeToCloseResult.rows[0]?.total_value_won || 0,
      },
      stage_velocity: stageVelocityResult.rows,
      stage_conversions: stageConversionResult.rows,
      health_metrics: healthMetricsResult.rows[0],
      stale_deals: staleDealsResult.rows,
      monthly_flow: monthlyFlowResult.rows,
    },
  });
});
