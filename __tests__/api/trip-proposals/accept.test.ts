/**
 * Unit Tests for POST /api/trip-proposals/[proposalNumber]/accept
 * @jest-environment node
 *
 * Tests the accept API route with email trigger:
 *   - Calls sendProposalAcceptedEmail after acceptance
 *   - Returns 400 for invalid proposal number
 *   - Returns 404 for non-existent proposal
 *   - Returns 400 for already accepted proposal
 *   - Returns 400 for expired proposal
 */

jest.mock('@/lib/services/trip-proposal.service', () => ({
  tripProposalService: {
    getByNumber: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('@/lib/services/trip-proposal-email.service', () => ({
  tripProposalEmailService: {
    sendProposalAcceptedEmail: jest.fn().mockResolvedValue(undefined),
  },
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
const mockUpdateStatus = require('@/lib/services/trip-proposal.service').tripProposalService.updateStatus as jest.Mock;
const mockSendProposalAcceptedEmail = require('@/lib/services/trip-proposal-email.service').tripProposalEmailService.sendProposalAcceptedEmail as jest.Mock;

import { POST } from '@/app/api/trip-proposals/[proposalNumber]/accept/route';

// ============================================================================
// Helpers
// ============================================================================

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    proposal_number: 'TP-20260001',
    status: 'sent',
    customer_name: 'Jane Doe',
    customer_email: 'jane@example.com',
    trip_type: 'wine_tour',
    start_date: '2026-06-15',
    end_date: '2026-06-17',
    party_size: 8,
    total: 2500,
    deposit_amount: 1250,
    valid_until: '2027-07-15', // Future date by default
    brand_id: 1,
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown> = { signature: 'Jane Doe', agreed_to_terms: true }) {
  return {
    json: jest.fn().mockResolvedValue(body),
    nextUrl: { pathname: '/api/trip-proposals/TP-20260001/accept' },
    method: 'POST',
    url: 'http://localhost:3000/api/trip-proposals/TP-20260001/accept',
    headers: {
      get: jest.fn((name: string) => {
        if (name === 'x-forwarded-for') return '192.168.1.1';
        if (name === 'user-agent') return 'test-user-agent';
        return null;
      }),
    },
  };
}

function makeContext(proposalNumber = 'TP-20260001') {
  return {
    params: Promise.resolve({ proposalNumber }),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/trip-proposals/[proposalNumber]/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetByNumber.mockReset();
    mockUpdateStatus.mockReset();
    mockSendProposalAcceptedEmail.mockClear();
  });

  it('should call sendProposalAcceptedEmail after successful acceptance', async () => {
    const proposal = makeProposal({ status: 'sent' });
    mockGetByNumber.mockResolvedValue(proposal);
    mockUpdateStatus.mockResolvedValue({
      ...proposal,
      status: 'accepted',
      accepted_at: '2026-02-21T12:00:00Z',
    });

    const response = await POST(makeRequest() as any, makeContext());

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('accepted');

    // Email service should have been called via after()
    expect(mockSendProposalAcceptedEmail).toHaveBeenCalledWith(1);
  });

  it('should return 400 for invalid proposal number', async () => {
    const response = await POST(makeRequest() as any, makeContext('INVALID'));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid proposal number');
  });

  it('should return 404 for non-existent proposal', async () => {
    mockGetByNumber.mockResolvedValue(null);

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('not found');
  });

  it('should return 400 for already accepted proposal', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal({ status: 'accepted' }));

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('already been accepted');
  });

  it('should return 400 for expired proposal', async () => {
    // valid_until is in the past
    const proposal = makeProposal({ status: 'sent', valid_until: '2025-01-01' });
    mockGetByNumber.mockResolvedValue(proposal);
    mockUpdateStatus.mockResolvedValue({ ...proposal, status: 'expired' });

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('expired');
  });

  it('should accept viewed proposals (not just sent)', async () => {
    const proposal = makeProposal({ status: 'viewed' });
    mockGetByNumber.mockResolvedValue(proposal);
    mockUpdateStatus.mockResolvedValue({
      ...proposal,
      status: 'accepted',
      accepted_at: '2026-02-21T12:00:00Z',
    });

    const response = await POST(makeRequest() as any, makeContext());

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('accepted');
  });

  it('should return 400 for draft proposal (cannot be accepted)', async () => {
    mockGetByNumber.mockResolvedValue(makeProposal({ status: 'draft' }));

    const response = await POST(makeRequest() as any, makeContext());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('cannot be accepted');
  });

  it('should pass signature and IP address to updateStatus', async () => {
    const proposal = makeProposal({ status: 'sent' });
    mockGetByNumber.mockResolvedValue(proposal);
    mockUpdateStatus.mockResolvedValue({
      ...proposal,
      status: 'accepted',
      accepted_at: '2026-02-21T12:00:00Z',
    });

    await POST(makeRequest() as any, makeContext());

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      1,
      'accepted',
      expect.objectContaining({
        actor_type: 'customer',
        signature: 'Jane Doe',
        ip_address: '192.168.1.1',
      })
    );
  });
});
