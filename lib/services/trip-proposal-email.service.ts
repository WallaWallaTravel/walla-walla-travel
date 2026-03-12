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
import { prisma } from '@/lib/prisma';
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
import { buildRegistrationConfirmationEmail } from '@/lib/email/templates/registration-confirmation-email';
import { emailPreferencesService } from '@/lib/services/email-preferences.service';

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
    const rows = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM email_logs
       WHERE trip_proposal_id = $1 AND email_type = $2 AND status = 'sent'
       LIMIT 1`,
      proposalId, emailType
    );
    return !!rows[0];
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
    await prisma.$queryRawUnsafe(
      `INSERT INTO email_logs (
        trip_proposal_id, email_type, recipient, subject, sent_at, status
      ) VALUES ($1, $2, $3, $4, NOW(), $5)`,
      proposalId, emailType, recipient, subject, success ? 'sent' : 'failed'
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

      // CAN-SPAM: Check if recipient has unsubscribed
      if (await emailPreferencesService.isUnsubscribed(proposal.customer_email)) {
        logger.info('[TripProposalEmail] Skipping proposal sent email — recipient unsubscribed', {
          proposalId,
          email: proposal.customer_email,
        });
        return;
      }

      // Get unsubscribe token and headers
      const pref = await emailPreferencesService.getOrCreatePreference(proposal.customer_email);
      const unsubscribeUrl = emailPreferencesService.getUnsubscribeUrl(pref.unsubscribe_token);
      const unsubscribeHeaders = emailPreferencesService.getUnsubscribeHeaders(pref.unsubscribe_token);

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
        unsubscribe_url: unsubscribeUrl,
      });

      const success = await sendEmail({
        to: proposal.customer_email,
        from: `${brand.name} <${brand.from_email}>`,
        replyTo: brand.reply_to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: unsubscribeHeaders,
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
        // CAN-SPAM: Check if recipient has unsubscribed
        const customerUnsubscribed = await emailPreferencesService.isUnsubscribed(proposal.customer_email);
        if (customerUnsubscribed) {
          logger.info('[TripProposalEmail] Skipping accepted customer email — recipient unsubscribed', {
            proposalId,
            email: proposal.customer_email,
          });
        } else {
          const pref = await emailPreferencesService.getOrCreatePreference(proposal.customer_email);
          const unsubscribeUrl = emailPreferencesService.getUnsubscribeUrl(pref.unsubscribe_token);
          const unsubscribeHeaders = emailPreferencesService.getUnsubscribeHeaders(pref.unsubscribe_token);

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
            unsubscribe_url: unsubscribeUrl,
          });

          const customerSuccess = await sendEmail({
            to: proposal.customer_email,
            from: `${brand.name} <${brand.from_email}>`,
            replyTo: brand.reply_to,
            subject: customerTemplate.subject,
            html: customerTemplate.html,
            text: customerTemplate.text,
            headers: unsubscribeHeaders,
          });

          await logEmail(proposalId, emailType, proposal.customer_email, customerTemplate.subject, customerSuccess);

          // CRM sync (non-blocking)
          crmSyncService.logEmailSent({
            customerEmail: proposal.customer_email,
            subject: customerTemplate.subject,
            emailType,
          }).catch(() => {});
        }
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
        // CAN-SPAM: Check if recipient has unsubscribed
        const customerUnsubscribed = await emailPreferencesService.isUnsubscribed(proposal.customer_email);
        if (customerUnsubscribed) {
          logger.info('[TripProposalEmail] Skipping deposit received customer email — recipient unsubscribed', {
            proposalId,
            email: proposal.customer_email,
          });
        } else {
          const pref = await emailPreferencesService.getOrCreatePreference(proposal.customer_email);
          const unsubscribeUrl = emailPreferencesService.getUnsubscribeUrl(pref.unsubscribe_token);
          const unsubscribeHeaders = emailPreferencesService.getUnsubscribeHeaders(pref.unsubscribe_token);

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
            unsubscribe_url: unsubscribeUrl,
          });

          const customerSuccess = await sendEmail({
            to: proposal.customer_email,
            from: `${brand.name} <${brand.from_email}>`,
            replyTo: brand.reply_to,
            subject: customerTemplate.subject,
            html: customerTemplate.html,
            text: customerTemplate.text,
            headers: unsubscribeHeaders,
          });

          await logEmail(proposalId, emailType, proposal.customer_email, customerTemplate.subject, customerSuccess);

          // CRM sync (non-blocking)
          crmSyncService.logEmailSent({
            customerEmail: proposal.customer_email,
            subject: customerTemplate.subject,
            emailType,
          }).catch(() => {});
        }
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

  /**
   * Send "Registration Confirmation" email to a guest.
   * Triggered after a guest registers (with or without a deposit payment).
   */
  async sendRegistrationConfirmationEmail(
    proposalId: number,
    guestId: number,
    depositAmount?: number
  ): Promise<void> {
    const emailType = 'registration_confirmation';
    try {
      const proposal = await tripProposalService.getById(proposalId);
      if (!proposal) {
        logger.warn('[TripProposalEmail] Proposal not found for registration confirmation', { proposalId });
        return;
      }

      // Get guest info
      const guestRows = await prisma.$queryRawUnsafe<{ name: string; email: string | null; guest_access_token: string }[]>(
        `SELECT name, email, guest_access_token FROM trip_proposal_guests WHERE id = $1 AND trip_proposal_id = $2`,
        guestId, proposalId
      );
      const guest = guestRows[0];
      if (!guest?.email) {
        logger.warn('[TripProposalEmail] Guest has no email for registration confirmation', { proposalId, guestId });
        return;
      }

      // CAN-SPAM: check unsubscribe
      if (await emailPreferencesService.isUnsubscribed(guest.email)) {
        logger.info('[TripProposalEmail] Skipping registration confirmation — recipient unsubscribed', { email: guest.email });
        return;
      }

      const pref = await emailPreferencesService.getOrCreatePreference(guest.email);
      const unsubscribeUrl = emailPreferencesService.getUnsubscribeUrl(pref.unsubscribe_token);
      const unsubscribeHeaders = emailPreferencesService.getUnsubscribeHeaders(pref.unsubscribe_token);

      const brandId = proposal.brand_id ?? undefined;
      const brand = getBrandEmailConfig(brandId);
      const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';
      const portalUrl = `${BASE_URL}/my-trip/${proposal.access_token}?guest=${guest.guest_access_token}`;

      const template = buildRegistrationConfirmationEmail({
        guest_name: guest.name,
        trip_title: proposal.trip_title || proposal.proposal_number,
        start_date: formatDateForEmail(proposal.start_date),
        end_date: formatDateForEmail(proposal.end_date || null),
        deposit_amount: depositAmount,
        portal_url: portalUrl,
        brand_id: proposal.brand_id || 1,
        unsubscribe_url: unsubscribeUrl,
      });

      const success = await sendEmail({
        to: guest.email,
        from: `${brand.name} <${brand.from_email}>`,
        replyTo: brand.reply_to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: unsubscribeHeaders,
      });

      await logEmail(proposalId, emailType, guest.email, template.subject, success);

      logger.info('[TripProposalEmail] Registration confirmation email sent', {
        proposalId,
        guestId,
        success,
        to: guest.email,
      });
    } catch (error) {
      logger.error('[TripProposalEmail] Error sending registration confirmation email', {
        proposalId,
        guestId,
        error,
      });
    }
  }
}

export const tripProposalEmailService = new TripProposalEmailService();
