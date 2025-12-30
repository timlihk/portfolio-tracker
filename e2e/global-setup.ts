import { request } from '@playwright/test';
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
  const apiBaseUrl = `${baseUrl.replace(/\/$/, '')}/api/v1`;

  const context = await request.newContext({ baseURL: baseUrl });
  const seedResponse = await context.get(`${apiBaseUrl}/portfolio/dashboard`, {
    headers: { 'x-shared-secret': sharedSecret },
  });
  if (!seedResponse.ok()) {
    throw new Error(`Failed to seed shared user: ${seedResponse.status()}`);
  }

  const authResponse = await context.post(`${apiBaseUrl}/auth/shared-secret`, {
    data: { secret: sharedSecret },
  });
  if (!authResponse.ok()) {
    throw new Error(`Failed to set shared secret cookie: ${authResponse.status()}`);
  }

  await context.storageState({ path: storageStatePath });
  await context.dispose();
}
