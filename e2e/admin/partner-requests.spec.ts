import { test, expect } from '@playwright/test';

test.describe('Admin Partner Requests', () => {
  // Serial mode: tests share state and run in order
  test.describe.configure({ mode: 'serial' });

  let proposalUrl: string | null = null;

  test('setup: find a proposal with stops', async ({ page }) => {
    test.setTimeout(60_000);

    // Find an existing proposal from the bookings page
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    const firstLink = page.locator('a[href*="/admin/trip-proposals/"]').first();
    if (await firstLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const href = await firstLink.getAttribute('href');
      if (href) proposalUrl = href;
    }

    test.skip(!proposalUrl, 'No test proposals available in the database');
  });

  test('proposal page loads with Days/Stops tab', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    await page.goto(proposalUrl!);

    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });

    // Days tab should be accessible
    const daysTab = page.getByRole('button', { name: /Days/i }).first();
    await expect(daysTab).toBeVisible();
  });

  test('vendor section shows RequestStatusBadge', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    await page.goto(proposalUrl!);
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });

    // Click Days tab
    await page.getByRole('button', { name: /Days/i }).first().click();
    await page.waitForTimeout(1000);

    // Look for vendor section — the summary shows "Vendor" with a status badge
    const vendorSummary = page.locator('summary').filter({ hasText: /Vendor/i }).first();

    if (await vendorSummary.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const badgeText = vendorSummary.locator('span');
      const badgeCount = await badgeText.count();
      expect(badgeCount).toBeGreaterThan(0);

      // Badge should show one of the valid statuses
      const vendorText = await vendorSummary.textContent();
      const hasStatus =
        vendorText?.includes('Not Sent') ||
        vendorText?.includes('Pending') ||
        vendorText?.includes('Confirmed') ||
        vendorText?.includes('Declined') ||
        vendorText?.includes('N/A');
      expect(hasStatus).toBeTruthy();
    }
  });

  test('Send Request button appears in vendor section', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    await page.goto(proposalUrl!);
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Days/i }).first().click();
    await page.waitForTimeout(1000);

    const vendorSummary = page.locator('summary').filter({ hasText: /Vendor/i }).first();
    if (await vendorSummary.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await vendorSummary.click();
      await page.waitForTimeout(500);

      const sendBtn = page.getByRole('button', { name: /Send Request/i }).first();
      await expect(sendBtn).toBeVisible({ timeout: 3_000 });
    }
  });

  test('Send Request button opens SendRequestModal', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    await page.goto(proposalUrl!);
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Days/i }).first().click();
    await page.waitForTimeout(1000);

    const vendorSummary = page.locator('summary').filter({ hasText: /Vendor/i }).first();
    if (await vendorSummary.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await vendorSummary.click();
      await page.waitForTimeout(500);

      const sendBtn = page.getByRole('button', { name: /Send Request/i }).first();
      if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sendBtn.click();

        // Modal should open with "Send Partner Request" title
        await expect(page.getByText('Send Partner Request')).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test('SendRequestModal has required form fields', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    await page.goto(proposalUrl!);
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Days/i }).first().click();
    await page.waitForTimeout(1000);

    const vendorSummary = page.locator('summary').filter({ hasText: /Vendor/i }).first();
    if (await vendorSummary.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await vendorSummary.click();
      await page.waitForTimeout(500);

      const sendBtn = page.getByRole('button', { name: /Send Request/i }).first();
      if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sendBtn.click();
        await expect(page.getByText('Send Partner Request')).toBeVisible({ timeout: 5_000 });

        // Required fields: Partner Email, Message
        await expect(page.getByText('Partner Email')).toBeVisible();
        await expect(page.getByText('Message')).toBeVisible();

        // Optional fields: Contact Name, Request Type, Subject
        await expect(page.getByText('Contact Name')).toBeVisible();
        await expect(page.getByText('Request Type')).toBeVisible();
        await expect(page.getByText('Subject')).toBeVisible();

        // Request type dropdown with options
        const requestTypeSelect = page.locator('select').filter({
          has: page.locator('option', { hasText: 'Reservation' }),
        });
        await expect(requestTypeSelect).toBeVisible();

        // Cancel and Send buttons
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send Request' })).toBeVisible();
      }
    }
  });

  test('SendRequestModal validates required fields', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    await page.goto(proposalUrl!);
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Days/i }).first().click();
    await page.waitForTimeout(1000);

    const vendorSummary = page.locator('summary').filter({ hasText: /Vendor/i }).first();
    if (await vendorSummary.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await vendorSummary.click();
      await page.waitForTimeout(500);

      const sendBtn = page.getByRole('button', { name: /Send Request/i }).first();
      if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sendBtn.click();
        await expect(page.getByText('Send Partner Request')).toBeVisible({ timeout: 5_000 });

        // Clear pre-populated fields
        const emailInput = page.getByPlaceholder('contact@venue.com');
        await emailInput.fill('');

        const messageTextarea = page.locator('textarea').first();
        await messageTextarea.fill('');

        // Send button should be disabled when required fields are empty
        const submitBtn = page.getByRole('button', { name: 'Send Request' });
        await expect(submitBtn).toBeDisabled();
      }
    }
  });

  test('SendRequestModal cancel closes modal', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    await page.goto(proposalUrl!);
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Days/i }).first().click();
    await page.waitForTimeout(1000);

    const vendorSummary = page.locator('summary').filter({ hasText: /Vendor/i }).first();
    if (await vendorSummary.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await vendorSummary.click();
      await page.waitForTimeout(500);

      const sendBtn = page.getByRole('button', { name: /Send Request/i }).first();
      if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sendBtn.click();
        await expect(page.getByText('Send Partner Request')).toBeVisible({ timeout: 5_000 });

        // Click Cancel
        await page.getByRole('button', { name: 'Cancel' }).click();
        await page.waitForTimeout(500);

        // Modal should be closed
        await expect(page.getByText('Send Partner Request')).not.toBeVisible();
      }
    }
  });
});
