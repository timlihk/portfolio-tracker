import { test, expect } from '@playwright/test';

test.describe('Stocks CRUD', () => {
  const sharedSecret = process.env.E2E_SHARED_SECRET || process.env.SHARED_SECRET;
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const apiBaseUrl = `${baseUrl.replace(/\/$/, '')}/api/v1`;
  const assertAuthenticated = async (page) => {
    const ok = await page.evaluate(async () => {
      const response = await fetch('/api/v1/auth/profile', { credentials: 'include' });
      return response.ok;
    });
    expect(ok).toBeTruthy();
  };

  const loginWithSharedSecret = async (page) => {
    const seedResponse = await page.request.get(`${apiBaseUrl}/portfolio/dashboard`, {
      headers: { 'x-shared-secret': sharedSecret },
    });
    expect(seedResponse.ok()).toBeTruthy();
    await page.goto(`${baseUrl.replace(/\/$/, '')}/login`);
    const secretInput = page.locator('input[type="password"], input[type="text"]').first();
    await secretInput.fill(sharedSecret);
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 10000 });
    await expect(page.locator('text=/portfolio|dashboard|total|assets/i').first()).toBeVisible({ timeout: 10000 });
    await assertAuthenticated(page);
  };

  const gotoAuthenticated = async (page, path) => {
    await page.goto(path);
    if (page.url().includes('/login')) {
      await loginWithSharedSecret(page);
      await page.goto(path);
    }
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 10000 });
    await assertAuthenticated(page);
  };

  test.beforeEach(async ({ page }) => {
    if (!sharedSecret) {
      test.skip(true, 'E2E_SHARED_SECRET not set');
      return;
    }

    // Login before each test
    await gotoAuthenticated(page, '/');
  });

  test('should navigate to stocks page', async ({ page }) => {
    if (!sharedSecret) return;

    await gotoAuthenticated(page, '/Stocks');
    await expect(page.getByRole('heading', { name: /stocks/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display stocks table', async ({ page }) => {
    if (!sharedSecret) return;

    await gotoAuthenticated(page, '/Stocks');

    // Wait for table or list to load
    const table = page.locator('table, [role="table"], .stocks-list');
    await expect(table.first()).toBeVisible({ timeout: 15000 });
  });

  test('should open add stock dialog', async ({ page }) => {
    if (!sharedSecret) return;

    await gotoAuthenticated(page, '/Stocks');

    // Find and click add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("+")').first();
    await addButton.click();

    // Dialog should open
    const dialog = page.locator('[role="dialog"], .dialog, .modal');
    await expect(dialog.first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a new stock', async ({ page }) => {
    if (!sharedSecret) return;

    await gotoAuthenticated(page, '/Stocks');

    // Open add dialog
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("+")').first();
    await addButton.click();

    // Fill form
    const tickerInput = page.locator('input[name="ticker"], input[placeholder*="ticker" i], input[placeholder*="AAPL" i]').first();
    await tickerInput.fill('TEST');

    const sharesInput = page.locator('input[name="shares"], input[placeholder*="shares" i], input[type="number"]').first();
    await sharesInput.fill('100');

    const costInput = page.locator('input[name="averageCost"], input[placeholder*="cost" i], input[placeholder*="price" i]').nth(0);
    await costInput.fill('50');

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Add")').last();
    await submitButton.click();

    // Dialog should close and stock should appear
    await expect(page.locator('text=TEST')).toBeVisible({ timeout: 10000 });
  });

  test('should delete a stock', async ({ page }) => {
    if (!sharedSecret) return;

    await gotoAuthenticated(page, '/Stocks');

    // Look for TEST stock we created
    const testRow = page.locator('tr:has-text("TEST"), [data-testid*="TEST"]').first();

    if (await testRow.isVisible()) {
      // Find delete button in row
      const deleteButton = testRow.locator('button:has-text("Delete"), button[aria-label*="delete" i], .delete-btn, button:has(.trash)').first();
      await deleteButton.click();

      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Stock should be removed
      await expect(page.locator('text=TEST')).not.toBeVisible({ timeout: 10000 });
    }
  });
});
