/**
 * Competitor Monitoring System Types
 *
 * @module types/competitors
 * @description TypeScript types for the competitor monitoring system including
 * competitors, pricing, changes, SWOT analysis, and competitive advantages.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

export type CompetitorType = 'tour_operator' | 'content_benchmark' | 'indirect' | 'aggregator';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type CheckFrequency = 'every_6_hours' | 'daily' | 'weekly' | 'monthly';
export type PricingType = 'base_tour' | 'hourly_rate' | 'per_person' | 'premium_package' | 'group_discount' | 'promotion' | 'other';
export type PageType = 'pricing' | 'homepage' | 'tours' | 'packages' | 'about' | 'promotions' | 'other';
export type ChangeType = 'pricing' | 'promotion' | 'package' | 'content' | 'design' | 'new_offering' | 'discontinued';
export type Significance = 'high' | 'medium' | 'low';
export type ThreatLevel = 'high' | 'medium' | 'low' | 'none' | 'opportunity';
export type ChangeStatus = 'new' | 'reviewed' | 'actioned' | 'dismissed' | 'archived';
export type SwotCategory = 'strength' | 'weakness' | 'opportunity' | 'threat';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type AdvantageCategory = 'service' | 'pricing' | 'experience' | 'technology' | 'expertise' | 'location' | 'vehicle' | 'partnership' | 'other';
export type AdvantageImportance = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'change_detected' | 'high_threat' | 'price_drop' | 'new_promotion' | 'weekly_digest' | 'manual';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'bounced';

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Competitor entity representing a tracked competitor
 */
export interface Competitor {
  id: number;
  name: string;
  website_url: string;
  description: string | null;
  competitor_type: CompetitorType;
  priority_level: PriorityLevel;
  check_frequency: CheckFrequency;
  monitor_pricing: boolean;
  monitor_promotions: boolean;
  monitor_packages: boolean;
  monitor_content: boolean;
  monitored_pages: string[];
  email_recipients: string[];
  alert_on_high_threat: boolean;
  notes: string | null;
  logo_url: string | null;
  pricing_model: string | null;
  min_booking: string | null;
  vehicle_types: string[] | null;
  is_active: boolean;
  last_checked_at: string | null;
  last_change_detected_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

/**
 * Competitor with calculated unreviewed changes count
 */
export interface CompetitorWithChanges extends Competitor {
  unreviewed_changes: number;
}

/**
 * Competitor pricing entry
 */
export interface CompetitorPricing {
  id: number;
  competitor_id: number;
  pricing_type: PricingType;
  pricing_name: string;
  price_amount: number | null;
  price_unit: string | null;
  price_notes: string | null;
  comparable_to_nw_touring: boolean;
  nw_touring_equivalent: string | null;
  is_current: boolean;
  effective_from: string;
  effective_until: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Website snapshot for change detection
 */
export interface CompetitorSnapshot {
  id: number;
  competitor_id: number;
  page_type: PageType;
  page_url: string;
  content_hash: string | null;
  content_text: string | null;
  raw_html: string | null;
  http_status: number | null;
  captured_at: string;
}

/**
 * Detected competitor change with AI analysis
 */
export interface CompetitorChange {
  id: number;
  competitor_id: number;
  change_type: ChangeType;
  significance: Significance;
  title: string;
  description: string;
  previous_value: string | null;
  new_value: string | null;
  threat_level: ThreatLevel | null;
  ai_analysis: string | null;
  recommended_actions: string[];
  strategic_implications: string | null;
  status: ChangeStatus;
  reviewed_at: string | null;
  reviewed_by: number | null;
  action_taken: string | null;
  action_taken_at: string | null;
  source_url: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Competitor change with competitor name for display
 */
export interface CompetitorChangeWithName extends CompetitorChange {
  competitor_name: string;
}

/**
 * SWOT analysis item for a competitor
 */
export interface CompetitorSwot {
  id: number;
  competitor_id: number;
  category: SwotCategory;
  title: string;
  description: string | null;
  impact_level: ImpactLevel;
  is_active: boolean;
  verified_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

/**
 * Our competitive advantage
 */
export interface CompetitiveAdvantage {
  id: number;
  title: string;
  description: string;
  category: AdvantageCategory;
  importance: AdvantageImportance;
  supporting_evidence: string | null;
  customer_testimonial: string | null;
  applies_to_competitors: number[];
  marketing_message: string | null;
  use_in_proposals: boolean;
  use_on_website: boolean;
  is_active: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

/**
 * Alert record for competitor changes
 */
export interface CompetitorAlert {
  id: number;
  alert_type: AlertType;
  competitor_id: number | null;
  change_id: number | null;
  subject: string;
  body: string;
  recipients: string[];
  sent_at: string | null;
  delivery_status: DeliveryStatus;
  delivery_error: string | null;
  created_at: string;
}

// ============================================================================
// Input Types (for creating/updating)
// ============================================================================

export interface CreateCompetitorInput {
  name: string;
  website_url: string;
  description?: string;
  competitor_type?: CompetitorType;
  priority_level?: PriorityLevel;
  check_frequency?: CheckFrequency;
  monitor_pricing?: boolean;
  monitor_promotions?: boolean;
  monitor_packages?: boolean;
  monitor_content?: boolean;
  monitored_pages?: string[];
  email_recipients?: string[];
  alert_on_high_threat?: boolean;
  notes?: string;
  logo_url?: string;
  pricing_model?: string;
  min_booking?: string;
  vehicle_types?: string[];
}

export interface UpdateCompetitorInput extends Partial<CreateCompetitorInput> {
  is_active?: boolean;
}

export interface CreatePricingInput {
  competitor_id: number;
  pricing_type: PricingType;
  pricing_name: string;
  price_amount?: number;
  price_unit?: string;
  price_notes?: string;
  comparable_to_nw_touring?: boolean;
  nw_touring_equivalent?: string;
  effective_from?: string;
}

export interface CreateChangeInput {
  competitor_id: number;
  change_type: ChangeType;
  significance?: Significance;
  title: string;
  description: string;
  previous_value?: string;
  new_value?: string;
  threat_level?: ThreatLevel;
  ai_analysis?: string;
  recommended_actions?: string[];
  strategic_implications?: string;
  source_url?: string;
}

export interface UpdateChangeStatusInput {
  status: ChangeStatus;
  action_taken?: string;
}

export interface CreateSwotInput {
  competitor_id: number;
  category: SwotCategory;
  title: string;
  description?: string;
  impact_level?: ImpactLevel;
  source?: string;
}

export interface CreateAdvantageInput {
  title: string;
  description: string;
  category: AdvantageCategory;
  importance?: AdvantageImportance;
  supporting_evidence?: string;
  customer_testimonial?: string;
  applies_to_competitors?: number[];
  marketing_message?: string;
  use_in_proposals?: boolean;
  use_on_website?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CompetitorListResponse {
  competitors: CompetitorWithChanges[];
  total: number;
}

export interface CompetitorDetailResponse {
  competitor: Competitor;
  pricing: CompetitorPricing[];
  swot: CompetitorSwot[];
  recent_changes: CompetitorChange[];
}

export interface ChangeListResponse {
  changes: CompetitorChangeWithName[];
  total: number;
  unreviewed_count: number;
}

export interface PriceComparisonRow {
  competitor_id: number;
  competitor_name: string;
  priority_level: PriorityLevel;
  pricing: {
    type: PricingType;
    name: string;
    amount: number | null;
    unit: string | null;
    notes: string | null;
  }[];
}

export interface PriceComparisonResponse {
  nw_touring: PriceComparisonRow;
  competitors: PriceComparisonRow[];
  last_updated: string;
}

export interface AIAnalysisRequest {
  competitor_id: number;
  change_id?: number;
  analysis_type: 'change_assessment' | 'full_competitor' | 'market_position';
}

export interface AIAnalysisResponse {
  threat_level: ThreatLevel;
  summary: string;
  recommended_actions: string[];
  strategic_implications: string;
  differentiation_opportunities: string[];
}

// ============================================================================
// Monitoring Types
// ============================================================================

export interface MonitoringResult {
  competitor_id: number;
  competitor_name: string;
  pages_checked: number;
  changes_detected: number;
  changes: {
    page_type: PageType;
    change_type: ChangeType;
    description: string;
  }[];
  checked_at: string;
}

export interface MonitoringJobResult {
  started_at: string;
  completed_at: string;
  competitors_checked: number;
  total_changes_detected: number;
  high_threat_changes: number;
  alerts_sent: number;
  results: MonitoringResult[];
  errors: {
    competitor_id: number;
    error: string;
  }[];
}
