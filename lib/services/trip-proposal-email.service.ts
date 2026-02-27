/**
 * Trip Proposal Email Service
 *
 * Orchestrates email sending for the trip proposal lifecycle:
 *   - Proposal sent to customer
 *   - Proposal accepted (customer + staff)
 *   - Deposit received (customer + staff)
 *
 * Each method: fetches proposal data → builds template → sends via sendEmail → logs to email_logs
 *
 * @module lib/services/trip-proposal-email.service
 */

import { sendEmail } from '@/lib/email';
import { query, queryOne } from '@/lib/db-helpers';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { logger } from '@/lib/logger';
import {
  buildProposalSentEmail,
  buildProposalAcceptedEmail,
  buildProposalAcceptedStaffEmail,
  buildDepositReceivedEmail,
  buildDepositReceivedStaffEmail,
} from '@/lib/email/templates/trip-proposal-emails';

const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';

// ---------------------------------------------------------------------------
// Helper: format dates for display in emails
// ---------------------------------------------------------------------------

function formatDateForEmail(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getTripTypeLabel(type: string | null | undefined): string {
  const labels: Record<string, string> = {
    wine_tour: 'Wine Tour',
    wine_group: 'Wine Group',
    multi_day_wine: 'Multi-Day Wine Experience',
    celebration: 'Celebration',
    bachelor: 'Bachelor Party',
    corporate: 'Corporate Event',
    birthday: 'Birthday Celebration',
    anniversary: 'Anniversary',
    wedding: 'Wedding',
    family: 'Family Outing',
    romantic: 'Romantic Getaway',
    custom: 'Custom Experience',
    other: 'Custom Experience',
  };
  return type ? labels[type] || type : 'Wine Country Experience';
}

// ---------------------------------------------------------------------------
// Helper: check if an email type was already sent for a proposal (idempotency)
// ---------------------------------------------------------------------------

async function wasEmailAlreadySent(proposalId: number, emailType: string): Promise<boolean> {
  try {
    const existing = await queryOne(
      `SELECT id FROM email_logs
       WHERE trip_proposal_id = $1 AND email_type = $2 AND status = 'sent'
       LIMIT 1`,
      [proposalId, emailType]
    );
    return !!existing;
  } catch {
    // email_logs table may not exist yet; proceed with sending
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper: log sent email to email_logs
// ---------------------------------------------------------------------------

async function logEmail(
  proposalId: number,
  emailType: string,
  recipient: string,
  subject: string,
  success: boolean
): Promise<void> {
  try {
    await query(
      `INSERT INTO email_logs (
        trip_proposal_id, email_type, recipient, subject, sent_at, status
      ) VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [proposalId, emailType, recipient, subject, success ? 'sent' : 'failed']
    );
  } catch (err) {
    logger.warn('[TripProposalEmail] Failed to log email', {
      proposalId,
      emailType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

class TripProposalEmailService {
  /**
   * Send "Proposal Sent" email to customer.
   * Triggered when admin changes status to 'sent'.
   */
  async sendProposalSentEmail(proposalId: number, customMessage?: string): Promise<void> {
    const emailType = 'trip_proposal_sent';

    try {
      // Idempotency check
      if (await wasEmailAlreadySent(proposalId, emailType)) {
        logger.info('[TripProposalEmail] Proposal sent email already sent', { proposalId });
        return;
      }

      const proposal = await tripProposalService.getById(proposalId);
      if (!proposal) {
        logger.warn('[TripProposalEmail] Proposal not found', { proposalId });
        return;
      }

      if (!proposal.customer_email) {
        logger.warn('[TripProposalEmail] No customer email on proposal', { proposalId });
        return;
      }

      const brandId = proposal.brand_id ?? undefined;
      const brand = getBrandEmailConfig(brandId);
      const template = buildProposalSentEmail({
        customer_name: proposal.customer_name,
        proposal_number: proposal.proposal_number,
        access_token: proposal.access_token,
        trip_type: getTripTypeLabel(proposal.trip_type),
        start_date: formatDateForEmail(proposal.start_date),
        end_date: formatDateForEmail(proposal.end_date || proposal.start_date),
        party_size: proposal.party_size,
        total: Number(proposal.total) || 0,
        deposit_amount: Number(proposal.deposit_amount) || 0,
        valid_until: formatDateForEmail(proposal.valid_until),
        brand_id: proposal.brand_id || 1,
        custom_message: customMessage,
      });

      const success = await sendEmail({
        to: proposal.customer_email,
        from: `${brand.name} <${brand.from_email}>`,
        replyTo: brand.reply_to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      await logEmail(proposalId, emailType, proposal.customer_email, template.subject, success);

      // CRM sync (non-blocking)
      crmSyncService.logEmailSent({
        customerEmail: proposal.customer_email,
        subject: template.subject,
        emailType,
      }).catch(() => {});

      logger.info('[TripProposalEmail] Proposal sent email completed', {
        proposalId,
        success,
        to: proposal.customer_email,
      });
    } catch (error) {
      logger.error('[TripProposalEmail] Error sending proposal sent email', {
        proposalId,
        error,
      });
    }
  }

  /**
   * Send "Proposal Accepted" emails:
   *   - Customer: confirmation with "Pay Deposit Now" CTA
   *   - Staff: notification with customer details
   * Triggered after customer accepts the proposal.
   */
  async sendProposalAcceptedEmail(proposalId: number): Promise<void> {
    const emailType = 'trip_proposal_accepted';

    try {
      // Idempotency check
      if (await wasEmailAlreadySent(proposalId, emailType)) {
        logger.info('[TripProposalEmail] Accepted email already sent', { proposalId });
        return;
      }

      const proposal = await tripProposalService.getById(proposalId);
      if (!proposal) {
        logger.warn('[TripProposalEmail] Proposal not found', { proposalId });
        return;
      }

      const brandId = proposal.brand_id ?? undefined;
      const brand = getBrandEmailConfig(brandId);
      const total = Number(proposal.total) || 0;
      const depositAmount = Number(proposal.deposit_amount) || 0;

      // Customer email
      if (proposal.customer_email) {
        const customerTemplate = buildProposalAcceptedEmail({
          customer_name: proposal.customer_name,
          proposal_number: proposal.proposal_number,
          access_token: proposal.access_token,
          trip_type: getTripTypeLabel(proposal.trip_type),
          start_date: formatDateForEmail(proposal.start_date),
          end_date: formatDateForEmail(proposal.end_date || proposal.start_date),
          party_size: proposal.party_size,
          total,
          deposit_amount: depositAmount,
          brand_id: proposal.brand_id || 1,
        });

        const customerSuccess = await sendEmail({
          to: proposal.customer_email,
          from: `${brand.name} <${brand.from_email}>`,
          replyTo: brand.reply_to,
          subject: customerTemplate.subject,
          html: customerTemplate.html,
          text: customerTemplate.text,
        });

        await logEmail(proposalId, emailType, proposal.customer_email, customerTemplate.subject, customerSuccess);

        // CRM sync (non-blocking)
        crmSyncService.logEmailSent({
          customerEmail: proposal.customer_email,
          subject: customerTemplate.subject,
          emailType,
        }).catch(() => {});
      }

      // Staff notification
      const staffTemplate = buildProposalAcceptedStaffEmail({
        customer_name: proposal.customer_name,
        customer_email: proposal.customer_email || 'Not provided',
        proposal_number: proposal.proposal_number,
        trip_type: getTripTypeLabel(proposal.trip_type),
        start_date: formatDateForEmail(proposal.start_date),
        party_size: proposal.party_size,
        total,
        deposit_amount: depositAmount,
        brand_id: proposal.brand_id || 1,
        proposalId: proposal.id.toString(),
      });

      const staffSuccess = await sendEmail({
        to: STAFF_EMAIL,
        from: `${brand.name} <${brand.from_email}>`,
        subject: staffTemplate.subject,
        html: staffTemplate.html,
        text: staffTemplate.text,
      });

      await logEmail(proposalId, `${emailType}_staff`, STAFF_EMAIL, staffTemplate.subject, staffSuccess);

      logger.info('[TripProposalEmail] Accepted emails completed', {
        proposalId,
        customerEmail: proposal.customer_email,
      });
    } catch (error) {
      logger.error('[TripProposalEmail] Error sending accepted emails', {
        proposalId,
        error,
      });
    }
  }

  /**
   * Send "Deposit Received" emails:
   *   - Customer: receipt with amount paid, balance remaining, next steps
   *   - Staff: notification that deposit was received
   * Triggered after deposit payment is confirmed.
   */
  async sendDepositReceivedEmail(proposalId: number, amountPaid: number): Promise<void> {
    const emailType = 'trip_proposal_deposit_received';

    try {
      // Idempotency check
      if (await wasEmailAlreadySent(proposalId, emailType)) {
        logger.info('[TripProposalEmail] Deposit received email already sent', { proposalId });
        return;
      }

      const proposal = await tripProposalService.getById(proposalId);
      if (!proposal) {
        logger.warn('[TripProposalEmail] Proposal not found', { proposalId });
        return;
      }

      const brandId = proposal.brand_id ?? undefined;
      const brand = getBrandEmailConfig(brandId);
      const total = Number(proposal.total) || 0;
      const depositAmount = Number(proposal.deposit_amount) || 0;
      const balanceRemaining = total - amountPaid;

      // Customer receipt
      if (proposal.customer_email) {
        const customerTemplate = buildDepositReceivedEmail({
          customer_name: proposal.customer_name,
          proposal_number: proposal.proposal_number,
          trip_type: getTripTypeLabel(proposal.trip_type),
          start_date: formatDateForEmail(proposal.start_date),
          party_size: proposal.party_size,
          total,
          deposit_amount: depositAmount,
          amount_paid: amountPaid,
          balance_remaining: balanceRemaining,
          brand_id: proposal.brand_id || 1,
        });

        const customerSuccess = await sendEmail({
          to: proposal.customer_email,
          from: `${brand.name} <${brand.from_email}>`,
          replyTo: brand.reply_to,
          subject: customerTemplate.subject,
          html: customerTemplate.html,
          text: customerTemplate.text,
        });

        await logEmail(proposalId, emailType, proposal.customer_email, customerTemplate.subject, customerSuccess);

        // CRM sync (non-blocking)
        crmSyncService.logEmailSent({
          customerEmail: proposal.customer_email,
          subject: customerTemplate.subject,
          emailType,
        }).catch(() => {});
      }

      // Staff notification
      const staffTemplate = buildDepositReceivedStaffEmail({
        customer_name: proposal.customer_name,
        customer_email: proposal.customer_email || 'Not provided',
        proposal_number: proposal.proposal_number,
        amount_paid: amountPaid,
        total,
        balance_remaining: balanceRemaining,
        brand_id: proposal.brand_id || 1,
      });

      const staffSuccess = await sendEmail({
        to: STAFF_EMAIL,
        from: `${brand.name} <${brand.from_email}>`,
        subject: staffTemplate.subject,
        html: staffTemplate.html,
        text: staffTemplate.text,
      });

      await logEmail(proposalId, `${emailType}_staff`, STAFF_EMAIL, staffTemplate.subject, staffSuccess);

      logger.info('[TripProposalEmail] Deposit received emails completed', {
        proposalId,
        amountPaid,
        customerEmail: proposal.customer_email,
      });
    } catch (error) {
      logger.error('[TripProposalEmail] Error sending deposit received emails', {
        proposalId,
        error,
      });
    }
  }
}

export const tripProposalEmailService = new TripProposalEmailService();
