import { test, expect } from '@playwright/test';

test.describe('Admin Calendar', () => {
  test('calendar page loads with heading', async ({ page }) => {
    await page.goto('/admin/calendar');

    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('calendar displays current month and year', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    // Month/year heading — e.g. "March 2026"
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    await expect(page.getByRole('heading', { name: `${monthName} ${year}` })).toBeVisible();
  });

  test('calendar has day-of-week headers', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const main = page.locator('main').last();
    await expect(main.getByText('Sunday')).toBeVisible();
    await expect(main.getByText('Monday')).toBeVisible();
    await expect(main.getByText('Tuesday')).toBeVisible();
    await expect(main.getByText('Wednesday')).toBeVisible();
    await expect(main.getByText('Thursday')).toBeVisible();
    await expect(main.getByText('Friday')).toBeVisible();
    await expect(main.getByText('Saturday')).toBeVisible();
  });

  test('date navigation — previous and next month', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });

    // Navigate to next month — use exact name to avoid matching Next.js dev tools button
    await page.getByRole('button', { name: 'Next →', exact: true }).click();
    await page.waitForTimeout(500);

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(nextMonthName)).first()).toBeVisible();

    // Navigate back
    await page.getByRole('button', { name: '← Previous', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(new RegExp(currentMonth)).first()).toBeVisible();
  });

  test('today button returns to current month', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    // Navigate away from current month
    await page.getByRole('button', { name: 'Next →', exact: true }).click();
    await page.waitForTimeout(500);

    // Click "Today" — scope to main content to avoid sidebar "Today's Priorities"
    const main = page.locator('main').last();
    await main.getByRole('button', { name: 'Today', exact: true }).click();
    await page.waitForTimeout(500);

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(currentMonth)).first()).toBeVisible();
  });

  test('filter by status dropdown works', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const statusLabel = page.getByText('Filter by Status');
    await expect(statusLabel).toBeVisible();

    const statusSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Statuses' }) });
    await expect(statusSelect).toBeVisible();

    // Select "Confirmed"
    await statusSelect.selectOption('confirmed');
    await page.waitForTimeout(500);

    // Select back to "All"
    await statusSelect.selectOption('all');
  });

  test('filter by driver dropdown works', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const driverLabel = page.getByText('Filter by Driver');
    await expect(driverLabel).toBeVisible();

    const driverSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Drivers' }) });
    await expect(driverSelect).toBeVisible();

    // Verify "Unassigned" option exists
    await expect(driverSelect.locator('option', { hasText: 'Unassigned' })).toBeAttached();

    // Select "Unassigned" to filter
    await driverSelect.selectOption({ label: 'Unassigned' });
    await page.waitForTimeout(500);

    // Reset to all
    await driverSelect.selectOption('all');
  });

  test('filter by vehicle dropdown works', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const vehicleLabel = page.getByText('Filter by Vehicle');
    await expect(vehicleLabel).toBeVisible();

    const vehicleSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Vehicles' }) });
    await expect(vehicleSelect).toBeVisible();
  });

  test('legend shows all event type labels', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    // Legend is inside a flex-wrap container — scope assertions to avoid matching dropdown options
    // Booking legend section
    await expect(page.getByText('Bookings:').first()).toBeVisible();
    // Tentative legend section with emoji+label
    await expect(page.getByText('🌟 Shared Tour')).toBeVisible();
    await expect(page.getByText('📨 Trip Proposal')).toBeVisible();
    await expect(page.getByText('📄 Proposal')).toBeVisible();
    await expect(page.getByText('🏢 Corporate')).toBeVisible();
    await expect(page.getByText('📋 Reservation')).toBeVisible();
    // Block legend section
    await expect(page.getByText('🔧 Maint')).toBeVisible();
    await expect(page.getByText('⛔ Blackout')).toBeVisible();
  });

  test('tentative toggle button works', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const tentativeBtn = page.getByRole('button', { name: /Tentative/i });
    await expect(tentativeBtn).toBeVisible();

    // Toggle tentative events off and on
    await tentativeBtn.click();
    await page.waitForTimeout(500);
    await tentativeBtn.click();
    await page.waitForTimeout(500);
  });

  test('blocks toggle button works', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const blocksBtn = page.getByRole('button', { name: /Blocks/i });
    await expect(blocksBtn).toBeVisible();

    await blocksBtn.click();
    await page.waitForTimeout(500);
    await blocksBtn.click();
    await page.waitForTimeout(500);
  });

  test('stats line shows counts', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    // Stats line: "X bookings | Y tentative | Z blocks | W vehicles"
    await expect(page.getByText(/\d+ bookings/).first()).toBeVisible();
    await expect(page.getByText(/\d+ tentative/).first()).toBeVisible();
    await expect(page.getByText(/\d+ vehicles/).first()).toBeVisible();
  });

  test('new booking button is visible', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    const newBookingBtn = page.getByRole('button', { name: /New Booking/i });
    await expect(newBookingBtn).toBeVisible();
  });

  test('dashboard link is visible', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByRole('button', { name: '← Dashboard' })).toBeVisible();
  });
});
