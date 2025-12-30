import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const storageStatePath = path.resolve('e2e/.auth/storage.json');

function ensureStorageDir() {
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
}

export default async function globalSetup() {
  ensureStorageDir();

  const sharedSecret = process.env.E2E_SHARED_SECRET || process.env.SHARED_SECRET;
  if (!sharedSecret) {
    fs.writeFileSync(storageStatePath, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    return;
  }

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();

  await page.goto('/login');
  await page.locator('input[type="password"], input[type="text"]').first().fill(sharedSecret);
  await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first().click();
  await page.waitForURL(/^(?!.*\/login).*/i, { timeout: 10000 });
  await page.waitForSelector('text=/portfolio|dashboard|total|assets/i', { timeout: 10000 });

  await context.storageState({ path: storageStatePath });
  await browser.close();
}
