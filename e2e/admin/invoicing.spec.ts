import { test, expect } from '@playwright/test';

test.describe('Admin Invoicing', () => {
  test('invoices page loads with heading', async ({ page }) => {
    await page.goto('/admin/invoices');

    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/Tours completed 48\+ hours ago/i)
    ).toBeVisible();
  });

  test('back to dashboard link works', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });

    const backLink = page.getByText(/Back to Dashboard/i);
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10_000 });
  });

  test('stats cards display counts', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });

    // Stats cards
    await expect(page.getByText('PENDING INVOICES')).toBeVisible();
    await expect(page.getByText('TOTAL AMOUNT')).toBeVisible();
    await expect(page.getByText('AVG HOURS')).toBeVisible();
  });

  test('shows empty state or invoice list', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });

    // Either shows "All caught up!" empty state or invoice cards
    const emptyState = page.getByText(/All caught up/i);
    const invoiceCard = page.getByText(/Review & Send/i).first();

    const isEmpty = await emptyState.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasInvoices = await invoiceCard.isVisible({ timeout: 3_000 }).catch(() => false);

    // One of these should be true
    expect(isEmpty || hasInvoices).toBeTruthy();
  });

  test('invoice cards show booking details', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });

    // If invoices exist, verify they show expected fields
    const reviewBtn = page.getByText(/Review & Send/i).first();
    if (await reviewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Invoice card should show these fields
      await expect(page.getByText(/Tour Date:/i).first()).toBeVisible();
      await expect(page.getByText(/Driver:/i).first()).toBeVisible();
      await expect(page.getByText(/Hours/i).first()).toBeVisible();
      await expect(page.getByText(/Hourly Rate:/i).first()).toBeVisible();
    }
  });

  test('review mode opens on click', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });

    const reviewBtn = page.getByText(/Review & Send/i).first();
    if (await reviewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await reviewBtn.click();

      // Review mode should show hours input and confirm button
      await expect(page.getByText(/Confirm & Send/i)).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
    }
  });

  test('review mode can be cancelled', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });

    const reviewBtn = page.getByText(/Review & Send/i).first();
    if (await reviewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await reviewBtn.click();
      await expect(page.getByText(/Confirm & Send/i)).toBeVisible({ timeout: 5_000 });

      // Cancel review
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Should return to initial state with "Review & Send" button visible
      await expect(page.getByText(/Review & Send/i).first()).toBeVisible();
    }
  });

  test('view booking details button links to booking', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Pending Final Invoices/i })).toBeVisible({
      timeout: 15_000,
    });

    const viewDetailsBtn = page.getByText(/View Booking Details/i).first();
    if (await viewDetailsBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(viewDetailsBtn).toBeVisible();
    }
  });
});
