import request from 'supertest';
import { app } from '../server.js';

describe('Shared secret cookie flow', () => {
  const secret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;

  it('rejects invalid shared secret', async () => {
    const res = await request(app)
      .post('/api/v1/auth/shared-secret')
      .send({ secret: 'wrong' });
    expect(res.status).toBe(403);
  });

  it('accepts valid shared secret when configured', async () => {
    if (!secret) return;
    const res = await request(app)
      .post('/api/v1/auth/shared-secret')
      .send({ secret });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
