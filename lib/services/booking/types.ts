/**
 * Booking Types & Interfaces
 *
 * @module lib/services/booking/types
 * @description Shared types for the booking service module
 */

import { z } from 'zod';
import { CreateCustomerData } from '../customer.service';

// ============================================================================
// Core Booking Types
// ============================================================================

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  party_size: number;
  status: BookingStatus;
  total_price: number;
  base_price: number;
  gratuity: number;
  taxes: number;
  deposit_amount: number;
  deposit_paid: boolean;
  final_payment_amount: number;
  final_payment_paid: boolean;
  pickup_location: string;
  dropoff_location: string;
  special_requests?: string;
  dietary_restrictions?: string;
  accessibility_needs?: string;
  driver_id?: number;
  vehicle_id?: number;
  brand_id?: number;
  created_at: string;
  updated_at: string;
  // Optional fields for cancellation
  cancellation_reason?: string;
  cancelled_at?: Date | string;
}

export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Winery {
  winery_id: number;
  visit_order: number;
  name?: string;
  slug?: string;
}

// ============================================================================
// Create Data Types
// ============================================================================

export interface CreateFullBookingData {
  customer: CreateCustomerData;
  booking: {
    tour_date: string;
    start_time: string;
    duration_hours: number;
    party_size: number;
    pickup_location: string;
    dropoff_location?: string;
    special_requests?: string;
    dietary_restrictions?: string;
    accessibility_needs?: string;
    brand_id?: number;
  };
  wineries: Winery[];
  payment: {
    stripe_payment_method_id: string;
  };
  marketing_consent?: {
    email?: boolean;
    sms?: boolean;
  };
}

export interface CreateBookingData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  tourDate: string;
  startTime: string;
  durationHours: number;
  totalPrice: number;
  depositPaid: number;
  brandId?: number;
}

// ============================================================================
// Full Booking Details (comprehensive view)
// ============================================================================

export interface FullBookingDetails {
  booking_number: string;
  status: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    vip_status: boolean;
  };
  party_size: number;
  pickup_location: string;
  dropoff_location: string;
  special_requests: string | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  wineries: WineryVisit[];
  driver: { id: number; name: string; email: string; phone: string } | null;
  vehicle: { id: number; name: string; license_plate: string; type: string; capacity: number } | null;
  pricing: {
    base_price: number;
    gratuity: number;
    taxes: number;
    total: number;
    deposit_paid: number;
    deposit_paid_at: string | null;
    balance_due: number;
    balance_due_date: string;
    balance_paid: boolean;
    balance_paid_at: string | null;
  };
  payments: PaymentRecord[];
  timeline: TimelineEvent[];
  permissions: {
    can_modify: boolean;
    can_cancel: boolean;
    cancellation_deadline: string;
  };
  cancellation: { cancelled_at: string; reason: string } | null;
  created_at: string;
  completed_at: string | null;
}

export interface WineryVisit {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  specialties: string | null;
  tasting_fee: number | null;
  address: string;
  city: string;
  phone: string | null;
  website: string | null;
  photos: string[] | null;
  amenities: string[] | null;
  average_rating: number | null;
  visit_order: number;
  scheduled_arrival: string | null;
  scheduled_departure: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  notes: string | null;
}

export interface PaymentRecord {
  id: number;
  amount: number;
  payment_type: string;
  payment_method: string;
  status: string;
  stripe_payment_intent_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  created_at: string;
  succeeded_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

export interface TimelineEvent {
  id: number;
  event_type: string;
  description: string;
  data: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Query Result Types (for proper typing of DB results)
// ============================================================================

export interface WineryQueryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  specialties: string | null;
  tasting_fee: string | null;
  address: string;
  city: string;
  phone: string | null;
  website: string | null;
  photos: string[] | null;
  amenities: string[] | null;
  average_rating: string | null;
  visit_order: number;
  scheduled_arrival: string | null;
  scheduled_departure: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  notes: string | null;
}

export interface PaymentQueryRow {
  id: number;
  amount: string;
  payment_type: string;
  payment_method: string;
  status: string;
  stripe_payment_intent_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  created_at: string;
  succeeded_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

export interface BookingQueryRow {
  id: number;
  booking_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: string;
  party_size: number;
  status: string;
  total_price: string;
  base_price: string;
  gratuity: string;
  taxes: string;
  deposit_amount: string;
  deposit_paid_at: string | null;
  final_payment_amount: string;
  final_payment_paid: boolean;
  final_payment_paid_at: string | null;
  pickup_location: string;
  dropoff_location: string;
  special_requests: string | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  driver_id: number | null;
  vehicle_id: number | null;
  brand_id: number | null;
  vip_status: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface BookingListFilters {
  year?: string;
  month?: string;
  status?: string;
  customer_id?: number;
  brand_id?: number;
  start_date?: string;
  end_date?: string;
  driver_id?: number;
  limit?: number;
  offset?: number;
}

export interface BookingQueryFilters {
  year?: string;
  month?: string;
  status?: string;
  customerId?: number;
  brandId?: number;
  includeWineries?: boolean;
  includeDriver?: boolean;
  includeVehicle?: boolean;
  limit?: number;
  offset?: number;
}

export interface AvailabilityCheckParams {
  date: string;
  startTime: string;
  durationHours: number;
  partySize: number;
  brandId?: number;
}

export interface AvailabilityResult {
  available: boolean;
  vehicleId: number | null;
  vehicleName: string | null;
  conflicts: string[];
  availableSlots: Array<{
    start: string;
    end: string;
    available: boolean;
    vehicle_id?: number;
    vehicle_name?: string;
  }>;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateBookingSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  partySize: z.number().int().min(1).max(50),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(4).max(24),
  totalPrice: z.number().min(0),
  depositPaid: z.number().min(0),
  brandId: z.number().int().positive().optional(),
});

// ============================================================================
// Status Transition Rules
// ============================================================================

export const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
