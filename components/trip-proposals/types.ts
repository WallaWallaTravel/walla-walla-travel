/**
 * Shared types and constants for the trip proposal creation form.
 */

export interface Brand {
  id: number;
  brand_code: string;
  brand_name: string;
  display_name: string;
  primary_color: string | null;
  default_brand: boolean | null;
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

export interface SavedMenuOption {
  id: number;
  name: string;
}

export interface StopData {
  id: string;
  stop_order: number;
  stop_type: string;
  winery_id?: number;
  restaurant_id?: number;
  hotel_id?: number;
  saved_menu_id?: number;
  custom_name?: string;
  custom_address?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  per_person_cost: number;
  flat_cost: number;
  cost_note?: string;
  reservation_status: string;
  client_notes?: string;
  internal_notes?: string;
  driver_notes?: string;
}

export interface DayData {
  id: string;
  day_number: number;
  date: string;
  title: string;
  notes?: string;
  stops: StopData[];
}

export interface GuestData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dietary_restrictions?: string;
  room_assignment?: string;
  is_primary: boolean;
}

export interface InclusionData {
  id: string;
  inclusion_type: string;
  description: string;
  pricing_type: 'flat' | 'per_person' | 'per_day';
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface FormData {
  brand_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string;
  trip_type: string;
  party_size: number;
  start_date: string;
  end_date: string;
  introduction: string;
  internal_notes: string;
  valid_until: string;
  deposit_percentage: number;
  gratuity_percentage: number;
  tax_rate: number;
  discount_amount: number;
  discount_reason: string;
  days: DayData[];
  guests: GuestData[];
  inclusions: InclusionData[];
}

export interface Totals {
  servicesTotal: number;
  subtotal: number;
  discount: number;
  afterDiscount: number;
  taxes: number;
  gratuity: number;
  total: number;
  deposit: number;
  balance: number;
}

export const STOP_TYPES = [
  { value: 'pickup', label: 'Pickup', icon: '🚗' },
  { value: 'dropoff', label: 'Dropoff', icon: '🏁' },
  { value: 'winery', label: 'Winery', icon: '🍷' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'activity', label: 'Activity', icon: '🎈' },
  { value: 'custom', label: 'Custom', icon: '📍' },
];

export const INCLUSION_TYPES = [
  { value: 'transportation', label: 'Transportation' },
  { value: 'chauffeur', label: 'Professional Chauffeur' },
  { value: 'gratuity', label: 'Gratuity' },
  { value: 'planning_fee', label: 'Planning Fee' },
  { value: 'arranged_tasting', label: 'Arranged Tasting' },
  { value: 'custom', label: 'Custom' },
];

export const SERVICE_TEMPLATES = [
  { label: 'Airport Transfer', inclusion_type: 'transportation', description: 'Airport Transfer', pricing_type: 'flat' as const },
  { label: 'Multi-Day Tour', inclusion_type: 'transportation', description: 'Wine Country Tour', pricing_type: 'per_day' as const },
  { label: 'Planning Fee', inclusion_type: 'planning_fee', description: 'Planning & Coordination', pricing_type: 'flat' as const },
  { label: 'Arranged Tasting', inclusion_type: 'arranged_tasting', description: 'Arranged Tasting Program', pricing_type: 'per_person' as const },
  { label: 'Custom', inclusion_type: 'custom', description: '', pricing_type: 'flat' as const },
];

export const PRICING_TYPE_OPTIONS = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'per_person', label: 'Per Person' },
  { value: 'per_day', label: 'Per Day/Unit' },
];
