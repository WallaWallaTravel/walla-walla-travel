/**
 * Integration Tests: Trip Proposal Payment Flow
 * @jest-environment node
 *
 * Tests the full payment lifecycle with mocked DB/Stripe:
 *   - Proposal in accepted state -> create payment intent -> confirm payment -> verify deposit_paid = true
 *   - Idempotency: confirm same payment twice -> only one DB update
 *
 * These tests validate the end-to-end contract between the create-payment
 * and confirm-payment routes without hitting real infrastructure.
 */

// ============================================================================
// Mocks
// ============================================================================

jest.mock('@/lib/services/trip-proposal.service', () => ({
  tripProposalService: {
    getByNumber: jest.fn(),
  },
}));

jest.mock('@/lib/services/trip-proposal-email.service', () => ({
  tripProposalEmailService: {
    sendDepositReceivedEmail: jest.fn().mockResolvedValue(undefined),
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

jest.mock('@/lib/db-helpers', () => {
  const _mockClientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  return {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    queryOne: jest.fn().mockResolvedValue(null),
    withTransaction: jest.fn(async (callback: (client: { query: jest.Mock }) => Promise<unknown>) => {
      const client = { query: _mockClientQuery };
      return await callback(client);
    }),
    __mockClientQuery: _mockClientQuery,
  };
});

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
const mockWithTransaction = require('@/lib/db-helpers').withTransaction as jest.Mock;
const mockSendDepositReceivedEmail = require('@/lib/services/trip-proposal-email.service').tripProposalEmailService.sendDepositReceivedEmail as jest.Mock;

import { POST as createPayment } from '@/app/api/trip-proposals/[proposalNumber]/create-payment/route';
import { POST as confirmPayment } from '@/app/api/trip-proposals/[proposalNumber]/confirm-payment/route';

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
    deposit_paid_at: null,
    valid_until: '2026-07-15',
    brand_id: 1,
    ...overrides,
  };
}

function makeCreatePaymentRequest() {
  return {
    nextUrl: { pathname: '/api/trip-proposals/TP-20260001/create-payment' },
    method: 'POST',
    url: 'http://localhost:3000/api/trip-proposals/TP-20260001/create-payment',
    headers: { get: jest.fn().mockReturnValue('test-user-agent') },
  };
}

function makeConfirmPaymentRequest(paymentIntentId = 'pi_test_123') {
  return {
    json: jest.fn().mockResolvedValue({ payment_intent_id: paymentIntentId }),
    nextUrl: { pathname: '/api/trip-proposals/TP-20260001/confirm-payment' },
    method: 'POST',
    url: 'http://localhost:3000/api/trip-proposals/TP-20260001/confirm-payment',
    headers: { get: jest.fn().mockReturnValue('test-user-agent') },
  };
}

function makeContext() {
  return {
    params: Promise.resolve({ proposalNumber: 'TP-20260001' }),
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
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 125000,
        metadata: {
          payment_type: 'trip_proposal_deposit',
          trip_proposal_id: '1',
          proposal_number: 'TP-20260001',
        },
      }),
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Trip Proposal Payment Flow (Integration)', () => {
  let mockStripe: ReturnType<typeof makeMockStripe>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetByNumber.mockReset();
    mockWithTransaction.mockClear();
    mockSendDepositReceivedEmail.mockClear();

    mockStripe = makeMockStripe();
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    // Re-establish withTransaction mock
    mockWithTransaction.mockImplementation(async (callback: (client: { query: jest.Mock }) => Promise<unknown>) => {
      const mockClientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const client = { query: mockClientQuery };
      return await callback(client);
    });
  });

  it('should complete full flow: create payment intent -> confirm payment -> deposit_paid = true', async () => {
    const proposal = makeProposal();
    mockGetByNumber.mockResolvedValue(proposal);

    // Step 1: Create payment intent
    const createResponse = await createPayment(makeCreatePaymentRequest() as any, makeContext());
    const createBody = await createResponse.json();

    expect(createBody.success).toBe(true);
    expect(createBody.data.client_secret).toBe('pi_test_123_secret_abc');
    expect(createBody.data.amount).toBe(1250);
    expect(createBody.data.publishable_key).toBe('pk_test_abc123');

    // Verify Stripe PaymentIntent was created with correct metadata
    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 125000,
        currency: 'usd',
        metadata: expect.objectContaining({
          payment_type: 'trip_proposal_deposit',
          trip_proposal_id: '1',
        }),
      }),
      expect.objectContaining({
        idempotencyKey: 'pi_tp_1_125000',
      })
    );

    // Step 2: Confirm payment (simulating return from Stripe)
    const confirmResponse = await confirmPayment(
      makeConfirmPaymentRequest('pi_test_123') as any,
      makeContext()
    );
    const confirmBody = await confirmResponse.json();

    expect(confirmBody.success).toBe(true);
    expect(confirmBody.data.deposit_paid).toBe(true);
    expect(confirmBody.data.deposit_amount).toBe(1250);
    expect(confirmBody.data.payment_intent_id).toBe('pi_test_123');

    // Step 3: Verify transaction was executed
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);

    // Step 4: Verify email was triggered
    expect(mockSendDepositReceivedEmail).toHaveBeenCalledWith(1, 1250);
  });

  it('should handle idempotency: confirm same payment twice -> only one DB update', async () => {
    const proposal = makeProposal();

    // First call: deposit not yet paid
    mockGetByNumber.mockResolvedValueOnce(proposal);

    const firstResponse = await confirmPayment(
      makeConfirmPaymentRequest('pi_test_123') as any,
      makeContext()
    );
    const firstBody = await firstResponse.json();

    expect(firstBody.success).toBe(true);
    expect(firstBody.data.deposit_paid).toBe(true);
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);

    // Clear transaction call count
    mockWithTransaction.mockClear();
    mockSendDepositReceivedEmail.mockClear();

    // Second call: deposit already paid (simulating proposal state after first call)
    const paidProposal = makeProposal({
      deposit_paid: true,
      deposit_paid_at: '2026-02-21T12:00:00Z',
    });
    mockGetByNumber.mockResolvedValueOnce(paidProposal);

    const secondResponse = await confirmPayment(
      makeConfirmPaymentRequest('pi_test_123') as any,
      makeContext()
    );
    const secondBody = await secondResponse.json();

    // Should return success with already_paid flag
    expect(secondBody.success).toBe(true);
    expect(secondBody.data.already_paid).toBe(true);

    // Should NOT run transaction again
    expect(mockWithTransaction).not.toHaveBeenCalled();

    // Should NOT send email again
    expect(mockSendDepositReceivedEmail).not.toHaveBeenCalled();
  });

  it('should fail create-payment when proposal is not in accepted state', async () => {
    const draftProposal = makeProposal({ status: 'sent' });
    mockGetByNumber.mockResolvedValue(draftProposal);

    const response = await createPayment(makeCreatePaymentRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('accepted');
  });

  it('should fail confirm-payment when Stripe payment has not succeeded', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal());

    // Override Stripe retrieve to return non-succeeded status
    mockStripe.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_test_123',
      status: 'requires_payment_method',
      amount: 125000,
      metadata: { trip_proposal_id: '1' },
    });

    const response = await confirmPayment(
      makeConfirmPaymentRequest('pi_test_123') as any,
      makeContext()
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('not succeeded');
  });
});
