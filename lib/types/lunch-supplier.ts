/**
 * Lunch Supplier & Ordering Types
 *
 * @module lib/types/lunch-supplier
 * @description Type definitions for lunch suppliers, menus, menu items,
 * and per-proposal lunch orders.
 */

import { z } from 'zod';

// ============================================================================
// Enums & Constants
// ============================================================================

export const ORDER_METHODS = ['email', 'phone', 'api', 'portal'] as const;
export type OrderMethod = (typeof ORDER_METHODS)[number];

export const LUNCH_ORDER_STATUS = [
  'draft',
  'submitted',
  'sent_to_supplier',
  'confirmed',
  'cancelled',
] as const;
export type LunchOrderStatus = (typeof LUNCH_ORDER_STATUS)[number];

export const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'gf',
  'df',
  'nut_free',
  'halal',
  'kosher',
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

// ============================================================================
// Core Interfaces
// ============================================================================

export interface LunchSupplier {
  id: number;
  name: string;
  restaurant_id: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  order_method: OrderMethod;
  api_endpoint: string | null;
  api_credentials: Record<string, unknown>;
  default_cutoff_hours: number;
  large_group_cutoff_hours: number;
  large_group_threshold: number;
  closed_days: number[]; // 0=Sun..6=Sat
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LunchMenu {
  id: number;
  supplier_id: number;
  name: string;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;

  // Relations
  items?: LunchMenuItem[];
}

export interface LunchMenuItem {
  id: number;
  menu_id: number;
  category: string;
  name: string;
  description: string | null;
  price: number;
  dietary_tags: string[];
  is_available: boolean;
  sort_order: number;
}

export interface GuestOrderItem {
  item_id: number;
  name: string;
  qty: number;
  price?: number;
}

export interface GuestOrder {
  guest_name: string;
  items: GuestOrderItem[];
  notes?: string;
}

export interface ProposalLunchOrder {
  id: number;
  trip_proposal_id: number;
  trip_proposal_day_id: number | null;
  supplier_id: number;
  guest_orders: GuestOrder[];
  special_requests: string | null;
  subtotal: number;
  tax: number;
  total: number;
  cutoff_at: string | null;
  status: LunchOrderStatus;
  sent_to_supplier_at: string | null;
  supplier_confirmed_at: string | null;
  supplier_reference: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  supplier?: LunchSupplier;
  day?: { id: number; day_number: number; date: string; title: string | null };
}

// ============================================================================
// Create / Update DTOs
// ============================================================================

export interface CreateLunchSupplierInput {
  name: string;
  restaurant_id?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  order_method?: OrderMethod;
  api_endpoint?: string;
  default_cutoff_hours?: number;
  large_group_cutoff_hours?: number;
  large_group_threshold?: number;
  closed_days?: number[];
  notes?: string;
}

export interface CreateLunchMenuInput {
  name: string;
  valid_from?: string;
  valid_until?: string;
}

export interface CreateLunchMenuItemInput {
  category: string;
  name: string;
  description?: string;
  price: number;
  dietary_tags?: string[];
  sort_order?: number;
}

export interface SubmitLunchOrderInput {
  guest_orders: GuestOrder[];
  special_requests?: string;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateLunchSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  restaurant_id: z.number().int().positive().optional(),
  contact_name: z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  order_method: z.enum(ORDER_METHODS).optional().default('email'),
  api_endpoint: z.string().url().optional().or(z.literal('')),
  default_cutoff_hours: z.number().int().min(0).max(720).optional().default(48),
  large_group_cutoff_hours: z.number().int().min(0).max(720).optional().default(72),
  large_group_threshold: z.number().int().min(1).max(100).optional().default(8),
  closed_days: z.array(z.number().int().min(0).max(6)).optional().default([]),
  notes: z.string().optional(),
});

export const CreateLunchMenuSchema = z.object({
  name: z.string().min(1).max(255),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const CreateLunchMenuItemSchema = z.object({
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().min(0),
  dietary_tags: z.array(z.string().max(50)).optional().default([]),
  sort_order: z.number().int().min(0).optional().default(0),
});

const GuestOrderItemSchema = z.object({
  item_id: z.number().int().positive(),
  name: z.string().min(1),
  qty: z.number().int().min(1).max(10),
});

const GuestOrderSchema = z.object({
  guest_name: z.string().min(1).max(255),
  items: z.array(GuestOrderItemSchema).min(1),
  notes: z.string().max(500).optional(),
});

export const SubmitLunchOrderSchema = z.object({
  guest_orders: z.array(GuestOrderSchema).min(1),
  special_requests: z.string().max(1000).optional(),
});
