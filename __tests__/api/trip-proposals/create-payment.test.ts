/**
 * Unit Tests for POST /api/trip-proposals/[proposalNumber]/create-payment
 * @jest-environment node
 *
 * Tests the create-payment API route:
 *   - Returns 404 when proposal not found
 *   - Returns 400 when proposal not accepted
 *   - Returns 400 when deposit already paid
 *   - Creates Stripe PaymentIntent with correct metadata
 *   - Returns client_secret and amount
 *   - Handles Stripe error gracefully
 */

jest.mock('@/lib/services/trip-proposal.service', () => ({
  tripProposalService: {
    getByNumber: jest.fn(),
  },
}));

jest.mock('@/lib/stripe-brands', () => ({
  getBrandStripeClient: jest.fn(),
  getBrandStripePublishableKey: jest.fn().mockReturnValue('pk_test_abc123'),
}));

jest.mock('@/lib/email-brands', () => ({
  getBrandEmailConfig: jest.fn().mockReturnValue({
    name: 'Walla Walla Travel',
    from_email: 'info@wallawalla.travel',
    reply_to: 'info@wallawalla.travel',
    phone: '(509) 200-8000',
    website: 'wallawalla.travel',
    primary_color: '#1e40af',
    secondary_color: '#3b82f6',
    tagline: 'Wine Country Experiences',
    closing: 'Cheers',
    signature: 'The Walla Walla Travel Team',
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  generateSecureString: jest.fn().mockReturnValue('abc123xyz'),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
      _data: data,
    })),
  },
  after: jest.fn((fn: () => void) => fn()),
}));

const mockGetByNumber = require('@/lib/services/trip-proposal.service').tripProposalService.getByNumber as jest.Mock;
const mockGetBrandStripeClient = require('@/lib/stripe-brands').getBrandStripeClient as jest.Mock;

import { POST } from '@/app/api/trip-proposals/[proposalNumber]/create-payment/route';

// ============================================================================
// Helpers
// ============================================================================

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    proposal_number: 'TP-20260001',
    status: 'accepted',
    customer_name: 'Jane Doe',
    customer_email: 'jane@example.com',
    trip_type: 'wine_tour',
    trip_title: 'Walla Walla Wine Weekend',
    start_date: '2026-06-15',
    end_date: '2026-06-17',
    party_size: 8,
    total: 2500,
    deposit_amount: 1250,
    deposit_paid: false,
    valid_until: '2026-07-15',
    brand_id: 1,
    ...overrides,
  };
}

function makeRequest(): { nextUrl: { pathname: string }; method: string; url: string; headers: { get: jest.Mock } } {
  return {
    nextUrl: { pathname: '/api/trip-proposals/TP-20260001/create-payment' },
    method: 'POST',
    url: 'http://localhost:3000/api/trip-proposals/TP-20260001/create-payment',
    headers: { get: jest.fn().mockReturnValue('test-user-agent') },
  };
}

function makeContext(proposalNumber = 'TP-20260001') {
  return {
    params: Promise.resolve({ proposalNumber }),
  };
}

function makeMockStripe() {
  return {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 125000,
      }),
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/trip-proposals/[proposalNumber]/create-payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetByNumber.mockReset();
    mockGetBrandStripeClient.mockReset();
  });

  it('should return 404 when proposal not found', async () => {
    mockGetByNumber.mockResolvedValue(null);

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('should return 400 when proposal not accepted', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal({ status: 'sent' }));

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('accepted');
  });

  it('should return 400 when deposit already paid', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal({ deposit_paid: true }));

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('already been paid');
  });

  it('should create Stripe PaymentIntent with correct metadata', async () => {
    const proposal = makeProposal();
    mockGetByNumber.mockResolvedValue(proposal);

    const mockStripe = makeMockStripe();
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    await POST(makeRequest() as any, makeContext());

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledTimes(1);

    const [createArgs, createOptions] = mockStripe.paymentIntents.create.mock.calls[0];

    // Correct amount in cents
    expect(createArgs.amount).toBe(125000);
    expect(createArgs.currency).toBe('usd');

    // Metadata
    expect(createArgs.metadata.payment_type).toBe('trip_proposal_deposit');
    expect(createArgs.metadata.trip_proposal_id).toBe('1');
    expect(createArgs.metadata.proposal_number).toBe('TP-20260001');
    expect(createArgs.metadata.customer_email).toBe('jane@example.com');

    // Idempotency key
    expect(createOptions.idempotencyKey).toBe('pi_tp_1_125000');
  });

  it('should return client_secret and amount on success', async () => {
    const proposal = makeProposal();
    mockGetByNumber.mockResolvedValue(proposal);

    const mockStripe = makeMockStripe();
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    const response = await POST(makeRequest() as any, makeContext());

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.client_secret).toBe('pi_test_123_secret_abc');
    expect(body.data.amount).toBe(1250);
    expect(body.data.publishable_key).toBe('pk_test_abc123');
    expect(body.data.payment_intent_id).toBe('pi_test_123');
  });

  it('should handle Stripe error gracefully', async () => {
    const proposal = makeProposal();
    mockGetByNumber.mockResolvedValue(proposal);

    const mockStripe = {
      paymentIntents: {
        create: jest.fn().mockRejectedValue(new Error('Stripe connection error')),
      },
    };
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    const response = await POST(makeRequest() as any, makeContext());

    // withErrorHandling should catch and return 500
    expect(response.status).toBe(500);
  });

  it('should return 400 when Stripe is not configured for brand', async () => {
    const proposal = makeProposal();
    mockGetByNumber.mockResolvedValue(proposal);
    mockGetBrandStripeClient.mockReturnValue(null);

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('Payment service not configured');
  });
});
