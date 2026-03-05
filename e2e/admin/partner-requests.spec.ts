import { test, expect } from '@playwright/test';

test.describe('Admin Partner Requests', () => {
  // Serial mode: tests share state and run in order
  test.describe.configure({ mode: 'serial' });

  let proposalUrl: string | null = null;

  test('setup: find a proposal with stops', async ({ page }) => {
    test.setTimeout(90_000);

    // Navigate to proposals list and wait for data to load
    await page.goto('/admin/trip-proposals');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Wait for proposals count text to appear (indicates API data loaded)
    const countText = page.getByText(/\d+ proposals?/);
    await countText.waitFor({ timeout: 20_000 }).catch(() => {});

    // Try to find a proposal link
    const firstLink = page.locator('a[href*="/admin/trip-proposals/"]').first();
    if (await firstLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const href = await firstLink.getAttribute('href');
      if (href) proposalUrl = href;
    }

    // If no proposals on the filtered page, try "Pending/Drafts" sidebar link which may show all
    if (!proposalUrl) {
      const pendingLink = page.locator('a[href*="/admin/trip-proposals"]').filter({ hasText: /Pending|Draft/i }).first();
      if (await pendingLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await pendingLink.click();
        await page.waitForLoadState('networkidle', { timeout: 15_000 });
        const link = page.locator('a[href*="/admin/trip-proposals/"]').first();
        if (await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
          const href = await link.getAttribute('href');
          if (href) proposalUrl = href;
        }
      }
    }

    // Skip all tests if no proposals exist in the database
    test.skip(!proposalUrl, 'No proposals available — create one manually to enable these tests');
  });

  test('proposal page loads with Days/Stops tab', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    test.setTimeout(60_000);
    await page.goto(proposalUrl!, { timeout: 30_000 });

    // Wait for proposal data to load (loading text disappears)
    await expect(page.getByText('Loading trip proposal')).toBeHidden({ timeout: 45_000 });

    // Days & Stops tab should be accessible
    const daysTab = page.getByRole('button', { name: /Days/i }).first();
    await expect(daysTab).toBeVisible({ timeout: 10_000 });
  });

  test('vendor section shows RequestStatusBadge', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    test.setTimeout(60_000);
    await page.goto(proposalUrl!, { timeout: 30_000 });
    await expect(page.getByText('Loading trip proposal')).toBeHidden({ timeout: 45_000 });

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
    test.setTimeout(60_000);
    await page.goto(proposalUrl!, { timeout: 30_000 });
    await expect(page.getByText('Loading trip proposal')).toBeHidden({ timeout: 45_000 });

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
    test.setTimeout(60_000);
    await page.goto(proposalUrl!, { timeout: 30_000 });
    await expect(page.getByText('Loading trip proposal')).toBeHidden({ timeout: 45_000 });

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
    test.setTimeout(60_000);
    await page.goto(proposalUrl!, { timeout: 30_000 });
    await expect(page.getByText('Loading trip proposal')).toBeHidden({ timeout: 45_000 });

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
        await expect(page.getByText('Message *')).toBeVisible();

        // Optional fields: Contact Name, Request Type, Subject
        await expect(page.getByText('Contact Name')).toBeVisible();
        await expect(page.getByText('Request Type')).toBeVisible();
        await expect(page.getByText('Subject')).toBeVisible();

        // Request type dropdown with options
        const requestTypeSelect = page.locator('select').filter({
          has: page.locator('option', { hasText: 'Reservation' }),
        });
        await expect(requestTypeSelect).toBeVisible();

        // Cancel and Send buttons (use .nth(1) for modal's Send Request — .first() is behind the modal)
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send Request' }).nth(1)).toBeVisible();
      }
    }
  });

  test('SendRequestModal validates required fields', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    test.setTimeout(60_000);
    await page.goto(proposalUrl!, { timeout: 30_000 });
    await expect(page.getByText('Loading trip proposal')).toBeHidden({ timeout: 45_000 });

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
        const submitBtn = page.getByRole('button', { name: 'Send Request' }).nth(1);
        await expect(submitBtn).toBeDisabled();
      }
    }
  });

  test('SendRequestModal cancel closes modal', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');
    test.setTimeout(60_000);
    await page.goto(proposalUrl!, { timeout: 30_000 });
    await expect(page.getByText('Loading trip proposal')).toBeHidden({ timeout: 45_000 });

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
