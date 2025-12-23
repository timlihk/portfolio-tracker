import request from 'supertest';
import { app } from '../server.js';

describe('Health endpoints', () => {
  if (process.env.PORT_BINDING_BLOCKED === 'true') {
    it.skip('skipped: environment blocks port binding', () => {});
    return;
  }

  it('returns OK for /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });
});
