// ============================================================================
// CRM Module TypeScript Types
// ============================================================================

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

export type ContactType = 'individual' | 'corporate' | 'referral_partner';

export type LifecycleStage = 'lead' | 'qualified' | 'opportunity' | 'customer' | 'repeat_customer' | 'lost';

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export type ActivityType =
  | 'call'
  | 'email'
  | 'sms'
  | 'meeting'
  | 'note'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'payment_received'
  | 'system'
  | 'status_change'
  | 'booking_created'
  | 'tour_completed';

export type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'wrong_number';

export type EmailDirection = 'inbound' | 'outbound';

export type EmailStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced';

export type TaskType = 'follow_up' | 'call' | 'email' | 'meeting' | 'proposal' | 'other';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type Brand = 'nw_touring' | 'walla_walla_travel';

export type ActivitySourceType = 'manual' | 'system' | 'email_sync' | 'proposal_webhook';

// ============================================================================
// PIPELINE TYPES
// ============================================================================

export interface PipelineTemplate {
  id: number;
  name: string;
  description: string | null;
  brand: Brand | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: number;
  template_id: number;
  name: string;
  sort_order: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  color: string;
  created_at: string;
}

export interface PipelineStageSummary extends PipelineStage {
  template_name: string;
  brand: Brand | null;
  deal_count: number;
  total_value: number;
  weighted_value: number;
}

export interface DealType {
  id: number;
  name: string;
  brand: Brand | null;
  pipeline_template_id: number;
  default_value: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// CONTACT TYPES
// ============================================================================

export interface CrmContact {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  contact_type: ContactType;
  lifecycle_stage: LifecycleStage;
  lead_score: number;
  lead_temperature: LeadTemperature;
  source: string | null;
  source_detail: string | null;
  preferred_wineries: string[] | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  notes: string | null;
  email_marketing_consent: boolean;
  sms_marketing_consent: boolean;
  total_bookings: number;
  total_revenue: number;
  last_booking_date: string | null;
  assigned_to: number | null;
  stripe_customer_id: string | null;
  customer_id: number | null;
  brand_id: number | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
}

export interface CrmContactSummary extends CrmContact {
  active_deals: number;
  pipeline_value: number;
  won_deals: number;
  won_value: number;
  pending_tasks: number;
  last_activity_at: string | null;
  assigned_user_name?: string;
}

export interface CreateContactData {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  contact_type?: ContactType;
  lifecycle_stage?: LifecycleStage;
  lead_temperature?: LeadTemperature;
  source?: string;
  source_detail?: string;
  preferred_wineries?: string[];
  dietary_restrictions?: string;
  accessibility_needs?: string;
  notes?: string;
  email_marketing_consent?: boolean;
  sms_marketing_consent?: boolean;
  assigned_to?: number;
  brand_id?: number;
}

export interface UpdateContactData extends Partial<CreateContactData> {
  lead_score?: number;
  next_follow_up_at?: string;
}

// ============================================================================
// DEAL TYPES
// ============================================================================

export interface CrmDeal {
  id: number;
  contact_id: number;
  stage_id: number;
  deal_type_id: number | null;
  brand: Brand | null;
  brand_id: number | null;
  title: string;
  description: string | null;
  party_size: number | null;
  expected_tour_date: string | null;
  expected_close_date: string | null;
  estimated_value: number | null;
  actual_value: number | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  consultation_id: number | null;
  corporate_request_id: number | null;
  proposal_id: number | null;
  trip_proposal_id: number | null;
  booking_id: number | null;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
}

export interface CrmDealWithRelations extends CrmDeal {
  contact_name: string;
  contact_email: string;
  stage_name: string;
  stage_color: string;
  stage_probability: number;
  deal_type_name?: string;
  assigned_user_name?: string;
}

export interface CreateDealData {
  contact_id: number;
  stage_id: number;
  deal_type_id?: number;
  brand?: Brand;
  brand_id?: number;
  title: string;
  description?: string;
  party_size?: number;
  expected_tour_date?: string;
  expected_close_date?: string;
  estimated_value?: number;
  assigned_to?: number;
  consultation_id?: number;
  corporate_request_id?: number;
  trip_proposal_id?: number;
}

export interface UpdateDealData extends Partial<Omit<CreateDealData, 'contact_id'>> {
  actual_value?: number;
  lost_reason?: string;
}

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

export interface CrmActivity {
  id: number;
  contact_id: number | null;
  deal_id: number | null;
  activity_type: ActivityType;
  subject: string | null;
  body: string | null;
  call_duration_minutes: number | null;
  call_outcome: CallOutcome | null;
  email_direction: EmailDirection | null;
  email_status: EmailStatus | null;
  performed_by: number | null;
  performed_at: string;
  source_type: ActivitySourceType | null;
  source_id: string | null;
  created_at: string;
}

export interface CrmActivityWithUser extends CrmActivity {
  performed_by_name?: string;
}

export interface CreateActivityData {
  contact_id?: number;
  deal_id?: number;
  activity_type: ActivityType;
  subject?: string;
  body?: string;
  call_duration_minutes?: number;
  call_outcome?: CallOutcome;
  email_direction?: EmailDirection;
  email_status?: EmailStatus;
  source_type?: ActivitySourceType;
  source_id?: string;
}

// ============================================================================
// TASK TYPES
// ============================================================================

export interface CrmTask {
  id: number;
  contact_id: number | null;
  deal_id: number | null;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  due_time: string | null;
  reminder_at: string | null;
  assigned_to: number | null;
  created_by: number | null;
  completed_at: string | null;
  completed_by: number | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmTaskWithRelations extends CrmTask {
  contact_name?: string;
  contact_email?: string;
  deal_title?: string;
  assigned_user_name?: string;
  created_by_name?: string;
}

export interface CreateTaskData {
  contact_id?: number;
  deal_id?: number;
  title: string;
  description?: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  due_date: string;
  due_time?: string;
  reminder_at?: string;
  assigned_to: number;
}

export interface UpdateTaskData extends Partial<Omit<CreateTaskData, 'assigned_to'>> {
  status?: TaskStatus;
  completion_notes?: string;
}

// ============================================================================
// CORPORATE REQUEST TYPES
// ============================================================================

export type CorporateRequestStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost';

export interface CorporateRequest {
  id: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_type: string | null;
  expected_attendees: number | null;
  preferred_date: string | null;
  alternate_dates: string | null;
  budget_range: string | null;
  requirements: string | null;
  special_requests: string | null;
  status: CorporateRequestStatus;
  assigned_to: number | null;
  crm_contact_id: number | null;
  crm_deal_id: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface CrmDashboardStats {
  totalContacts: number;
  newLeadsThisMonth: number;
  hotLeads: number;
  totalDeals: number;
  openDeals: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  wonThisMonth: number;
  wonValueThisMonth: number;
  overdueTasks: number;
  tasksDueToday: number;
  upcomingTasks: number;
}

export interface PipelineOverview {
  stages: PipelineStageSummary[];
  totalValue: number;
  weightedValue: number;
  dealCount: number;
}

export interface RecentActivity {
  activities: CrmActivityWithUser[];
  totalCount: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CrmContactsResponse {
  contacts: CrmContactSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface CrmDealsResponse {
  deals: CrmDealWithRelations[];
  total: number;
  page: number;
  limit: number;
}

export interface CrmTasksResponse {
  tasks: CrmTaskWithRelations[];
  overdue: number;
  dueToday: number;
  upcoming: number;
}

export interface CrmPipelineResponse {
  templates: PipelineTemplate[];
  stages: PipelineStageSummary[];
  deals: CrmDealWithRelations[];
  dealTypes: DealType[];
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface ContactFilters {
  search?: string;
  lifecycle_stage?: LifecycleStage;
  lead_temperature?: LeadTemperature;
  contact_type?: ContactType;
  assigned_to?: number;
  has_deals?: boolean;
}

export interface DealFilters {
  search?: string;
  stage_id?: number;
  brand?: Brand;
  deal_type_id?: number;
  assigned_to?: number;
  expected_close_before?: string;
  expected_close_after?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number;
  due_before?: string;
  due_after?: string;
  overdue?: boolean;
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  opportunity: 'Opportunity',
  customer: 'Customer',
  repeat_customer: 'Repeat Customer',
  lost: 'Lost',
};

export const LEAD_TEMPERATURE_COLORS: Record<LeadTemperature, string> = {
  cold: 'slate',
  warm: 'amber',
  hot: 'red',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'slate',
  normal: 'blue',
  high: 'amber',
  urgent: 'red',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  call: '📞',
  email: '📧',
  sms: '💬',
  meeting: '🤝',
  note: '📝',
  proposal_sent: '📤',
  proposal_viewed: '👁️',
  payment_received: '💰',
  system: '⚙️',
  status_change: '🔄',
  booking_created: '📅',
  tour_completed: '✅',
};

export const BRAND_LABELS: Record<Brand, string> = {
  nw_touring: 'NW Touring & Concierge',
  walla_walla_travel: 'Walla Walla Travel',
};
