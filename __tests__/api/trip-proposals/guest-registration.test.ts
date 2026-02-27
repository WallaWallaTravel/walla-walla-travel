/**
 * Guest Registration API Tests
 * Tests GET and POST /api/my-trip/[token]/join
 * @jest-environment node
 */

// Mock service
const mockGetByAccessToken = jest.fn();
const mockGetGuestCount = jest.fn();
const mockGetPerPersonEstimate = jest.fn();
const mockIsEmailRegistered = jest.fn();
const mockAddGuest = jest.fn();

jest.mock('@/lib/services/trip-proposal.service', () => ({
  tripProposalService: {
    getByAccessToken: (...args: unknown[]) => mockGetByAccessToken(...args),
    getGuestCount: (...args: unknown[]) => mockGetGuestCount(...args),
    getPerPersonEstimate: (...args: unknown[]) => mockGetPerPersonEstimate(...args),
    isEmailRegistered: (...args: unknown[]) => mockIsEmailRegistered(...args),
    addGuest: (...args: unknown[]) => mockAddGuest(...args),
  },
}));

// Mock rate limiter
const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/api/middleware/rate-limit', () => ({
  rateLimiters: {
    publicSubmit: { check: jest.fn() },
  },
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

// Mock error handler - provide a passthrough wrapper
jest.mock('@/lib/api/middleware/error-handler', () => {
  const actual = jest.requireActual('@/lib/api/middleware/error-handler');
  return {
    ...actual,
    withErrorHandling: (handler: (...args: unknown[]) => unknown) => handler,
  };
});

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logDbError: jest.fn(),
  logDebug: jest.fn(),
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  generateSecureString: jest.fn(() => 'x'.repeat(64)),
}));

import { GET, POST } from '@/app/api/my-trip/[token]/join/route';
import { NextRequest } from 'next/server';

// Helper to create a mock NextRequest with properly parsed JSON body
function createRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const url = 'http://localhost:3000/api/my-trip/test-token/join';
  const req = new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Override json() to ensure it returns parsed object (Jest env may return string)
  if (body) {
    const parsedBody = body;
    req.json = () => Promise.resolve(parsedBody);
  }
  return req;
}

// Helper to create mock route context
function createContext(token: string) {
  return { params: Promise.resolve({ token }) };
}

// Valid 64-char alphanumeric token
const VALID_TOKEN = 'a'.repeat(64);

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: 'accepted',
    planning_phase: 'active_planning',
    customer_name: 'Test',
    trip_title: 'Test Trip',
    start_date: '2026-06-01',
    end_date: null,
    max_guests: null,
    min_guests: null,
    dynamic_pricing_enabled: false,
    guest_approval_required: false,
    show_guest_count_to_guests: false,
    ...overrides,
  };
}

describe('GET /api/my-trip/[token]/join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns trip info for valid token', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(makeProposal());
    mockGetGuestCount.mockResolvedValueOnce(3);

    const req = createRequest('GET');
    const res = await GET(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.trip_title).toBe('Test Trip');
  });

  it('rejects token with invalid format (injection chars)', async () => {
    const req = createRequest('GET');
    const res = await GET(req, createContext('abc<script>alert(1)</script>'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    // Should NOT have called the database
    expect(mockGetByAccessToken).not.toHaveBeenCalled();
  });

  it('rejects short token', async () => {
    const req = createRequest('GET');
    const res = await GET(req, createContext('abc123'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(mockGetByAccessToken).not.toHaveBeenCalled();
  });

  it('returns 404 for nonexistent token', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(null);

    const req = createRequest('GET');
    const res = await GET(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Trip not found');
  });

  it('blocks draft-status proposals', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(
      makeProposal({ status: 'draft', planning_phase: 'proposal' })
    );

    const req = createRequest('GET');
    const res = await GET(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('not accepting');
  });

  it('includes dynamic pricing when enabled and guest count visible', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(
      makeProposal({
        dynamic_pricing_enabled: true,
        show_guest_count_to_guests: true,
        max_guests: 10,
        min_guests: 5,
      })
    );
    mockGetGuestCount.mockResolvedValueOnce(7);
    mockGetPerPersonEstimate.mockResolvedValueOnce({
      current_per_person: 150,
      ceiling_price: 200,
      floor_price: 100,
      min_guests: 5,
      max_guests: 10,
    });

    const req = createRequest('GET');
    const res = await GET(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.dynamic_pricing).toBeDefined();
    expect(data.data.dynamic_pricing.current_per_person).toBe(150);
    expect(data.data.guest_count).toBe(7);
  });

  it('hides guest count when show_guest_count_to_guests is false', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(
      makeProposal({ show_guest_count_to_guests: false })
    );
    mockGetGuestCount.mockResolvedValueOnce(5);

    const req = createRequest('GET');
    const res = await GET(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.guest_count).toBeUndefined();
    expect(data.data.spots_remaining).toBeUndefined();
  });
});

describe('POST /api/my-trip/[token]/join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(null); // Not rate limited by default
  });

  it('registers guest successfully (201)', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(makeProposal());
    mockIsEmailRegistered.mockResolvedValueOnce(false);
    mockAddGuest.mockResolvedValueOnce({
      id: 10,
      guest_access_token: 'gtoken123',
      name: 'Jane',
    });

    const req = createRequest('POST', {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-1234',
    });
    const res = await POST(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.guest_access_token).toBe('gtoken123');
    expect(data.data.rsvp_status).toBe('confirmed');
    expect(data.data.needs_approval).toBe(false);
  });

  it('rejects invalid token format', async () => {
    const req = createRequest('POST', { name: 'Test', email: 'test@test.com' });
    const res = await POST(req, createContext('invalid!token@here'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(mockGetByAccessToken).not.toHaveBeenCalled();
  });

  it('rejects missing name (400)', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(makeProposal());

    const req = createRequest('POST', { email: 'jane@example.com' });
    const res = await POST(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid input');
  });

  it('rejects invalid email (400)', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(makeProposal());

    const req = createRequest('POST', { name: 'Jane', email: 'not-an-email' });
    const res = await POST(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns generic message for duplicate email (409)', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(makeProposal());
    mockIsEmailRegistered.mockResolvedValueOnce(true);

    const req = createRequest('POST', { name: 'Jane', email: 'existing@test.com' });
    const res = await POST(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(409);
    // Must NOT confirm the email exists with a definitive statement
    expect(data.error).not.toContain('A guest with this email is already registered');
    expect(data.error).toContain('Unable to complete registration');
  });

  it('returns 429 when rate limited', async () => {
    // Mock checkRateLimit to return a 429 response (simulate NextResponse.json)
    const rateLimitResponse = new Response(
      JSON.stringify({ error: 'Too many submissions.', code: 'RATE_LIMIT_EXCEEDED' }),
      { status: 429, headers: { 'content-type': 'application/json' } }
    );
    mockCheckRateLimit.mockResolvedValueOnce(rateLimitResponse);

    const req = createRequest('POST', { name: 'Spam', email: 'spam@test.com' });
    const res = await POST(req, createContext(VALID_TOKEN));

    expect(res.status).toBe(429);
    expect(mockGetByAccessToken).not.toHaveBeenCalled();
  });

  it('sets rsvp_status to pending when approval required', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(
      makeProposal({ guest_approval_required: true })
    );
    mockIsEmailRegistered.mockResolvedValueOnce(false);
    mockAddGuest.mockResolvedValueOnce({
      id: 11,
      guest_access_token: 'gt456',
    });

    const req = createRequest('POST', { name: 'Bob', email: 'bob@test.com' });
    const res = await POST(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.rsvp_status).toBe('pending');
    expect(data.data.needs_approval).toBe(true);

    // Verify addGuest was called with rsvp_status: 'pending'
    expect(mockAddGuest).toHaveBeenCalledWith(1, expect.objectContaining({
      is_registered: true,
      rsvp_status: 'pending',
    }));
  });

  it('sets rsvp_status to confirmed for auto-confirm', async () => {
    mockGetByAccessToken.mockResolvedValueOnce(
      makeProposal({ guest_approval_required: false })
    );
    mockIsEmailRegistered.mockResolvedValueOnce(false);
    mockAddGuest.mockResolvedValueOnce({
      id: 12,
      guest_access_token: 'gt789',
    });

    const req = createRequest('POST', { name: 'Alice', email: 'alice@test.com' });
    const res = await POST(req, createContext(VALID_TOKEN));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.rsvp_status).toBe('confirmed');

    expect(mockAddGuest).toHaveBeenCalledWith(1, expect.objectContaining({
      is_registered: true,
      rsvp_status: 'confirmed',
    }));
  });
});
