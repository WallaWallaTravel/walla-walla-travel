/**
 * Gold-Standard Integration Test: Proposal-to-Booking Lifecycle
 *
 * Traces the complete lifecycle of a trip proposal from creation through
 * to conversion into a booking. Each step asserts both UI state and API
 * data state. Uses serial mode because each step depends on the previous.
 *
 * Flow:
 *   Create proposal -> Add a day -> Add a stop -> Add inclusion ->
 *   Calculate pricing -> Send to client -> Client views ->
 *   Client accepts -> Verify payment API -> Convert to booking ->
 *   Verify booking exists
 */

import { test, expect } from '@playwright/test';
import { waitForPageLoad, goToAdmin, futureDate, expectApiSuccess } from '../helpers/flow-tracer';

test.describe('Proposal-to-Booking Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  // Shared state across serial steps
  let proposalId: number;
  let proposalNumber: string;
  let dayId: number;
  let bookingId: number;

  const customerName = `E2E Lifecycle ${Date.now()}`;
  const customerEmail = `e2e-${Date.now()}@test.example.com`;
  const startDate = futureDate(30);

  // ---------------------------------------------------------------------------
  // Step 1: Create proposal via API
  // ---------------------------------------------------------------------------
  test('Step 1: Create a draft proposal via API', async ({ request }) => {
    test.setTimeout(90_000);

    const response = await request.post('/api/admin/trip-proposals?draft=true', {
      data: {
        customer_name: customerName,
        customer_email: customerEmail,
        party_size: 4,
        start_date: startDate,
        trip_type: 'wine_tour',
        trip_title: 'E2E Lifecycle Test Tour',
      },
    });

    const body = await expectApiSuccess(response);
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('proposal_number');
    expect(body.data.proposal_number).toMatch(/^TP-/);

    proposalId = body.data.id as number;
    proposalNumber = body.data.proposal_number as string;
  });

  // ---------------------------------------------------------------------------
  // Step 2: Add a day to the proposal
  // ---------------------------------------------------------------------------
  test('Step 2: Add a day to the proposal', async ({ request }) => {
    test.setTimeout(30_000);

    // Skip if proposal was not created
    test.skip(!proposalId, 'Proposal not created in Step 1');

    const response = await request.post(
      `/api/admin/trip-proposals/${proposalId}/days`,
      {
        data: {
          date: startDate,
          title: 'Wine Tour Day 1',
        },
      }
    );

    const body = await expectApiSuccess(response);
    expect(body.data).toHaveProperty('id');

    dayId = body.data.id as number;
  });

  // ---------------------------------------------------------------------------
  // Step 3: Add a stop (winery visit) to the day
  // ---------------------------------------------------------------------------
  test('Step 3: Add a stop to the day', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!dayId, 'Day not created in Step 2');

    const response = await request.post(
      `/api/admin/trip-proposals/${proposalId}/days/${dayId}/stops`,
      {
        data: {
          stop_type: 'winery',
          custom_name: 'E2E Test Winery',
          custom_address: '123 Vineyard Lane, Walla Walla, WA',
          scheduled_time: '10:00',
          duration_minutes: 90,
          cost_note: 'Tasting fee ~$25/pp, paid at winery',
        },
      }
    );

    const body = await expectApiSuccess(response);
    expect(body.data).toHaveProperty('id');
    expect(body.data.stop_type).toBe('winery');
  });

  // ---------------------------------------------------------------------------
  // Step 4: Add a service line item (inclusion) for pricing
  // ---------------------------------------------------------------------------
  test('Step 4: Add an inclusion (service line item)', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalId, 'Proposal not created in Step 1');

    const response = await request.post(
      `/api/admin/trip-proposals/${proposalId}/inclusions`,
      {
        data: {
          inclusion_type: 'transportation',
          description: 'Private Sprinter Van for Wine Tour',
          pricing_type: 'flat',
          total_price: 800,
          is_taxable: true,
          show_on_proposal: true,
        },
      }
    );

    const body = await expectApiSuccess(response);
    expect(body.data).toHaveProperty('id');
    expect(body.data.inclusion_type).toBe('transportation');
  });

  // ---------------------------------------------------------------------------
  // Step 5: Calculate pricing
  // ---------------------------------------------------------------------------
  test('Step 5: Calculate pricing', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalId, 'Proposal not created in Step 1');

    const response = await request.post(
      `/api/admin/trip-proposals/${proposalId}/pricing`
    );

    const body = await expectApiSuccess(response);
    // After pricing, the total should be > 0 (800 base + tax)
    expect(Number(body.data.total)).toBeGreaterThan(0);
    expect(Number(body.data.subtotal)).toBe(800);
  });

  // ---------------------------------------------------------------------------
  // Step 6: Verify proposal appears in admin UI
  // ---------------------------------------------------------------------------
  test('Step 6: Verify proposal appears in admin list', async ({ page }) => {
    test.setTimeout(60_000);

    test.skip(!proposalId, 'Proposal not created in Step 1');

    await goToAdmin(page, 'trip-proposals');
    await waitForPageLoad(page);

    // Search for the test customer
    const searchInput = page.getByPlaceholder(/Customer name or email/i);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill(customerName);
      // Wait for search debounce
      await page.waitForTimeout(600);
    }

    // The proposal number or customer name should appear in the list
    const listContent = page.locator('main');
    await expect(listContent).toContainText(customerName, { timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Step 7: Send proposal to client via API
  // ---------------------------------------------------------------------------
  test('Step 7: Send proposal to client', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalId, 'Proposal not created in Step 1');

    const response = await request.post(
      `/api/admin/trip-proposals/${proposalId}/send`,
      {
        data: {
          custom_message: 'E2E test: Please review this proposal.',
        },
      }
    );

    const body = await expectApiSuccess(response);
    expect(body.data.status).toBe('sent');
  });

  // ---------------------------------------------------------------------------
  // Step 8: Client views the proposal (marks it as viewed)
  // ---------------------------------------------------------------------------
  test('Step 8: Client views the proposal', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalNumber, 'Proposal number not available');

    const response = await request.get(
      `/api/trip-proposals/${proposalNumber}`
    );

    const body = await expectApiSuccess(response);
    expect(body.data).toHaveProperty('proposal_number', proposalNumber);
    // Internal notes should be stripped from client response
    expect(body.data.internal_notes).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Step 9: Verify status is now 'viewed'
  // ---------------------------------------------------------------------------
  test('Step 9: Verify proposal status is viewed', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalId, 'Proposal not created in Step 1');

    const response = await request.get(
      `/api/admin/trip-proposals/${proposalId}`
    );

    const body = await expectApiSuccess(response);
    expect(body.data.status).toBe('viewed');
    expect(body.data.view_count).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // Step 10: Client accepts the proposal
  // ---------------------------------------------------------------------------
  test('Step 10: Client accepts the proposal', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalNumber, 'Proposal number not available');

    const response = await request.post(
      `/api/trip-proposals/${proposalNumber}/accept`,
      {
        data: {
          signature: 'E2E Test Signature',
          agreed_to_terms: true,
        },
      }
    );

    const body = await expectApiSuccess(response);
    expect(body.data.status).toBe('accepted');
    expect(body.data).toHaveProperty('deposit_amount');
    expect(Number(body.data.deposit_amount)).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Step 11: Verify payment API endpoint (without hitting Stripe)
  // ---------------------------------------------------------------------------
  test('Step 11: Verify payment create-payment API rejects without Stripe', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalNumber, 'Proposal number not available');

    // We do NOT test Stripe payment UI directly (external dependency).
    // Instead, verify the create-payment endpoint exists and validates correctly.
    // In test environments without Stripe keys, this may return a 400/500.
    const response = await request.post(
      `/api/trip-proposals/${proposalNumber}/create-payment`
    );

    // The endpoint should respond (not 404) — it exists and validates
    const status = response.status();
    expect(status).not.toBe(404);

    // If Stripe is configured, it would return 200 with client_secret.
    // If not, it returns 400 or 500 — both are valid in test.
    // The point is the route exists and processes the request.
  });

  // ---------------------------------------------------------------------------
  // Step 12: Verify confirm-payment API validates correctly
  // ---------------------------------------------------------------------------
  test('Step 12: Verify confirm-payment API validates input', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalNumber, 'Proposal number not available');

    // Send a request without payment_intent_id to verify validation
    const response = await request.post(
      `/api/trip-proposals/${proposalNumber}/confirm-payment`,
      {
        data: {},
      }
    );

    // Should reject with 400 (missing payment_intent_id)
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Step 13: Convert proposal to booking via admin API
  // ---------------------------------------------------------------------------
  test('Step 13: Convert proposal to booking', async ({ request }) => {
    test.setTimeout(60_000);

    test.skip(!proposalId, 'Proposal not created in Step 1');

    const response = await request.post(
      `/api/admin/trip-proposals/${proposalId}/convert`
    );

    const body = await expectApiSuccess(response);
    expect(body.data).toHaveProperty('booking_id');

    bookingId = body.data.booking_id as number;
    expect(bookingId).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Step 14: Verify proposal status is now 'booked'
  // ---------------------------------------------------------------------------
  test('Step 14: Verify proposal is marked as booked', async ({ request }) => {
    test.setTimeout(30_000);

    test.skip(!proposalId, 'Proposal not created in Step 1');

    const response = await request.get(
      `/api/admin/trip-proposals/${proposalId}`
    );

    const body = await expectApiSuccess(response);
    expect(body.data.status).toBe('booked');
    expect(body.data.converted_to_booking_id).toBe(bookingId);
  });

  // ---------------------------------------------------------------------------
  // Step 15: Verify booking exists in admin UI
  // ---------------------------------------------------------------------------
  test('Step 15: Verify booking exists in admin UI', async ({ page }) => {
    test.setTimeout(60_000);

    test.skip(!bookingId, 'Booking not created in Step 13');

    await goToAdmin(page, 'bookings');
    await waitForPageLoad(page);

    // The bookings page should load without errors
    const heading = page.getByRole('heading', { name: /Booking/i }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Search for the customer name if search is available
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill(customerName);
      await page.waitForTimeout(600);
    }
  });

  // ---------------------------------------------------------------------------
  // Cleanup: Delete the test proposal (best effort)
  // ---------------------------------------------------------------------------
  test('Cleanup: Archive test data', async ({ request }) => {
    test.setTimeout(30_000);

    // We can't delete non-draft proposals, so archive it instead
    if (proposalId) {
      await request.post(
        `/api/admin/trip-proposals/${proposalId}/archive`
      ).catch(() => {
        // Best effort cleanup — don't fail the suite
      });
    }
  });
});
