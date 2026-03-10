'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type {
  ContactFilters,
  DealFilters,
  TaskFilters,
} from '@/lib/schemas/crm'

// ============================================================================
// TYPES
// ============================================================================

export type ContactListItem = {
  id: number
  email: string
  name: string
  phone: string | null
  company: string | null
  contact_type: string | null
  lifecycle_stage: string | null
  lead_score: number | null
  lead_temperature: string | null
  source: string | null
  total_bookings: number | null
  total_revenue: number | null
  last_booking_date: Date | null
  assigned_to: number | null
  created_at: Date | null
  updated_at: Date | null
  last_contacted_at: Date | null
  next_follow_up_at: Date | null
  assigned_user_name: string | null
  _count: {
    crm_deals: number
    crm_tasks: number
    crm_activities: number
  }
}

export type DealListItem = {
  id: number
  contact_id: number
  stage_id: number
  title: string
  brand: string | null
  party_size: number | null
  expected_tour_date: Date | null
  estimated_value: Prisma.Decimal | null
  actual_value: Prisma.Decimal | null
  won_at: Date | null
  lost_at: Date | null
  stage_changed_at: Date | null
  created_at: Date | null
  crm_contacts: { name: string; email: string }
  crm_pipeline_stages: { name: string; color: string | null; probability: number | null }
  crm_deal_types: { name: string } | null
  users: { name: string } | null
}

export type TaskListItem = {
  id: number
  contact_id: number | null
  deal_id: number | null
  title: string
  description: string | null
  task_type: string | null
  priority: string | null
  status: string | null
  due_date: Date
  due_time: Date | null
  assigned_to: number | null
  completed_at: Date | null
  created_at: Date | null
  crm_contacts: { name: string; email: string } | null
  crm_deals: { title: string } | null
  users_crm_tasks_assigned_toTousers: { name: string } | null
  users_crm_tasks_created_byTousers: { name: string } | null
}

// ============================================================================
// CONTACT QUERIES
// ============================================================================

export async function getContacts(filters: ContactFilters) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { contacts: [], total: 0, stageCounts: {} }
  }

  const where: Prisma.crm_contactsWhereInput = {}

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.lifecycle_stage) where.lifecycle_stage = filters.lifecycle_stage
  if (filters.lead_temperature) where.lead_temperature = filters.lead_temperature
  if (filters.contact_type) where.contact_type = filters.contact_type
  if (filters.assigned_to) where.assigned_to = filters.assigned_to

  const [contacts, total, stageCountsRaw] = await Promise.all([
    prisma.crm_contacts.findMany({
      where,
      include: {
        users: { select: { name: true } },
        _count: {
          select: {
            crm_deals: true,
            crm_tasks: true,
            crm_activities: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.crm_contacts.count({ where }),
    prisma.crm_contacts.groupBy({
      by: ['lifecycle_stage'],
      _count: { id: true },
    }),
  ])

  const stageCounts = stageCountsRaw.reduce((acc, row) => {
    if (row.lifecycle_stage) {
      acc[row.lifecycle_stage] = row._count.id
    }
    return acc
  }, {} as Record<string, number>)

  return { contacts, total, stageCounts }
}

export async function getContactById(contactId: number) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const contact = await prisma.crm_contacts.findUnique({
    where: { id: contactId },
    include: {
      users: { select: { name: true } },
      crm_deals: {
        include: {
          crm_pipeline_stages: { select: { name: true, color: true } },
          crm_deal_types: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
      },
      crm_activities: {
        include: {
          users: { select: { name: true } },
        },
        orderBy: { performed_at: 'desc' },
        take: 20,
      },
      crm_tasks: {
        include: {
          users_crm_tasks_assigned_toTousers: { select: { name: true } },
        },
        orderBy: [
          { status: 'asc' },
          { due_date: 'asc' },
        ],
      },
    },
  })

  return contact
}

// ============================================================================
// DEAL QUERIES
// ============================================================================

export async function getDeals(filters: DealFilters) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { deals: [], total: 0, summary: { totalValue: 0, weightedValue: 0, dealCount: 0 } }
  }

  const where: Prisma.crm_dealsWhereInput = {}

  if (!filters.include_won) where.won_at = null
  if (!filters.include_lost) where.lost_at = null

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { crm_contacts: { name: { contains: filters.search, mode: 'insensitive' } } },
      { crm_contacts: { email: { contains: filters.search, mode: 'insensitive' } } },
    ]
  }

  if (filters.stage_id) where.stage_id = filters.stage_id
  if (filters.brand) where.brand = filters.brand
  if (filters.deal_type_id) where.deal_type_id = filters.deal_type_id
  if (filters.assigned_to) where.assigned_to = filters.assigned_to
  if (filters.contact_id) where.contact_id = filters.contact_id

  const [deals, total] = await Promise.all([
    prisma.crm_deals.findMany({
      where,
      include: {
        crm_contacts: { select: { name: true, email: true } },
        crm_pipeline_stages: { select: { name: true, color: true, probability: true } },
        crm_deal_types: { select: { name: true } },
        users: { select: { name: true } },
      },
      orderBy: { stage_changed_at: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.crm_deals.count({ where }),
  ])

  // Pipeline value summary — active deals only
  const activeSummary = await prisma.crm_deals.aggregate({
    where: { won_at: null, lost_at: null },
    _sum: { estimated_value: true },
    _count: { id: true },
  })

  return {
    deals,
    total,
    summary: {
      totalValue: Number(activeSummary._sum.estimated_value ?? 0),
      weightedValue: 0, // weighted calc needs stage join — would need raw query
      dealCount: activeSummary._count.id,
    },
  }
}

export async function getDealById(dealId: number) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const deal = await prisma.crm_deals.findUnique({
    where: { id: dealId },
    include: {
      crm_contacts: {
        select: { name: true, email: true, phone: true, company: true },
      },
      crm_pipeline_stages: {
        select: {
          name: true,
          color: true,
          probability: true,
          template_id: true,
        },
      },
      crm_deal_types: { select: { name: true } },
      users: { select: { name: true } },
      crm_activities: {
        include: {
          users: { select: { name: true } },
        },
        orderBy: { performed_at: 'desc' },
        take: 20,
      },
      crm_tasks: {
        include: {
          users_crm_tasks_assigned_toTousers: { select: { name: true } },
        },
        orderBy: [
          { status: 'asc' },
          { due_date: 'asc' },
        ],
      },
    },
  })

  if (!deal) return null

  // Get available pipeline stages for this deal's template
  const availableStages = await prisma.crm_pipeline_stages.findMany({
    where: { template_id: deal.crm_pipeline_stages.template_id },
    orderBy: { sort_order: 'asc' },
  })

  return { deal, availableStages }
}

// ============================================================================
// TASK QUERIES
// ============================================================================

export async function getTasks(filters: TaskFilters) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { tasks: [], overdue: 0, dueToday: 0, upcoming: 0 }
  }

  const where: Prisma.crm_tasksWhereInput = {}

  if (filters.status) where.status = filters.status
  if (filters.priority) where.priority = filters.priority
  if (filters.assigned_to) where.assigned_to = filters.assigned_to
  if (filters.contact_id) where.contact_id = filters.contact_id
  if (filters.deal_id) where.deal_id = filters.deal_id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  const weekFromNow = new Date(today)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  if (filters.overdue) {
    where.due_date = { lt: today }
    where.status = { in: ['pending', 'in_progress'] }
  }

  if (filters.due_today) {
    where.due_date = { gte: today, lte: todayEnd }
    where.status = { in: ['pending', 'in_progress'] }
  }

  if (filters.upcoming) {
    where.due_date = { gt: todayEnd, lte: weekFromNow }
    where.status = { in: ['pending', 'in_progress'] }
  }

  const [tasks, overdueCount, dueTodayCount, upcomingCount] = await Promise.all([
    prisma.crm_tasks.findMany({
      where,
      include: {
        crm_contacts: { select: { name: true, email: true } },
        crm_deals: { select: { title: true } },
        users_crm_tasks_assigned_toTousers: { select: { name: true } },
        users_crm_tasks_created_byTousers: { select: { name: true } },
      },
      orderBy: [
        { due_date: 'asc' },
        { priority: 'asc' },
      ],
    }),
    prisma.crm_tasks.count({
      where: {
        due_date: { lt: today },
        status: { in: ['pending', 'in_progress'] },
      },
    }),
    prisma.crm_tasks.count({
      where: {
        due_date: { gte: today, lte: todayEnd },
        status: { in: ['pending', 'in_progress'] },
      },
    }),
    prisma.crm_tasks.count({
      where: {
        due_date: { gt: todayEnd, lte: weekFromNow },
        status: { in: ['pending', 'in_progress'] },
      },
    }),
  ])

  return {
    tasks,
    overdue: overdueCount,
    dueToday: dueTodayCount,
    upcoming: upcomingCount,
  }
}

export async function getTaskById(taskId: number) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  return prisma.crm_tasks.findUnique({
    where: { id: taskId },
    include: {
      crm_contacts: { select: { name: true, email: true } },
      crm_deals: { select: { title: true } },
      users_crm_tasks_assigned_toTousers: { select: { name: true } },
      users_crm_tasks_created_byTousers: { select: { name: true } },
    },
  })
}

// ============================================================================
// PIPELINE QUERIES
// ============================================================================

export async function getPipelineData(templateId?: number, brand?: string) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { templates: [], stages: [], deals: [], dealTypes: [] }
  }

  // Get all pipeline templates
  const templates = await prisma.crm_pipeline_templates.findMany({
    orderBy: [
      { is_default: 'desc' },
      { name: 'asc' },
    ],
  })

  // Build stage filter
  const stageWhere: Prisma.crm_pipeline_stagesWhereInput = {}
  if (templateId) {
    stageWhere.template_id = templateId
  } else if (brand) {
    stageWhere.crm_pipeline_templates = {
      OR: [{ brand }, { brand: null }],
    }
  }

  // Get stages with deal counts
  const stages = await prisma.crm_pipeline_stages.findMany({
    where: stageWhere,
    include: {
      crm_pipeline_templates: {
        select: { name: true, brand: true },
      },
      _count: {
        select: {
          crm_deals: {
            where: { won_at: null, lost_at: null },
          },
        },
      },
    },
    orderBy: [
      { template_id: 'asc' },
      { sort_order: 'asc' },
    ],
  })

  // Get active deals for the pipeline
  const dealWhere: Prisma.crm_dealsWhereInput = {
    won_at: null,
    lost_at: null,
  }
  if (templateId) {
    dealWhere.crm_pipeline_stages = { template_id: templateId }
  } else if (brand) {
    dealWhere.OR = [{ brand }, { brand: null }]
  }

  const deals = await prisma.crm_deals.findMany({
    where: dealWhere,
    include: {
      crm_contacts: { select: { name: true, email: true } },
      crm_pipeline_stages: { select: { name: true, color: true, probability: true } },
      crm_deal_types: { select: { name: true } },
      users: { select: { name: true } },
    },
    orderBy: { stage_changed_at: 'desc' },
  })

  // Get deal types
  const dealTypeWhere: Prisma.crm_deal_typesWhereInput = { is_active: true }
  if (brand) {
    dealTypeWhere.OR = [{ brand }, { brand: null }]
  }

  const dealTypes = await prisma.crm_deal_types.findMany({
    where: dealTypeWhere,
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  })

  return { templates, stages, deals, dealTypes }
}

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

export async function getCrmDashboardStats() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalContacts,
    newLeadsThisMonth,
    hotLeads,
    totalDeals,
    openDeals,
    wonThisMonth,
    overdueTasks,
    tasksDueToday,
    upcomingTasks,
  ] = await Promise.all([
    prisma.crm_contacts.count(),
    prisma.crm_contacts.count({
      where: {
        lifecycle_stage: 'lead',
        created_at: { gte: firstOfMonth },
      },
    }),
    prisma.crm_contacts.count({
      where: { lead_temperature: 'hot' },
    }),
    prisma.crm_deals.count(),
    prisma.crm_deals.count({
      where: { won_at: null, lost_at: null },
    }),
    prisma.crm_deals.count({
      where: { won_at: { gte: firstOfMonth } },
    }),
    prisma.crm_tasks.count({
      where: {
        due_date: { lt: today },
        status: { in: ['pending', 'in_progress'] },
      },
    }),
    prisma.crm_tasks.count({
      where: {
        due_date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        status: { in: ['pending', 'in_progress'] },
      },
    }),
    prisma.crm_tasks.count({
      where: {
        due_date: {
          gt: today,
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { in: ['pending', 'in_progress'] },
      },
    }),
  ])

  // Pipeline value aggregations
  const pipelineAgg = await prisma.crm_deals.aggregate({
    where: { won_at: null, lost_at: null },
    _sum: { estimated_value: true },
  })

  const wonValueAgg = await prisma.crm_deals.aggregate({
    where: { won_at: { gte: firstOfMonth } },
    _sum: { actual_value: true },
  })

  return {
    totalContacts,
    newLeadsThisMonth,
    hotLeads,
    totalDeals,
    openDeals,
    pipelineValue: Number(pipelineAgg._sum.estimated_value ?? 0),
    wonThisMonth,
    wonValueThisMonth: Number(wonValueAgg._sum.actual_value ?? 0),
    overdueTasks,
    tasksDueToday,
    upcomingTasks,
  }
}

// ============================================================================
// LEAD SOURCE QUERIES
// ============================================================================

export async function getLeadSourceStats(fromDate?: string, toDate?: string) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }

  const where: Prisma.crm_contactsWhereInput = {}
  if (fromDate || toDate) {
    where.created_at = {}
    if (fromDate) (where.created_at as Prisma.DateTimeNullableFilter).gte = new Date(fromDate)
    if (toDate) (where.created_at as Prisma.DateTimeNullableFilter).lte = new Date(toDate)
  }

  // Lead counts by source
  const bySource = await prisma.crm_contacts.groupBy({
    by: ['source'],
    where,
    _count: { id: true },
    _sum: { total_revenue: true },
  })

  // Overall summary
  const overall = await prisma.crm_contacts.aggregate({
    where,
    _count: { id: true },
    _sum: { total_revenue: true },
  })

  const totalCustomers = await prisma.crm_contacts.count({
    where: {
      ...where,
      lifecycle_stage: { in: ['customer', 'repeat_customer'] },
    },
  })

  // Temperature counts
  const temperatureCounts = await prisma.crm_contacts.groupBy({
    by: ['lead_temperature'],
    where,
    _count: { id: true },
  })

  return {
    summary: {
      totalContacts: overall._count.id,
      totalRevenue: Number(overall._sum.total_revenue ?? 0),
      totalCustomers,
      conversionRate: overall._count.id > 0
        ? Math.round((totalCustomers / overall._count.id) * 10000) / 100
        : 0,
    },
    bySource: bySource.map((row) => ({
      source: row.source ?? 'unknown',
      count: row._count.id,
      revenue: Number(row._sum.total_revenue ?? 0),
    })),
    temperatureCounts: temperatureCounts.reduce((acc, row) => {
      if (row.lead_temperature) {
        acc[row.lead_temperature] = row._count.id
      }
      return acc
    }, {} as Record<string, number>),
  }
}
