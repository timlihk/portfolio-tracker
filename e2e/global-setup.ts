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
  const apiContext = await request.newContext({ baseURL: baseUrl });

  const secretResponse = await apiContext.post('/api/v1/auth/shared-secret', {
    data: { secret: sharedSecret }
  });
  if (!secretResponse.ok()) {
    const body = await secretResponse.text().catch(() => '');
    throw new Error(`Global setup failed to set shared secret: ${secretResponse.status()} ${body}`);
  }

  const profileResponse = await apiContext.get('/api/v1/auth/profile');
  if (!profileResponse.ok()) {
    const body = await profileResponse.text().catch(() => '');
    throw new Error(`Global setup failed to fetch profile: ${profileResponse.status()} ${body}`);
  }

  await apiContext.storageState({ path: storageStatePath });
  await apiContext.dispose();
}
