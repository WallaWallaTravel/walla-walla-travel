/**
 * Unit Tests for TripProposalEmailService
 * @jest-environment node
 *
 * Tests the email orchestration layer:
 *   - Proposal sent email (idempotency, missing email, happy path)
 *   - Proposal accepted email (customer + staff)
 *   - Deposit received email (customer receipt + staff notification)
 *   - Graceful handling when proposal is not found
 */

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/db-helpers', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  queryOne: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/services/trip-proposal.service', () => ({
  tripProposalService: {
    getById: jest.fn(),
  },
}));

jest.mock('@/lib/services/crm-sync.service', () => ({
  crmSyncService: {
    logEmailSent: jest.fn().mockResolvedValue(undefined),
  },
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

jest.mock('@/lib/email/templates/trip-proposal-emails', () => ({
  buildProposalSentEmail: jest.fn().mockReturnValue({
    subject: 'Your Trip Proposal is Ready | Walla Walla Travel',
    html: '<p>proposal sent html</p>',
    text: 'proposal sent text',
  }),
  buildProposalAcceptedEmail: jest.fn().mockReturnValue({
    subject: 'Your Trip is Confirmed! | Walla Walla Travel',
    html: '<p>accepted customer html</p>',
    text: 'accepted customer text',
  }),
  buildProposalAcceptedStaffEmail: jest.fn().mockReturnValue({
    subject: 'Trip Proposal Accepted: TP-20260001',
    html: '<p>accepted staff html</p>',
    text: 'accepted staff text',
  }),
  buildDepositReceivedEmail: jest.fn().mockReturnValue({
    subject: 'Deposit Received - TP-20260001 | Walla Walla Travel',
    html: '<p>deposit customer html</p>',
    text: 'deposit customer text',
  }),
  buildDepositReceivedStaffEmail: jest.fn().mockReturnValue({
    subject: 'Deposit Received: TP-20260001 - $1,250.00',
    html: '<p>deposit staff html</p>',
    text: 'deposit staff text',
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockSendEmail = require('@/lib/email').sendEmail as jest.Mock;
const mockQuery = require('@/lib/db-helpers').query as jest.Mock;
const mockQueryOne = require('@/lib/db-helpers').queryOne as jest.Mock;
const mockGetById = require('@/lib/services/trip-proposal.service').tripProposalService.getById as jest.Mock;

import { tripProposalEmailService } from '@/lib/services/trip-proposal-email.service';

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
    valid_until: '2026-07-15',
    brand_id: 1,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TripProposalEmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockQueryOne.mockReset();
    mockSendEmail.mockReset();
    mockGetById.mockReset();

    // Default: email not already sent
    mockQueryOne.mockResolvedValue(null);
    // Default: sendEmail succeeds
    mockSendEmail.mockResolvedValue(true);
    // Default: logEmail query succeeds
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  // ==========================================================================
  // sendProposalSentEmail
  // ==========================================================================

  describe('sendProposalSentEmail', () => {
    it('should fetch proposal, build template, send email, and log to email_logs', async () => {
      const proposal = makeProposal();
      mockGetById.mockResolvedValue(proposal);

      await tripProposalEmailService.sendProposalSentEmail(1);

      // Should fetch proposal
      expect(mockGetById).toHaveBeenCalledWith(1);

      // Should send email
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: expect.stringContaining('Trip Proposal is Ready'),
        })
      );

      // Should log email to email_logs (INSERT INTO email_logs)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_logs'),
        expect.arrayContaining([1, 'trip_proposal_sent', 'jane@example.com']),
      );
    });

    it('should skip if email already sent (idempotency)', async () => {
      // queryOne returns a row indicating email was already sent
      mockQueryOne.mockResolvedValue({ id: 99 });

      await tripProposalEmailService.sendProposalSentEmail(1);

      // Should NOT fetch proposal (short-circuits)
      expect(mockGetById).not.toHaveBeenCalled();
      // Should NOT send email
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should handle missing customer email gracefully', async () => {
      const proposal = makeProposal({ customer_email: null });
      mockGetById.mockResolvedValue(proposal);

      await tripProposalEmailService.sendProposalSentEmail(1);

      // Should NOT send email
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should handle proposal not found gracefully', async () => {
      mockGetById.mockResolvedValue(null);

      // Should not throw
      await tripProposalEmailService.sendProposalSentEmail(999);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // sendProposalAcceptedEmail
  // ==========================================================================

  describe('sendProposalAcceptedEmail', () => {
    it('should send both customer and staff emails', async () => {
      const proposal = makeProposal({ status: 'accepted' });
      mockGetById.mockResolvedValue(proposal);

      await tripProposalEmailService.sendProposalAcceptedEmail(1);

      // Should send 2 emails: one to customer, one to staff
      expect(mockSendEmail).toHaveBeenCalledTimes(2);

      // Customer email
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: expect.stringContaining('Confirmed'),
        })
      );

      // Staff notification email
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Trip Proposal Accepted'),
        })
      );
    });

    it('should handle proposal not found gracefully', async () => {
      mockGetById.mockResolvedValue(null);

      await tripProposalEmailService.sendProposalAcceptedEmail(999);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should skip if email already sent (idempotency)', async () => {
      mockQueryOne.mockResolvedValue({ id: 42 });

      await tripProposalEmailService.sendProposalAcceptedEmail(1);

      expect(mockGetById).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // sendDepositReceivedEmail
  // ==========================================================================

  describe('sendDepositReceivedEmail', () => {
    it('should send customer receipt and staff notification emails', async () => {
      const proposal = makeProposal({ status: 'accepted', deposit_paid: true });
      mockGetById.mockResolvedValue(proposal);

      await tripProposalEmailService.sendDepositReceivedEmail(1, 1250);

      // Should send 2 emails: customer receipt + staff notification
      expect(mockSendEmail).toHaveBeenCalledTimes(2);

      // Customer receipt
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: expect.stringContaining('Deposit Received'),
        })
      );

      // Staff notification
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Deposit Received'),
        })
      );
    });

    it('should handle proposal not found gracefully', async () => {
      mockGetById.mockResolvedValue(null);

      await tripProposalEmailService.sendDepositReceivedEmail(999, 1250);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should skip if email already sent (idempotency)', async () => {
      mockQueryOne.mockResolvedValue({ id: 55 });

      await tripProposalEmailService.sendDepositReceivedEmail(1, 1250);

      expect(mockGetById).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should still send staff email even when customer email is missing', async () => {
      const proposal = makeProposal({ customer_email: null });
      mockGetById.mockResolvedValue(proposal);

      await tripProposalEmailService.sendDepositReceivedEmail(1, 1250);

      // Should send only the staff notification (not the customer receipt)
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Deposit Received'),
        })
      );
    });
  });
});
