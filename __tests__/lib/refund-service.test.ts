/**
 * Tests for Refund Service
 * @module lib/services/refund.service
 *
 * Tests cancellation policy calculation and refund processing.
 */

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

jest.mock('@/lib/db/transaction', () => ({
  withTransaction: jest.fn((cb: any) => cb(require('@/lib/db').query)),
}));

// Get reference to the mock after jest.mock hoisting
const mockQuery = require('@/lib/db').query as jest.Mock;

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(() => ({
    refunds: {
      create: jest.fn(),
    },
  })),
}));

import { RefundService } from '@/lib/services/refund.service';

describe('RefundService', () => {
  let service: RefundService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    service = new RefundService();
  });

  // ===========================================================================
  // calculateRefund - Cancellation Policy
  // ===========================================================================

  describe('calculateRefund', () => {
    function futureDateDays(days: number): string {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }

    it('should give 100% refund for 45+ days before tour', () => {
      const result = service.calculateRefund(futureDateDays(50), 200);
      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(200);
      expect(result.policyApplied).toContain('Full refund');
    });

    it('should give 100% refund at 46 days (boundary safe)', () => {
      // Note: Math.floor of day difference can round 45 to 44 due to
      // sub-day time remaining, so we use 46 to test the 45+ branch reliably
      const result = service.calculateRefund(futureDateDays(46), 200);
      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(200);
    });

    it('should give 50% refund for 21-44 days before tour', () => {
      const result = service.calculateRefund(futureDateDays(30), 200);
      expect(result.refundPercentage).toBe(50);
      expect(result.refundAmount).toBe(100);
      expect(result.policyApplied).toContain('50% refund');
    });

    it('should give 50% refund at exactly 44 days', () => {
      const result = service.calculateRefund(futureDateDays(44), 200);
      expect(result.refundPercentage).toBe(50);
    });

    it('should give 50% refund at exactly 21 days', () => {
      const result = service.calculateRefund(futureDateDays(21), 200);
      expect(result.refundPercentage).toBe(50);
    });

    it('should give 0% refund for under 21 days', () => {
      const result = service.calculateRefund(futureDateDays(10), 200);
      expect(result.refundPercentage).toBe(0);
      expect(result.refundAmount).toBe(0);
      expect(result.policyApplied).toContain('No refund');
    });

    it('should give 0% refund at exactly 20 days', () => {
      const result = service.calculateRefund(futureDateDays(20), 200);
      expect(result.refundPercentage).toBe(0);
    });

    it('should handle 0% for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const result = service.calculateRefund(pastDate.toISOString(), 200);
      expect(result.refundPercentage).toBe(0);
      expect(result.refundAmount).toBe(0);
    });

    it('should round 50% correctly for odd amounts', () => {
      // depositAmount * 50 / 100 = math round
      const result = service.calculateRefund(futureDateDays(30), 199);
      expect(result.refundAmount).toBe(Math.round(199 * 50) / 100);
    });

    it('should handle zero deposit amount', () => {
      const result = service.calculateRefund(futureDateDays(50), 0);
      expect(result.refundAmount).toBe(0);
    });

    it('should accept Date object as tourDate', () => {
      const date = new Date();
      date.setDate(date.getDate() + 60);
      const result = service.calculateRefund(date, 100);
      expect(result.refundPercentage).toBe(100);
    });
  });

  // ===========================================================================
  // processBookingRefund
  // ===========================================================================

  describe('processBookingRefund', () => {
    it('should return null refundId when booking not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.processBookingRefund(999);

      expect(result.refundId).toBeNull();
      expect(result.refundAmount).toBe(0);
      expect(result.policyApplied).toBe('Booking not found');
    });

    it('should return null when no deposit paid', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          tour_date: new Date(Date.now() + 86400000 * 60).toISOString(),
          deposit_amount: 0,
          deposit_paid: false,
          status: 'cancelled',
        }],
        rowCount: 1,
      } as any);

      const result = await service.processBookingRefund(1);

      expect(result.refundId).toBeNull();
      expect(result.policyApplied).toBe('No deposit paid');
    });

    it('should return null when deposit_paid is false', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          tour_date: new Date(Date.now() + 86400000 * 60).toISOString(),
          deposit_amount: 200,
          deposit_paid: false,
          status: 'cancelled',
        }],
        rowCount: 1,
      } as any);

      const result = await service.processBookingRefund(1);

      expect(result.refundId).toBeNull();
      expect(result.policyApplied).toBe('No deposit paid');
    });

    it('should record policy and return $0 when within 21 days', async () => {
      mockQuery
        // Get booking
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            tour_date: new Date(Date.now() + 86400000 * 10).toISOString(),
            deposit_amount: 200,
            deposit_paid: true,
            status: 'cancelled',
          }],
          rowCount: 1,
        } as any)
        // Timeline insert (catch-wrapped, but mock anyway)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.processBookingRefund(1);

      expect(result.refundAmount).toBe(0);
      expect(result.refundPercentage).toBe(0);
      expect(result.refundId).toBeNull();
    });

    it('should return manual refund needed when no Stripe payment', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 60).toISOString();

      mockQuery
        // Get booking
        .mockResolvedValueOnce({
          rows: [{
            id: 1, tour_date: futureDate, deposit_amount: 200,
            deposit_paid: true, status: 'cancelled',
          }],
          rowCount: 1,
        } as any)
        // Get payment - not found
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.processBookingRefund(1);

      expect(result.refundId).toBeNull();
      expect(result.refundAmount).toBe(200);
      expect(result.policyApplied).toContain('manual refund needed');
    });

    it('should process Stripe refund for 100% policy', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 60).toISOString();
      const { getStripe } = require('@/lib/stripe');
      const mockRefundCreate = jest.fn().mockResolvedValue({ id: 're_test123' });
      getStripe.mockReturnValue({ refunds: { create: mockRefundCreate } });

      mockQuery
        // Get booking
        .mockResolvedValueOnce({
          rows: [{
            id: 1, tour_date: futureDate, deposit_amount: 200,
            deposit_paid: true, status: 'cancelled',
          }],
          rowCount: 1,
        } as any)
        // Get payment
        .mockResolvedValueOnce({
          rows: [{
            id: 10, stripe_payment_intent_id: 'pi_abc123', amount: 200,
          }],
          rowCount: 1,
        } as any)
        // Update payment
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
        // Update booking
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
        // Timeline insert
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.processBookingRefund(1);

      expect(result.refundId).toBe('re_test123');
      expect(result.stripeRefundId).toBe('re_test123');
      expect(result.refundAmount).toBe(200);
      expect(result.refundPercentage).toBe(100);

      expect(mockRefundCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_abc123',
        amount: 20000, // $200 in cents
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          booking_id: '1',
          refund_percentage: '100',
        }),
      });
    });

    it('should process 50% Stripe refund', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
      const { getStripe } = require('@/lib/stripe');
      const mockRefundCreate = jest.fn().mockResolvedValue({ id: 're_half' });
      getStripe.mockReturnValue({ refunds: { create: mockRefundCreate } });

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 2, tour_date: futureDate, deposit_amount: 300,
            deposit_paid: true, status: 'cancelled',
          }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 20, stripe_payment_intent_id: 'pi_xyz', amount: 300 }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.processBookingRefund(2);

      expect(result.refundPercentage).toBe(50);
      expect(result.refundAmount).toBe(150);
      expect(mockRefundCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 15000, // $150 in cents
        })
      );
    });

    it('should handle Stripe refund failure gracefully', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 60).toISOString();
      const { getStripe } = require('@/lib/stripe');
      const mockRefundCreate = jest.fn().mockRejectedValue(new Error('Stripe error'));
      getStripe.mockReturnValue({ refunds: { create: mockRefundCreate } });

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 3, tour_date: futureDate, deposit_amount: 200,
            deposit_paid: true, status: 'cancelled',
          }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 30, stripe_payment_intent_id: 'pi_fail', amount: 200 }],
          rowCount: 1,
        } as any)
        // Timeline failure entry
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.processBookingRefund(3);

      expect(result.refundId).toBeNull();
      expect(result.refundAmount).toBe(200);
      expect(result.policyApplied).toContain('manual refund needed');
    });
  });
});
