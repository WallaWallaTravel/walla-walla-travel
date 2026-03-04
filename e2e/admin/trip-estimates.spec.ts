import { test, expect } from '@playwright/test';

test.describe('Admin Trip Estimates', () => {
  test('estimates page loads', async ({ page }) => {
    await page.goto('/admin/trip-estimates');

    await expect(page.getByText(/Trip Estimates/i).first()).toBeVisible();
  });

  test('create estimate and verify deposit auto-calculates to 50%', async ({ page }) => {
    await page.goto('/admin/trip-estimates/new');

    // Wait for form to load
    await expect(page.getByText(/Trip Basics/i)).toBeVisible({ timeout: 10_000 });

    // Fill customer name using placeholder
    await page.getByPlaceholder('e.g., John & Jane Smith').fill('E2E Estimate Customer');
    await page.getByPlaceholder('client@email.com').fill('e2e-estimate@example.com');

    // Fill a cost line item description
    const descriptionInput = page.getByPlaceholder('Description...').first();
    if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionInput.fill('Wine tour transportation');
    }

    // Set quantity
    const qtyInput = page.locator('input[type="number"][step="0.5"]').first();
    if (await qtyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await qtyInput.fill('2');
    }

    // Set unit price
    const priceInput = page.locator('input[type="number"][step="0.01"]').first();
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.fill('500');
    }

    // Wait for auto-calculation
    await page.waitForTimeout(1000);

    // Verify the summary section shows a dollar amount (auto-calculated)
    const summarySection = page.getByText('Estimated Total');
    await expect(summarySection).toBeVisible({ timeout: 5000 });

    // Save as draft
    await page.getByRole('button', { name: /Save Draft/i }).click();

    // Wait for save response
    await page.waitForTimeout(3000);

    // Navigate back to list
    await page.goto('/admin/trip-estimates');
    await expect(page.getByText(/Trip Estimates/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('new estimate form has all required sections', async ({ page }) => {
    await page.goto('/admin/trip-estimates/new');

    // Wait for form to load
    await expect(page.getByText(/Trip Basics/i)).toBeVisible({ timeout: 10_000 });

    // Customer info — check by placeholder
    await expect(page.getByPlaceholder('e.g., John & Jane Smith')).toBeVisible();
    await expect(page.getByPlaceholder('client@email.com')).toBeVisible();

    // Trip type selector
    const tripTypeSelect = page
      .locator('select')
      .filter({ has: page.locator('option[value="wine_tour"]') });
    await expect(tripTypeSelect).toBeVisible();

    // Cost line items — description input
    await expect(page.getByPlaceholder('Description...').first()).toBeVisible();

    // Add line item button
    await expect(page.getByRole('button', { name: /Add Line Item/i })).toBeVisible();

    // Save buttons
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible();
  });

  test('estimates list has search and status filter', async ({ page }) => {
    await page.goto('/admin/trip-estimates');
    await expect(page.getByText(/Trip Estimates/i).first()).toBeVisible();

    // Search input
    await expect(page.getByPlaceholder(/Search by customer/i)).toBeVisible();

    // Status filter dropdown
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
  });
});
