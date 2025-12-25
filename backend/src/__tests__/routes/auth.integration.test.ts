// Integration-style tests for auth flows using mocked Prisma
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.SHARED_SECRET = process.env.SHARED_SECRET || 'test-shared-secret';
process.env.SHARED_SECRET_USER_ID = process.env.SHARED_SECRET_USER_ID || '1';

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, beforeEach, expect, vi } from 'vitest';

// Mock Prisma before importing the app (use hoisted value to avoid TDZ)
const mockPrisma = vi.hoisted(() => ({
  $connect: vi.fn().mockResolvedValue(undefined),
  user: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../../lib/prisma.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma
}));

import { app } from '../../server.js';

const sharedSecret = process.env.SHARED_SECRET || 'test-shared-secret';
const portBlocked = process.env.PORT_BINDING_BLOCKED === 'true';
const describeOrSkip = portBlocked ? describe.skip : describe;

describeOrSkip('Auth integration (shared secret + JWT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.upsert.mockResolvedValue({ id: 1 });
    mockPrisma.user.create.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Tester'
    });
  });

  it('registers a user when shared secret is provided', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('x-shared-secret', sharedSecret)
      .send({ email: 'test@example.com', password: 'password123', name: 'Tester' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('rejects register without shared secret when required', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'no-secret@example.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/secret/i);
  });

  it('logs in a user with valid credentials and shared secret', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Tester',
      passwordHash
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('x-shared-secret', sharedSecret)
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns profile when shared secret cookie/header is valid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Tester',
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('x-shared-secret', sharedSecret);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@example.com');
  });
});
