/**
 * Trip Estimate Types
 *
 * @module lib/types/trip-estimate
 * @description Type definitions for the Quick Tally / Trip Estimate system.
 * Supports lightweight cost estimation before building a full trip proposal.
 */

import { z } from 'zod';
import { TRIP_TYPES, type TripType } from './trip-proposal';

// ============================================================================
// Enums & Constants
// ============================================================================

export const TRIP_ESTIMATE_STATUS = [
  'draft',
  'sent',
  'viewed',
  'deposit_paid',
  'proposal_created',
] as const;

export type TripEstimateStatus = (typeof TRIP_ESTIMATE_STATUS)[number];

export const ESTIMATE_ITEM_CATEGORIES = [
  'transportation',
  'airport_transfer',
  'tasting_fees',
  'dining',
  'lunch_catering',
  'hotel',
  'planning_fee',
  'misc',
] as const;

export type EstimateItemCategory = (typeof ESTIMATE_ITEM_CATEGORIES)[number];

/** Human-readable labels for item categories */
export const CATEGORY_LABELS: Record<EstimateItemCategory, string> = {
  transportation: 'Transportation',
  airport_transfer: 'Airport Transfer',
  tasting_fees: 'Tasting Fees',
  dining: 'Dining',
  lunch_catering: 'Lunch & Catering',
  hotel: 'Hotel',
  planning_fee: 'Planning Fee',
  misc: 'Miscellaneous',
};

/** Default unit labels per category */
export const CATEGORY_DEFAULT_UNITS: Record<EstimateItemCategory, string> = {
  transportation: 'days',
  airport_transfer: 'trips',
  tasting_fees: 'people',
  dining: 'reservations',
  lunch_catering: 'days',
  hotel: 'nights',
  planning_fee: 'flat',
  misc: 'each',
};

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Trip Estimate - Main entity
 */
export interface TripEstimate {
  id: number;
  estimate_number: string;
  status: TripEstimateStatus;

  // Customer info
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;

  // Trip details
  trip_type: TripType;
  trip_title: string | null;
  trip_description: string | null;
  start_date: string | null;
  end_date: string | null;
  party_size: number;

  // Pricing
  subtotal: number;
  deposit_amount: number;
  deposit_reason: string | null;

  // Deposit payment
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  payment_intent_id: string | null;

  // Link to full proposal
  trip_proposal_id: number | null;

  // Validity
  valid_until: string | null;

  // Branding & ownership
  brand_id: number | null;
  created_by: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations (when included)
  items?: TripEstimateItem[];
}

/**
 * Trip Estimate Item - Line item
 */
export interface TripEstimateItem {
  id: number;
  trip_estimate_id: number;
  category: EstimateItemCategory;
  description: string | null;
  quantity: number;
  unit_label: string | null;
  unit_price: number;
  total_price: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Trip Estimate with all related data
 */
export interface TripEstimateFull extends TripEstimate {
  items: TripEstimateItem[];
}

// ============================================================================
// Create/Update DTOs
// ============================================================================

export interface CreateTripEstimateInput {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  trip_type?: TripType;
  trip_title?: string;
  trip_description?: string;
  start_date?: string;
  end_date?: string;
  party_size?: number;
  deposit_amount?: number;
  deposit_reason?: string;
  valid_until?: string;
  brand_id?: number;
  items?: CreateTripEstimateItemInput[];
}

export interface UpdateTripEstimateInput {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  trip_type?: TripType;
  trip_title?: string;
  trip_description?: string;
  start_date?: string;
  end_date?: string;
  party_size?: number;
  deposit_amount?: number;
  deposit_reason?: string;
  valid_until?: string;
  brand_id?: number | null;
  items?: CreateTripEstimateItemInput[];
}

export interface CreateTripEstimateItemInput {
  category: EstimateItemCategory;
  description?: string;
  quantity?: number;
  unit_label?: string;
  unit_price?: number;
  total_price?: number;
  notes?: string;
  sort_order?: number;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateTripEstimateItemSchema = z.object({
  category: z.enum(ESTIMATE_ITEM_CATEGORIES),
  description: z.string().max(1000).optional().or(z.literal('')),
  quantity: z.number().min(0).optional().default(1),
  unit_label: z.string().max(50).optional().or(z.literal('')),
  unit_price: z.number().min(0).optional().default(0),
  total_price: z.number().min(0).optional(),
  notes: z.string().max(1000).optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
});

export const CreateTripEstimateSchema = z.object({
  customer_name: z.string().min(1).max(255),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().max(50).optional().or(z.literal('')),
  trip_type: z.enum(TRIP_TYPES).optional().default('wine_tour'),
  trip_title: z.string().max(255).optional().or(z.literal('')),
  trip_description: z.string().max(5000).optional().or(z.literal('')),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  party_size: z.number().int().min(1).max(100).optional().default(2),
  deposit_amount: z.number().min(0).optional().default(0),
  deposit_reason: z.string().max(1000).optional().or(z.literal('')),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  brand_id: z.number().int().positive().optional(),
  items: z.array(CreateTripEstimateItemSchema).optional(),
});

export const UpdateTripEstimateSchema = z.object({
  customer_name: z.string().min(1).max(255).optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().max(50).optional().or(z.literal('')),
  trip_type: z.enum(TRIP_TYPES).optional(),
  trip_title: z.string().max(255).optional().or(z.literal('')),
  trip_description: z.string().max(5000).optional().or(z.literal('')),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  party_size: z.number().int().min(1).max(100).optional(),
  deposit_amount: z.number().min(0).optional(),
  deposit_reason: z.string().max(1000).optional().or(z.literal('')),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  brand_id: z.number().int().positive().optional().nullable(),
  items: z.array(CreateTripEstimateItemSchema).optional(),
});

// ============================================================================
// API Response Types
// ============================================================================

export interface TripEstimateListResponse {
  estimates: TripEstimate[];
  total: number;
  limit: number;
  offset: number;
}

// Re-export TripType for convenience
export type { TripType };
