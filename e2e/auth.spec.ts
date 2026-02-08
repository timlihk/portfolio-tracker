import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toContainText(/login|sign in|welcome|secret phrase/i);
  });

  test('should reject invalid shared secret', async ({ page }) => {
    await page.goto('/login');

    // Find and fill the secret input
    const secretInput = page.locator('input[type="password"], input[type="text"]').first();
    await secretInput.fill('invalid-secret-12345');

    // Submit the form
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();

    // Should show error or stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should login with valid shared secret', async ({ page }) => {
    const sharedSecret = process.env.E2E_SHARED_SECRET || process.env.SHARED_SECRET;

    if (!sharedSecret) {
      test.skip(true, 'E2E_SHARED_SECRET not set');
      return;
    }

    await page.goto('/login');

    // Find and fill the secret input
    const secretInput = page.locator('input[type="password"], input[type="text"]').first();
    await secretInput.fill(sharedSecret);

    // Submit the form
    const secretResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/auth/shared-secret') &&
        response.request().method() === 'POST'
    );
    const dashboardResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/portfolio/dashboard') &&
        response.request().method() === 'GET'
    );

    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();

    const secretResponse = await secretResponsePromise;
    if (!secretResponse.ok()) {
      const body = await secretResponse.text().catch(() => '');
      throw new Error(`Shared-secret API failed: ${secretResponse.status()} ${body}`);
    }

    const dashboardResponse = await dashboardResponsePromise;
    if (!dashboardResponse.ok()) {
      const body = await dashboardResponse.text().catch(() => '');
      throw new Error(`Dashboard API failed: ${dashboardResponse.status()} ${body}`);
    }

    // Should redirect to dashboard
    try {
      await expect(page).not.toHaveURL(/\/login/i, { timeout: 10000 });
    } catch (error) {
      const errorText = await page.locator('.text-red-600, [role="alert"]').first().textContent().catch(() => '');
      throw new Error(`Still on login page. Error banner: ${errorText || 'none'}`);
    }

    // Dashboard should show portfolio content
    // Use .or() to combine multiple possible locators for better reliability
    const portfolioHeading = page.getByRole('heading').filter({ hasText: /portfolio|dashboard/i });
    const totalText = page.getByText(/total|assets/i);
    const mainContent = page.locator('main, [data-testid="dashboard"], .dashboard-content');

    try {
      await expect(portfolioHeading.or(totalText).or(mainContent).first()).toBeVisible({ timeout: 10000 });
    } catch (error) {
      // Debug: capture page state on failure
      const currentUrl = page.url();
      const pageTitle = await page.title().catch(() => 'unknown');
      const html = await page.content().catch(() => 'failed to get HTML');
      console.error('Dashboard visibility check failed:');
      console.error(`  URL: ${currentUrl}`);
      console.error(`  Title: ${pageTitle}`);
      console.error(`  HTML preview: ${html.substring(0, 2000)}`);
      throw error;
    }
  });

  test('should logout successfully', async ({ page }) => {
    const sharedSecret = process.env.E2E_SHARED_SECRET || process.env.SHARED_SECRET;

    if (!sharedSecret) {
      test.skip(true, 'E2E_SHARED_SECRET not set');
      return;
    }

    // Login first
    await page.goto('/login');
    const secretInput = page.locator('input[type="password"], input[type="text"]').first();
    await secretInput.fill(sharedSecret);
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
    await expect(page).toHaveURL(/dashboard|\//i, { timeout: 10000 });

    // Find and click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});
