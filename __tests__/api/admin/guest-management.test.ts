/**
 * Admin Guest Management API Tests
 * Tests PATCH and DELETE /api/admin/trip-proposals/[id]/guests/[guestId]
 * @jest-environment node
 */

// Mock auth wrapper — passthrough
jest.mock('@/lib/api/middleware/auth-wrapper', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withAdminAuth: (handler: (...args: any[]) => any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: any, context: any) => handler(request, { user: { id: 1, role: 'admin' } }, context),
}));

// Mock service
const mockDeleteGuest = jest.fn();
jest.mock('@/lib/services/trip-proposal.service', () => ({
  tripProposalService: {
    deleteGuest: (...args: unknown[]) => mockDeleteGuest(...args),
  },
}));

// Mock db-helpers
const mockQueryOne = jest.fn();
jest.mock('@/lib/db-helpers', () => ({
  queryOne: (...args: unknown[]) => mockQueryOne(...args),
  QueryParamValue: {},
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logDbError: jest.fn(),
  logDebug: jest.fn(),
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '@/app/api/admin/trip-proposals/[id]/guests/[guestId]/route';
import { NotFoundError } from '@/lib/api/middleware/error-handler';

function createRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const url = 'http://localhost:3000/api/admin/trip-proposals/1/guests/10';
  const req = new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Override json() to ensure it returns parsed object (Jest env may return string)
  if (body) {
    const parsedBody = body;
    req.json = () => Promise.resolve(parsedBody);
  }
  return req;
}

function createContext(id: string, guestId: string) {
  return { params: Promise.resolve({ id, guestId }) };
}

describe('PATCH /api/admin/trip-proposals/[id]/guests/[guestId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates guest successfully', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 10,
      name: 'Updated Name',
      email: 'updated@test.com',
    });

    const req = createRequest('PATCH', { name: 'Updated Name' });
    const res = await PATCH(req, createContext('1', '10'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Updated Name');
  });

  it('returns 400 for invalid IDs', async () => {
    const req = createRequest('PATCH', { name: 'Test' });
    const res = await PATCH(req, createContext('abc', '10'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid ID');
  });

  it('returns 400 when no valid fields provided', async () => {
    const req = createRequest('PATCH', { hackerField: 'evil' });
    const res = await PATCH(req, createContext('1', '10'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('No valid fields');
  });

  it('returns 404 when guest not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const req = createRequest('PATCH', { name: 'Ghost' });
    const res = await PATCH(req, createContext('1', '999'));
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('ignores disallowed fields (whitelist enforcement)', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 10, name: 'OK' });

    const req = createRequest('PATCH', {
      name: 'OK',
      is_sponsored: true, // NOT in allowed fields
      amount_owed: 0, // NOT in allowed fields
    });
    const res = await PATCH(req, createContext('1', '10'));
    const data = await res.json();

    expect(res.status).toBe(200);
    // Verify the SQL only has 'name' in SET clause, not 'is_sponsored' or 'amount_owed'
    const sql = mockQueryOne.mock.calls[0][0] as string;
    expect(sql).toContain('name');
    expect(sql).not.toContain('is_sponsored');
    expect(sql).not.toContain('amount_owed');
  });

  it('scopes update to correct proposal (proposal scoping)', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 10, name: 'Test' });

    const req = createRequest('PATCH', { name: 'Test' });
    await PATCH(req, createContext('42', '10'));

    const params = mockQueryOne.mock.calls[0][1] as unknown[];
    // Last two params should be guestId and proposalId
    expect(params).toContain(10); // guestId
    expect(params).toContain(42); // proposalId
  });
});

describe('DELETE /api/admin/trip-proposals/[id]/guests/[guestId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes guest successfully', async () => {
    mockDeleteGuest.mockResolvedValueOnce(undefined);

    const req = createRequest('DELETE');
    const res = await DELETE(req, createContext('1', '10'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteGuest).toHaveBeenCalledWith(1, 10);
  });

  it('returns 400 for invalid guest ID', async () => {
    const req = createRequest('DELETE');
    const res = await DELETE(req, createContext('1', 'abc'));
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid proposal ID', async () => {
    const req = createRequest('DELETE');
    const res = await DELETE(req, createContext('abc', '10'));
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('IDOR prevention: guest in different proposal returns error', async () => {
    // deleteGuest throws NotFoundError when guest doesn't belong to proposal
    mockDeleteGuest.mockRejectedValueOnce(new NotFoundError('TripProposalGuest', '10'));

    const req = createRequest('DELETE');
    // Trying to delete guest 10 from proposal 999 (wrong proposal)
    await expect(async () => {
      await DELETE(req, createContext('999', '10'));
    }).rejects.toThrow(NotFoundError);

    expect(mockDeleteGuest).toHaveBeenCalledWith(999, 10);
  });
});
