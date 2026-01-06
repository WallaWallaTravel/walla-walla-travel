/**
 * Test Data Factories
 * Generate realistic test data for testing
 */

import {
  generateRandomString,
  generateRandomEmail,
  generateRandomPhone,
  getNextWeekDate
} from './test-utils';

// Re-export utility functions for convenience
export { generateRandomEmail, generateRandomPhone, generateRandomString, getNextWeekDate } from './test-utils';

// Customer factory
export function createMockCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    email: generateRandomEmail(),
    name: `Test Customer ${generateRandomString(5)}`,
    phone: generateRandomPhone(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Booking factory
export function createMockBooking(overrides: Record<string, unknown> = {}) {
  const customerId = (overrides.customer_id as number) || Math.floor(Math.random() * 10000);
  const partySize = (overrides.party_size as number) || 6;
  
  return {
    id: Math.floor(Math.random() * 10000),
    booking_number: `WWT-2025-${Math.floor(100000 + Math.random() * 900000)}`,
    customer_id: customerId,
    customer_name: `Test Customer ${generateRandomString(5)}`,
    customer_email: generateRandomEmail(),
    customer_phone: generateRandomPhone(),
    party_size: partySize,
    tour_date: getNextWeekDate(),
    pickup_time: '10:00',
    pickup_location: '123 Main St, Walla Walla, WA',
    dropoff_location: '123 Main St, Walla Walla, WA',
    duration: 6.0,
    status: 'confirmed',
    total_price: 850.00,
    tax: 75.65,
    subtotal: 774.35,
    driver_id: null,
    vehicle_id: null,
    brand_id: 1,
    special_requests: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Booking with relations
export function createMockBookingWithRelations(overrides: Record<string, unknown> = {}) {
  const booking = createMockBooking(overrides);
  
  return {
    ...booking,
    wineries: [
      {
        id: 5,
        name: "L'Ecole No 41",
        tasting_fee: 25.00,
        slug: 'lecole-no-41',
      },
      {
        id: 12,
        name: 'Leonetti Cellar',
        tasting_fee: 30.00,
        slug: 'leonetti-cellar',
      },
    ],
    driver: booking.driver_id ? {
      id: booking.driver_id,
      name: 'Ryan Smith',
      phone: generateRandomPhone(),
    } : null,
    vehicle: booking.vehicle_id ? {
      id: booking.vehicle_id,
      make: 'Mercedes',
      model: 'Sprinter',
      type: 'Van',
      capacity: 14,
    } : null,
    customer: {
      id: booking.customer_id,
      email: booking.customer_email,
      name: booking.customer_name,
      phone: booking.customer_phone,
    },
  };
}

// Proposal factory
export function createMockProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    proposal_number: `PROP-2025-${Math.floor(100000 + Math.random() * 900000)}`,
    customer_id: Math.floor(Math.random() * 10000),
    customer_name: `Test Customer ${generateRandomString(5)}`,
    customer_email: generateRandomEmail(),
    customer_phone: generateRandomPhone(),
    proposal_date: new Date().toISOString().split('T')[0],
    valid_until: getNextWeekDate(),
    status: 'draft',
    subtotal: 1000.00,
    tax: 89.00,
    total: 1089.00,
    notes: null,
    internal_notes: null,
    brand_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Proposal with items
export function createMockProposalWithItems(overrides: Record<string, unknown> = {}) {
  const proposal = createMockProposal(overrides);
  
  return {
    ...proposal,
    items: [
      {
        id: Math.floor(Math.random() * 10000),
        proposal_id: proposal.id,
        description: 'Wine tour (6 hours, 8 guests)',
        quantity: 1,
        unit_price: 850.00,
        amount: 850.00,
        item_order: 1,
      },
      {
        id: Math.floor(Math.random() * 10000),
        proposal_id: proposal.id,
        description: 'Lunch at Saffron Mediterranean',
        quantity: 8,
        unit_price: 25.00,
        amount: 200.00,
        item_order: 2,
      },
    ],
  };
}

// Reservation factory
export function createMockReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    reservation_number: `RES-2025-${Math.floor(100000 + Math.random() * 900000)}`,
    customer_id: Math.floor(Math.random() * 10000),
    customer_name: `Test Customer ${generateRandomString(5)}`,
    customer_email: generateRandomEmail(),
    customer_phone: generateRandomPhone(),
    party_size: 6,
    preferred_date: getNextWeekDate(),
    alternate_date: null,
    event_type: null,
    special_requests: null,
    deposit_amount: 250.00,
    deposit_paid: true,
    payment_method: 'card',
    status: 'pending',
    consultation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    brand_id: 1,
    booking_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Payment factory
export function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    booking_id: (overrides.booking_id as number) || Math.floor(Math.random() * 10000),
    reservation_id: (overrides.reservation_id as number | null) || null,
    customer_id: Math.floor(Math.random() * 10000),
    amount: 250.00,
    payment_method: 'card',
    payment_status: 'completed',
    stripe_payment_intent_id: `pi_test_${generateRandomString(20)}`,
    transaction_date: new Date().toISOString(),
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Winery factory
export function createMockWinery(overrides: Record<string, unknown> = {}) {
  const name = (overrides.name as string) || `Test Winery ${generateRandomString(5)}`;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  
  return {
    id: Math.floor(Math.random() * 10000),
    name,
    slug,
    tasting_fee: 25.00,
    address: '123 Wine St, Walla Walla, WA 99362',
    phone: generateRandomPhone(),
    website: `https://${slug}.com`,
    is_active: true,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Restaurant factory
export function createMockRestaurant(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    name: `Test Restaurant ${generateRandomString(5)}`,
    cuisine_type: 'Mediterranean',
    phone: generateRandomPhone(),
    email: generateRandomEmail(),
    accepts_pre_orders: true,
    minimum_order_value: 15.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// API request factory
export function createMockBookingRequest(overrides: Record<string, unknown> = {}) {
  return {
    customerName: `Test Customer ${generateRandomString(5)}`,
    customerEmail: generateRandomEmail(),
    customerPhone: generateRandomPhone(),
    partySize: 6,
    tourDate: getNextWeekDate(),
    pickupTime: '10:00',
    pickupLocation: '123 Main St, Walla Walla, WA',
    dropoffLocation: '123 Main St, Walla Walla, WA',
    duration: 6.0,
    wineryIds: [5, 12, 23],
    lunchRestaurantId: 3,
    specialRequests: null,
    brandId: 1,
    ...overrides,
  };
}

export function createMockProposalRequest(overrides: Record<string, unknown> = {}) {
  return {
    customerName: `Test Customer ${generateRandomString(5)}`,
    customerEmail: generateRandomEmail(),
    customerPhone: generateRandomPhone(),
    proposalDate: new Date().toISOString().split('T')[0],
    validUntil: getNextWeekDate(),
    items: [
      {
        description: 'Wine tour (6 hours)',
        quantity: 1,
        unitPrice: 850.00,
        amount: 850.00,
      },
    ],
    notes: null,
    brandId: 1,
    ...overrides,
  };
}

export function createMockReservationRequest(overrides: Record<string, unknown> = {}) {
  return {
    customerName: `Test Customer ${generateRandomString(5)}`,
    customerEmail: generateRandomEmail(),
    customerPhone: generateRandomPhone(),
    partySize: 6,
    preferredDate: getNextWeekDate(),
    alternateDate: null,
    eventType: null,
    specialRequests: null,
    depositAmount: 250.00,
    paymentMethod: 'card',
    stripePaymentIntentId: null,
    brandId: 1,
    ...overrides,
  };
}

// ============================================================================
// Payment & Pricing Factories (Phase 1)
// ============================================================================

// Stripe payment intent factory
export function createMockPaymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: `pi_test_${generateRandomString(20)}`,
    object: 'payment_intent',
    amount: 15000,
    currency: 'usd',
    status: 'succeeded',
    client_secret: `pi_test_${generateRandomString(20)}_secret_test`,
    created: Math.floor(Date.now() / 1000),
    metadata: {},
    ...overrides,
  };
}

// Pricing rule factory (for database mocks)
export function createMockPricingRule(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    vehicle_type: 'sprinter',
    duration_hours: 6,
    base_price: '800.00',
    weekend_multiplier: '1.20',
    is_active: true,
    priority: 1,
    is_weekend: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Pricing result factory
export function createMockPricingDetails(overrides: Record<string, unknown> = {}) {
  const basePrice = (overrides.basePrice as number) || 800;
  const gratuity = basePrice * 0.15;
  const taxes = basePrice * 0.09;
  const totalPrice = basePrice + gratuity + taxes;
  const depositAmount = totalPrice * 0.5;
  const finalPaymentAmount = totalPrice - depositAmount;

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    gratuity: Math.round(gratuity * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    depositAmount: Math.round(depositAmount * 100) / 100,
    finalPaymentAmount: Math.round(finalPaymentAmount * 100) / 100,
    vehicleType: 'sprinter' as const,
    ...overrides,
  };
}

// ============================================================================
// Vehicle & Availability Factories (Phase 2)
// ============================================================================

// Vehicle factory
export function createMockVehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    name: `Vehicle ${generateRandomString(5)}`,
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2024,
    license_plate: `WA-${generateRandomString(6).toUpperCase()}`,
    capacity: 14,
    vehicle_type: 'sprinter',
    status: 'available',
    brand_id: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Availability block factory
export function createMockAvailabilityBlock(overrides: Record<string, unknown> = {}) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 6 * 60 * 60 * 1000);

  return {
    id: Math.floor(Math.random() * 10000),
    vehicle_id: Math.floor(Math.random() * 10000),
    booking_id: null,
    block_type: 'booking',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    reason: null,
    hold_expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Availability check result factory
export function createMockAvailabilityResult(overrides: Record<string, unknown> = {}) {
  return {
    available: true,
    vehicle_id: Math.floor(Math.random() * 10000),
    vehicle_name: 'Mercedes Sprinter',
    conflicts: [],
    ...overrides,
  };
}

// ============================================================================
// Auth & User Factories (Phase 3)
// ============================================================================

// User factory
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    email: generateRandomEmail(),
    name: `Test User ${generateRandomString(5)}`,
    password_hash: '$2b$10$testhashedpassword',
    role: 'admin',
    is_active: true,
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Session factory
export function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    userId: Math.floor(Math.random() * 10000).toString(),
    email: generateRandomEmail(),
    name: `Test User ${generateRandomString(5)}`,
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}



// Factory smoke tests - ensure factories are properly exported
describe('Test Factories', () => {
  it('should export createMockCustomer', () => {
    expect(typeof require('./factories').createMockCustomer).toBe('function');
  });

  it('should export createMockBooking', () => {
    expect(typeof require('./factories').createMockBooking).toBe('function');
  });

  it('should export createMockProposal', () => {
    expect(typeof require('./factories').createMockProposal).toBe('function');
  });
});
