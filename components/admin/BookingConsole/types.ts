/**
 * Booking Console Types
 *
 * Shared interfaces for the internal booking console components.
 */

// ============================================================================
// Core State Types
// ============================================================================

export interface CustomerInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  can_text: boolean;
}

export interface TourDetails {
  date: string;
  start_time: string;
  duration_hours: number; // Flexible: 0 for flat-rate services, any number for hourly
  party_size: number;
  pickup_location: string;
  dropoff_location: string; // For airport transfers, different destinations, etc.
  special_requests: string;
  wine_preferences: string;
  tour_type: 'wine_tour' | 'private_transportation' | 'airport_transfer' | 'corporate' | 'dinner_service';
  how_did_you_hear: string;
  custom_price: number | null; // Override calculated pricing with negotiated price
}

export interface ConsoleState {
  customer: CustomerInfo;
  tour: TourDetails;
  selectedVehicles: number[];
  selectedDriver: number | null;
  availability: AvailabilityResult | null;
  pricing: PricingResult | null;
  isLoadingAvailability: boolean;
  isLoadingPricing: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// Availability Types
// ============================================================================

export interface AvailableVehicle {
  id: number;
  name: string;
  capacity: number;
  available: boolean;
  vehicle_type?: string;
}

export interface AvailableDriver {
  id: number;
  name: string;
  email: string;
  phone: string;
  available: boolean;
  hours_today?: number;
  hours_this_week?: number;
}

export interface AvailabilityResult {
  available: boolean;
  vehicles: AvailableVehicle[];
  drivers: AvailableDriver[];
  conflicts: string[];
  warnings: string[];
}

// ============================================================================
// Pricing Types
// ============================================================================

export interface PricingLineItem {
  label: string;
  amount: number;
  editable?: boolean;
  key?: string;
}

export interface PricingResult {
  breakdown: PricingLineItem[];
  subtotal: number;
  taxes: number;
  total: number;
  deposit: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AvailabilityCheckRequest {
  date: string;
  startTime: string;
  durationHours: number;
  partySize: number;
  brandId?: number;
}

export interface AvailabilityCheckResponse {
  success: boolean;
  data?: AvailabilityResult;
  error?: string;
}

export interface PricingCalculateRequest {
  date: string;
  duration_hours: number;
  party_size: number;
  vehicle_ids?: number[];
  custom_discount?: number;
}

export interface PricingCalculateResponse {
  success: boolean;
  data?: PricingResult;
  error?: string;
}

export type SaveMode = 'draft' | 'create' | 'create_and_invoice';

export interface CreateConsoleBookingRequest {
  saveMode: SaveMode;
  customer: CustomerInfo;
  tour: TourDetails;
  vehicles: number[];
  driver_id?: number;
  pricing: {
    total_price: number;
    deposit_amount: number;
    breakdown: PricingLineItem[];
    custom_discount?: number;
  };
}

export interface CreateConsoleBookingResponse {
  success: boolean;
  data?: {
    booking: {
      id: number;
      booking_number: string;
      status: string;
    };
    invoice_sent?: boolean;
  };
  error?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface CustomerPanelProps {
  customer: CustomerInfo;
  tour: TourDetails;
  errors: Record<string, string>;
  onCustomerChange: (updates: Partial<CustomerInfo>) => void;
  onTourChange: (updates: Partial<TourDetails>) => void;
}

export interface AvailabilityPanelProps {
  availability: AvailabilityResult | null;
  isLoading: boolean;
  tour: TourDetails;
}

export interface PricingCalculatorProps {
  pricing: PricingResult | null;
  isLoading: boolean;
  customDiscount: number;
  onCustomDiscountChange: (discount: number) => void;
  onLineItemOverride?: (key: string, amount: number) => void;
  customPriceOverride: number | null;
}

export interface VehicleSelectorProps {
  vehicles: AvailableVehicle[];
  selectedVehicles: number[];
  partySize: number;
  onSelectionChange: (vehicleIds: number[]) => void;
}

export interface DriverSelectorProps {
  drivers: AvailableDriver[];
  selectedDriver: number | null;
  onSelectionChange: (driverId: number | null) => void;
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateCustomer(customer: CustomerInfo): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!customer.first_name.trim()) {
    errors.first_name = 'First name is required';
  }
  if (!customer.last_name.trim()) {
    errors.last_name = 'Last name is required';
  }
  if (!customer.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    errors.email = 'Invalid email format';
  }
  if (!customer.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (customer.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Phone number must be at least 10 digits';
  }

  return errors;
}

export function validateTour(tour: TourDetails): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!tour.date) {
    errors.date = 'Tour date is required';
  } else {
    const tourDate = new Date(tour.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tourDate < today) {
      errors.date = 'Tour date cannot be in the past';
    }
  }

  if (!tour.start_time) {
    errors.start_time = 'Start time is required';
  }

  if (tour.party_size < 1) {
    errors.party_size = 'Party size must be at least 1';
  } else if (tour.party_size > 50) {
    errors.party_size = 'Party size cannot exceed 50';
  }

  if (!tour.pickup_location.trim()) {
    errors.pickup_location = 'Pickup location is required';
  }

  return errors;
}

export function calculateTotalCapacity(
  vehicles: AvailableVehicle[],
  selectedIds: number[]
): number {
  return vehicles
    .filter(v => selectedIds.includes(v.id))
    .reduce((sum, v) => sum + v.capacity, 0);
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_CUSTOMER: CustomerInfo = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  can_text: false,
};

export const DEFAULT_TOUR: TourDetails = {
  date: '',
  start_time: '10:00',
  duration_hours: 6,
  party_size: 2,
  pickup_location: '',
  dropoff_location: '',
  special_requests: '',
  wine_preferences: '',
  tour_type: 'wine_tour',
  how_did_you_hear: '',
  custom_price: null,
};

export const REFERRAL_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'google', label: 'Google Search' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'friend', label: 'Friend/Family Referral' },
  { value: 'hotel', label: 'Hotel Concierge' },
  { value: 'winery', label: 'Winery Recommendation' },
  { value: 'repeat', label: 'Repeat Customer' },
  { value: 'other', label: 'Other' },
];

export const TOUR_TYPE_OPTIONS = [
  { value: 'wine_tour', label: 'Wine Tour' },
  { value: 'private_transportation', label: 'Private Transportation' },
  { value: 'airport_transfer', label: 'Airport Transfer' },
  { value: 'dinner_service', label: 'Dinner Service' },
  { value: 'corporate', label: 'Corporate Event' },
];
