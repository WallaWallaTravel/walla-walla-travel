/**
 * Lead Source Reporting API
 * GET /api/admin/crm/reports/lead-sources
 *
 * Returns analytics on where leads come from and their conversion rates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import type { QueryParamValue } from '@/lib/db-helpers';

interface LeadSourceStats {
  source: string;
  source_detail: string | null;
  total_leads: number;
  converted_to_customer: number;
  conversion_rate: number;
  total_revenue: number;
  avg_revenue_per_customer: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
}

interface LeadSourceTrend {
  month: string;
  source: string;
  count: number;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Build date filters
    const dateConditions: string[] = [];
    const params: QueryParamValue[] = [];

    if (fromDate) {
      params.push(fromDate);
      dateConditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      dateConditions.push(`created_at <= $${params.length}`);
    }

    const dateWhereClause = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : '';

    // Get lead source summary
    const summaryResult = await query<LeadSourceStats>(
      `SELECT
         COALESCE(source, 'unknown') as source,
         source_detail,
         COUNT(*) as total_leads,
         COUNT(CASE WHEN lifecycle_stage IN ('customer', 'repeat_customer') THEN 1 END) as converted_to_customer,
         ROUND(
           COUNT(CASE WHEN lifecycle_stage IN ('customer', 'repeat_customer') THEN 1 END)::numeric /
           NULLIF(COUNT(*), 0) * 100,
           2
         ) as conversion_rate,
         COALESCE(SUM(total_revenue), 0) as total_revenue,
         ROUND(
           COALESCE(SUM(total_revenue), 0) /
           NULLIF(COUNT(CASE WHEN lifecycle_stage IN ('customer', 'repeat_customer') THEN 1 END), 0),
           2
         ) as avg_revenue_per_customer,
         COUNT(CASE WHEN lead_temperature = 'hot' THEN 1 END) as hot_leads,
         COUNT(CASE WHEN lead_temperature = 'warm' THEN 1 END) as warm_leads,
         COUNT(CASE WHEN lead_temperature = 'cold' THEN 1 END) as cold_leads
       FROM crm_contacts
       ${dateWhereClause}
       GROUP BY COALESCE(source, 'unknown'), source_detail
       ORDER BY total_leads DESC`,
      params
    );

    // Get monthly trend data
    const trendParams: QueryParamValue[] = [...params];
    const trendDateClause = dateWhereClause || 'WHERE created_at >= NOW() - INTERVAL \'12 months\'';

    const trendResult = await query<LeadSourceTrend>(
      `SELECT
         TO_CHAR(created_at, 'YYYY-MM') as month,
         COALESCE(source, 'unknown') as source,
         COUNT(*) as count
       FROM crm_contacts
       ${trendDateClause}
       GROUP BY TO_CHAR(created_at, 'YYYY-MM'), COALESCE(source, 'unknown')
       ORDER BY month ASC, count DESC`,
      trendParams
    );

    // Get overall summary
    const overallResult = await query<{
      total_contacts: number;
      total_leads: number;
      total_customers: number;
      total_revenue: number;
      overall_conversion_rate: number;
    }>(
      `SELECT
         COUNT(*) as total_contacts,
         COUNT(CASE WHEN lifecycle_stage = 'lead' THEN 1 END) as total_leads,
         COUNT(CASE WHEN lifecycle_stage IN ('customer', 'repeat_customer') THEN 1 END) as total_customers,
         COALESCE(SUM(total_revenue), 0) as total_revenue,
         ROUND(
           COUNT(CASE WHEN lifecycle_stage IN ('customer', 'repeat_customer') THEN 1 END)::numeric /
           NULLIF(COUNT(*), 0) * 100,
           2
         ) as overall_conversion_rate
       FROM crm_contacts
       ${dateWhereClause}`,
      params
    );

    // Get top performing sources (by revenue)
    const topSourcesResult = await query<{
      source: string;
      total_revenue: number;
      customers: number;
    }>(
      `SELECT
         COALESCE(source, 'unknown') as source,
         COALESCE(SUM(total_revenue), 0) as total_revenue,
         COUNT(CASE WHEN lifecycle_stage IN ('customer', 'repeat_customer') THEN 1 END) as customers
       FROM crm_contacts
       ${dateWhereClause}
       GROUP BY COALESCE(source, 'unknown')
       HAVING SUM(total_revenue) > 0
       ORDER BY total_revenue DESC
       LIMIT 5`,
      params
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: overallResult.rows[0],
        by_source: summaryResult.rows,
        trends: trendResult.rows,
        top_sources_by_revenue: topSourcesResult.rows,
      },
    });
});
