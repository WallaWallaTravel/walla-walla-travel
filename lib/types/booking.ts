/**
 * Booking System Types
 * TypeScript interfaces for Phase 2 booking system
 */

// ============================================================================
// COMMON UTILITY TYPES
// ============================================================================

/** Operating hours for a single day */
export interface DayHours {
  open: string;  // e.g., "10:00"
  close: string; // e.g., "18:00"
  closed?: boolean;
}

/** Weekly operating hours schedule */
export interface HoursOfOperation {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

/** Photo/image metadata */
export interface PhotoData {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  isPrimary?: boolean;
}

/** Collection of photos */
export interface PhotoCollection {
  primary?: PhotoData;
  gallery?: PhotoData[];
  thumbnail?: PhotoData;
}

/** Geographic coordinates */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Restaurant menu item */
export interface MenuItem {
  name: string;
  description?: string;
  price: number;
  category?: string;
  dietaryFlags?: string[];
}

/** Restaurant menu structure */
export interface MenuStructure {
  categories?: string[];
  items?: MenuItem[];
  lastUpdated?: string;
}

/** Lunch order line item */
export interface LunchOrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  dietaryNotes?: string;
}

/** Wine purchase line item */
export interface WinePurchaseItem {
  wineId?: string;
  name: string;
  vintage?: number;
  quantity: number;
  pricePerBottle: number;
  totalPrice: number;
}

/** Availability rule configuration */
export interface AvailabilityRuleConfig {
  blockedDates?: string[];
  allowedDaysOfWeek?: number[];
  maxBookingsPerDay?: number;
  minAdvanceHours?: number;
  maxAdvanceDays?: number;
  specialHolidays?: string[];
  [key: string]: unknown;
}

/** Timeline event metadata */
export interface TimelineMetadata {
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  triggeredBy?: string;
  additionalInfo?: Record<string, unknown>;
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface Customer {
  id: number;
  email: string;
  name: string;
  phone?: string;
  preferred_wineries?: string[];
  dietary_restrictions?: string;
  accessibility_needs?: string;
  vip_status: boolean;
  email_marketing_consent: boolean;
  sms_marketing_consent: boolean;
  total_bookings: number;
  total_spent: number;
  average_rating?: number;
  last_booking_date?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  email: string;
  name: string;
  phone?: string;
  dietary_restrictions?: string;
  accessibility_needs?: string;
  email_marketing_consent?: boolean;
  sms_marketing_consent?: boolean;
}

// ============================================================================
// WINERY TYPES
// ============================================================================

export interface Winery {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  founded_year?: number;
  winemaker?: string;
  specialties?: string[];
  tasting_fee?: number;
  reservation_required: boolean;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  hours_of_operation?: HoursOfOperation;
  photos?: PhotoCollection;
  average_rating: number;
  total_reviews: number;
  curator_notes?: string;
  amenities?: string[];
  keywords?: string[];
  is_partner: boolean;
  commission_rate?: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WineryListItem {
  id: number;
  name: string;
  slug: string;
  short_description?: string;
  specialties?: string[];
  tasting_fee?: number;
  average_rating: number;
  is_featured: boolean;
  photos?: PhotoCollection;
}

// ============================================================================
// RESTAURANT TYPES
// ============================================================================

export interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  menu?: MenuStructure;
  dietary_options?: string[];
  average_rating: number;
  total_reviews: number;
  is_partner: boolean;
  commission_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type BookingSource =
  | 'website'
  | 'phone'
  | 'email'
  | 'manual';

export interface Booking {
  id: number;
  booking_number: string;
  customer_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  party_size: number;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  pickup_location: string;
  pickup_coordinates?: Coordinates;
  driver_id?: number;
  vehicle_id?: number;
  base_price: number;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_at?: string;
  final_payment_due: number;
  final_payment_paid: boolean;
  final_payment_paid_at?: string;
  status: BookingStatus;
  confirmed_at?: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_issued: boolean;
  refund_issued_at?: string;
  special_requests?: string;
  dietary_restrictions?: string;
  accessibility_needs?: string;
  internal_notes?: string;
  booking_source: BookingSource;
  stripe_payment_intent_id?: string;
  confirmation_email_sent: boolean;
  reminder_email_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingWithRelations extends Booking {
  customer?: Customer;
  driver?: {
    id: number;
    name: string;
    email: string;
  };
  vehicle?: {
    id: number;
    name: string;
    license_plate: string;
  };
  wineries?: BookingWinery[];
  lunch_order?: LunchOrder;
  payments?: Payment[];
  timeline?: BookingTimeline[];
}

export interface CreateBookingInput {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  party_size: number;
  tour_date: string;
  start_time: string;
  duration_hours: 4.0 | 6.0 | 8.0;
  pickup_location: string;
  winery_ids: number[];
  special_requests?: string;
  dietary_restrictions?: string;
  accessibility_needs?: string;
  booking_source?: BookingSource;
}

export interface BookingAvailabilityQuery {
  tour_date: string;
  start_time: string;
  duration_hours: 4.0 | 6.0 | 8.0;
  party_size: number;
}

export interface BookingAvailabilityResult {
  available: boolean;
  pricing: {
    base_price: number;
    deposit_amount: number;
    total_price: number;
  };
  available_vehicles?: Array<{
    id: number;
    name: string;
    capacity: number;
  }>;
  conflicts?: string[];
}

// ============================================================================
// BOOKING WINERY JUNCTION
// ============================================================================

export interface BookingWinery {
  id: number;
  booking_id: number;
  winery_id: number;
  visit_order: number;
  scheduled_arrival?: string;
  scheduled_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  tasting_fee_paid?: number;
  wine_purchases?: number;
  notes?: string;
  created_at: string;
  winery?: Winery;
}

// ============================================================================
// LUNCH ORDER TYPES
// ============================================================================

export interface LunchOrder {
  id: number;
  booking_id: number;
  restaurant_id: number;
  scheduled_time?: string;
  items: LunchOrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  special_instructions?: string;
  confirmed: boolean;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export type PaymentType = 'deposit' | 'final_payment' | 'refund';
export type PaymentMethod = 'credit_card' | 'cash' | 'check' | 'other';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: number;
  booking_id: number;
  payment_type: PaymentType;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  transaction_id?: string;
  processed_at?: string;
  failed_reason?: string;
  refunded_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRICING RULE TYPES
// ============================================================================

export type VehicleType = 'sprinter' | 'luxury_sedan' | 'suv';

export interface PricingRule {
  id: number;
  name: string;
  vehicle_type: VehicleType;
  duration_hours: 4.0 | 6.0 | 8.0;
  base_price: number;
  is_weekend: boolean;
  effective_from?: string;
  effective_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AVAILABILITY RULE TYPES
// ============================================================================

export interface AvailabilityRule {
  id: number;
  name: string;
  rule_type: string;
  config: AvailabilityRuleConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BOOKING TIMELINE TYPES
// ============================================================================

export interface BookingTimeline {
  id: number;
  booking_id: number;
  event_type: string;
  description: string;
  actor_type?: string;
  actor_id?: number;
  metadata?: TimelineMetadata;
  created_at: string;
}

// ============================================================================
// WINERY REVIEW TYPES
// ============================================================================

export interface WineryReview {
  id: number;
  winery_id: number;
  booking_id?: number;
  customer_id?: number;
  rating: number;
  title?: string;
  review_text?: string;
  wine_quality_rating?: number;
  service_rating?: number;
  atmosphere_rating?: number;
  value_rating?: number;
  would_recommend: boolean;
  visit_date?: string;
  is_verified: boolean;
  is_approved: boolean;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CUSTOMER TASTING NOTE TYPES
// ============================================================================

export interface CustomerTastingNote {
  id: number;
  customer_id: number;
  winery_id: number;
  booking_id?: number;
  wine_name: string;
  wine_variety?: string;
  vintage?: number;
  rating?: number;
  notes?: string;
  purchased: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WINE PURCHASE TYPES
// ============================================================================

export type ShipmentStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface WinePurchase {
  id: number;
  customer_id: number;
  winery_id: number;
  booking_id?: number;
  purchase_date: string;
  items: WinePurchaseItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  commission_amount?: number;
  commission_paid: boolean;
  shipment_status: ShipmentStatus;
  tracking_number?: string;
  shipped_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface BookingListResponse {
  bookings: BookingWithRelations[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BookingFilters {
  status?: BookingStatus | BookingStatus[];
  tour_date_from?: string;
  tour_date_to?: string;
  driver_id?: number;
  customer_email?: string;
  booking_number?: string;
  page?: number;
  limit?: number;
}

export interface BookingStats {
  total_bookings: number;
  pending_count: number;
  confirmed_count: number;
  in_progress_count: number;
  completed_count: number;
  cancelled_count: number;
  total_revenue: number;
  average_party_size: number;
  popular_wineries: Array<{
    winery_id: number;
    winery_name: string;
    visit_count: number;
  }>;
}
