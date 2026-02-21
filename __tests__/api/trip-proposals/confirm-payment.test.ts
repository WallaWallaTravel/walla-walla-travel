/**
 * Unit Tests for POST /api/trip-proposals/[proposalNumber]/confirm-payment
 * @jest-environment node
 *
 * Tests the confirm-payment API route:
 *   - Returns success with already_paid when deposit is already paid (idempotent)
 *   - Returns 400 when payment_intent_id is missing
 *   - Returns 400 when Stripe payment hasn't succeeded
 *   - Returns 400 when metadata doesn't match
 *   - Updates trip_proposals and inserts payment record in transaction
 *   - Triggers email asynchronously
 */

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
}));

jest.mock('@/lib/db-helpers', () => {
  const _mockClientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  return {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
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

import { POST } from '@/app/api/trip-proposals/[proposalNumber]/confirm-payment/route';

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

function makeRequest(body: Record<string, unknown> = { payment_intent_id: 'pi_test_123' }) {
  return {
    json: jest.fn().mockResolvedValue(body),
    nextUrl: { pathname: '/api/trip-proposals/TP-20260001/confirm-payment' },
    method: 'POST',
    url: 'http://localhost:3000/api/trip-proposals/TP-20260001/confirm-payment',
    headers: { get: jest.fn().mockReturnValue('test-user-agent') },
  };
}

function makeContext(proposalNumber = 'TP-20260001') {
  return {
    params: Promise.resolve({ proposalNumber }),
  };
}

function makeMockStripe(paymentIntentOverrides: Record<string, unknown> = {}) {
  return {
    paymentIntents: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 125000,
        metadata: {
          payment_type: 'trip_proposal_deposit',
          trip_proposal_id: '1',
          proposal_number: 'TP-20260001',
        },
        ...paymentIntentOverrides,
      }),
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/trip-proposals/[proposalNumber]/confirm-payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetByNumber.mockReset();
    mockGetBrandStripeClient.mockReset();
    mockWithTransaction.mockClear();
    mockSendDepositReceivedEmail.mockClear();
  });

  it('should return success with already_paid when deposit is already paid (idempotent)', async () => {
    const proposal = makeProposal({
      deposit_paid: true,
      deposit_paid_at: '2026-02-20T12:00:00Z',
    });
    mockGetByNumber.mockResolvedValue(proposal);

    const response = await POST(makeRequest() as any, makeContext());

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.already_paid).toBe(true);
    expect(body.data.proposal_number).toBe('TP-20260001');

    // Should NOT call Stripe or run transaction
    expect(mockGetBrandStripeClient).not.toHaveBeenCalled();
  });

  it('should return 400 when payment_intent_id is missing', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal());

    const response = await POST(makeRequest({}) as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('payment_intent_id');
  });

  it('should return 400 when Stripe payment has not succeeded', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal());

    const mockStripe = {
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          status: 'requires_payment_method',
          amount: 125000,
          metadata: { trip_proposal_id: '1' },
        }),
      },
    };
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('not succeeded');
  });

  it('should return 400 when metadata does not match proposal', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal());

    const mockStripe = {
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          status: 'succeeded',
          amount: 125000,
          metadata: {
            payment_type: 'trip_proposal_deposit',
            trip_proposal_id: '999', // Wrong proposal ID
          },
        }),
      },
    };
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('does not match');
  });

  it('should update trip_proposals and insert payment record in transaction', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal());

    const mockStripe = makeMockStripe();
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    const response = await POST(makeRequest() as any, makeContext());

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.deposit_paid).toBe(true);
    expect(body.data.deposit_amount).toBe(1250);
    expect(body.data.payment_intent_id).toBe('pi_test_123');

    // withTransaction should have been called
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
  });

  it('should trigger email asynchronously via after()', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal());

    const mockStripe = makeMockStripe();
    mockGetBrandStripeClient.mockReturnValue(mockStripe);

    await POST(makeRequest() as any, makeContext());

    // The after() mock executes the callback immediately
    expect(mockSendDepositReceivedEmail).toHaveBeenCalledWith(1, 1250);
  });

  it('should return 404 when proposal not found', async () => {
    mockGetByNumber.mockResolvedValue(null);

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(404);
  });
});
