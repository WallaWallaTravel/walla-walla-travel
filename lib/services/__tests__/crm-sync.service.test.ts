/**
 * CrmSyncService Tests
 *
 * Tests for CRM synchronization service that syncs data between
 * bookings/corporate requests/consultations/proposals and the CRM module.
 *
 * Coverage target: 85%+
 */

import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockCustomer as _createMockCustomer } from '../../__tests__/factories';
import type { CrmContact, CrmDeal, CrmActivity } from '@/types/crm';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock error logger
jest.mock('../../monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

// Import the singleton after mocks are set up
import { crmSyncService } from '../crm-sync.service';
import type {
  SyncCustomerData,
  SyncCorporateRequestData,
  SyncConsultationData,
  SyncBookingData,
  SyncTripProposalData,
  LogActivityData,
} from '../crm-sync.service';

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockCrmContact(overrides: Partial<CrmContact> = {}): CrmContact {
  return {
    id: 100,
    email: 'test@example.com',
    name: 'Test Contact',
    phone: '+1-509-555-1234',
    company: null,
    contact_type: 'individual',
    lifecycle_stage: 'lead',
    lead_score: 0,
    lead_temperature: 'warm',
    source: 'booking',
    source_detail: null,
    preferred_wineries: null,
    dietary_restrictions: null,
    accessibility_needs: null,
    notes: null,
    email_marketing_consent: false,
    sms_marketing_consent: false,
    total_bookings: 0,
    total_revenue: 0,
    last_booking_date: null,
    assigned_to: null,
    stripe_customer_id: null,
    customer_id: null,
    brand_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_contacted_at: null,
    next_follow_up_at: null,
    ...overrides,
  };
}

function createMockCrmDeal(overrides: Partial<CrmDeal> = {}): CrmDeal {
  return {
    id: 200,
    contact_id: 100,
    stage_id: 1,
    deal_type_id: null,
    brand: 'walla_walla_travel',
    brand_id: 1,
    title: 'Test Deal',
    description: null,
    party_size: 6,
    expected_tour_date: '2026-03-15',
    expected_close_date: null,
    estimated_value: 850,
    actual_value: null,
    won_at: null,
    lost_at: null,
    lost_reason: null,
    consultation_id: null,
    corporate_request_id: null,
    proposal_id: null,
    trip_proposal_id: null,
    booking_id: null,
    assigned_to: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stage_changed_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockCrmActivity(overrides: Partial<CrmActivity> = {}): CrmActivity {
  return {
    id: 300,
    contact_id: 100,
    deal_id: 200,
    activity_type: 'system',
    subject: 'Test activity',
    body: null,
    call_duration_minutes: null,
    call_outcome: null,
    email_direction: null,
    email_status: null,
    performed_by: null,
    performed_at: new Date().toISOString(),
    source_type: 'system',
    source_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('CrmSyncService', () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // syncCustomerToContact
  // ==========================================================================

  describe('syncCustomerToContact', () => {
    const customerData: SyncCustomerData = {
      customerId: 42,
      email: 'customer@example.com',
      name: 'Jane Doe',
      phone: '+1-509-555-9999',
      source: 'booking',
      sourceDetail: 'website',
    };

    it('should create a new CRM contact when none exists', async () => {
      const newContact = createMockCrmContact({
        id: 101,
        email: customerData.email,
        name: customerData.name,
        customer_id: customerData.customerId,
        contact_type: 'individual',
        lifecycle_stage: 'customer',
        lead_temperature: 'warm',
        source: 'booking',
      });

      // 1st query: SELECT by customer_id -> no result
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2nd query: SELECT by email -> no result
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 3rd query: INSERT new contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));

      const result = await crmSyncService.syncCustomerToContact(customerData);

      expect(result).toBeDefined();
      expect(result.id).toBe(101);
      expect(result.email).toBe(customerData.email);
      expect(result.name).toBe(customerData.name);
      expect(result.customer_id).toBe(customerData.customerId);

      // Verify the INSERT query includes brand_id
      expect(mockQuery).toHaveBeenCalledTimes(3);
      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[0]).toContain('INSERT INTO crm_contacts');
      expect(insertCall[0]).toContain('brand_id');
    });

    it('should update existing CRM contact when found by customer_id', async () => {
      const existingContact = createMockCrmContact({
        id: 50,
        customer_id: customerData.customerId,
        email: customerData.email,
        name: 'Old Name',
      });

      const updatedContact = createMockCrmContact({
        ...existingContact,
        name: customerData.name,
        phone: customerData.phone,
      });

      // 1st query: SELECT by customer_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingContact]));
      // 2nd query: UPDATE existing contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedContact]));

      const result = await crmSyncService.syncCustomerToContact(customerData);

      expect(result).toBeDefined();
      expect(result.id).toBe(50);
      expect(result.name).toBe(customerData.name);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify update query
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE crm_contacts');
    });

    it('should link existing contact found by email to customer', async () => {
      const existingContact = createMockCrmContact({
        id: 75,
        email: customerData.email,
        customer_id: null,
      });

      const linkedContact = createMockCrmContact({
        ...existingContact,
        customer_id: customerData.customerId,
        name: customerData.name,
      });

      // 1st query: SELECT by customer_id -> no result
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2nd query: SELECT by email -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingContact]));
      // 3rd query: UPDATE to link customer_id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([linkedContact]));

      const result = await crmSyncService.syncCustomerToContact(customerData);

      expect(result).toBeDefined();
      expect(result.id).toBe(75);
      expect(result.customer_id).toBe(customerData.customerId);
      expect(mockQuery).toHaveBeenCalledTimes(3);

      // Verify the link update
      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[0]).toContain('UPDATE crm_contacts');
      expect(updateCall[0]).toContain('customer_id');
      expect(updateCall[1]).toContain(customerData.customerId);
    });

    it('should use default source "booking" when source is not provided', async () => {
      const dataNoSource: SyncCustomerData = {
        customerId: 55,
        email: 'nosource@example.com',
        name: 'No Source',
      };

      // No existing contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // INSERT
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([createMockCrmContact({ id: 102 })])
      );

      await crmSyncService.syncCustomerToContact(dataNoSource);

      // Verify INSERT params include 'booking' as default source
      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[1]).toContain('booking');
    });

    it('should handle null phone gracefully', async () => {
      const dataNoPhone: SyncCustomerData = {
        customerId: 60,
        email: 'nophone@example.com',
        name: 'No Phone',
        phone: null,
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(
        createMockQueryResult([createMockCrmContact({ id: 103, phone: null })])
      );

      const result = await crmSyncService.syncCustomerToContact(dataNoPhone);

      expect(result).toBeDefined();
      expect(result.id).toBe(103);
    });
  });

  // ==========================================================================
  // syncCorporateRequest
  // ==========================================================================

  describe('syncCorporateRequest', () => {
    const corporateData: SyncCorporateRequestData = {
      requestId: 10,
      companyName: 'Acme Corp',
      contactName: 'Bob Manager',
      contactEmail: 'bob@acme.com',
      contactPhone: '+1-509-555-0001',
      eventType: 'team_building',
      partySize: 20,
      preferredDates: ['2026-04-15', '2026-04-22'],
      budgetRange: '$5,000 - $10,000',
      brand: 'walla_walla_travel',
    };

    it('should create new contact and deal from corporate request', async () => {
      const newContact = createMockCrmContact({
        id: 110,
        email: corporateData.contactEmail,
        name: corporateData.contactName,
        company: corporateData.companyName,
        contact_type: 'corporate',
        lifecycle_stage: 'lead',
        lead_temperature: 'hot',
        brand_id: 1,
      });

      const stage = { id: 5, template_id: 1 };
      const newDeal = createMockCrmDeal({
        id: 210,
        contact_id: 110,
        stage_id: 5,
        brand: 'walla_walla_travel',
        brand_id: 1,
        title: 'Acme Corp - team_building',
        corporate_request_id: 10,
        party_size: 20,
      });

      const activity = createMockCrmActivity({ id: 301 });

      // 1. SELECT contact by email -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2. INSERT new contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      // 3. SELECT pipeline stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      // 4. INSERT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      // 5. UPDATE corporate_requests with CRM links
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // 6. INSERT activity (via logActivity)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.syncCorporateRequest(corporateData);

      expect(result.contact).toBeDefined();
      expect(result.contact.id).toBe(110);
      expect(result.contact.contact_type).toBe('corporate');
      expect(result.deal).toBeDefined();
      expect(result.deal.id).toBe(210);
      expect(result.deal.corporate_request_id).toBe(10);
    });

    it('should update existing contact to corporate type when found by email', async () => {
      const existingContact = createMockCrmContact({
        id: 111,
        email: corporateData.contactEmail,
        contact_type: 'individual',
      });

      const stage = { id: 5, template_id: 1 };
      const newDeal = createMockCrmDeal({ id: 211, contact_id: 111 });
      const activity = createMockCrmActivity();

      // 1. SELECT contact by email -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingContact]));
      // 2. UPDATE contact to corporate
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // 3. SELECT pipeline stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      // 4. INSERT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      // 5. UPDATE corporate_requests
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // 6. INSERT activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.syncCorporateRequest(corporateData);

      expect(result.contact.id).toBe(111);

      // Verify the UPDATE to corporate
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain("contact_type = 'corporate'");
      expect(updateCall[0]).toContain("lead_temperature = 'hot'");
    });

    it('should throw error when no pipeline stage found', async () => {
      const newContact = createMockCrmContact({ id: 112 });

      // 1. SELECT contact -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2. INSERT contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      // 3. SELECT pipeline stage -> none found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        crmSyncService.syncCorporateRequest(corporateData)
      ).rejects.toThrow('No pipeline stage found for corporate request');
    });

    it('should use walla_walla_travel as default brand', async () => {
      const dataWithoutBrand: SyncCorporateRequestData = {
        ...corporateData,
        brand: undefined,
      };

      const newContact = createMockCrmContact({ id: 113 });
      const stage = { id: 5, template_id: 1 };
      const newDeal = createMockCrmDeal({ id: 213 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncCorporateRequest(dataWithoutBrand);

      // Verify brand used in pipeline stage query
      const stageQueryCall = mockQuery.mock.calls[2];
      expect(stageQueryCall[1]).toContain('walla_walla_travel');
    });

    it('should map brand_id correctly on INSERT statements', async () => {
      const newContact = createMockCrmContact({ id: 114, brand_id: 2 });
      const stage = { id: 5, template_id: 1 };
      const newDeal = createMockCrmDeal({ id: 214, brand_id: 2 });
      const activity = createMockCrmActivity();

      const dataHerdingCats: SyncCorporateRequestData = {
        ...corporateData,
        brand: 'nw_touring' as unknown as SyncCorporateRequestData['brand'],
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncCorporateRequest(dataHerdingCats);

      // Verify brand_id=3 (nw_touring) was passed to contact INSERT
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[0]).toContain('brand_id');
      expect(contactInsert[1]).toContain(3); // nw_touring = 3

      // Verify brand_id=3 was passed to deal INSERT
      const dealInsert = mockQuery.mock.calls[3];
      expect(dealInsert[0]).toContain('brand_id');
      expect(dealInsert[1]).toContain(3);
    });

    it('should use first preferred date as tour date', async () => {
      const newContact = createMockCrmContact({ id: 115 });
      const stage = { id: 5, template_id: 1 };
      const newDeal = createMockCrmDeal({ id: 215 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncCorporateRequest(corporateData);

      // The deal INSERT should use the first preferred date
      const dealInsert = mockQuery.mock.calls[3];
      expect(dealInsert[1]).toContain('2026-04-15');
    });

    it('should log activity after creating deal', async () => {
      const newContact = createMockCrmContact({ id: 116 });
      const stage = { id: 5, template_id: 1 };
      const newDeal = createMockCrmDeal({ id: 216 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncCorporateRequest(corporateData);

      // Last query should be the activity insert
      const activityInsert = mockQuery.mock.calls[5];
      expect(activityInsert[0]).toContain('INSERT INTO crm_activities');
      expect(activityInsert[1]).toContain('Corporate request received');
    });
  });

  // ==========================================================================
  // syncConsultationToContact
  // ==========================================================================

  describe('syncConsultationToContact', () => {
    const consultationData: SyncConsultationData = {
      tripId: 77,
      shareCode: 'abc123',
      tripTitle: 'Wine Country Weekend',
      ownerName: 'Alice Tester',
      ownerEmail: 'alice@example.com',
      ownerPhone: '+1-509-555-2222',
      tripType: 'wine_tour',
      partySize: 8,
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      notes: 'Prefer red wines',
      brand: 'walla_walla_travel',
    };

    it('should create new contact and deal from consultation', async () => {
      const newContact = createMockCrmContact({
        id: 120,
        email: consultationData.ownerEmail,
        name: consultationData.ownerName,
        contact_type: 'individual',
        lifecycle_stage: 'lead',
        lead_temperature: 'warm',
        source: 'consultation',
        brand_id: 1,
      });

      const newDeal = createMockCrmDeal({
        id: 220,
        contact_id: 120,
        consultation_id: 77,
        title: 'Wine Country Weekend',
        party_size: 8,
        brand: 'walla_walla_travel',
        brand_id: 1,
      });

      const activity = createMockCrmActivity();

      // 1. SELECT contact by email -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2. INSERT new contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      // 3. SELECT deal by consultation_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 4. SELECT default pipeline stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      // 5. INSERT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      // 6. INSERT activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.syncConsultationToContact(consultationData);

      expect(result.contact).toBeDefined();
      expect(result.contact.id).toBe(120);
      expect(result.contact.source).toBe('consultation');
      expect(result.deal).toBeDefined();
      expect(result.deal.id).toBe(220);
      expect(result.deal.consultation_id).toBe(77);
    });

    it('should update existing contact when found by email', async () => {
      const existingContact = createMockCrmContact({
        id: 121,
        email: consultationData.ownerEmail,
        lead_temperature: 'cold',
      });

      const newDeal = createMockCrmDeal({ id: 221, contact_id: 121 });
      const activity = createMockCrmActivity();

      // 1. SELECT contact by email -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingContact]));
      // 2. UPDATE existing contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // 3. SELECT deal by consultation_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 4. SELECT default pipeline stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      // 5. INSERT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      // 6. INSERT activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.syncConsultationToContact(consultationData);

      expect(result.contact.id).toBe(121);

      // Verify the UPDATE query was called to warm up the contact
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE crm_contacts');
      expect(updateCall[0]).toContain('lead_temperature');
    });

    it('should return existing deal when deal already exists for consultation', async () => {
      const existingContact = createMockCrmContact({ id: 122 });
      const existingDeal = createMockCrmDeal({
        id: 222,
        contact_id: 122,
        consultation_id: 77,
      });

      // 1. SELECT contact by email -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingContact]));
      // 2. UPDATE existing contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // 3. SELECT deal by consultation_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingDeal]));

      const result = await crmSyncService.syncConsultationToContact(consultationData);

      expect(result.deal.id).toBe(222);
      // Should not have inserted a new deal
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw error when no pipeline stage found', async () => {
      const newContact = createMockCrmContact({ id: 123 });

      // 1. SELECT contact -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2. INSERT contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      // 3. SELECT deal -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 4. SELECT default pipeline stage -> none found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        crmSyncService.syncConsultationToContact(consultationData)
      ).rejects.toThrow('No pipeline stage found for consultation');
    });

    it('should map brand_id correctly on INSERT statements', async () => {
      const dataNwTouring: SyncConsultationData = {
        ...consultationData,
        brand: 'nw_touring',
      };

      const newContact = createMockCrmContact({ id: 124, brand_id: 3 });
      const newDeal = createMockCrmDeal({ id: 224, brand_id: 3 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncConsultationToContact(dataNwTouring);

      // Contact INSERT should have brand_id = 3
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[0]).toContain('brand_id');
      expect(contactInsert[1]).toContain(3);

      // Deal INSERT should have brand_id = 3
      const dealInsert = mockQuery.mock.calls[4];
      expect(dealInsert[0]).toContain('brand_id');
      expect(dealInsert[1]).toContain(3);
    });

    it('should use trip title as deal title when available', async () => {
      const newContact = createMockCrmContact({ id: 125 });
      const newDeal = createMockCrmDeal({ id: 225 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncConsultationToContact(consultationData);

      // The deal INSERT should use trip title
      const dealInsert = mockQuery.mock.calls[4];
      expect(dealInsert[1]).toContain('Wine Country Weekend');
    });

    it('should use notes as deal description when provided', async () => {
      const newContact = createMockCrmContact({ id: 126 });
      const newDeal = createMockCrmDeal({ id: 226 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncConsultationToContact(consultationData);

      // The deal INSERT should use notes
      const dealInsert = mockQuery.mock.calls[4];
      expect(dealInsert[1]).toContain('Prefer red wines');
    });
  });

  // ==========================================================================
  // syncBookingToDeal
  // ==========================================================================

  describe('syncBookingToDeal', () => {
    const bookingData: SyncBookingData = {
      bookingId: 500,
      customerId: 42,
      customerEmail: 'jane@example.com',
      customerName: 'Jane Doe',
      tourDate: '2026-04-20',
      partySize: 6,
      totalAmount: 850,
      status: 'confirmed',
      brand: 'nw_touring',
    };

    it('should create deal from booking when no deal exists', async () => {
      const contact = createMockCrmContact({ id: 130, customer_id: 42 });
      const newDeal = createMockCrmDeal({
        id: 230,
        contact_id: 130,
        booking_id: 500,
        brand: 'nw_touring',
        brand_id: 3,
        title: 'Tour - Jane Doe',
        party_size: 6,
        estimated_value: 850,
      });

      // getOrCreateContactForCustomer: SELECT by customer_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      // SELECT deal by booking_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // SELECT pipeline stage by name
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 7 }]));
      // INSERT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));

      const result = await crmSyncService.syncBookingToDeal(bookingData);

      expect(result).toBeDefined();
      expect(result!.id).toBe(230);
      expect(result!.booking_id).toBe(500);
      expect(result!.brand_id).toBe(3);
    });

    it('should update existing deal when booking already has a deal', async () => {
      // Use 'completed' status so updateDealFromBookingStatus hits the won path
      const completedBookingData: SyncBookingData = {
        ...bookingData,
        status: 'completed',
      };

      const contact = createMockCrmContact({ id: 131, customer_id: 42 });
      const existingDeal = createMockCrmDeal({
        id: 231,
        booking_id: 500,
        brand: 'nw_touring',
      });
      const updatedDeal = createMockCrmDeal({
        ...existingDeal,
        stage_id: 10,
        won_at: new Date().toISOString(),
      });

      // getOrCreateContactForCustomer: SELECT by customer_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      // SELECT deal by booking_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingDeal]));
      // updateDealFromBookingStatus: SELECT deal by id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ ...existingDeal, brand: 'nw_touring' }]));
      // SELECT won stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 10 }]));
      // UPDATE deal to won
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedDeal]));

      const result = await crmSyncService.syncBookingToDeal(completedBookingData);

      expect(result).toBeDefined();
      expect(result!.stage_id).toBe(10);
    });

    it('should return null when contact cannot be found or created', async () => {
      // getOrCreateContactForCustomer: SELECT by customer_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // SELECT customer -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.syncBookingToDeal(bookingData);

      expect(result).toBeNull();
    });

    it('should return null when no pipeline stage found', async () => {
      const contact = createMockCrmContact({ id: 132, customer_id: bookingData.customerId });

      // getOrCreateContactForCustomer: SELECT by customer_id -> found directly
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      // SELECT deal by booking_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // SELECT pipeline stage by name -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // getDefaultStageId fallback -> not found either
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.syncBookingToDeal(bookingData);

      expect(result).toBeNull();
    });

    it('should use nw_touring as default brand for bookings', async () => {
      const dataNoExplicitBrand: SyncBookingData = {
        ...bookingData,
        brand: undefined,
      };

      const contact = createMockCrmContact({ id: 133, customer_id: 42 });
      const newDeal = createMockCrmDeal({ id: 233 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 7 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));

      await crmSyncService.syncBookingToDeal(dataNoExplicitBrand);

      // Pipeline stage query should use 'nw_touring'
      const stageQuery = mockQuery.mock.calls[2];
      expect(stageQuery[1]).toContain('nw_touring');
    });

    it('should set brand_id on deal INSERT', async () => {
      const contact = createMockCrmContact({ id: 134, customer_id: 42 });
      const newDeal = createMockCrmDeal({ id: 234 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 7 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));

      await crmSyncService.syncBookingToDeal(bookingData);

      // Verify deal INSERT includes brand_id
      const dealInsert = mockQuery.mock.calls[3];
      expect(dealInsert[0]).toContain('brand_id');
      // nw_touring = 3
      expect(dealInsert[1]).toContain(3);
    });
  });

  // ==========================================================================
  // updateDealFromBookingStatus (syncBookingStatusToDeal)
  // ==========================================================================

  describe('updateDealFromBookingStatus', () => {
    it('should move deal to Won stage when booking is completed', async () => {
      const deal = createMockCrmDeal({ id: 240, brand: 'nw_touring' });
      const wonStage = { id: 15 };
      const updatedDeal = createMockCrmDeal({
        ...deal,
        stage_id: 15,
        won_at: new Date().toISOString(),
        actual_value: 850,
      });

      // SELECT deal by id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // SELECT won stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([wonStage]));
      // UPDATE deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedDeal]));

      const result = await crmSyncService.updateDealFromBookingStatus(240, 'completed', 850);

      expect(result).toBeDefined();
      expect(result!.stage_id).toBe(15);
      expect(result!.actual_value).toBe(850);

      // Verify UPDATE sets won_at
      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[0]).toContain('won_at = NOW()');
    });

    it('should move deal to Won stage when booking is paid', async () => {
      const deal = createMockCrmDeal({ id: 241, brand: 'nw_touring' });
      const wonStage = { id: 15 };
      const updatedDeal = createMockCrmDeal({ ...deal, stage_id: 15 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([wonStage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedDeal]));

      const result = await crmSyncService.updateDealFromBookingStatus(241, 'paid', 900);

      expect(result).toBeDefined();
      expect(result!.stage_id).toBe(15);
    });

    it('should move deal to Lost stage when booking is cancelled', async () => {
      const deal = createMockCrmDeal({ id: 242, brand: 'nw_touring' });
      const lostStage = { id: 20 };
      const updatedDeal = createMockCrmDeal({
        ...deal,
        stage_id: 20,
        lost_at: new Date().toISOString(),
        lost_reason: 'Booking cancelled',
      });

      // SELECT deal by id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // SELECT lost stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([lostStage]));
      // UPDATE deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedDeal]));

      const result = await crmSyncService.updateDealFromBookingStatus(242, 'cancelled');

      expect(result).toBeDefined();
      expect(result!.stage_id).toBe(20);
      expect(result!.lost_reason).toBe('Booking cancelled');

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[0]).toContain('lost_at = NOW()');
      expect(updateCall[1]).toContain('Booking cancelled');
    });

    it('should move deal to Lost stage when booking is refunded', async () => {
      const deal = createMockCrmDeal({ id: 243, brand: 'nw_touring' });
      const lostStage = { id: 20 };
      const updatedDeal = createMockCrmDeal({
        ...deal,
        stage_id: 20,
        lost_reason: 'Booking refunded',
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([lostStage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedDeal]));

      const result = await crmSyncService.updateDealFromBookingStatus(243, 'refunded');

      expect(result).toBeDefined();
      expect(result!.lost_reason).toBe('Booking refunded');

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[1]).toContain('Booking refunded');
    });

    it('should return the deal unchanged for non-terminal statuses', async () => {
      const deal = createMockCrmDeal({ id: 244, brand: 'nw_touring' });

      // SELECT deal by id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));

      const result = await crmSyncService.updateDealFromBookingStatus(244, 'pending');

      expect(result).toBeDefined();
      expect(result!.id).toBe(244);
      // Should not have queried for won/lost stage
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should return null when deal not found', async () => {
      // SELECT deal by id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.updateDealFromBookingStatus(999, 'completed');

      expect(result).toBeNull();
    });

    it('should return deal unchanged if won stage not found', async () => {
      const deal = createMockCrmDeal({ id: 245, brand: 'nw_touring' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // Won stage -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.updateDealFromBookingStatus(245, 'completed');

      expect(result).toBeDefined();
      expect(result!.id).toBe(245);
    });

    it('should return deal unchanged if lost stage not found', async () => {
      const deal = createMockCrmDeal({ id: 246, brand: 'nw_touring' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // Lost stage -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.updateDealFromBookingStatus(246, 'cancelled');

      expect(result).toBeDefined();
      expect(result!.id).toBe(246);
    });
  });

  // ==========================================================================
  // onBookingStatusChange
  // ==========================================================================

  describe('onBookingStatusChange', () => {
    it('should update deal and log activity when deal exists for booking', async () => {
      const deal = createMockCrmDeal({
        id: 250,
        booking_id: 500,
        contact_id: 130,
        brand: 'nw_touring',
      });
      const wonStage = { id: 15 };
      const updatedDeal = createMockCrmDeal({ ...deal, stage_id: 15 });
      const activity = createMockCrmActivity();

      // SELECT deal by booking_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // updateDealFromBookingStatus: SELECT deal by id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ ...deal, brand: 'nw_touring' }]));
      // SELECT won stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([wonStage]));
      // UPDATE deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([updatedDeal]));
      // logActivity: INSERT activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.onBookingStatusChange(500, 'completed', 850);

      // Verify activity was logged
      const activityInsert = mockQuery.mock.calls[4];
      expect(activityInsert[0]).toContain('INSERT INTO crm_activities');
      expect(activityInsert[1]).toContain('Booking status: completed');
    });

    it('should do nothing when no deal exists for booking', async () => {
      // SELECT deal by booking_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await crmSyncService.onBookingStatusChange(999, 'completed');

      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should include amount in activity body when provided', async () => {
      const deal = createMockCrmDeal({ id: 251, booking_id: 500, contact_id: 130, brand: 'nw_touring' });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // updateDealFromBookingStatus returns the deal unchanged for 'pending'
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ ...deal, brand: 'nw_touring' }]));
      // logActivity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.onBookingStatusChange(500, 'pending', 850);

      const activityInsert = mockQuery.mock.calls[2];
      expect(activityInsert[1]).toContain('Amount: $850');
    });
  });

  // ==========================================================================
  // syncTripProposalToDeal
  // ==========================================================================

  describe('syncTripProposalToDeal', () => {
    const proposalData: SyncTripProposalData = {
      proposalId: 300,
      proposalNumber: 'PROP-2026-001',
      customerName: 'Carol Proposer',
      customerEmail: 'carol@example.com',
      customerPhone: '+1-509-555-3333',
      customerCompany: null,
      partySize: 10,
      startDate: '2026-06-15',
      estimatedValue: 2500,
      brand: 'walla_walla_travel',
    };

    it('should create contact and deal from trip proposal', async () => {
      const newContact = createMockCrmContact({
        id: 140,
        email: proposalData.customerEmail,
        name: proposalData.customerName,
        contact_type: 'individual',
        brand_id: 1,
      });

      const newDeal = createMockCrmDeal({
        id: 240,
        contact_id: 140,
        trip_proposal_id: 300,
        title: 'Trip Proposal - Carol Proposer',
        party_size: 10,
        estimated_value: 2500,
        brand_id: 1,
      });

      const activity = createMockCrmActivity();

      // 1. SELECT contact by email -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2. INSERT new contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      // 3. SELECT deal by trip_proposal_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 4. getDefaultStageId -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      // 5. INSERT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      // 6. INSERT activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.syncTripProposalToDeal(proposalData);

      expect(result).toBeDefined();
      expect(result!.contact.id).toBe(140);
      expect(result!.deal.id).toBe(240);
      expect(result!.deal.trip_proposal_id).toBe(300);
    });

    it('should update existing contact when found by email', async () => {
      const existingContact = createMockCrmContact({
        id: 141,
        email: proposalData.customerEmail,
      });

      const newDeal = createMockCrmDeal({ id: 241, contact_id: 141 });
      const activity = createMockCrmActivity();

      // 1. SELECT contact by email -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingContact]));
      // 2. UPDATE existing contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // 3. SELECT deal by trip_proposal_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 4. getDefaultStageId
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      // 5. INSERT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      // 6. INSERT activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.syncTripProposalToDeal(proposalData);

      expect(result).toBeDefined();
      expect(result!.contact.id).toBe(141);

      // Verify UPDATE was called
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE crm_contacts');
    });

    it('should return existing deal when deal already exists for proposal', async () => {
      const existingContact = createMockCrmContact({ id: 142 });
      const existingDeal = createMockCrmDeal({
        id: 242,
        contact_id: 142,
        trip_proposal_id: 300,
      });

      // 1. SELECT contact by email -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingContact]));
      // 2. UPDATE contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // 3. SELECT deal by trip_proposal_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([existingDeal]));

      const result = await crmSyncService.syncTripProposalToDeal(proposalData);

      expect(result).toBeDefined();
      expect(result!.deal.id).toBe(242);
      // Should NOT have inserted a new deal
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should return null when no pipeline stage found', async () => {
      const newContact = createMockCrmContact({ id: 143 });

      // 1. SELECT contact -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 2. INSERT contact
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      // 3. SELECT deal -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // 4. getDefaultStageId -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.syncTripProposalToDeal(proposalData);

      expect(result).toBeNull();
    });

    it('should create corporate contact when company is provided', async () => {
      const dataWithCompany: SyncTripProposalData = {
        ...proposalData,
        customerCompany: 'BigCorp LLC',
      };

      const newContact = createMockCrmContact({
        id: 144,
        contact_type: 'corporate',
        company: 'BigCorp LLC',
      });
      const newDeal = createMockCrmDeal({ id: 244, contact_id: 144 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.syncTripProposalToDeal(dataWithCompany);

      expect(result).toBeDefined();

      // Verify INSERT includes 'corporate' type and company
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[1]).toContain('BigCorp LLC');
      expect(contactInsert[1]).toContain('corporate');
    });

    it('should set brand_id on both contact and deal INSERT', async () => {
      const newContact = createMockCrmContact({ id: 145, brand_id: 1 });
      const newDeal = createMockCrmDeal({ id: 245, brand_id: 1 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncTripProposalToDeal(proposalData);

      // Contact INSERT
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[0]).toContain('brand_id');
      expect(contactInsert[1]).toContain(1); // walla_walla_travel = 1

      // Deal INSERT
      const dealInsert = mockQuery.mock.calls[4];
      expect(dealInsert[0]).toContain('brand_id');
      expect(dealInsert[1]).toContain(1);
    });

    it('should log activity with proposal number in subject', async () => {
      const newContact = createMockCrmContact({ id: 146 });
      const newDeal = createMockCrmDeal({ id: 246 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newDeal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncTripProposalToDeal(proposalData);

      // Activity INSERT should reference the proposal number
      const activityInsert = mockQuery.mock.calls[5];
      expect(activityInsert[1]).toContain('Trip proposal PROP-2026-001 created');
    });
  });

  // ==========================================================================
  // logActivity
  // ==========================================================================

  describe('logActivity', () => {
    it('should insert activity record', async () => {
      const activityData: LogActivityData = {
        contactId: 100,
        dealId: 200,
        activityType: 'system',
        subject: 'Test activity',
        body: 'This is a test',
        performedBy: 1,
      };

      const activity = createMockCrmActivity({
        id: 310,
        contact_id: 100,
        deal_id: 200,
        activity_type: 'system',
        subject: 'Test activity',
        body: 'This is a test',
        performed_by: 1,
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.logActivity(activityData);

      expect(result).toBeDefined();
      expect(result.id).toBe(310);
      expect(result.subject).toBe('Test activity');

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO crm_activities');
      expect(insertCall[1]).toEqual([100, 200, 'system', 'Test activity', 'This is a test', 1]);
    });

    it('should handle null optional fields', async () => {
      const activityData: LogActivityData = {
        activityType: 'note',
        subject: 'A note',
      };

      const activity = createMockCrmActivity({
        id: 311,
        contact_id: null,
        deal_id: null,
        body: null,
        performed_by: null,
      });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      const result = await crmSyncService.logActivity(activityData);

      expect(result).toBeDefined();

      const insertCall = mockQuery.mock.calls[0];
      // contactId, dealId, body, performedBy should all be null
      expect(insertCall[1]).toEqual([null, null, 'note', 'A note', null, null]);
    });

    it('should update last_contacted_at for communication activities', async () => {
      const activityData: LogActivityData = {
        contactId: 100,
        activityType: 'call',
        subject: 'Follow-up call',
      };

      const activity = createMockCrmActivity({ id: 312, activity_type: 'call' });

      // INSERT activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));
      // UPDATE last_contacted_at
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      await crmSyncService.logActivity(activityData);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE crm_contacts SET last_contacted_at');
      expect(updateCall[1]).toContain(100);
    });

    it('should update last_contacted_at for email activities', async () => {
      const activityData: LogActivityData = {
        contactId: 100,
        activityType: 'email',
        subject: 'Follow-up email',
      };

      const activity = createMockCrmActivity({ id: 313, activity_type: 'email' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      await crmSyncService.logActivity(activityData);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain('last_contacted_at');
    });

    it('should update last_contacted_at for meeting activities', async () => {
      const activityData: LogActivityData = {
        contactId: 100,
        activityType: 'meeting',
        subject: 'In-person meeting',
      };

      const activity = createMockCrmActivity({ id: 314, activity_type: 'meeting' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      await crmSyncService.logActivity(activityData);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should NOT update last_contacted_at for system activities', async () => {
      const activityData: LogActivityData = {
        contactId: 100,
        activityType: 'system',
        subject: 'Auto-generated',
      };

      const activity = createMockCrmActivity({ id: 315, activity_type: 'system' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.logActivity(activityData);

      // Only the INSERT, no UPDATE for last_contacted_at
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should NOT update last_contacted_at when contactId is not provided', async () => {
      const activityData: LogActivityData = {
        dealId: 200,
        activityType: 'call',
        subject: 'Some call',
      };

      const activity = createMockCrmActivity({ id: 316, contact_id: null });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.logActivity(activityData);

      // Only the INSERT, no UPDATE for last_contacted_at
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // getBrandId (private, tested indirectly)
  // ==========================================================================

  describe('getBrandId mapping (tested through INSERT statements)', () => {
    it('should map walla_walla_travel to brand_id 1', async () => {
      const data: SyncCorporateRequestData = {
        requestId: 1,
        companyName: 'Test',
        contactName: 'Test',
        contactEmail: 'test-brand1@example.com',
        eventType: 'test',
        partySize: 5,
        brand: 'walla_walla_travel',
      };

      const contact = createMockCrmContact({ id: 150 });
      const stage = { id: 5, template_id: 1 };
      const deal = createMockCrmDeal({ id: 250 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncCorporateRequest(data);

      // Check contact INSERT has brand_id = 1
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[1]).toContain(1);

      // Check deal INSERT has brand_id = 1
      const dealInsert = mockQuery.mock.calls[3];
      expect(dealInsert[1]).toContain(1);
    });

    it('should map nw_touring to brand_id 3', async () => {
      const data: SyncConsultationData = {
        tripId: 99,
        shareCode: 'xyz',
        tripTitle: 'NW Tour',
        ownerName: 'Test',
        ownerEmail: 'test-brand3@example.com',
        tripType: 'tour',
        partySize: 4,
        brand: 'nw_touring',
      };

      const contact = createMockCrmContact({ id: 151 });
      const deal = createMockCrmDeal({ id: 251 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncConsultationToContact(data);

      // Contact INSERT: brand_id should be 3
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[1]).toContain(3);

      // Deal INSERT: brand_id should be 3
      const dealInsert = mockQuery.mock.calls[4];
      expect(dealInsert[1]).toContain(3);
    });

    it('should default to brand_id 1 when brand is undefined', async () => {
      const data: SyncTripProposalData = {
        proposalId: 400,
        proposalNumber: 'PROP-2026-999',
        customerName: 'Default',
        customerEmail: 'default-brand@example.com',
        partySize: 2,
        startDate: '2026-07-01',
        brand: undefined,
      };

      const contact = createMockCrmContact({ id: 152 });
      const deal = createMockCrmDeal({ id: 252 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 5 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncTripProposalToDeal(data);

      // Contact INSERT should have brand_id = 1 (default)
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[1]).toContain(1);

      // Deal INSERT should have brand_id = 1 (default)
      const dealInsert = mockQuery.mock.calls[4];
      expect(dealInsert[1]).toContain(1);
    });

    it('should default to brand_id 1 for unknown brand string', async () => {
      // The syncCustomerToContact method passes null for brand_id,
      // but we can test through corporate request with unknown brand.
      // getBrandId with an unknown string should return 1.
      const data: SyncCorporateRequestData = {
        requestId: 2,
        companyName: 'Unknown Brand Corp',
        contactName: 'Test',
        contactEmail: 'unknown-brand@example.com',
        eventType: 'test',
        partySize: 5,
        brand: 'some_unknown_brand' as unknown as SyncCorporateRequestData['brand'],
      };

      const contact = createMockCrmContact({ id: 153 });
      const stage = { id: 5, template_id: 1 };
      const deal = createMockCrmDeal({ id: 253 });
      const activity = createMockCrmActivity();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([stage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([activity]));

      await crmSyncService.syncCorporateRequest(data);

      // Contact INSERT: brand_id should be 1 (fallback)
      const contactInsert = mockQuery.mock.calls[1];
      expect(contactInsert[1]).toContain(1);
    });
  });

  // ==========================================================================
  // getOrCreateContactForCustomer
  // ==========================================================================

  describe('getOrCreateContactForCustomer', () => {
    it('should return existing contact when linked to customer', async () => {
      const contact = createMockCrmContact({ id: 160, customer_id: 42 });

      // SELECT by customer_id -> found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));

      const result = await crmSyncService.getOrCreateContactForCustomer(42);

      expect(result).toBeDefined();
      expect(result!.id).toBe(160);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should create contact from customer when not linked', async () => {
      const customer = {
        id: 43,
        email: 'customer43@example.com',
        name: 'Customer 43',
        phone: '+1-509-555-4343',
      };
      const newContact = createMockCrmContact({
        id: 161,
        customer_id: 43,
        email: customer.email,
      });

      // SELECT by customer_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // SELECT customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([customer]));
      // syncCustomerToContact: SELECT by customer_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // syncCustomerToContact: SELECT by email -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // syncCustomerToContact: INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([newContact]));

      const result = await crmSyncService.getOrCreateContactForCustomer(43);

      expect(result).toBeDefined();
      expect(result!.id).toBe(161);
    });

    it('should return null when customer does not exist', async () => {
      // SELECT by customer_id -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // SELECT customer -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.getOrCreateContactForCustomer(999);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should propagate database errors from syncCustomerToContact', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(
        crmSyncService.syncCustomerToContact({
          customerId: 1,
          email: 'err@example.com',
          name: 'Error Test',
        })
      ).rejects.toThrow('Database connection lost');
    });

    it('should propagate database errors from syncCorporateRequest', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(
        crmSyncService.syncCorporateRequest({
          requestId: 1,
          companyName: 'Err Corp',
          contactName: 'Err',
          contactEmail: 'err@corp.com',
          eventType: 'test',
          partySize: 5,
        })
      ).rejects.toThrow('Query timeout');
    });

    it('should propagate database errors from logActivity', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(
        crmSyncService.logActivity({
          activityType: 'system',
          subject: 'Test',
        })
      ).rejects.toThrow('Insert failed');
    });

    it('should call error logger when database errors occur', async () => {
      const { logError } = require('../../monitoring/error-logger');

      mockQuery.mockRejectedValueOnce(new Error('Test DB error'));

      try {
        await crmSyncService.syncCustomerToContact({
          customerId: 1,
          email: 'err@example.com',
          name: 'Error Logger Test',
        });
      } catch {
        // Expected to throw
      }

      expect(logError).toHaveBeenCalled();
      const logCall = logError.mock.calls[0][0];
      expect(logCall.errorType).toContain('CrmSyncService');
      expect(logCall.errorMessage).toContain('Test DB error');
    });
  });

  // ==========================================================================
  // getCrmDataForTripProposal
  // ==========================================================================

  describe('getCrmDataForTripProposal', () => {
    it('should return contact and deal when they exist', async () => {
      const deal = createMockCrmDeal({ id: 260, contact_id: 170, trip_proposal_id: 300 });
      const contact = createMockCrmContact({ id: 170 });

      // SELECT deal by trip_proposal_id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // SELECT contact by id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));

      const result = await crmSyncService.getCrmDataForTripProposal(300);

      expect(result.deal).toBeDefined();
      expect(result.deal!.id).toBe(260);
      expect(result.contact).toBeDefined();
      expect(result.contact!.id).toBe(170);
    });

    it('should return nulls when no deal exists', async () => {
      // SELECT deal -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await crmSyncService.getCrmDataForTripProposal(999);

      expect(result.deal).toBeNull();
      expect(result.contact).toBeNull();
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // onTripProposalStatusChange
  // ==========================================================================

  describe('onTripProposalStatusChange', () => {
    it('should move deal to Quoted stage when proposal is sent', async () => {
      const deal = createMockCrmDeal({ id: 270, contact_id: 180, brand: 'walla_walla_travel' });
      const quotedStage = { id: 8 };

      // SELECT deal by trip_proposal_id
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // SELECT quoted stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([quotedStage]));
      // UPDATE deal stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // UPDATE contact lifecycle
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // Log activity: INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCrmActivity()]));

      await crmSyncService.onTripProposalStatusChange(300, 'PROP-2026-001', 'sent');

      // Verify stage update
      const stageUpdate = mockQuery.mock.calls[2];
      expect(stageUpdate[0]).toContain('UPDATE crm_deals SET stage_id');
      expect(stageUpdate[1]).toContain(8);
    });

    it('should move deal to Won stage when proposal is accepted', async () => {
      const deal = createMockCrmDeal({ id: 271, contact_id: 181, brand: 'walla_walla_travel' });
      const wonStage = { id: 15 };

      // SELECT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // SELECT won stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([wonStage]));
      // UPDATE deal to won
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // UPDATE contact lifecycle to customer
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // Log activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCrmActivity()]));

      await crmSyncService.onTripProposalStatusChange(
        300,
        'PROP-2026-001',
        'accepted',
        { amount: 2500 }
      );

      const dealUpdate = mockQuery.mock.calls[2];
      expect(dealUpdate[0]).toContain('won_at = NOW()');
    });

    it('should move deal to Lost stage when proposal is declined', async () => {
      const deal = createMockCrmDeal({ id: 272, contact_id: 182, brand: 'walla_walla_travel' });
      const lostStage = { id: 20 };

      // SELECT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // SELECT lost stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([lostStage]));
      // UPDATE deal to lost
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // Log activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCrmActivity()]));

      await crmSyncService.onTripProposalStatusChange(300, 'PROP-2026-001', 'declined');

      const dealUpdate = mockQuery.mock.calls[2];
      expect(dealUpdate[0]).toContain('lost_at = NOW()');
      expect(dealUpdate[1]).toContain('Proposal declined');
    });

    it('should move deal to Lost stage when proposal is expired', async () => {
      const deal = createMockCrmDeal({ id: 273, contact_id: 183, brand: 'walla_walla_travel' });
      const lostStage = { id: 20 };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([lostStage]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCrmActivity()]));

      await crmSyncService.onTripProposalStatusChange(300, 'PROP-2026-001', 'expired');

      const dealUpdate = mockQuery.mock.calls[2];
      expect(dealUpdate[1]).toContain('Proposal expired');
    });

    it('should log view activity when proposal is viewed', async () => {
      const deal = createMockCrmDeal({ id: 274, contact_id: 184, brand: 'walla_walla_travel' });
      const viewActivity = createMockCrmActivity({ activity_type: 'proposal_viewed' });

      // SELECT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // logActivity for view: INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([viewActivity]));
      // logActivity for status change: INSERT
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCrmActivity()]));

      await crmSyncService.onTripProposalStatusChange(300, 'PROP-2026-001', 'viewed');

      // View activity
      const viewInsert = mockQuery.mock.calls[1];
      expect(viewInsert[1]).toContain('Proposal PROP-2026-001 viewed');
    });

    it('should link deal to booking when proposal is converted', async () => {
      const deal = createMockCrmDeal({ id: 275, contact_id: 185, brand: 'walla_walla_travel' });

      // SELECT deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // UPDATE deal to link booking
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // Log activity
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCrmActivity()]));

      await crmSyncService.onTripProposalStatusChange(
        300,
        'PROP-2026-001',
        'booked',
        { bookingId: 600 }
      );

      const dealUpdate = mockQuery.mock.calls[1];
      expect(dealUpdate[0]).toContain('UPDATE crm_deals SET booking_id');
      expect(dealUpdate[1]).toContain(600);
    });

    it('should do nothing when no deal found for proposal', async () => {
      // SELECT deal -> not found
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await crmSyncService.onTripProposalStatusChange(999, 'PROP-2026-999', 'sent');

      // Only the one SELECT
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should always log status change activity', async () => {
      const deal = createMockCrmDeal({ id: 276, contact_id: 186, brand: 'walla_walla_travel' });

      // For 'sent' status
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));
      // quoted stage
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 8 }]));
      // UPDATE deal
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // UPDATE contact lifecycle
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));
      // Log activity INSERT (status change)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([createMockCrmActivity()]));

      await crmSyncService.onTripProposalStatusChange(300, 'PROP-2026-001', 'sent');

      // Last call should be the status change activity
      const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
      expect(lastCall[0]).toContain('INSERT INTO crm_activities');
      expect(lastCall[1]).toContain('Proposal status: sent');
    });
  });

  // ==========================================================================
  // getStageNameForBookingStatus (private, tested indirectly)
  // ==========================================================================

  describe('getStageNameForBookingStatus (tested through syncBookingToDeal)', () => {
    it('should use "Won" for confirmed status', async () => {
      const contact = createMockCrmContact({ id: 190, customer_id: 42 });
      const deal = createMockCrmDeal({ id: 290 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 7 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));

      await crmSyncService.syncBookingToDeal({
        ...{
          bookingId: 600,
          customerId: 42,
          customerEmail: 'test@example.com',
          customerName: 'Test',
          tourDate: '2026-05-01',
          partySize: 4,
          totalAmount: 500,
          status: 'confirmed',
          brand: 'nw_touring',
        },
      });

      // The stage query should look for 'Won'
      const stageQuery = mockQuery.mock.calls[2];
      expect(stageQuery[1]).toContain('Won');
    });

    it('should use "Lost" for cancelled status', async () => {
      const contact = createMockCrmContact({ id: 191, customer_id: 42 });
      const deal = createMockCrmDeal({ id: 291 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 8 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));

      await crmSyncService.syncBookingToDeal({
        bookingId: 601,
        customerId: 42,
        customerEmail: 'test@example.com',
        customerName: 'Test',
        tourDate: '2026-05-01',
        partySize: 4,
        totalAmount: 500,
        status: 'cancelled',
        brand: 'nw_touring',
      });

      const stageQuery = mockQuery.mock.calls[2];
      expect(stageQuery[1]).toContain('Lost');
    });

    it('should use "New Inquiry" for pending status', async () => {
      const contact = createMockCrmContact({ id: 192, customer_id: 42 });
      const deal = createMockCrmDeal({ id: 292 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 9 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));

      await crmSyncService.syncBookingToDeal({
        bookingId: 602,
        customerId: 42,
        customerEmail: 'test@example.com',
        customerName: 'Test',
        tourDate: '2026-05-01',
        partySize: 4,
        totalAmount: 500,
        status: 'pending',
        brand: 'nw_touring',
      });

      const stageQuery = mockQuery.mock.calls[2];
      expect(stageQuery[1]).toContain('New Inquiry');
    });

    it('should use "New Inquiry" for unknown status', async () => {
      const contact = createMockCrmContact({ id: 193, customer_id: 42 });
      const deal = createMockCrmDeal({ id: 293 });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([contact]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 9 }]));
      mockQuery.mockResolvedValueOnce(createMockQueryResult([deal]));

      await crmSyncService.syncBookingToDeal({
        bookingId: 603,
        customerId: 42,
        customerEmail: 'test@example.com',
        customerName: 'Test',
        tourDate: '2026-05-01',
        partySize: 4,
        totalAmount: 500,
        status: 'some_unknown_status',
        brand: 'nw_touring',
      });

      const stageQuery = mockQuery.mock.calls[2];
      expect(stageQuery[1]).toContain('New Inquiry');
    });
  });
});
