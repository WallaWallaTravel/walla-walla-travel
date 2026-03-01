import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';
import type {
  PipelineTemplate,
  PipelineStageSummary,
  CrmDealWithRelations,
  DealType
} from '@/types/crm';

/**
 * GET /api/admin/crm/pipeline
 * Get pipeline data for the Kanban board view
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('template_id');
  const brand = searchParams.get('brand');

  // Get pipeline templates
  const templatesResult = await query<PipelineTemplate>(
    `SELECT * FROM crm_pipeline_templates ORDER BY is_default DESC, name`,
    []
  );

  // Build stage query with optional template filter
  let stageConditions = '';
  const stageParams: unknown[] = [];

  if (templateId) {
    stageConditions = 'WHERE pt.id = $1';
    stageParams.push(parseInt(templateId));
  } else if (brand) {
    stageConditions = 'WHERE pt.brand = $1 OR pt.brand IS NULL';
    stageParams.push(brand);
  }

  // Get pipeline stages with deal counts
  const stagesResult = await query<PipelineStageSummary>(
    `SELECT
      pt.id as template_id,
      pt.name as template_name,
      pt.brand,
      ps.id as stage_id,
      ps.id,
      ps.name,
      ps.sort_order,
      ps.probability,
      ps.is_won,
      ps.is_lost,
      ps.color,
      ps.template_id,
      ps.created_at,
      COUNT(d.id) FILTER (WHERE d.won_at IS NULL AND d.lost_at IS NULL) as deal_count,
      COALESCE(SUM(d.estimated_value) FILTER (WHERE d.won_at IS NULL AND d.lost_at IS NULL), 0) as total_value,
      COALESCE(SUM(d.estimated_value * ps.probability / 100) FILTER (WHERE d.won_at IS NULL AND d.lost_at IS NULL), 0) as weighted_value
    FROM crm_pipeline_templates pt
    JOIN crm_pipeline_stages ps ON ps.template_id = pt.id
    LEFT JOIN crm_deals d ON d.stage_id = ps.id
    ${stageConditions}
    GROUP BY pt.id, pt.name, pt.brand, ps.id, ps.name, ps.sort_order, ps.probability, ps.is_won, ps.is_lost, ps.color, ps.template_id, ps.created_at
    ORDER BY pt.id, ps.sort_order`,
    stageParams
  );

  // Build deal query conditions
  const dealConditions: string[] = ['d.won_at IS NULL', 'd.lost_at IS NULL'];
  const dealParams: unknown[] = [];
  let paramIndex = 1;

  if (templateId) {
    dealConditions.push(`ps.template_id = $${paramIndex}`);
    dealParams.push(parseInt(templateId));
    paramIndex++;
  } else if (brand) {
    dealConditions.push(`(d.brand = $${paramIndex} OR d.brand IS NULL)`);
    dealParams.push(brand);
    paramIndex++;
  }

  const dealWhereClause = `WHERE ${dealConditions.join(' AND ')}`;

  // Get active deals for the pipeline
  const dealsResult = await query<CrmDealWithRelations>(
    `SELECT
      d.*,
      c.name as contact_name,
      c.email as contact_email,
      ps.name as stage_name,
      ps.color as stage_color,
      ps.probability as stage_probability,
      dt.name as deal_type_name,
      u.name as assigned_user_name
    FROM crm_deals d
    JOIN crm_contacts c ON d.contact_id = c.id
    JOIN crm_pipeline_stages ps ON d.stage_id = ps.id
    LEFT JOIN crm_deal_types dt ON d.deal_type_id = dt.id
    LEFT JOIN users u ON d.assigned_to = u.id
    ${dealWhereClause}
    ORDER BY d.stage_changed_at DESC`,
    dealParams
  );

  // Get deal types
  let dealTypeConditions = '';
  const dealTypeParams: unknown[] = [];

  if (brand) {
    dealTypeConditions = 'WHERE (brand = $1 OR brand IS NULL) AND is_active = true';
    dealTypeParams.push(brand);
  } else {
    dealTypeConditions = 'WHERE is_active = true';
  }

  const dealTypesResult = await query<DealType>(
    `SELECT * FROM crm_deal_types ${dealTypeConditions} ORDER BY sort_order, name`,
    dealTypeParams
  );

  // Calculate totals
  const totalValue = stagesResult.rows
    .filter(s => !s.is_won && !s.is_lost)
    .reduce((sum, s) => sum + parseFloat(String(s.total_value)), 0);

  const weightedValue = stagesResult.rows
    .filter(s => !s.is_won && !s.is_lost)
    .reduce((sum, s) => sum + parseFloat(String(s.weighted_value)), 0);

  const dealCount = stagesResult.rows
    .filter(s => !s.is_won && !s.is_lost)
    .reduce((sum, s) => sum + parseInt(String(s.deal_count)), 0);

  return NextResponse.json({
    success: true,
    templates: templatesResult.rows,
    stages: stagesResult.rows,
    deals: dealsResult.rows,
    dealTypes: dealTypesResult.rows,
    summary: {
      totalValue,
      weightedValue,
      dealCount,
    },
    timestamp: new Date().toISOString(),
  });
});
