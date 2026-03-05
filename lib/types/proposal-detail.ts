/**
 * Proposal Detail Page Types
 *
 * These represent the actual API response shapes for the proposal edit page.
 * Monetary fields are strings because PostgreSQL DECIMAL serializes as strings in JSON.
 * The canonical types in trip-proposal.ts use `number` for those fields — these types
 * match runtime data.
 */

export interface Brand {
  id: number;
  brand_code: string;
  brand_name: string;
  display_name: string;
  primary_color: string | null;
}

export interface Winery {
  id: number;
  name: string;
  city: string;
}

export interface Restaurant {
  id: number;
  name: string;
  city: string;
  cuisine_type: string | null;
}

export interface Hotel {
  id: number;
  name: string;
  city: string;
}

export interface StopData {
  id: number;
  stop_order: number;
  stop_type: string;
  winery_id?: number;
  restaurant_id?: number;
  hotel_id?: number;
  saved_menu_id?: number;
  winery?: { id: number; name: string };
  restaurant?: { id: number; name: string };
  hotel?: { id: number; name: string };
  custom_name?: string;
  custom_address?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  per_person_cost: string;
  flat_cost: string;
  cost_note?: string;
  reservation_status: string;
  client_notes?: string;
  internal_notes?: string;
  driver_notes?: string;
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  quote_status?: string;
  quoted_amount?: number;
  quote_notes?: string;
}

export interface DayData {
  id: number;
  day_number: number;
  date: string;
  title: string;
  notes?: string;
  stops: StopData[];
}

export interface GuestData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  dietary_restrictions?: string;
  room_assignment?: string;
  is_primary: boolean;
  guest_access_token?: string;
  rsvp_status?: string;
  is_registered?: boolean;
  shared_tour_ticket_id?: number | null;
}

export interface InclusionData {
  id: number;
  inclusion_type: string;
  description: string;
  pricing_type: 'flat' | 'per_person' | 'per_day';
  quantity: number;
  unit_price: string;
  total_price: string;
  is_taxable: boolean;
  tax_included_in_price: boolean;
}

export interface ProposalDetail {
  id: number;
  proposal_number: string;
  status: string;
  access_token: string;
  planning_phase: string;
  brand_id: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  trip_type: string;
  party_size: number;
  start_date: string;
  end_date: string | null;
  introduction: string | null;
  internal_notes: string | null;
  valid_until: string | null;
  deposit_percentage: number;
  gratuity_percentage: number;
  tax_rate: string;
  discount_amount: string;
  discount_reason: string | null;
  subtotal: string;
  taxes: string;
  total: string;
  deposit_amount: string;
  skip_deposit_on_accept?: boolean;
  planning_fee_mode?: 'flat' | 'percentage';
  planning_fee_percentage?: number;
  individual_billing_enabled?: boolean;
  payment_deadline?: string | null;
  reminders_paused?: boolean;
  max_guests?: number | null;
  min_guests?: number | null;
  min_guests_deadline?: string | null;
  dynamic_pricing_enabled?: boolean;
  guest_approval_required?: boolean;
  show_guest_count_to_guests?: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  days?: DayData[];
  guests?: GuestData[];
  inclusions?: InclusionData[];
}

export interface NoteData {
  id: number;
  author_type: string;
  author_name: string;
  content: string;
  context_type: string | null;
  context_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface LunchOrderData {
  id: number;
  ordering_mode: string;
  day?: { day_number: number; title: string | null };
  supplier?: { name: string };
}

export interface ReminderRecord {
  id: number;
  guest_name?: string;
  scheduled_date: string;
  urgency: string;
  status: string;
  paused: boolean;
  skip_reason: string | null;
  sent_at: string | null;
  custom_message: string | null;
}

export type ToastFn = (message: string, type: 'success' | 'error' | 'info') => void;
