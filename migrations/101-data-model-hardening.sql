-- Migration 101: Data Model Hardening — onDelete policies & financial cascade protection
-- Generated: 2026-03-02
--
-- FIX 1: Add explicit onDelete SET NULL to ~58 relations that previously had no onDelete
-- FIX 2: Change dangerous CASCADE to RESTRICT on financial/compliance records
--
-- IMPORTANT: This migration only changes FK constraint behaviors.
-- No data is modified. All changes are safe to apply.

BEGIN;

-- ============================================================================
-- FIX 2: DANGEROUS CASCADE → RESTRICT (Financial & Compliance Records)
-- These MUST be changed first to prevent accidental data loss.
-- ============================================================================

-- driver_tips: Payment records — NEVER cascade delete money
ALTER TABLE driver_tips DROP CONSTRAINT IF EXISTS driver_tips_booking_id_fkey;
ALTER TABLE driver_tips ADD CONSTRAINT driver_tips_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE driver_tips DROP CONSTRAINT IF EXISTS driver_tips_driver_id_fkey;
ALTER TABLE driver_tips ADD CONSTRAINT driver_tips_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- tour_expenses: Expense/reimbursement records — NEVER cascade delete money
ALTER TABLE tour_expenses DROP CONSTRAINT IF EXISTS tour_expenses_booking_id_fkey;
ALTER TABLE tour_expenses ADD CONSTRAINT tour_expenses_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE tour_expenses DROP CONSTRAINT IF EXISTS tour_expenses_driver_id_fkey;
ALTER TABLE tour_expenses ADD CONSTRAINT tour_expenses_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- tour_completions: Tracks tip payment links & lunch costs — financial adjacent
ALTER TABLE tour_completions DROP CONSTRAINT IF EXISTS tour_completions_booking_id_fkey;
ALTER TABLE tour_completions ADD CONSTRAINT tour_completions_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE tour_completions DROP CONSTRAINT IF EXISTS tour_completions_driver_id_fkey;
ALTER TABLE tour_completions ADD CONSTRAINT tour_completions_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- break_records: DOT rest break compliance records
ALTER TABLE break_records DROP CONSTRAINT IF EXISTS break_records_driver_id_fkey;
ALTER TABLE break_records ADD CONSTRAINT break_records_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- driver_status_logs: HOS (Hours of Service) compliance data
ALTER TABLE driver_status_logs DROP CONSTRAINT IF EXISTS driver_status_logs_driver_id_fkey;
ALTER TABLE driver_status_logs ADD CONSTRAINT driver_status_logs_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- dvir_reports: FMCSA-required vehicle inspection records
ALTER TABLE dvir_reports DROP CONSTRAINT IF EXISTS dvir_reports_driver_id_fkey;
ALTER TABLE dvir_reports ADD CONSTRAINT dvir_reports_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE dvir_reports DROP CONSTRAINT IF EXISTS dvir_reports_vehicle_id_fkey;
ALTER TABLE dvir_reports ADD CONSTRAINT dvir_reports_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ============================================================================
-- FIX 1: MISSING onDelete → SET NULL (User reference fields)
-- Audit/tracking fields: deleting a user should null the reference, not block or cascade
-- ============================================================================

-- corporate_requests
ALTER TABLE corporate_requests DROP CONSTRAINT IF EXISTS corporate_requests_assigned_to_fkey;
ALTER TABLE corporate_requests ADD CONSTRAINT corporate_requests_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE corporate_requests DROP CONSTRAINT IF EXISTS corporate_requests_crm_contact_id_fkey;
ALTER TABLE corporate_requests ADD CONSTRAINT corporate_requests_crm_contact_id_fkey
  FOREIGN KEY (crm_contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE corporate_requests DROP CONSTRAINT IF EXISTS corporate_requests_crm_deal_id_fkey;
ALTER TABLE corporate_requests ADD CONSTRAINT corporate_requests_crm_deal_id_fkey
  FOREIGN KEY (crm_deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- blog_drafts
ALTER TABLE blog_drafts DROP CONSTRAINT IF EXISTS blog_drafts_created_by_fkey;
ALTER TABLE blog_drafts ADD CONSTRAINT blog_drafts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE blog_drafts DROP CONSTRAINT IF EXISTS blog_drafts_reviewed_by_fkey;
ALTER TABLE blog_drafts ADD CONSTRAINT blog_drafts_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- competitive_advantages
ALTER TABLE competitive_advantages DROP CONSTRAINT IF EXISTS competitive_advantages_created_by_fkey;
ALTER TABLE competitive_advantages ADD CONSTRAINT competitive_advantages_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- competitor_changes
ALTER TABLE competitor_changes DROP CONSTRAINT IF EXISTS competitor_changes_reviewed_by_fkey;
ALTER TABLE competitor_changes ADD CONSTRAINT competitor_changes_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- competitors
ALTER TABLE competitors DROP CONSTRAINT IF EXISTS competitors_created_by_fkey;
ALTER TABLE competitors ADD CONSTRAINT competitors_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- competitor_swot
ALTER TABLE competitor_swot DROP CONSTRAINT IF EXISTS competitor_swot_created_by_fkey;
ALTER TABLE competitor_swot ADD CONSTRAINT competitor_swot_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- contact_inquiries
ALTER TABLE contact_inquiries DROP CONSTRAINT IF EXISTS contact_inquiries_crm_contact_id_fkey;
ALTER TABLE contact_inquiries ADD CONSTRAINT contact_inquiries_crm_contact_id_fkey
  FOREIGN KEY (crm_contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- content_approvals
ALTER TABLE content_approvals DROP CONSTRAINT IF EXISTS content_approvals_approved_by_fkey;
ALTER TABLE content_approvals ADD CONSTRAINT content_approvals_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- content_collections
ALTER TABLE content_collections DROP CONSTRAINT IF EXISTS content_collections_updated_by_fkey;
ALTER TABLE content_collections ADD CONSTRAINT content_collections_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- content_history
ALTER TABLE content_history DROP CONSTRAINT IF EXISTS content_history_changed_by_fkey;
ALTER TABLE content_history ADD CONSTRAINT content_history_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- content_refresh_suggestions
ALTER TABLE content_refresh_suggestions DROP CONSTRAINT IF EXISTS content_refresh_suggestions_applied_by_fkey;
ALTER TABLE content_refresh_suggestions ADD CONSTRAINT content_refresh_suggestions_applied_by_fkey
  FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- content_suggestions
ALTER TABLE content_suggestions DROP CONSTRAINT IF EXISTS content_suggestions_accepted_by_fkey;
ALTER TABLE content_suggestions ADD CONSTRAINT content_suggestions_accepted_by_fkey
  FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE content_suggestions DROP CONSTRAINT IF EXISTS content_suggestions_scheduled_post_id_fkey;
ALTER TABLE content_suggestions ADD CONSTRAINT content_suggestions_scheduled_post_id_fkey
  FOREIGN KEY (scheduled_post_id) REFERENCES scheduled_posts(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- crm_activities
ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_performed_by_fkey;
ALTER TABLE crm_activities ADD CONSTRAINT crm_activities_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- crm_contacts
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_assigned_to_fkey;
ALTER TABLE crm_contacts ADD CONSTRAINT crm_contacts_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_customer_id_fkey;
ALTER TABLE crm_contacts ADD CONSTRAINT crm_contacts_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- crm_deals
ALTER TABLE crm_deals DROP CONSTRAINT IF EXISTS crm_deals_assigned_to_fkey;
ALTER TABLE crm_deals ADD CONSTRAINT crm_deals_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE crm_deals DROP CONSTRAINT IF EXISTS crm_deals_booking_id_fkey;
ALTER TABLE crm_deals ADD CONSTRAINT crm_deals_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE crm_deals DROP CONSTRAINT IF EXISTS crm_deals_proposal_id_fkey;
ALTER TABLE crm_deals ADD CONSTRAINT crm_deals_proposal_id_fkey
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- crm_tasks
ALTER TABLE crm_tasks DROP CONSTRAINT IF EXISTS crm_tasks_assigned_to_fkey;
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE crm_tasks DROP CONSTRAINT IF EXISTS crm_tasks_completed_by_fkey;
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE crm_tasks DROP CONSTRAINT IF EXISTS crm_tasks_created_by_fkey;
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- driver_status_logs (time_card_id — optional reference)
ALTER TABLE driver_status_logs DROP CONSTRAINT IF EXISTS driver_status_logs_time_card_id_fkey;
ALTER TABLE driver_status_logs ADD CONSTRAINT driver_status_logs_time_card_id_fkey
  FOREIGN KEY (time_card_id) REFERENCES time_cards(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- dvir_reports (optional user/inspection references)
ALTER TABLE dvir_reports DROP CONSTRAINT IF EXISTS dvir_reports_mechanic_id_fkey;
ALTER TABLE dvir_reports ADD CONSTRAINT dvir_reports_mechanic_id_fkey
  FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE dvir_reports DROP CONSTRAINT IF EXISTS dvir_reports_post_trip_inspection_id_fkey;
ALTER TABLE dvir_reports ADD CONSTRAINT dvir_reports_post_trip_inspection_id_fkey
  FOREIGN KEY (post_trip_inspection_id) REFERENCES inspections(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE dvir_reports DROP CONSTRAINT IF EXISTS dvir_reports_pre_trip_inspection_id_fkey;
ALTER TABLE dvir_reports ADD CONSTRAINT dvir_reports_pre_trip_inspection_id_fkey
  FOREIGN KEY (pre_trip_inspection_id) REFERENCES inspections(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- geology_facts
ALTER TABLE geology_facts DROP CONSTRAINT IF EXISTS geology_facts_context_site_id_fkey;
ALTER TABLE geology_facts ADD CONSTRAINT geology_facts_context_site_id_fkey
  FOREIGN KEY (context_site_id) REFERENCES geology_sites(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE geology_facts DROP CONSTRAINT IF EXISTS geology_facts_context_topic_id_fkey;
ALTER TABLE geology_facts ADD CONSTRAINT geology_facts_context_topic_id_fkey
  FOREIGN KEY (context_topic_id) REFERENCES geology_topics(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- geology_site_topics
ALTER TABLE geology_site_topics DROP CONSTRAINT IF EXISTS geology_site_topics_topic_id_fkey;
ALTER TABLE geology_site_topics ADD CONSTRAINT geology_site_topics_topic_id_fkey
  FOREIGN KEY (topic_id) REFERENCES geology_topics(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- kb_contributions
ALTER TABLE kb_contributions DROP CONSTRAINT IF EXISTS kb_contributions_business_id_fkey;
ALTER TABLE kb_contributions ADD CONSTRAINT kb_contributions_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES kb_businesses(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE kb_contributions DROP CONSTRAINT IF EXISTS kb_contributions_contributor_id_fkey;
ALTER TABLE kb_contributions ADD CONSTRAINT kb_contributions_contributor_id_fkey
  FOREIGN KEY (contributor_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- marketing_campaigns
ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_created_by_fkey;
ALTER TABLE marketing_campaigns ADD CONSTRAINT marketing_campaigns_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- mileage_logs
ALTER TABLE mileage_logs DROP CONSTRAINT IF EXISTS mileage_logs_recorded_by_fkey;
ALTER TABLE mileage_logs ADD CONSTRAINT mileage_logs_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- page_content
ALTER TABLE page_content DROP CONSTRAINT IF EXISTS page_content_updated_by_fkey;
ALTER TABLE page_content ADD CONSTRAINT page_content_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- scheduled_posts
ALTER TABLE scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_account_id_fkey;
ALTER TABLE scheduled_posts ADD CONSTRAINT scheduled_posts_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES social_accounts(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_created_by_fkey;
ALTER TABLE scheduled_posts ADD CONSTRAINT scheduled_posts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_strategy_id_fkey;
ALTER TABLE scheduled_posts ADD CONSTRAINT scheduled_posts_strategy_id_fkey
  FOREIGN KEY (strategy_id) REFERENCES marketing_strategies(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- social_accounts
ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_connected_by_fkey;
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_connected_by_fkey
  FOREIGN KEY (connected_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- trending_topics
ALTER TABLE trending_topics DROP CONSTRAINT IF EXISTS trending_topics_actioned_post_id_fkey;
ALTER TABLE trending_topics ADD CONSTRAINT trending_topics_actioned_post_id_fkey
  FOREIGN KEY (actioned_post_id) REFERENCES scheduled_posts(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- trip_proposal_activity
ALTER TABLE trip_proposal_activity DROP CONSTRAINT IF EXISTS trip_proposal_activity_actor_user_id_fkey;
ALTER TABLE trip_proposal_activity ADD CONSTRAINT trip_proposal_activity_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- trip_estimates
ALTER TABLE trip_estimates DROP CONSTRAINT IF EXISTS trip_estimates_trip_proposal_id_fkey;
ALTER TABLE trip_estimates ADD CONSTRAINT trip_estimates_trip_proposal_id_fkey
  FOREIGN KEY (trip_proposal_id) REFERENCES trip_proposals(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- trip_proposals
ALTER TABLE trip_proposals DROP CONSTRAINT IF EXISTS trip_proposals_brand_id_fkey;
ALTER TABLE trip_proposals ADD CONSTRAINT trip_proposals_brand_id_fkey
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE trip_proposals DROP CONSTRAINT IF EXISTS trip_proposals_converted_to_booking_id_fkey;
ALTER TABLE trip_proposals ADD CONSTRAINT trip_proposals_converted_to_booking_id_fkey
  FOREIGN KEY (converted_to_booking_id) REFERENCES bookings(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE trip_proposals DROP CONSTRAINT IF EXISTS trip_proposals_created_by_fkey;
ALTER TABLE trip_proposals ADD CONSTRAINT trip_proposals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE trip_proposals DROP CONSTRAINT IF EXISTS trip_proposals_customer_id_fkey;
ALTER TABLE trip_proposals ADD CONSTRAINT trip_proposals_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- trip_proposal_stops
ALTER TABLE trip_proposal_stops DROP CONSTRAINT IF EXISTS trip_proposal_stops_hotel_id_fkey;
ALTER TABLE trip_proposal_stops ADD CONSTRAINT trip_proposal_stops_hotel_id_fkey
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE trip_proposal_stops DROP CONSTRAINT IF EXISTS trip_proposal_stops_restaurant_id_fkey;
ALTER TABLE trip_proposal_stops ADD CONSTRAINT trip_proposal_stops_restaurant_id_fkey
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE trip_proposal_stops DROP CONSTRAINT IF EXISTS trip_proposal_stops_winery_id_fkey;
ALTER TABLE trip_proposal_stops ADD CONSTRAINT trip_proposal_stops_winery_id_fkey
  FOREIGN KEY (winery_id) REFERENCES wineries(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- vehicle_alerts
ALTER TABLE vehicle_alerts DROP CONSTRAINT IF EXISTS vehicle_alerts_created_by_fkey;
ALTER TABLE vehicle_alerts ADD CONSTRAINT vehicle_alerts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE vehicle_alerts DROP CONSTRAINT IF EXISTS vehicle_alerts_resolved_by_fkey;
ALTER TABLE vehicle_alerts ADD CONSTRAINT vehicle_alerts_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- campaign_items
ALTER TABLE campaign_items DROP CONSTRAINT IF EXISTS campaign_items_scheduled_post_id_fkey;
ALTER TABLE campaign_items ADD CONSTRAINT campaign_items_scheduled_post_id_fkey
  FOREIGN KEY (scheduled_post_id) REFERENCES scheduled_posts(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- competitor_alerts
ALTER TABLE competitor_alerts DROP CONSTRAINT IF EXISTS competitor_alerts_change_id_fkey;
ALTER TABLE competitor_alerts ADD CONSTRAINT competitor_alerts_change_id_fkey
  FOREIGN KEY (change_id) REFERENCES competitor_changes(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE competitor_alerts DROP CONSTRAINT IF EXISTS competitor_alerts_competitor_id_fkey;
ALTER TABLE competitor_alerts ADD CONSTRAINT competitor_alerts_competitor_id_fkey
  FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- shared_tours_tickets (hotel_partner_id)
ALTER TABLE shared_tours_tickets DROP CONSTRAINT IF EXISTS shared_tours_tickets_hotel_partner_id_fkey;
ALTER TABLE shared_tours_tickets ADD CONSTRAINT shared_tours_tickets_hotel_partner_id_fkey
  FOREIGN KEY (hotel_partner_id) REFERENCES hotel_partners(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- wineries (featured_photo_override_id)
ALTER TABLE wineries DROP CONSTRAINT IF EXISTS wineries_featured_photo_override_id_fkey;
ALTER TABLE wineries ADD CONSTRAINT wineries_featured_photo_override_id_fkey
  FOREIGN KEY (featured_photo_override_id) REFERENCES media_library(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- Record migration
INSERT INTO _migrations (id, migration_name, applied_at, notes)
VALUES (
  101,
  '101-data-model-hardening',
  NOW(),
  'Add explicit onDelete policies to 58 relations; change 10 financial/compliance cascades to RESTRICT'
);

COMMIT;
