/**
 * CRM Sync Service
 *
 * @module lib/services/crm-sync.service
 * @description Automatically synchronizes data between the CRM module and other
 * parts of the application (customers, bookings, corporate requests, proposals).
 *
 * @features
 * - Auto-create CRM contacts from customers
 * - Create CRM deals from corporate requests
 * - Sync booking status to CRM deals
 * - Log activities for proposals, payments, and communications
 */

import { BaseService } from './base.service';
import type {
  CrmContact,
  CrmDeal,
  CrmActivity,
  Brand,
  ActivityType,
} from '@/types/crm';

// ============================================================================
// Types
// ============================================================================

export interface SyncCustomerData {
  customerId: number;
  email: string;
  name: string;
  phone?: string | null;
  source?: string;
  sourceDetail?: string;
}

export interface SyncCorporateRequestData {
  requestId: number;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  eventType: string;
  partySize: number;
  preferredDates?: string[];
  budgetRange?: string | null;
  brand?: Brand;
}

export interface SyncTripProposalData {
  proposalId: number;
  proposalNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCompany?: string | null;
  partySize: number;
  startDate: string;
  estimatedValue?: number;
  brand?: Brand;
}

export interface SyncConsultationData {
  tripId: number;
  shareCode: string;
  tripTitle: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  tripType: string;
  partySize: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  brand?: Brand;
}

export interface SyncBookingData {
  bookingId: number;
  customerId: number;
  customerEmail: string;
  customerName: string;
  tourDate: string;
  partySize: number;
  totalAmount: number;
  status: string;
  brand?: Brand;
}

export interface LogActivityData {
  contactId?: number;
  dealId?: number;
  activityType: ActivityType;
  subject: string;
  body?: string;
  performedBy?: number;
}

// ============================================================================
// Service
// ============================================================================

class CrmSyncService extends BaseService {
  protected get serviceName(): string {
    return 'CrmSyncService';
  }

  // ==========================================================================
  // Customer → CRM Contact Sync
  // ==========================================================================

  /**
   * Find or create a CRM contact from a customer
   * Called when a customer is created or updated
   */
  async syncCustomerToContact(data: SyncCustomerData): Promise<CrmContact> {
    this.log('Syncing customer to CRM contact', { customerId: data.customerId, email: data.email });

    // Check if CRM contact already exists for this customer
    let contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE customer_id = $1`,
      [data.customerId]
    );

    if (contact) {
      // Update existing contact
      this.log('Updating existing CRM contact', { contactId: contact.id });

      contact = await this.queryOne<CrmContact>(
        `UPDATE crm_contacts
         SET name = $1, phone = COALESCE($2, phone), updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [data.name, data.phone, contact.id]
      );

      return contact!;
    }

    // Check if contact exists by email (might have been created manually)
    contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [data.email]
    );

    if (contact) {
      // Link existing contact to customer
      this.log('Linking existing CRM contact to customer', { contactId: contact.id, customerId: data.customerId });

      contact = await this.queryOne<CrmContact>(
        `UPDATE crm_contacts
         SET customer_id = $1, name = $2, phone = COALESCE($3, phone), updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [data.customerId, data.name, data.phone, contact.id]
      );

      return contact!;
    }

    // Create new CRM contact
    this.log('Creating new CRM contact from customer', { customerId: data.customerId });

    contact = await this.queryOne<CrmContact>(
      `INSERT INTO crm_contacts (
        email, name, phone, customer_id, contact_type, lifecycle_stage,
        lead_temperature, source, source_detail, brand_id
      ) VALUES ($1, $2, $3, $4, 'individual', 'customer', 'warm', $5, $6, $7)
      RETURNING *`,
      [data.email, data.name, data.phone, data.customerId, data.source || 'booking', data.sourceDetail, null]
    );

    this.log('CRM contact created', { contactId: contact!.id });
    return contact!;
  }

  /**
   * Get CRM contact for a customer, creating if needed
   */
  async getOrCreateContactForCustomer(customerId: number): Promise<CrmContact | null> {
    // First check if already linked
    const contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE customer_id = $1`,
      [customerId]
    );

    if (contact) return contact;

    // Get customer data
    const customer = await this.queryOne<{
      id: number;
      email: string;
      name: string;
      phone: string | null;
    }>(`SELECT id, email, name, phone FROM customers WHERE id = $1`, [customerId]);

    if (!customer) return null;

    // Sync customer to CRM
    return this.syncCustomerToContact({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      source: 'booking',
    });
  }

  // ==========================================================================
  // Corporate Request → CRM Sync
  // ==========================================================================

  /**
   * Create CRM contact and deal from a corporate request
   */
  async syncCorporateRequest(data: SyncCorporateRequestData): Promise<{
    contact: CrmContact;
    deal: CrmDeal;
  }> {
    this.log('Syncing corporate request to CRM', { requestId: data.requestId });

    // Find or create contact
    let contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [data.contactEmail]
    );

    if (!contact) {
      contact = await this.queryOne<CrmContact>(
        `INSERT INTO crm_contacts (
          email, name, phone, company, contact_type, lifecycle_stage,
          lead_temperature, source, source_detail, brand_id
        ) VALUES ($1, $2, $3, $4, 'corporate', 'lead', 'hot', 'corporate_request', $5, $6)
        RETURNING *`,
        [data.contactEmail, data.contactName, data.contactPhone, data.companyName, data.eventType, this.getBrandId(data.brand)]
      );
    } else {
      // Update contact to corporate if it was individual
      await this.query(
        `UPDATE crm_contacts
         SET contact_type = 'corporate',
             company = COALESCE(company, $1),
             lead_temperature = 'hot',
             updated_at = NOW()
         WHERE id = $2`,
        [data.companyName, contact.id]
      );
    }

    // Get the appropriate pipeline template and first stage
    const brand = data.brand || 'walla_walla_travel';
    const stage = await this.queryOne<{ id: number; template_id: number }>(
      `SELECT ps.id, ps.template_id
       FROM crm_pipeline_stages ps
       JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
       WHERE (pt.brand = $1 OR pt.brand IS NULL)
         AND ps.is_won = false AND ps.is_lost = false
       ORDER BY pt.is_default DESC, ps.sort_order ASC
       LIMIT 1`,
      [brand]
    );

    if (!stage) {
      throw new Error('No pipeline stage found for corporate request');
    }

    // Create deal
    const dealTitle = `${data.companyName} - ${data.eventType}`;
    const tourDate = data.preferredDates?.[0] || null;

    const deal = await this.queryOne<CrmDeal>(
      `INSERT INTO crm_deals (
        contact_id, stage_id, brand, title, description,
        party_size, expected_tour_date, corporate_request_id, brand_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        contact!.id,
        stage.id,
        brand,
        dealTitle,
        `Budget: ${data.budgetRange || 'Not specified'}`,
        data.partySize,
        tourDate,
        data.requestId,
        this.getBrandId(brand),
      ]
    );

    // Update corporate request with CRM links
    await this.query(
      `UPDATE corporate_requests
       SET crm_contact_id = $1, crm_deal_id = $2
       WHERE id = $3`,
      [contact!.id, deal!.id, data.requestId]
    );

    // Log activity
    await this.logActivity({
      contactId: contact!.id,
      dealId: deal!.id,
      activityType: 'system',
      subject: 'Corporate request received',
      body: `New ${data.eventType} request for ${data.partySize} guests from ${data.companyName}`,
    });

    this.log('Corporate request synced to CRM', {
      contactId: contact!.id,
      dealId: deal!.id,
    });

    return { contact: contact!, deal: deal! };
  }

  // ==========================================================================
  // Trip Consultation (Handoff) → CRM Sync
  // ==========================================================================

  /**
   * Create CRM contact and deal from a trip consultation (handoff request)
   */
  async syncConsultationToContact(data: SyncConsultationData): Promise<{
    contact: CrmContact;
    deal: CrmDeal;
  }> {
    this.log('Syncing consultation to CRM', { tripId: data.tripId, shareCode: data.shareCode });

    // Find or create contact by email
    let contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [data.ownerEmail]
    );

    if (!contact) {
      contact = await this.queryOne<CrmContact>(
        `INSERT INTO crm_contacts (
          email, name, phone, contact_type, lifecycle_stage,
          lead_temperature, source, source_detail, brand_id
        ) VALUES ($1, $2, $3, 'individual', 'lead', 'warm', 'consultation', $4, $5)
        RETURNING *`,
        [data.ownerEmail, data.ownerName, data.ownerPhone, `Trip: ${data.tripTitle}`, this.getBrandId(data.brand)]
      );
    } else {
      // Update existing contact if they're still a lead
      await this.query(
        `UPDATE crm_contacts
         SET name = COALESCE(NULLIF($1, ''), name),
             phone = COALESCE($2, phone),
             lead_temperature = CASE
               WHEN lead_temperature = 'cold' THEN 'warm'
               ELSE lead_temperature
             END,
             updated_at = NOW()
         WHERE id = $3`,
        [data.ownerName, data.ownerPhone, contact.id]
      );
    }

    // Check if deal already exists for this consultation
    let deal = await this.queryOne<CrmDeal>(
      `SELECT * FROM crm_deals WHERE consultation_id = $1`,
      [data.tripId]
    );

    if (deal) {
      this.log('Deal already exists for consultation', { dealId: deal.id });
      return { contact: contact!, deal };
    }

    // Get the appropriate pipeline template and first stage
    const brand = data.brand || 'walla_walla_travel';
    const stageId = await this.getDefaultStageId(brand);

    if (!stageId) {
      throw new Error('No pipeline stage found for consultation');
    }

    // Create deal
    const dealTitle = data.tripTitle || `Trip Consultation - ${data.ownerName}`;
    const tourDate = data.startDate || null;

    deal = await this.queryOne<CrmDeal>(
      `INSERT INTO crm_deals (
        contact_id, stage_id, brand, title, description,
        party_size, expected_tour_date, consultation_id, brand_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        contact!.id,
        stageId,
        brand,
        dealTitle,
        data.notes || `${data.tripType} trip consultation`,
        data.partySize,
        tourDate,
        data.tripId,
        this.getBrandId(brand),
      ]
    );

    // Log activity
    await this.logActivity({
      contactId: contact!.id,
      dealId: deal!.id,
      activityType: 'system',
      subject: 'Consultation request received',
      body: `Trip consultation "${data.tripTitle}" for ${data.partySize} guests${data.startDate ? ` on ${data.startDate}` : ''}`,
    });

    this.log('Consultation synced to CRM', {
      contactId: contact!.id,
      dealId: deal!.id,
    });

    return { contact: contact!, deal: deal! };
  }

  // ==========================================================================
  // Booking → CRM Deal Sync
  // ==========================================================================

  /**
   * Create or update CRM deal when a booking is created
   */
  async syncBookingToDeal(data: SyncBookingData): Promise<CrmDeal | null> {
    this.log('Syncing booking to CRM deal', { bookingId: data.bookingId });

    // Get or create contact
    const contact = await this.getOrCreateContactForCustomer(data.customerId);
    if (!contact) {
      this.log('Could not find/create contact for booking', { customerId: data.customerId });
      return null;
    }

    // Check if deal already exists for this booking
    let deal = await this.queryOne<CrmDeal>(
      `SELECT * FROM crm_deals WHERE booking_id = $1`,
      [data.bookingId]
    );

    if (deal) {
      // Update existing deal
      return this.updateDealFromBookingStatus(deal.id, data.status, data.totalAmount);
    }

    // Get appropriate pipeline stage based on booking status
    const brand = data.brand || 'nw_touring';
    const stageName = this.getStageNameForBookingStatus(data.status);

    const stage = await this.queryOne<{ id: number }>(
      `SELECT ps.id
       FROM crm_pipeline_stages ps
       JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
       WHERE (pt.brand = $1 OR pt.brand IS NULL)
         AND LOWER(ps.name) = LOWER($2)
       ORDER BY pt.is_default DESC
       LIMIT 1`,
      [brand, stageName]
    );

    // Fallback to first non-terminal stage if specific stage not found
    const stageId = stage?.id || await this.getDefaultStageId(brand);

    if (!stageId) {
      this.log('No pipeline stage found for booking', { brand });
      return null;
    }

    // Create deal
    deal = await this.queryOne<CrmDeal>(
      `INSERT INTO crm_deals (
        contact_id, stage_id, brand, title,
        party_size, expected_tour_date, estimated_value, booking_id, brand_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        contact.id,
        stageId,
        brand,
        `Tour - ${data.customerName}`,
        data.partySize,
        data.tourDate,
        data.totalAmount,
        data.bookingId,
        this.getBrandId(brand),
      ]
    );

    this.log('Deal created from booking', { dealId: deal!.id, bookingId: data.bookingId });
    return deal;
  }

  /**
   * Update deal when booking status changes
   */
  async updateDealFromBookingStatus(
    dealId: number,
    bookingStatus: string,
    amount?: number
  ): Promise<CrmDeal | null> {
    this.log('Updating deal from booking status', { dealId, bookingStatus });

    // Get current deal
    const deal = await this.queryOne<CrmDeal & { brand: Brand }>(
      `SELECT * FROM crm_deals WHERE id = $1`,
      [dealId]
    );

    if (!deal) return null;

    const brand = deal.brand || 'nw_touring';

    // Map booking status to deal action
    if (bookingStatus === 'completed' || bookingStatus === 'paid') {
      // Move to Won stage
      const wonStage = await this.queryOne<{ id: number }>(
        `SELECT ps.id
         FROM crm_pipeline_stages ps
         JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
         WHERE (pt.brand = $1 OR pt.brand IS NULL)
           AND ps.is_won = true
         ORDER BY pt.is_default DESC
         LIMIT 1`,
        [brand]
      );

      if (wonStage) {
        return this.queryOne<CrmDeal>(
          `UPDATE crm_deals
           SET stage_id = $1, won_at = NOW(), actual_value = COALESCE($2, estimated_value),
               stage_changed_at = NOW(), updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [wonStage.id, amount, dealId]
        );
      }
    } else if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') {
      // Move to Lost stage
      const lostStage = await this.queryOne<{ id: number }>(
        `SELECT ps.id
         FROM crm_pipeline_stages ps
         JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
         WHERE (pt.brand = $1 OR pt.brand IS NULL)
           AND ps.is_lost = true
         ORDER BY pt.is_default DESC
         LIMIT 1`,
        [brand]
      );

      if (lostStage) {
        return this.queryOne<CrmDeal>(
          `UPDATE crm_deals
           SET stage_id = $1, lost_at = NOW(), lost_reason = $2,
               stage_changed_at = NOW(), updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [lostStage.id, `Booking ${bookingStatus}`, dealId]
        );
      }
    }

    return deal;
  }

  /**
   * Sync booking status change to CRM
   */
  async onBookingStatusChange(
    bookingId: number,
    newStatus: string,
    amount?: number
  ): Promise<void> {
    const deal = await this.queryOne<CrmDeal>(
      `SELECT * FROM crm_deals WHERE booking_id = $1`,
      [bookingId]
    );

    if (deal) {
      await this.updateDealFromBookingStatus(deal.id, newStatus, amount);

      // Log activity
      await this.logActivity({
        dealId: deal.id,
        contactId: deal.contact_id,
        activityType: 'status_change',
        subject: `Booking status: ${newStatus}`,
        body: amount ? `Amount: $${amount}` : undefined,
      });
    }
  }

  // ==========================================================================
  // Trip Proposal → CRM Deal Sync
  // ==========================================================================

  /**
   * Create or update CRM deal when a trip proposal is created
   */
  async syncTripProposalToDeal(data: SyncTripProposalData): Promise<{
    contact: CrmContact;
    deal: CrmDeal;
  } | null> {
    this.log('Syncing trip proposal to CRM deal', { proposalId: data.proposalId });

    // Find or create contact by email
    let contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [data.customerEmail]
    );

    if (!contact) {
      // Create new contact
      contact = await this.queryOne<CrmContact>(
        `INSERT INTO crm_contacts (
          email, name, phone, company, contact_type, lifecycle_stage,
          lead_temperature, source, source_detail, brand_id
        ) VALUES ($1, $2, $3, $4, $5, 'lead', 'warm', 'trip_proposal', $6, $7)
        RETURNING *`,
        [
          data.customerEmail,
          data.customerName,
          data.customerPhone || null,
          data.customerCompany || null,
          data.customerCompany ? 'corporate' : 'individual',
          `Proposal ${data.proposalNumber}`,
          this.getBrandId(data.brand),
        ]
      );
    } else {
      // Update existing contact
      await this.query(
        `UPDATE crm_contacts
         SET name = COALESCE(NULLIF($1, ''), name),
             phone = COALESCE($2, phone),
             company = COALESCE($3, company),
             updated_at = NOW()
         WHERE id = $4`,
        [data.customerName, data.customerPhone, data.customerCompany, contact.id]
      );
    }

    if (!contact) {
      this.log('Could not create/find contact for trip proposal', { email: data.customerEmail });
      return null;
    }

    // Check if deal already exists for this trip proposal
    let deal = await this.queryOne<CrmDeal>(
      `SELECT * FROM crm_deals WHERE trip_proposal_id = $1`,
      [data.proposalId]
    );

    if (deal) {
      this.log('Deal already exists for trip proposal', { dealId: deal.id });
      return { contact, deal };
    }

    // Get appropriate pipeline stage (first non-terminal stage)
    const brand = data.brand || 'walla_walla_travel';
    const stageId = await this.getDefaultStageId(brand);

    if (!stageId) {
      this.log('No pipeline stage found for trip proposal', { brand });
      return null;
    }

    // Create deal
    deal = await this.queryOne<CrmDeal>(
      `INSERT INTO crm_deals (
        contact_id, stage_id, brand, title,
        party_size, expected_tour_date, estimated_value, trip_proposal_id, brand_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        contact.id,
        stageId,
        brand,
        `Trip Proposal - ${data.customerName}`,
        data.partySize,
        data.startDate,
        data.estimatedValue || null,
        data.proposalId,
        this.getBrandId(brand),
      ]
    );

    // Log activity
    await this.logActivity({
      contactId: contact.id,
      dealId: deal!.id,
      activityType: 'system',
      subject: `Trip proposal ${data.proposalNumber} created`,
      body: `New trip proposal for ${data.partySize} guests starting ${data.startDate}`,
    });

    this.log('Deal created from trip proposal', { dealId: deal!.id, proposalId: data.proposalId });

    return { contact, deal: deal! };
  }

  /**
   * Update CRM deal when trip proposal status changes
   */
  async onTripProposalStatusChange(
    proposalId: number,
    proposalNumber: string,
    newStatus: string,
    metadata?: {
      customerEmail?: string;
      amount?: number;
      bookingId?: number;
    }
  ): Promise<void> {
    this.log('Trip proposal status change', { proposalId, newStatus });

    // Get the deal for this proposal
    const deal = await this.queryOne<CrmDeal & { brand: Brand }>(
      `SELECT * FROM crm_deals WHERE trip_proposal_id = $1`,
      [proposalId]
    );

    if (!deal) {
      this.log('No deal found for trip proposal, skipping CRM update', { proposalId });
      return;
    }

    const brand = deal.brand || 'walla_walla_travel';

    // Map trip proposal status to deal stage action
    if (newStatus === 'sent') {
      // Move to "Quoted" stage
      const quotedStage = await this.queryOne<{ id: number }>(
        `SELECT ps.id
         FROM crm_pipeline_stages ps
         JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
         WHERE (pt.brand = $1 OR pt.brand IS NULL)
           AND LOWER(ps.name) = 'quoted'
         ORDER BY pt.is_default DESC
         LIMIT 1`,
        [brand]
      );

      if (quotedStage) {
        await this.query(
          `UPDATE crm_deals SET stage_id = $1, stage_changed_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [quotedStage.id, deal.id]
        );
      }

      // Update contact lifecycle stage
      if (deal.contact_id) {
        await this.query(
          `UPDATE crm_contacts SET lifecycle_stage = 'opportunity' WHERE id = $1 AND lifecycle_stage = 'lead'`,
          [deal.contact_id]
        );
      }
    } else if (newStatus === 'viewed') {
      // Log view activity (don't change stage, already at Quoted)
      await this.logActivity({
        dealId: deal.id,
        contactId: deal.contact_id,
        activityType: 'proposal_viewed',
        subject: `Proposal ${proposalNumber} viewed`,
      });
    } else if (newStatus === 'accepted') {
      // Move to "Won" stage
      const wonStage = await this.queryOne<{ id: number }>(
        `SELECT ps.id
         FROM crm_pipeline_stages ps
         JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
         WHERE (pt.brand = $1 OR pt.brand IS NULL)
           AND ps.is_won = true
         ORDER BY pt.is_default DESC
         LIMIT 1`,
        [brand]
      );

      if (wonStage) {
        await this.query(
          `UPDATE crm_deals
           SET stage_id = $1, won_at = NOW(), actual_value = COALESCE($2, estimated_value),
               stage_changed_at = NOW(), updated_at = NOW()
           WHERE id = $3`,
          [wonStage.id, metadata?.amount, deal.id]
        );
      }

      // Update contact lifecycle stage to customer
      if (deal.contact_id) {
        await this.query(
          `UPDATE crm_contacts SET lifecycle_stage = 'customer' WHERE id = $1`,
          [deal.contact_id]
        );
      }
    } else if (newStatus === 'converted' && metadata?.bookingId) {
      // Link deal to booking
      await this.query(
        `UPDATE crm_deals SET booking_id = $1, updated_at = NOW() WHERE id = $2`,
        [metadata.bookingId, deal.id]
      );
    } else if (newStatus === 'declined' || newStatus === 'expired') {
      // Move to "Lost" stage
      const lostStage = await this.queryOne<{ id: number }>(
        `SELECT ps.id
         FROM crm_pipeline_stages ps
         JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
         WHERE (pt.brand = $1 OR pt.brand IS NULL)
           AND ps.is_lost = true
         ORDER BY pt.is_default DESC
         LIMIT 1`,
        [brand]
      );

      if (lostStage) {
        await this.query(
          `UPDATE crm_deals
           SET stage_id = $1, lost_at = NOW(), lost_reason = $2,
               stage_changed_at = NOW(), updated_at = NOW()
           WHERE id = $3`,
          [lostStage.id, `Proposal ${newStatus}`, deal.id]
        );
      }
    }

    // Log status change activity
    await this.logActivity({
      dealId: deal.id,
      contactId: deal.contact_id,
      activityType: 'status_change',
      subject: `Proposal status: ${newStatus}`,
      body: `Trip proposal ${proposalNumber} changed to ${newStatus}`,
    });
  }

  /**
   * Get CRM contact and deal for a trip proposal
   */
  async getCrmDataForTripProposal(proposalId: number): Promise<{
    contact: CrmContact | null;
    deal: CrmDeal | null;
  }> {
    const deal = await this.queryOne<CrmDeal>(
      `SELECT * FROM crm_deals WHERE trip_proposal_id = $1`,
      [proposalId]
    );

    if (!deal) {
      return { contact: null, deal: null };
    }

    const contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE id = $1`,
      [deal.contact_id]
    );

    return { contact, deal };
  }

  // ==========================================================================
  // Activity Logging
  // ==========================================================================

  /**
   * Log an activity to the CRM
   */
  async logActivity(data: LogActivityData): Promise<CrmActivity> {
    this.log('Logging CRM activity', { type: data.activityType, subject: data.subject });

    const activity = await this.queryOne<CrmActivity>(
      `INSERT INTO crm_activities (
        contact_id, deal_id, activity_type, subject, body,
        performed_by, performed_at, source_type
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'system')
      RETURNING *`,
      [
        data.contactId || null,
        data.dealId || null,
        data.activityType,
        data.subject,
        data.body || null,
        data.performedBy || null,
      ]
    );

    // Update contact's last_contacted_at if this is a communication activity
    if (data.contactId && ['call', 'email', 'meeting'].includes(data.activityType)) {
      await this.query(
        `UPDATE crm_contacts SET last_contacted_at = NOW() WHERE id = $1`,
        [data.contactId]
      );
    }

    return activity!;
  }

  /**
   * Log proposal sent activity
   */
  async logProposalSent(
    proposalId: number,
    contactEmail: string,
    proposalNumber: string
  ): Promise<void> {
    const contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [contactEmail]
    );

    if (contact) {
      // Find associated deal
      const deal = await this.queryOne<CrmDeal>(
        `SELECT * FROM crm_deals WHERE contact_id = $1 AND proposal_id = $2`,
        [contact.id, proposalId]
      );

      await this.logActivity({
        contactId: contact.id,
        dealId: deal?.id,
        activityType: 'proposal_sent',
        subject: `Proposal ${proposalNumber} sent`,
        body: `Proposal sent to ${contactEmail}`,
      });

      // Update contact lifecycle if they're still a lead
      if (contact.lifecycle_stage === 'lead') {
        await this.query(
          `UPDATE crm_contacts SET lifecycle_stage = 'opportunity' WHERE id = $1`,
          [contact.id]
        );
      }
    }
  }

  /**
   * Log proposal viewed activity
   */
  async logProposalViewed(proposalId: number, contactEmail: string): Promise<void> {
    const contact = await this.queryOne<CrmContact>(
      `SELECT * FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [contactEmail]
    );

    if (contact) {
      const deal = await this.queryOne<CrmDeal>(
        `SELECT * FROM crm_deals WHERE contact_id = $1 AND proposal_id = $2`,
        [contact.id, proposalId]
      );

      await this.logActivity({
        contactId: contact.id,
        dealId: deal?.id,
        activityType: 'proposal_viewed',
        subject: 'Proposal viewed',
        body: `Customer viewed the proposal`,
      });
    }
  }

  /**
   * Log email sent activity
   */
  async logEmailSent(params: {
    contactId?: number;
    customerId?: number;
    customerEmail?: string;
    dealId?: number;
    subject: string;
    body?: string;
    emailType?: string;
  }): Promise<void> {
    // Get contact ID from various sources
    let contactId = params.contactId;

    if (!contactId && params.customerId) {
      const contact = await this.getOrCreateContactForCustomer(params.customerId);
      contactId = contact?.id;
    }

    if (!contactId && params.customerEmail) {
      const contact = await this.queryOne<CrmContact>(
        `SELECT * FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
        [params.customerEmail]
      );
      contactId = contact?.id;
    }

    if (!contactId) {
      this.log('Could not find contact for email logging', { params });
      return;
    }

    await this.logActivity({
      contactId,
      dealId: params.dealId,
      activityType: 'email',
      subject: params.subject,
      body: params.body || `Email type: ${params.emailType || 'general'}`,
    });

    this.log('Email activity logged to CRM', { contactId, subject: params.subject });
  }

  /**
   * Log SMS sent activity
   */
  async logSmsSent(params: {
    contactId?: number;
    customerId?: number;
    customerPhone?: string;
    dealId?: number;
    message: string;
    messageType?: string;
  }): Promise<void> {
    // Get contact ID from various sources
    let contactId = params.contactId;

    if (!contactId && params.customerId) {
      const contact = await this.getOrCreateContactForCustomer(params.customerId);
      contactId = contact?.id;
    }

    if (!contactId && params.customerPhone) {
      // Try to find contact by phone
      const contact = await this.queryOne<CrmContact>(
        `SELECT * FROM crm_contacts WHERE phone = $1 OR phone LIKE $2`,
        [params.customerPhone, `%${params.customerPhone.replace(/\D/g, '').slice(-10)}`]
      );
      contactId = contact?.id;
    }

    if (!contactId) {
      this.log('Could not find contact for SMS logging', { params });
      return;
    }

    await this.logActivity({
      contactId,
      dealId: params.dealId,
      activityType: 'sms' as ActivityType,
      subject: params.messageType ? `SMS: ${params.messageType}` : 'SMS sent',
      body: params.message.substring(0, 500), // Limit message length
    });

    this.log('SMS activity logged to CRM', { contactId, messageType: params.messageType });
  }

  /**
   * Log payment received activity
   */
  async logPaymentReceived(
    customerId: number,
    amount: number,
    paymentType: string,
    bookingId?: number
  ): Promise<void> {
    const contact = await this.getOrCreateContactForCustomer(customerId);

    if (contact) {
      let deal: CrmDeal | null = null;
      if (bookingId) {
        deal = await this.queryOne<CrmDeal>(
          `SELECT * FROM crm_deals WHERE booking_id = $1`,
          [bookingId]
        );
      }

      await this.logActivity({
        contactId: contact.id,
        dealId: deal?.id,
        activityType: 'payment_received',
        subject: `Payment received: $${amount}`,
        body: `${paymentType} payment of $${amount}`,
      });

      // Update contact to customer status
      await this.query(
        `UPDATE crm_contacts
         SET lifecycle_stage = CASE
           WHEN lifecycle_stage IN ('lead', 'qualified', 'opportunity') THEN 'customer'
           WHEN lifecycle_stage = 'customer' THEN 'repeat_customer'
           ELSE lifecycle_stage
         END,
         total_revenue = total_revenue + $1,
         total_bookings = total_bookings + 1,
         last_booking_date = NOW()
         WHERE id = $2`,
        [amount, contact.id]
      );
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getStageNameForBookingStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'New Inquiry',
      quoted: 'Quoted',
      confirmed: 'Won',
      paid: 'Won',
      completed: 'Won',
      cancelled: 'Lost',
      refunded: 'Lost',
    };
    return statusMap[status] || 'New Inquiry';
  }

  private getBrandId(brand?: Brand | string): number {
    const brandIdMap: Record<string, number> = {
      'walla_walla_travel': 1,
      'herding_cats': 2,
      'nw_touring': 3,
    };
    return brandIdMap[brand || 'walla_walla_travel'] || 1;
  }

  private async getDefaultStageId(brand: Brand): Promise<number | null> {
    const stage = await this.queryOne<{ id: number }>(
      `SELECT ps.id
       FROM crm_pipeline_stages ps
       JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
       WHERE (pt.brand = $1 OR pt.brand IS NULL)
         AND ps.is_won = false AND ps.is_lost = false
       ORDER BY pt.is_default DESC, ps.sort_order ASC
       LIMIT 1`,
      [brand]
    );
    return stage?.id || null;
  }
}

// Export singleton instance
export const crmSyncService = new CrmSyncService();
