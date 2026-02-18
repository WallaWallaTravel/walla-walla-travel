/**
 * Proposal Utilities
 * Shared functions for proposal management
 */

import { Pool } from 'pg';
import { generateSecureString } from '@/lib/utils';

// Module-specific types
export interface CorporateDetails {
  company_name?: string;
  company_logo?: string;
  contact_person?: string;
  po_number?: string;
  billing_address?: string;
}

export interface MultiDayItineraryItem {
  day: number;
  date: string;
  title: string;
  activities: string[];
  accommodation?: string;
  meals?: string[];
}

export interface B2BDetails {
  partner_company?: string;
  contract_id?: string;
  commission_rate?: number;
  payment_terms?: string;
  referral_source?: string;
}

export interface SpecialEventDetails {
  event_type?: string;
  occasion?: string;
  special_requests?: string;
  vip_needs?: string[];
}

export interface GroupCoordinationDetails {
  attendees?: Array<{
    name: string;
    email: string;
    dietary_restrictions?: string;
  }>;
  special_needs?: string[];
}

export interface ProposalActivityMetadata {
  viewed_at?: string;
  sent_at?: string;
  method?: string;
  sent_to_email?: string;
  sent_to_phone?: string;
  custom_message?: string | null;
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  converted_at?: string;
  booking_id?: number;
  changes?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ServiceItem {
  id: string;
  service_type: 'wine_tour' | 'airport_transfer' | 'local_transfer' | 'wait_time' | 'custom';
  name: string;
  description: string;
  date: string;
  start_time: string;
  party_size: number;
  
  // Wine tour specific
  duration_hours?: 4 | 6 | 8;
  selected_wineries?: Array<{
    id: number;
    name: string;
    city: string;
    display_order: number;
    estimated_time?: string;
  }>;
  
  // Transfer specific
  transfer_type?: 'seatac_to_walla' | 'walla_to_seatac' | 'pasco_to_walla' | 'walla_to_pasco' | 'local';
  pickup_location?: string;
  dropoff_location?: string;
  miles?: number;
  
  // Wait time specific
  wait_hours?: number;
  
  // Pricing
  pricing_type: 'calculated' | 'hourly' | 'flat';
  hourly_rate?: number;
  flat_rate?: number;
  calculated_price: number;
}

export interface ProposalData {
  // Brand Selection
  brand_id?: number | null;

  // Client Information
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company?: string;
  
  // Editable Text Fields
  proposal_title: string;
  introduction: string;
  wine_tour_description?: string;
  transfer_description?: string;
  wait_time_description?: string;
  special_notes?: string;
  cancellation_policy?: string;
  footer_notes?: string;
  
  // Service Items
  service_items: ServiceItem[];
  
  // Additional Services (e.g., lunch coordination, photography)
  additional_services?: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
  
  // Optional Services
  lunch_coordination?: boolean;
  lunch_coordination_count?: number;
  photography_package?: boolean;
  
  // Discount
  discount_percentage: number;
  discount_reason?: string;
  
  // Gratuity
  include_gratuity_request: boolean;
  suggested_gratuity_percentage: number;
  gratuity_optional: boolean;
  
  // Pricing
  subtotal: number;
  discount_amount: number;
  total: number;
  
  // Proposal Details
  valid_until: string;
  
  // Modules (optional)
  modules?: {
    corporate?: boolean;
    multi_day?: boolean;
    b2b?: boolean;
    special_event?: boolean;
    group_coordination?: boolean;
  };
  corporate_details?: CorporateDetails;
  multi_day_itinerary?: MultiDayItineraryItem[];
  b2b_details?: B2BDetails;
  special_event_details?: SpecialEventDetails;
  group_coordination?: GroupCoordinationDetails;
}

export interface Proposal extends ProposalData {
  id: number;
  proposal_number: string;
  uuid: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'converted';
  created_at: string;
  updated_at: string;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  view_count: number;
}

/**
 * Generate unique proposal number
 */
export function generateProposalNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = generateSecureString(4, '0123456789');
  
  return `PROP-${year}${month}${day}-${random}`;
}

/**
 * Get default proposal text from template
 */
export async function getDefaultProposalText(pool: Pool, templateName: string = 'default') {
  const result = await pool.query(
    'SELECT * FROM proposal_text_templates WHERE template_name = $1',
    [templateName]
  );
  
  if (result.rows.length === 0) {
    // Return hardcoded defaults if no template found
    return {
      title: 'Walla Walla Wine Country Experience',
      introduction: 'Thank you for your interest in Walla Walla Travel! We are excited to create a memorable wine country experience for you and your guests.',
      wine_tour_description: 'Visit 3 premier wineries in the Walla Walla Valley. Your private guide will provide insights into the region\'s rich wine-making heritage while ensuring a comfortable and memorable experience.',
      transfer_description: 'Professional transportation service with experienced drivers and comfortable, well-maintained vehicles.',
      wait_time_description: 'Professional wait time service while you attend meetings, events, or other activities.',
      terms_and_conditions: 'A 50% deposit is required to confirm your booking. The remaining balance is due 48 hours after your tour concludes. Cancellations 45+ days before: 100% refund of deposit. Cancellations 21-44 days before: 50% refund of deposit. Cancellations within 21 days: No refund.',
      cancellation_policy: 'Cancellations 45+ days before: 100% refund of deposit. 21-44 days before: 50% refund of deposit. Within 21 days: No refund.',
      footer_notes: 'Looking forward to hosting you!'
    };
  }
  
  return result.rows[0];
}

/**
 * Calculate proposal totals
 */
export function calculateProposalTotals(data: Partial<ProposalData>) {
  const servicesSubtotal = (data.service_items || []).reduce(
    (sum, item) => sum + item.calculated_price,
    0
  );
  
  const subtotal = servicesSubtotal;
  const discountPercentage = data.discount_percentage || 0;
  const discountAmount = subtotal * (discountPercentage / 100);
  const afterDiscount = subtotal - discountAmount;
  
  // Tax rate from config
  const taxRate = 0.091; // 9.1%
  const taxAmount = afterDiscount * taxRate;
  
  const total = afterDiscount + taxAmount;
  
  // Deposit (50%)
  const depositAmount = total * 0.5;
  const balanceAmount = total - depositAmount;
  
  return {
    servicesSubtotal,
    subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    total,
    depositAmount,
    balanceAmount
  };
}

/**
 * Validate proposal data
 */
export function validateProposalData(data: Partial<ProposalData>): string[] {
  const errors: string[] = [];
  
  if (!data.client_name?.trim()) {
    errors.push('Client name is required');
  }
  
  if (!data.client_email?.trim()) {
    errors.push('Client email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.client_email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.client_phone?.trim()) {
    errors.push('Client phone is required');
  }
  
  if (!data.service_items || data.service_items.length === 0) {
    errors.push('At least one service item is required');
  }
  
  if (!data.valid_until) {
    errors.push('Valid until date is required');
  }
  
  // Validate service items
  data.service_items?.forEach((item, index) => {
    if (!item.date) {
      errors.push(`Service item ${index + 1}: Date is required`);
    }
    if (!item.party_size || item.party_size < 1) {
      errors.push(`Service item ${index + 1}: Party size must be at least 1`);
    }
    if (item.calculated_price < 0) {
      errors.push(`Service item ${index + 1}: Price cannot be negative`);
    }
  });
  
  return errors;
}

/**
 * Log proposal activity
 */
export async function logProposalActivity(
  pool: Pool,
  proposalId: number,
  activityType: string,
  description: string,
  metadata?: ProposalActivityMetadata
) {
  await pool.query(
    `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4)`,
    [proposalId, activityType, description, metadata ? JSON.stringify(metadata) : null]
  );
}

