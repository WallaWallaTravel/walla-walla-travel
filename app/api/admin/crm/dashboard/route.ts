import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';
import type { CrmDashboardStats, CrmActivityWithUser } from '@/types/crm';

/**
 * GET /api/admin/crm/dashboard
 * Get CRM dashboard statistics and recent activity
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  // Get contact stats
  const contactStatsResult = await query<{
    total_contacts: string;
    new_leads_this_month: string;
    hot_leads: string;
  }>(
    `SELECT
      COUNT(*) as total_contacts,
      COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_leads_this_month,
      COUNT(*) FILTER (WHERE lead_temperature = 'hot' AND lifecycle_stage IN ('lead', 'qualified', 'opportunity')) as hot_leads
    FROM crm_contacts`,
    []
  );

  const contactStats = contactStatsResult.rows[0];

  // Get deal stats
  const dealStatsResult = await query<{
    total_deals: string;
    open_deals: string;
    pipeline_value: string;
    weighted_pipeline_value: string;
    won_this_month: string;
    won_value_this_month: string;
  }>(
    `SELECT
      COUNT(*) as total_deals,
      COUNT(*) FILTER (WHERE won_at IS NULL AND lost_at IS NULL) as open_deals,
      COALESCE(SUM(d.estimated_value) FILTER (WHERE won_at IS NULL AND lost_at IS NULL), 0) as pipeline_value,
      COALESCE(SUM(d.estimated_value * ps.probability / 100) FILTER (WHERE won_at IS NULL AND lost_at IS NULL), 0) as weighted_pipeline_value,
      COUNT(*) FILTER (WHERE won_at >= DATE_TRUNC('month', CURRENT_DATE)) as won_this_month,
      COALESCE(SUM(actual_value) FILTER (WHERE won_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as won_value_this_month
    FROM crm_deals d
    LEFT JOIN crm_pipeline_stages ps ON d.stage_id = ps.id`,
    []
  );

  const dealStats = dealStatsResult.rows[0];

  // Get task stats
  const taskStatsResult = await query<{
    overdue_tasks: string;
    tasks_due_today: string;
    upcoming_tasks: string;
  }>(
    `SELECT
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status IN ('pending', 'in_progress')) as overdue_tasks,
      COUNT(*) FILTER (WHERE due_date = CURRENT_DATE AND status IN ('pending', 'in_progress')) as tasks_due_today,
      COUNT(*) FILTER (WHERE due_date > CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days' AND status IN ('pending', 'in_progress')) as upcoming_tasks
    FROM crm_tasks`,
    []
  );

  const taskStats = taskStatsResult.rows[0];

  // Get pipeline overview by stage
  const pipelineOverviewResult = await query<{
    stage_id: number;
    stage_name: string;
    stage_color: string;
    sort_order: number;
    deal_count: string;
    total_value: string;
    is_won: boolean;
    is_lost: boolean;
  }>(
    `SELECT
      ps.id as stage_id,
      ps.name as stage_name,
      ps.color as stage_color,
      ps.sort_order,
      COUNT(d.id) as deal_count,
      COALESCE(SUM(d.estimated_value), 0) as total_value,
      ps.is_won,
      ps.is_lost
    FROM crm_pipeline_stages ps
    LEFT JOIN crm_deals d ON d.stage_id = ps.id AND d.won_at IS NULL AND d.lost_at IS NULL
    GROUP BY ps.id, ps.name, ps.color, ps.sort_order, ps.is_won, ps.is_lost
    ORDER BY ps.sort_order`,
    []
  );

  // Get recent activities
  const recentActivitiesResult = await query<CrmActivityWithUser>(
    `SELECT
      a.*,
      u.name as performed_by_name,
      c.name as contact_name,
      d.title as deal_title
    FROM crm_activities a
    LEFT JOIN users u ON a.performed_by = u.id
    LEFT JOIN crm_contacts c ON a.contact_id = c.id
    LEFT JOIN crm_deals d ON a.deal_id = d.id
    ORDER BY a.performed_at DESC
    LIMIT 20`,
    []
  );

  // Get upcoming tasks
  const upcomingTasksResult = await query(
    `SELECT
      t.*,
      c.name as contact_name,
      d.title as deal_title
    FROM crm_tasks t
    LEFT JOIN crm_contacts c ON t.contact_id = c.id
    LEFT JOIN crm_deals d ON t.deal_id = d.id
    WHERE t.status IN ('pending', 'in_progress')
    ORDER BY
      CASE WHEN t.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
      t.due_date ASC,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END
    LIMIT 10`,
    []
  );

  const stats: CrmDashboardStats = {
    totalContacts: parseInt(contactStats?.total_contacts || '0'),
    newLeadsThisMonth: parseInt(contactStats?.new_leads_this_month || '0'),
    hotLeads: parseInt(contactStats?.hot_leads || '0'),
    totalDeals: parseInt(dealStats?.total_deals || '0'),
    openDeals: parseInt(dealStats?.open_deals || '0'),
    pipelineValue: parseFloat(dealStats?.pipeline_value || '0'),
    weightedPipelineValue: parseFloat(dealStats?.weighted_pipeline_value || '0'),
    wonThisMonth: parseInt(dealStats?.won_this_month || '0'),
    wonValueThisMonth: parseFloat(dealStats?.won_value_this_month || '0'),
    overdueTasks: parseInt(taskStats?.overdue_tasks || '0'),
    tasksDueToday: parseInt(taskStats?.tasks_due_today || '0'),
    upcomingTasks: parseInt(taskStats?.upcoming_tasks || '0'),
  };

  return NextResponse.json({
    success: true,
    stats,
    pipelineOverview: pipelineOverviewResult.rows.map(row => ({
      ...row,
      deal_count: parseInt(String(row.deal_count)),
      total_value: parseFloat(String(row.total_value)),
    })),
    recentActivities: recentActivitiesResult.rows,
    upcomingTasks: upcomingTasksResult.rows,
    timestamp: new Date().toISOString(),
  });
});
