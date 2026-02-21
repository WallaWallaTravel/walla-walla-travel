/**
 * Unit Tests for TripProposalService
 * @jest-environment node
 *
 * Tests the core pricing calculations, inclusion/stop persistence,
 * and status transition logic in the trip proposal service.
 */

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

jest.mock('@/lib/db/transaction', () => ({
  withTransaction: jest.fn((cb: any) => cb(require('@/lib/db').query)),
}));

const mockQuery = require('@/lib/db').query as jest.Mock;

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logDbError: jest.fn(),
  logDebug: jest.fn(),
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

jest.mock('@/lib/services/crm-sync.service', () => ({
  crmSyncService: { onTripProposalStatusChange: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/services/crm-task-automation.service', () => ({
  crmTaskAutomationService: { createFollowUpTasksForProposal: jest.fn().mockResolvedValue(undefined) },
}));

import { tripProposalService, TripProposalService } from '@/lib/services/trip-proposal.service';
import { ValidationError } from '@/lib/api/middleware/error-handler';

// ============================================================================
// Helpers
// ============================================================================

function makeProposalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    proposal_number: 'TP-20260001',
    status: 'draft',
    customer_name: 'Jane Doe',
    customer_email: 'jane@example.com',
    customer_phone: '509-555-1234',
    customer_company: null,
    customer_id: 10,
    trip_type: 'wine_tour',
    trip_title: 'Walla Walla Wine Weekend',
    party_size: 8,
    start_date: '2026-06-15',
    end_date: '2026-06-17',
    subtotal: 0,
    discount_amount: 0,
    discount_percentage: 0,
    discount_reason: null,
    taxes: 0,
    tax_rate: 0.091,
    gratuity_percentage: 20,
    gratuity_amount: 0,
    total: 0,
    deposit_percentage: 50,
    deposit_amount: 0,
    deposit_paid: false,
    deposit_paid_at: null,
    deposit_payment_id: null,
    balance_due: 0,
    balance_paid: false,
    balance_paid_at: null,
    balance_payment_id: null,
    valid_until: '2026-07-15',
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
    created_by: 1,
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
    ...overrides,
  };
}

function makeInclusionRow(overrides: Record<string, unknown> = {}) {
  return {
    unit_price: '100',
    quantity: '1',
    total_price: '100',
    pricing_type: 'flat',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TripProposalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  // ==========================================================================
  // calculatePricing
  // ==========================================================================

  describe('calculatePricing', () => {
    /**
     * Helper: sets up mockQuery calls for calculatePricing.
     *
     * calculatePricing performs these queries in order:
     *   1. getById → findById → queryOne → query (SELECT * FROM trip_proposals WHERE id = $1)
     *   2. query for inclusions (SELECT unit_price, quantity, total_price, ... FROM trip_proposal_inclusions)
     *   3. update → query (UPDATE trip_proposals SET ... WHERE id = $1)
     */
    function setupPricingMocks(
      proposal: Record<string, unknown>,
      inclusionRows: Record<string, unknown>[]
    ) {
      // Call 1: getById (findById → query)
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });
      // Call 2: inclusions query
      mockQuery.mockResolvedValueOnce({ rows: inclusionRows, rowCount: inclusionRows.length });
      // Call 3: update query
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });
    }

    it('should calculate flat rate items correctly', async () => {
      const proposal = makeProposalRow({ party_size: 8 });
      const inclusions = [
        makeInclusionRow({ unit_price: '400', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      expect(result.inclusions_subtotal).toBe(400);
      expect(result.services_subtotal).toBe(400);
    });

    it('should calculate per-person items correctly', async () => {
      const proposal = makeProposalRow({ party_size: 8 });
      const inclusions = [
        makeInclusionRow({ unit_price: '35', quantity: '1', pricing_type: 'per_person' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // $35/person × 8 guests = $280
      expect(result.inclusions_subtotal).toBe(280);
    });

    it('should calculate per-day items correctly', async () => {
      const proposal = makeProposalRow({ party_size: 8 });
      const inclusions = [
        makeInclusionRow({ unit_price: '600', quantity: '3', pricing_type: 'per_day' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // $600/day × 3 days = $1800
      expect(result.inclusions_subtotal).toBe(1800);
    });

    it('should calculate mixed pricing types correctly', async () => {
      const proposal = makeProposalRow({ party_size: 8 });
      const inclusions = [
        makeInclusionRow({ unit_price: '400', quantity: '1', pricing_type: 'flat' }),
        makeInclusionRow({ unit_price: '35', quantity: '1', pricing_type: 'per_person' }),
        makeInclusionRow({ unit_price: '600', quantity: '2', pricing_type: 'per_day' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // flat: $400 + per_person: $35×8=$280 + per_day: $600×2=$1200 → $1880
      expect(result.inclusions_subtotal).toBe(1880);
    });

    it('should apply discount percentage correctly', async () => {
      const proposal = makeProposalRow({
        party_size: 8,
        discount_percentage: 10,
        tax_rate: 0,
        gratuity_percentage: 0,
        deposit_percentage: 0,
      });
      const inclusions = [
        makeInclusionRow({ unit_price: '1000', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // $1000 subtotal, 10% discount = $100 off → $900
      expect(result.subtotal).toBe(1000);
      expect(result.discount_amount).toBe(100);
      expect(result.subtotal_after_discount).toBe(900);
    });

    it('should calculate tax correctly', async () => {
      const proposal = makeProposalRow({
        party_size: 1,
        discount_percentage: 0,
        tax_rate: 0.091,
        gratuity_percentage: 0,
        deposit_percentage: 0,
      });
      const inclusions = [
        makeInclusionRow({ unit_price: '1000', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // $1000 × 0.091 = $91
      expect(result.taxes).toBe(91);
    });

    it('should calculate gratuity correctly', async () => {
      const proposal = makeProposalRow({
        party_size: 1,
        discount_percentage: 0,
        tax_rate: 0,
        gratuity_percentage: 20,
        deposit_percentage: 0,
      });
      const inclusions = [
        makeInclusionRow({ unit_price: '1000', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // $1000 × 20% = $200
      expect(result.gratuity_amount).toBe(200);
    });

    it('should perform full calculation with discount, tax, gratuity, and deposit', async () => {
      const proposal = makeProposalRow({
        party_size: 8,
        discount_percentage: 10,
        tax_rate: 0.091,
        gratuity_percentage: 20,
        deposit_percentage: 50,
        deposit_paid: false,
        deposit_amount: 0,
      });
      // Services: flat $400 + per_person $35×8=$280 + per_day $600×(1 day qty)=$600 +
      //   another flat $470 = total $1750... let's use a clearer example:
      // One flat $1150 inclusion
      const inclusions = [
        makeInclusionRow({ unit_price: '1150', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // subtotal = $1150
      expect(result.subtotal).toBe(1150);
      // discount = $1150 × 10% = $115
      expect(result.discount_amount).toBe(115);
      // subtotal_after_discount = $1150 - $115 = $1035
      expect(result.subtotal_after_discount).toBe(1035);
      // taxes = $1035 × 0.091 = $94.185
      expect(result.taxes).toBeCloseTo(94.185, 2);
      // gratuity = $1035 × 20% = $207
      expect(result.gratuity_amount).toBe(207);
      // total = $1035 + $94.185 + $207 = $1336.185
      expect(result.total).toBeCloseTo(1336.185, 2);
      // deposit = $1336.185 × 50% = $668.0925
      expect(result.deposit_amount).toBeCloseTo(668.0925, 2);
    });

    it('should handle empty inclusions (no service line items)', async () => {
      const proposal = makeProposalRow({
        party_size: 4,
        discount_percentage: 0,
        tax_rate: 0.091,
        gratuity_percentage: 20,
        deposit_percentage: 50,
      });
      setupPricingMocks(proposal, []);

      const result = await tripProposalService.calculatePricing(1);

      expect(result.inclusions_subtotal).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
      expect(result.deposit_amount).toBe(0);
    });

    it('should always return stops_subtotal as 0', async () => {
      const proposal = makeProposalRow({ party_size: 4 });
      const inclusions = [
        makeInclusionRow({ unit_price: '500', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      expect(result.stops_subtotal).toBe(0);
    });

    it('should have services_subtotal equal to inclusions_subtotal', async () => {
      const proposal = makeProposalRow({ party_size: 6 });
      const inclusions = [
        makeInclusionRow({ unit_price: '200', quantity: '1', pricing_type: 'flat' }),
        makeInclusionRow({ unit_price: '50', quantity: '1', pricing_type: 'per_person' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // flat: $200 + per_person: $50×6=$300 → $500
      expect(result.inclusions_subtotal).toBe(500);
      expect(result.services_subtotal).toBe(result.inclusions_subtotal);
    });

    it('should calculate balance_due as total when deposit is not paid', async () => {
      const proposal = makeProposalRow({
        party_size: 1,
        discount_percentage: 0,
        tax_rate: 0,
        gratuity_percentage: 0,
        deposit_percentage: 50,
        deposit_paid: false,
        deposit_amount: 0,
      });
      const inclusions = [
        makeInclusionRow({ unit_price: '1000', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // When deposit_paid is false, balance_due = total - 0 = total
      expect(result.balance_due).toBe(result.total);
    });

    it('should subtract deposit_amount from balance_due when deposit is paid', async () => {
      const proposal = makeProposalRow({
        party_size: 1,
        discount_percentage: 0,
        tax_rate: 0,
        gratuity_percentage: 0,
        deposit_percentage: 50,
        deposit_paid: true,
        deposit_amount: 250,
      });
      const inclusions = [
        makeInclusionRow({ unit_price: '1000', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // total = $1000, deposit_paid = true, deposit_amount = $250
      // balance_due = $1000 - $250 = $750
      expect(result.total).toBe(1000);
      expect(result.balance_due).toBe(750);
    });

    it('should throw NotFoundError when proposal does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(tripProposalService.calculatePricing(999)).rejects.toThrow('TripProposal');
    });

    it('should call update with the computed pricing values', async () => {
      const proposal = makeProposalRow({
        party_size: 2,
        discount_percentage: 0,
        tax_rate: 0.1,
        gratuity_percentage: 10,
        deposit_percentage: 50,
        deposit_paid: false,
        deposit_amount: 0,
      });
      const inclusions = [
        makeInclusionRow({ unit_price: '500', quantity: '1', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      await tripProposalService.calculatePricing(1);

      // The third mockQuery call is the UPDATE
      expect(mockQuery).toHaveBeenCalledTimes(3);
      const updateSql = mockQuery.mock.calls[2][0] as string;
      expect(updateSql).toContain('UPDATE trip_proposals');
      expect(updateSql).toContain('subtotal');
      expect(updateSql).toContain('taxes');
      expect(updateSql).toContain('total');
    });

    it('should handle inclusions with missing pricing_type (defaults to flat via COALESCE)', async () => {
      const proposal = makeProposalRow({ party_size: 8 });
      const inclusions = [
        // pricing_type will be 'flat' due to COALESCE in SQL
        makeInclusionRow({ unit_price: '200', quantity: '2', pricing_type: 'flat' }),
      ];
      setupPricingMocks(proposal, inclusions);

      const result = await tripProposalService.calculatePricing(1);

      // flat: $200 × 2 = $400
      expect(result.inclusions_subtotal).toBe(400);
    });
  });

  // ==========================================================================
  // addInclusion — pricing_type persistence
  // ==========================================================================

  describe('addInclusion', () => {
    it('should include pricing_type in the INSERT when adding an inclusion', async () => {
      // Call 1: exists check for proposal (SELECT EXISTS...)
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
      // Call 2: get max sort_order
      mockQuery.mockResolvedValueOnce({ rows: [{ max_order: 2 }], rowCount: 1 });
      // Call 3: INSERT INTO trip_proposal_inclusions
      const insertedInclusion = {
        id: 5,
        trip_proposal_id: 1,
        inclusion_type: 'arranged_tasting',
        description: 'Reserve tasting at Leonetti',
        quantity: 1,
        unit: null,
        unit_price: 45,
        total_price: 45,
        pricing_type: 'per_person',
        sort_order: 3,
        show_on_proposal: true,
        notes: null,
        created_at: '2026-02-20T00:00:00Z',
        updated_at: '2026-02-20T00:00:00Z',
      };
      mockQuery.mockResolvedValueOnce({ rows: [insertedInclusion], rowCount: 1 });

      const result = await tripProposalService.addInclusion(1, {
        inclusion_type: 'arranged_tasting',
        description: 'Reserve tasting at Leonetti',
        unit_price: 45,
        pricing_type: 'per_person',
      });

      expect(result.pricing_type).toBe('per_person');

      // Verify the INSERT SQL includes pricing_type
      const insertCall = mockQuery.mock.calls[2];
      const sql = insertCall[0] as string;
      expect(sql).toContain('INSERT INTO trip_proposal_inclusions');
      expect(sql).toContain('pricing_type');

      // Verify the value is in the params
      const params = insertCall[1] as unknown[];
      expect(params).toContain('per_person');
    });
  });

  // ==========================================================================
  // addStop — cost_note persistence
  // ==========================================================================

  describe('addStop', () => {
    it('should include cost_note in the INSERT when adding a stop', async () => {
      // Call 1: exists check for day (SELECT EXISTS...)
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
      // Call 2: get max stop_order
      mockQuery.mockResolvedValueOnce({ rows: [{ max_order: 1 }], rowCount: 1 });
      // Call 3: INSERT INTO trip_proposal_stops
      const insertedStop = {
        id: 10,
        trip_proposal_day_id: 5,
        stop_order: 2,
        stop_type: 'winery',
        winery_id: 42,
        restaurant_id: null,
        hotel_id: null,
        custom_name: null,
        custom_address: null,
        custom_description: null,
        scheduled_time: '11:00',
        duration_minutes: 60,
        per_person_cost: 0,
        flat_cost: 0,
        cost_notes: null,
        cost_note: 'Tasting fee ~$25/pp',
        room_rate: 0,
        num_rooms: 0,
        nights: 1,
        reservation_status: 'pending',
        client_notes: null,
        internal_notes: null,
        driver_notes: null,
        created_at: '2026-02-20T00:00:00Z',
        updated_at: '2026-02-20T00:00:00Z',
      };
      mockQuery.mockResolvedValueOnce({ rows: [insertedStop], rowCount: 1 });

      const result = await tripProposalService.addStop(5, {
        stop_type: 'winery',
        winery_id: 42,
        scheduled_time: '11:00',
        duration_minutes: 60,
        cost_note: 'Tasting fee ~$25/pp',
      });

      expect(result.cost_note).toBe('Tasting fee ~$25/pp');

      // Verify the INSERT SQL includes cost_note
      const insertCall = mockQuery.mock.calls[2];
      const sql = insertCall[0] as string;
      expect(sql).toContain('INSERT INTO trip_proposal_stops');
      expect(sql).toContain('cost_note');

      // Verify the value is in the params
      const params = insertCall[1] as unknown[];
      expect(params).toContain('Tasting fee ~$25/pp');
    });
  });

  // ==========================================================================
  // updateStatus — status transition validation
  // ==========================================================================

  describe('updateStatus', () => {
    /**
     * Helper: sets up mockQuery calls for updateStatus.
     *
     * updateStatus performs these queries:
     *   1. getById → findById → query (SELECT * FROM trip_proposals WHERE id = $1)
     *   2. update → query (UPDATE trip_proposals SET ...)
     *   3. logActivity → insert → query (INSERT INTO trip_proposal_activity ...)
     */
    function setupStatusMocks(proposal: Record<string, unknown>) {
      // Call 1: getById
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });
      // Call 2: update
      mockQuery.mockResolvedValueOnce({ rows: [{ ...proposal, status: 'sent' }], rowCount: 1 });
      // Call 3: logActivity insert
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    }

    it('should allow draft → sent transition', async () => {
      const proposal = makeProposalRow({ status: 'draft' });
      setupStatusMocks(proposal);

      const result = await tripProposalService.updateStatus(1, 'sent');

      expect(result).toBeDefined();
      // Verify update was called
      const updateSql = mockQuery.mock.calls[1][0] as string;
      expect(updateSql).toContain('UPDATE trip_proposals');
    });

    it('should allow sent → viewed transition', async () => {
      const proposal = makeProposalRow({ status: 'sent' });
      // Call 1: getById
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });
      // Call 2: update
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...proposal, status: 'viewed', view_count: 1 }],
        rowCount: 1,
      });
      // Call 3: logActivity insert
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const result = await tripProposalService.updateStatus(1, 'viewed');

      expect(result).toBeDefined();
    });

    it('should reject draft → accepted transition', async () => {
      const proposal = makeProposalRow({ status: 'draft' });
      // Call 1: getById
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });

      await expect(
        tripProposalService.updateStatus(1, 'accepted')
      ).rejects.toThrow('Cannot transition from draft to accepted');
    });

    it('should reject draft → viewed transition', async () => {
      const proposal = makeProposalRow({ status: 'draft' });
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });

      await expect(
        tripProposalService.updateStatus(1, 'viewed')
      ).rejects.toThrow('Cannot transition from draft to viewed');
    });

    it('should reject converted → any transition (final state)', async () => {
      const proposal = makeProposalRow({ status: 'converted' });
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });

      await expect(
        tripProposalService.updateStatus(1, 'draft')
      ).rejects.toThrow('Cannot transition from converted to draft');
    });

    it('should allow declined → draft (reopen) transition', async () => {
      const proposal = makeProposalRow({ status: 'declined' });
      // Call 1: getById
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });
      // Call 2: update
      mockQuery.mockResolvedValueOnce({ rows: [{ ...proposal, status: 'draft' }], rowCount: 1 });
      // Call 3: logActivity
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const result = await tripProposalService.updateStatus(1, 'draft');

      expect(result).toBeDefined();
    });

    it('should throw NotFoundError when proposal does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        tripProposalService.updateStatus(999, 'sent')
      ).rejects.toThrow('TripProposal');
    });

    it('should set sent_at when transitioning to sent', async () => {
      const proposal = makeProposalRow({ status: 'draft' });
      setupStatusMocks(proposal);

      await tripProposalService.updateStatus(1, 'sent');

      // The update call params should include sent_at
      const updateParams = mockQuery.mock.calls[1][1] as unknown[];
      const updateSql = mockQuery.mock.calls[1][0] as string;
      expect(updateSql).toContain('sent_at');
    });

    it('should increment view_count when transitioning to viewed', async () => {
      const proposal = makeProposalRow({ status: 'sent', view_count: 3 });
      // Call 1: getById
      mockQuery.mockResolvedValueOnce({ rows: [proposal], rowCount: 1 });
      // Call 2: update
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...proposal, status: 'viewed', view_count: 4 }],
        rowCount: 1,
      });
      // Call 3: logActivity
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      await tripProposalService.updateStatus(1, 'viewed');

      const updateSql = mockQuery.mock.calls[1][0] as string;
      expect(updateSql).toContain('view_count');
      // The params should include view_count = 4 (3 + 1)
      const updateParams = mockQuery.mock.calls[1][1] as unknown[];
      expect(updateParams).toContain(4);
    });
  });
});
