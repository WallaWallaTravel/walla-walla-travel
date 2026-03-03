-- Migration 109: Fix mutable search_path on all public plpgsql functions
-- Supabase linter flagged 39 functions without an explicit search_path,
-- which is a theoretical schema injection risk (CWE-1321).
-- ALTER FUNCTION ... SET search_path is safe and non-destructive.

ALTER FUNCTION public.calculate_ticket_price(p_tour_id integer, p_ticket_count integer, p_includes_lunch boolean) SET search_path = public;
ALTER FUNCTION public.check_dq_file_complete(p_driver_id integer) SET search_path = public;
ALTER FUNCTION public.check_shared_tour_availability(p_tour_id integer, p_requested_tickets integer) SET search_path = public;
ALTER FUNCTION public.check_vehicle_availability(p_vehicle_id integer, p_date date, p_start_time time without time zone, p_end_time time without time zone) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_holds() SET search_path = public;
ALTER FUNCTION public.convert_hold_to_booking(p_block_id integer, p_booking_id integer, p_session_id character varying) SET search_path = public;
ALTER FUNCTION public.create_availability_hold(p_vehicle_id integer, p_date date, p_start_time time without time zone, p_end_time time without time zone, p_session_id character varying, p_hold_minutes integer) SET search_path = public;
ALTER FUNCTION public.ensure_single_default_preset() SET search_path = public;
ALTER FUNCTION public.generate_business_invite_token() SET search_path = public;
ALTER FUNCTION public.generate_ticket_number() SET search_path = public;
ALTER FUNCTION public.generate_trip_estimate_number() SET search_path = public;
ALTER FUNCTION public.generate_trip_proposal_number() SET search_path = public;
ALTER FUNCTION public.set_ticket_number() SET search_path = public;
ALTER FUNCTION public.sync_business_type() SET search_path = public;
ALTER FUNCTION public.update_availability_timestamp() SET search_path = public;
ALTER FUNCTION public.update_businesses_updated_at() SET search_path = public;
ALTER FUNCTION public.update_competitor_last_change() SET search_path = public;
ALTER FUNCTION public.update_competitors_updated_at() SET search_path = public;
ALTER FUNCTION public.update_contact_inquiries_updated_at() SET search_path = public;
ALTER FUNCTION public.update_contact_last_contacted() SET search_path = public;
ALTER FUNCTION public.update_crm_updated_at() SET search_path = public;
ALTER FUNCTION public.update_deal_stage_changed() SET search_path = public;
ALTER FUNCTION public.update_dq_file_status() SET search_path = public;
ALTER FUNCTION public.update_driver_documents_timestamp() SET search_path = public;
ALTER FUNCTION public.update_event_organizers_updated_at() SET search_path = public;
ALTER FUNCTION public.update_events_updated_at() SET search_path = public;
ALTER FUNCTION public.update_geology_ai_guidance_timestamp() SET search_path = public;
ALTER FUNCTION public.update_geology_sites_timestamp() SET search_path = public;
ALTER FUNCTION public.update_geology_topics_timestamp() SET search_path = public;
ALTER FUNCTION public.update_geology_tours_timestamp() SET search_path = public;
ALTER FUNCTION public.update_marketing_updated_at() SET search_path = public;
ALTER FUNCTION public.update_modified_column() SET search_path = public;
ALTER FUNCTION public.update_operational_updated_at() SET search_path = public;
ALTER FUNCTION public.update_social_updated_at() SET search_path = public;
ALTER FUNCTION public.update_trip_activity() SET search_path = public;
ALTER FUNCTION public.update_trip_estimates_timestamp() SET search_path = public;
ALTER FUNCTION public.update_trip_proposals_timestamp() SET search_path = public;
ALTER FUNCTION public.update_trips_timestamp() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
