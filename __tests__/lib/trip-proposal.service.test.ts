/**
 * Trip Proposal Service - Guest Method Tests
 * @jest-environment node
 */

// Mock database
const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: { connect: jest.fn() },
}));

jest.mock('@/lib/db/transaction', () => ({
  withTransaction: jest.fn((cb: () => unknown) => cb()),
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logDbError: jest.fn(),
  logDebug: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  generateSecureString: jest.fn(() => 'a'.repeat(64)),
}));

jest.mock('@/lib/redis', () => ({
  rateLimit: { check: jest.fn(), reset: jest.fn() },
  isRedisAvailable: jest.fn(() => false),
}));

jest.mock('@/lib/services/crm-sync.service', () => ({
  crmSyncService: {
    syncTripProposalToDeal: jest.fn().mockResolvedValue(undefined),
    onTripProposalStatusChange: jest.fn().mockResolvedValue(undefined),
    getCrmDataForTripProposal: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/lib/services/crm-task-automation.service', () => ({
  crmTaskAutomationService: {
    onProposalSent: jest.fn().mockResolvedValue(undefined),
    onProposalViewed: jest.fn().mockResolvedValue(undefined),
  },
}));

import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { ValidationError, NotFoundError } from '@/lib/api/middleware/error-handler';

// Helper to create a mock proposal row
function makeProposalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    proposal_number: 'TP-001',
    status: 'accepted',
    access_token: 'a'.repeat(64),
    planning_phase: 'active_planning',
    customer_name: 'Test User',
    customer_email: 'test@example.com',
    customer_phone: null,
    customer_company: null,
    customer_id: null,
    trip_type: 'wine_tour',
    trip_title: 'Test Trip',
    party_size: 4,
    start_date: '2026-06-01',
    end_date: null,
    subtotal: 1000,
    discount_amount: 0,
    discount_percentage: 0,
    discount_reason: null,
    taxes: 91,
    tax_rate: 0.091,
    gratuity_percentage: 0,
    gratuity_amount: 0,
    total: 1091,
    planning_fee_mode: 'flat',
    planning_fee_percentage: 0,
    deposit_percentage: 50,
    deposit_amount: 545.5,
    deposit_paid: false,
    deposit_paid_at: null,
    deposit_payment_id: null,
    skip_deposit_on_accept: false,
    individual_billing_enabled: false,
    has_sponsored_guest: false,
    payment_deadline: null,
    reminders_paused: false,
    max_guests: null,
    min_guests: null,
    min_guests_deadline: null,
    dynamic_pricing_enabled: false,
    guest_approval_required: false,
    show_guest_count_to_guests: false,
    balance_due: 1091,
    balance_paid: false,
    balance_paid_at: null,
    balance_payment_id: null,
    valid_until: '2026-07-01',
    brand_id: null,
    introduction: null,
    special_notes: null,
    internal_notes: null,
    converted_to_booking_id: null,
    converted_at: null,
    first_viewed_at: null,
    last_viewed_at: null,
    view_count: 0,
    accepted_at: null,
    accepted_signature: null,
    accepted_ip: null,
    sent_at: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper to create a mock guest row
function makeGuestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    trip_proposal_id: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    is_primary: false,
    dietary_restrictions: null,
    accessibility_needs: null,
    special_requests: null,
    room_assignment: null,
    rsvp_status: 'pending',
    rsvp_responded_at: null,
    guest_access_token: 'b'.repeat(64),
    is_registered: false,
    is_sponsored: false,
    amount_owed: 0,
    amount_owed_override: null,
    amount_paid: 0,
    payment_status: 'unpaid',
    payment_paid_at: null,
    payment_group_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('TripProposalService - Guest Methods', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  // =========================================================================
  // getGuestCount()
  // =========================================================================
  describe('getGuestCount()', () => {
    it('returns 0 for empty proposal', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      const count = await tripProposalService.getGuestCount(1);
      expect(count).toBe(0);
    });

    it('returns correct count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });
      const count = await tripProposalService.getGuestCount(1);
      expect(count).toBe(5);
    });

    it('parses string count correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '42' }], rowCount: 1 });
      const count = await tripProposalService.getGuestCount(1);
      expect(count).toBe(42);
    });
  });

  // =========================================================================
  // getPerPersonEstimate()
  // =========================================================================
  describe('getPerPersonEstimate()', () => {
    it('calculates correct per-person amounts', async () => {
      // getById query
      mockQuery.mockResolvedValueOnce({
        rows: [makeProposalRow({ total: 1000, min_guests: 5, max_guests: 10 })],
        rowCount: 1,
      });
      // getGuestCount query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }], rowCount: 1 });

      const result = await tripProposalService.getPerPersonEstimate(1);

      expect(result.current_per_person).toBe(125); // 1000/8
      expect(result.ceiling_price).toBe(200); // 1000/5
      expect(result.floor_price).toBe(100); // 1000/10
      expect(result.current_guest_count).toBe(8);
      expect(result.total).toBe(1000);
    });

    it('handles zero guests safely', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeProposalRow({ total: 1000, min_guests: null, max_guests: null })],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      const result = await tripProposalService.getPerPersonEstimate(1);

      // With 0 guests and null min/max, minGuests and maxGuests default to 1
      expect(result.current_per_person).toBe(1000); // guestCount=0, falls back to total
      expect(result.ceiling_price).toBe(1000); // 1000/1
      expect(result.floor_price).toBe(1000); // 1000/1
      expect(Number.isFinite(result.current_per_person)).toBe(true);
      expect(Number.isFinite(result.ceiling_price)).toBe(true);
      expect(Number.isFinite(result.floor_price)).toBe(true);
    });

    it('guards against NaN/Infinity', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeProposalRow({ total: 0, min_guests: 0, max_guests: 0 })],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      const result = await tripProposalService.getPerPersonEstimate(1);

      // Math.max(1, 0 || 0 || 1) = 1, so no division by zero
      expect(Number.isFinite(result.current_per_person)).toBe(true);
      expect(Number.isFinite(result.ceiling_price)).toBe(true);
      expect(Number.isFinite(result.floor_price)).toBe(true);
    });

    it('throws NotFoundError for missing proposal', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(tripProposalService.getPerPersonEstimate(999))
        .rejects.toThrow(NotFoundError);
    });
  });

  // =========================================================================
  // addGuest() - capacity enforcement
  // =========================================================================
  describe('addGuest() capacity', () => {
    it('succeeds when no capacity limit set', async () => {
      // getById for proposal
      mockQuery.mockResolvedValueOnce({
        rows: [makeProposalRow({ max_guests: null })],
        rowCount: 1,
      });
      // Atomic CTE insert returns the guest
      mockQuery.mockResolvedValueOnce({
        rows: [makeGuestRow({ name: 'New Guest' })],
        rowCount: 1,
      });

      const guest = await tripProposalService.addGuest(1, { name: 'New Guest', email: 'new@test.com' });
      expect(guest.name).toBe('New Guest');
    });

    it('succeeds when under capacity', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeProposalRow({ max_guests: 10 })],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [makeGuestRow()],
        rowCount: 1,
      });

      const guest = await tripProposalService.addGuest(1, { name: 'Under Cap', email: 'under@test.com' });
      expect(guest).toBeDefined();
    });

    it('throws ValidationError when at capacity', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeProposalRow({ max_guests: 5 })],
        rowCount: 1,
      });
      // CTE returns no rows (at capacity)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        tripProposalService.addGuest(1, { name: 'Over Cap', email: 'over@test.com' })
      ).rejects.toThrow(ValidationError);
    });

    it('persists is_registered and rsvp_status fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeProposalRow({ max_guests: null })],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({
        rows: [makeGuestRow({ is_registered: true, rsvp_status: 'confirmed' })],
        rowCount: 1,
      });

      const guest = await tripProposalService.addGuest(1, {
        name: 'Registered',
        email: 'reg@test.com',
        is_registered: true,
        rsvp_status: 'confirmed',
      });

      // Verify the SQL contains the new fields
      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
      const sql = lastCall[0] as string;
      expect(sql).toContain('is_registered');
      expect(sql).toContain('rsvp_status');
      // Verify params include the values
      const params = lastCall[1] as unknown[];
      expect(params).toContain(true); // is_registered
      expect(params).toContain('confirmed'); // rsvp_status
    });

    it('throws NotFoundError for missing proposal', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        tripProposalService.addGuest(999, { name: 'Nobody' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =========================================================================
  // isEmailRegistered()
  // =========================================================================
  describe('isEmailRegistered()', () => {
    it('returns false when email not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await tripProposalService.isEmailRegistered(1, 'new@example.com');
      expect(result).toBe(false);
    });

    it('returns true when email found (case-insensitive)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 });

      const result = await tripProposalService.isEmailRegistered(1, 'Jane@Example.COM');
      expect(result).toBe(true);

      // Verify LOWER() is used in the query
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('LOWER(email)');
      expect(sql).toContain('LOWER($2)');
    });

    it('scopes by proposal ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await tripProposalService.isEmailRegistered(42, 'test@example.com');

      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(42); // proposalId
      expect(params[1]).toBe('test@example.com');
    });
  });

  // =========================================================================
  // deleteGuest() - ownership check
  // =========================================================================
  describe('deleteGuest() ownership', () => {
    it('deletes successfully with correct proposalId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await expect(
        tripProposalService.deleteGuest(1, 10)
      ).resolves.toBeUndefined();

      // Verify both IDs are in the query
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain('trip_proposal_id');
      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(params).toContain(10); // guestId
      expect(params).toContain(1); // proposalId
    });

    it('throws NotFoundError with wrong proposalId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        tripProposalService.deleteGuest(999, 10)
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError for nonexistent guest', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        tripProposalService.deleteGuest(1, 9999)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
