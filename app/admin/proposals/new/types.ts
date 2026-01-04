/**
 * Proposal Form Types
 *
 * @module app/admin/proposals/new/types
 * @description Shared type definitions for the proposal creation system.
 * Extracted to enable component splitting and type reuse.
 */

/**
 * Service item in a proposal
 * Supports wine tours, transfers, wait time, and custom services
 */
export interface ServiceItem {
  id: string;
  service_type: 'wine_tour' | 'airport_transfer' | 'local_transfer' | 'regional_transfer' | 'wait_time' | 'custom';
  name: string;
  description: string;
  date: string;
  start_time: string;

  /** Party size per service */
  party_size: number;

  /** Wine tour specific - duration in hours */
  duration_hours?: number;

  /** Wine tour specific - selected wineries */
  selected_wineries?: Array<{
    id: number;
    name: string;
    city: string;
  }>;

  /** Pricing override configuration */
  pricing_override?: {
    enabled: boolean;
    pricing_mode?: 'hourly' | 'fixed';
    custom_hourly_rate?: number;
    custom_total: number;
    override_reason?: string;
  };

  /** Transfer specific - type of transfer */
  transfer_type?: 'seatac_to_walla' | 'walla_to_seatac' | 'pasco_to_walla' | 'walla_to_pasco' | 'local';
  pickup_location?: string;
  dropoff_location?: string;
  miles?: number;

  /** Wait time specific */
  wait_hours?: number;

  /** Pricing configuration */
  pricing_type: 'calculated' | 'hourly' | 'flat';
  hourly_rate?: number;
  flat_rate?: number;
  calculated_price: number;
}

/**
 * Complete proposal data structure
 */
export interface ProposalData {
  /** Client Information */
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string;

  /** Service Items */
  service_items: ServiceItem[];

  /** Additional Services */
  additional_services?: Array<{
    service_id: number;
    quantity: number;
  }>;

  /** Discount */
  discount_percentage: number;
  discount_reason: string;

  /** Gratuity */
  include_gratuity_request: boolean;
  suggested_gratuity_percentage: number;
  gratuity_optional: boolean;

  /** Proposal Details */
  proposal_title: string;
  introduction: string;
  special_notes: string;
  valid_until: string;
}

/**
 * Pricing strategy options
 */
export type PricingStrategy = 'conservative' | 'standard' | 'aggressive';

/**
 * Winery data from API
 */
export interface Winery {
  id: number;
  name: string;
  city: string;
  slug?: string;
}

/**
 * Additional service from API
 */
export interface AdditionalService {
  id: number;
  name: string;
  description: string;
  price: number;
  icon?: string;
  is_active: boolean;
}

/**
 * Price calculation result
 */
export interface PriceCalculation {
  servicesSubtotal: number;
  additionalServicesTotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  taxes: number;
  gratuityAmount: number;
  total: number;
  depositAmount: number;
}
