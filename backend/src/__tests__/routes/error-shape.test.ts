import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';

const portBlocked = process.env.PORT_BINDING_BLOCKED === 'true';

vi.mock('../../lib/prisma.js', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 1 }),
      upsert: vi.fn().mockResolvedValue({ id: 1 })
    },
    stock: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn()
    }
  };

  return {
    default: mockPrisma,
    prisma: mockPrisma
  };
});

const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE || 'test-shared-secret';

const describeOrSkip = portBlocked ? describe.skip : describe;

describeOrSkip('Error response shapes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a consistent error shape when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/portfolio/stocks');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it('returns validation error payloads with details', async () => {
    const res = await request(app)
      .post('/api/v1/portfolio/stocks')
      .set('x-shared-secret', sharedSecret)
      .send({ ticker: '', shares: -1, averageCost: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });
});
