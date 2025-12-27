/**
 * Multi-Entity Billing System Types
 * Supports NW Touring & Concierge, Walla Walla Travel, and future entities
 */

// ============================================================================
// SERVICE ENTITIES
// ============================================================================

export interface ServiceEntity {
  id: string;
  code: string;  // 'nw_touring', 'walla_walla_travel'
  legal_name: string;
  display_name: string;
  dba_names?: string[];  // ['Herding Cats Wine Tours']

  // Business details
  entity_type?: 'llc' | 'sole_prop' | 'corporation';
  state_of_formation?: string;  // 'OR', 'WA'
  ein?: string;

  // Regulatory (transportation providers)
  usdot_number?: string;
  mc_number?: string;
  insurance_policy_number?: string;
  insurance_minimum?: number;
  insurance_expiry?: string;

  // Payment processing
  payment_processor?: 'stripe' | 'square';
  stripe_account_id?: string;
  square_merchant_id?: string;

  // Branding
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;

  // Contact
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;

  // Tax
  tax_rate?: number;

  // Policies
  terms_version?: string;
  terms_updated_at?: string;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export type ServiceCategory = 'transportation' | 'planning' | 'accommodation' | 'activity';
export type PricingType = 'hourly' | 'flat' | 'per_person';
export type CommissionType = 'percentage' | 'flat' | 'none';

export interface ServiceType {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: ServiceCategory;

  // Default entity
  default_entity_id?: string;
  default_entity?: ServiceEntity;

  // Default pricing
  default_pricing_type: PricingType;
  default_rate?: number;
  minimum_hours?: number;

  // Default commission
  default_commission_type: CommissionType;
  default_commission_rate?: number;
  default_commission_flat?: number;

  // Policy requirements
  requires_transportation_liability: boolean;
  requires_waiver_signature: boolean;
  requires_alcohol_acknowledgment: boolean;

  // Display
  icon?: string;
  display_order: number;

  is_active: boolean;
}

// ============================================================================
// BOOKING SOURCES
// ============================================================================

export interface BookingSource {
  id: string;
  code: string;
  name: string;
  description?: string;

  // Owner
  owner_entity_id?: string;
  owner_entity?: ServiceEntity;

  // Commission
  commission_type: CommissionType;
  commission_rate?: number;
  commission_flat?: number;

  // Tracking
  utm_source?: string;
  utm_medium?: string;

  is_active: boolean;
}

// ============================================================================
// COMMISSION RATES
// ============================================================================

export interface CommissionRate {
  id: string;
  booking_source_id?: string;
  service_type_id?: string;
  provider_entity_id?: string;

  commission_type: CommissionType;
  commission_rate?: number;
  commission_flat?: number;

  notes?: string;
  effective_from: string;
  effective_until?: string;

  is_active: boolean;
}

export interface CalculatedCommission {
  commission_type: CommissionType;
  commission_rate?: number;
  commission_amount: number;
}

// ============================================================================
// BOOKING LINE ITEMS
// ============================================================================

export interface BookingLineItem {
  id: string;
  booking_id: number;

  // Service
  service_type_id?: string;
  service_type?: ServiceType;
  description: string;

  // Provider
  provider_entity_id: string;
  provider_entity?: ServiceEntity;
  brand_name?: string;

  // Details
  service_date?: string;
  duration_hours?: number;
  party_size?: number;

  // Pricing
  pricing_type?: PricingType;
  unit_price: number;
  quantity: number;
  subtotal: number;
  tax_rate?: number;
  tax_amount: number;
  total: number;

  // Payment routing
  payment_destination?: string;

  // Status
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';

  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMMISSION LEDGER
// ============================================================================

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled';

export interface CommissionLedgerEntry {
  id: string;
  booking_id?: number;
  line_item_id?: string;

  // Entities
  payer_entity_id: string;
  payer_entity?: ServiceEntity;
  payee_entity_id: string;
  payee_entity?: ServiceEntity;

  // Source
  booking_source_id?: string;
  booking_source?: BookingSource;

  // Amounts
  booking_amount: number;
  commission_type: CommissionType;
  commission_rate?: number;
  commission_amount: number;

  // Status
  status: CommissionStatus;

  // Approval
  approved_at?: string;
  approved_by?: number;

  // Payment
  paid_at?: string;
  payment_method?: 'bank_transfer' | 'check' | 'stripe' | 'internal';
  payment_reference?: string;
  payment_notes?: string;

  // Dispute
  disputed_at?: string;
  dispute_reason?: string;
  dispute_resolved_at?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// VEHICLE INCIDENTS
// ============================================================================

export type IncidentType = 'cleaning' | 'damage' | 'smoking' | 'vomit' | 'illegal_activity' | 'minor_damage' | 'major_damage';
export type ChargeStatus = 'pending' | 'charged' | 'paid' | 'disputed' | 'waived';

export interface VehicleIncident {
  id: string;
  booking_id?: number;
  vehicle_id?: number;
  driver_id?: number;

  incident_type: IncidentType;
  incident_date: string;
  description: string;
  location?: string;

  // Charges
  base_fee: number;
  additional_charges: number;
  total_charge: number;

  // Documentation
  photos?: string[];

  // Customer notification
  customer_notified_at?: string;
  customer_acknowledged_at?: string;

  // Payment
  charge_status: ChargeStatus;
  charged_at?: string;
  payment_id?: string;

  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentFeeSchedule {
  id: string;
  entity_id: string;
  incident_type: IncidentType;
  description?: string;
  base_fee: number;
  is_active: boolean;
}

// ============================================================================
// ENTITY CONSTANTS
// ============================================================================

export const ENTITY_CODES = {
  NW_TOURING: 'nw_touring',
  WALLA_WALLA_TRAVEL: 'walla_walla_travel',
} as const;

export const BOOKING_SOURCE_CODES = {
  WWT_WEBSITE: 'wwt_website',
  WWT_CHATGPT: 'wwt_chatgpt',
  WWT_PHONE: 'wwt_phone',
  WWT_PROPOSAL: 'wwt_proposal',
  NWT_DIRECT: 'nwt_direct',
  NWT_PHONE: 'nwt_phone',
  HERDING_CATS: 'herding_cats',
  REFERRAL: 'referral',
} as const;

export const SERVICE_TYPE_CODES = {
  WINE_TOUR: 'wine_tour',
  AIRPORT_TRANSFER: 'airport_transfer',
  CHARTER: 'charter',
  SHARED_TOUR: 'shared_tour',
  TRIP_PLANNING: 'trip_planning',
  CONCIERGE: 'concierge',
} as const;

// ============================================================================
// SUMMARY TYPES FOR REPORTING
// ============================================================================

export interface CommissionSummary {
  period: string;
  payer_entity: string;
  payee_entity: string;
  booking_source?: string;
  status: CommissionStatus;
  transaction_count: number;
  total_booking_amount: number;
  total_commission: number;
}

export interface EntityRevenueSummary {
  entity_code: string;
  entity_name: string;
  period: string;
  service_type?: string;
  booking_count: number;
  gross_revenue: number;
  tax_collected: number;
  total_revenue: number;
  commissions_paid: number;
}
