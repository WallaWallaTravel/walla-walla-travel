// ============================================================================
// Marketing Module TypeScript Types
// ============================================================================

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'twitter' | 'pinterest';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export type PostContentType = 'general' | 'wine_spotlight' | 'event_promo' | 'seasonal' | 'educational' | 'behind_scenes' | 'customer_story' | 'suggestion';

export type PostSource = 'manual' | 'ai_generator' | 'suggestion' | 'duplicate' | 'import';

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';

export type CampaignChannel = 'instagram' | 'facebook' | 'linkedin' | 'email' | 'blog' | 'page_update';

export type CampaignItemType = 'social_post' | 'email_blast' | 'blog_post' | 'page_update';

export type CampaignItemStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'sent' | 'failed' | 'cancelled';

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';

export type SuggestionStatus = 'pending' | 'accepted' | 'modified' | 'dismissed' | 'expired';

export type TrendingCategory = 'wine' | 'travel' | 'local_news' | 'events' | 'seasonal' | 'industry' | 'food' | 'lifestyle';

export type TrendingStatus = 'new' | 'actioned' | 'dismissed' | 'expired';

export type BlogDraftStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export type RefreshReason = 'stale_date' | 'declining_traffic' | 'outdated_info' | 'seasonal_update' | 'keyword_opportunity';

export type RefreshUrgency = 'low' | 'medium' | 'high' | 'critical';

export type RefreshStatus = 'pending' | 'approved' | 'applied' | 'dismissed';

export type ApprovalAction = 'approved' | 'edited' | 'rejected';

export type ApprovalContentType = 'social_post' | 'email' | 'blog' | 'page_update' | 'campaign';

export type StrategyStatus = 'draft' | 'active' | 'completed' | 'archived';

export type ReportType = 'weekly_summary' | 'monthly_summary' | 'strategy' | 'performance_alert';

export type PreferenceType = 'tone' | 'length' | 'emoji_usage' | 'hashtag_style' | 'cta_style' | 'topic_preference' | 'rejection_pattern' | 'edit_pattern';

// ============================================================================
// SOCIAL ACCOUNTS
// ============================================================================

export interface SocialAccount {
  id: number;
  platform: SocialPlatform;
  account_name: string | null;
  account_username: string | null;
  buffer_profile_id: string | null;
  external_account_id: string | null;
  profile_ids: unknown;
  avatar_url: string | null;
  is_active: boolean;
  connection_status: ConnectionStatus;
  last_error: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  connected_by: number | null;
}

// ============================================================================
// SCHEDULED POSTS
// ============================================================================

export interface ScheduledPost {
  id: number;
  content: string;
  media_urls: string[];
  hashtags: string[];
  link_url: string | null;
  platform: SocialPlatform;
  account_id: number | null;
  scheduled_for: string;
  timezone: string;
  status: PostStatus;
  buffer_post_id: string | null;
  buffer_update_id: string | null;
  published_at: string | null;
  error_message: string | null;
  retry_count: number;
  content_type: PostContentType | null;
  winery_id: number | null;
  impressions: number;
  engagement: number;
  clicks: number;
  shares: number;
  analytics_synced_at: string | null;
  source: PostSource;
  suggestion_id: number | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

// ============================================================================
// CONTENT SUGGESTIONS
// ============================================================================

export interface ContentSuggestion {
  id: number;
  suggestion_date: string;
  platform: SocialPlatform;
  content_type: PostContentType;
  winery_id: number | null;
  winery_name: string | null;
  suggested_content: string;
  suggested_hashtags: string[];
  suggested_time: string | null;
  suggested_media_urls: string[];
  media_source: string;
  image_search_query: string | null;
  reasoning: string;
  data_sources: unknown;
  priority: number;
  relevance_score: number | null;
  status: SuggestionStatus;
  scheduled_post_id: number | null;
  accepted_at: string | null;
  accepted_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MARKETING CAMPAIGNS
// ============================================================================

export interface MarketingCampaign {
  id: number;
  name: string;
  description: string | null;
  theme: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  channels: string[];
  target_audience: string | null;
  budget: number | null;
  goals: Record<string, unknown>;
  performance: Record<string, unknown>;
  auto_generated: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignItem {
  id: number;
  campaign_id: number;
  channel: CampaignChannel;
  item_type: CampaignItemType;
  content: string;
  subject_line: string | null;
  media_urls: string[];
  scheduled_for: string | null;
  status: CampaignItemStatus;
  scheduled_post_id: number | null;
  performance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRENDING TOPICS
// ============================================================================

export interface TrendingTopic {
  id: number;
  topic: string;
  category: TrendingCategory | null;
  summary: string;
  relevance_score: number;
  suggested_content: string | null;
  suggested_angle: string | null;
  source_urls: string[];
  detected_at: string;
  expires_at: string | null;
  status: TrendingStatus;
  actioned_post_id: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BLOG DRAFTS
// ============================================================================

export interface BlogDraft {
  id: number;
  title: string;
  slug: string | null;
  meta_description: string | null;
  target_keywords: string[];
  content: string;
  word_count: number;
  estimated_read_time: number;
  json_ld: unknown;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  category: string | null;
  tags: string[];
  status: BlogDraftStatus;
  published_url: string | null;
  published_at: string | null;
  seo_score: number | null;
  readability_score: number | null;
  created_by: number | null;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTENT REFRESH
// ============================================================================

export interface ContentRefreshSuggestion {
  id: number;
  page_path: string;
  page_title: string | null;
  reason: RefreshReason;
  current_content: string | null;
  suggested_update: string | null;
  urgency: RefreshUrgency;
  last_modified: string | null;
  days_since_update: number | null;
  impressions_trend: string | null;
  status: RefreshStatus;
  applied_at: string | null;
  applied_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTENT APPROVALS & AI LEARNING
// ============================================================================

export interface ContentApproval {
  id: number;
  content_type: ApprovalContentType;
  content_id: number;
  action: ApprovalAction;
  original_content: string;
  final_content: string | null;
  edit_diff: string | null;
  platform: string | null;
  content_category: string | null;
  tone: string | null;
  approval_time_seconds: number | null;
  notes: string | null;
  approved_by: number | null;
  created_at: string;
}

export interface AiLearningPreference {
  id: number;
  preference_type: PreferenceType;
  platform: string | null;
  pattern: string;
  confidence_score: number;
  learned_from_count: number;
  example_content: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MARKETING STRATEGIES
// ============================================================================

export interface MarketingStrategy {
  id: number;
  week_start: string;
  week_end: string;
  theme: string | null;
  summary: string;
  data_inputs: Record<string, unknown>;
  recommended_posts: unknown[];
  keyword_opportunities: unknown[];
  content_gaps: unknown[];
  performance_summary: Record<string, unknown>;
  status: StrategyStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MARKETING REPORTS
// ============================================================================

export interface MarketingReportLog {
  id: number;
  report_type: ReportType;
  report_date: string;
  report_content: string;
  metrics: Record<string, unknown>;
  sent_to: string[];
  sent_at: string | null;
  created_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface MarketingMetricsResponse {
  campaigns: {
    active: number;
    total: number;
    total_budget: number;
  };
  social: {
    scheduled_posts: number;
    published_this_week: number;
    total_impressions: number;
    total_engagement: number;
  };
  suggestions: {
    pending: number;
    accepted_this_week: number;
  };
  content: {
    refresh_needed: number;
    blog_drafts: number;
  };
}

export interface SocialCalendarResponse {
  posts: ScheduledPost[];
  suggestions: ContentSuggestion[];
  date_range: {
    start: string;
    end: string;
  };
}
