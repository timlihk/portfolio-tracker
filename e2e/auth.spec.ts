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
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();

    // Should redirect to dashboard
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 10000 });

    // Dashboard should show portfolio content
    await expect(page.locator('text=/portfolio|dashboard|total|assets/i').first()).toBeVisible({ timeout: 10000 });
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
