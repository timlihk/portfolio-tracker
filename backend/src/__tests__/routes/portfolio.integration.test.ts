// Integration-style portfolio route tests with mocked Prisma
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.SHARED_SECRET = process.env.SHARED_SECRET || 'test-shared-secret';
process.env.SHARED_SECRET_USER_ID = process.env.SHARED_SECRET_USER_ID || '1';

import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sharedSecret = process.env.SHARED_SECRET || 'test-shared-secret';

// Prisma mock must be defined before importing app
const mockPrisma = vi.hoisted(() => ({
  $connect: vi.fn().mockResolvedValue(undefined),
  user: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  stock: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  bond: {
    findMany: vi.fn()
  },
  peFund: {
    findMany: vi.fn()
  },
  peDeal: {
    findMany: vi.fn()
  },
  account: {
    findMany: vi.fn()
  },
  cashDeposit: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  liquidFund: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  liability: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../lib/prisma.js', () => ({
  default: mockPrisma,
  prisma: mockPrisma
}));

import { app } from '../../server.js';

const baseHeaders = { 'x-shared-secret': sharedSecret };
const portBlocked = process.env.PORT_BINDING_BLOCKED === 'true';
const describeOrSkip = portBlocked ? describe.skip : describe;

describeOrSkip('Portfolio routes integration (shared secret)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.user.upsert.mockResolvedValue({ id: 1 });

    mockPrisma.stock.findMany.mockResolvedValue([
      { id: 1, userId: 1, ticker: 'AAPL', companyName: 'Apple', shares: 10, averageCost: 150, currentPrice: 170, currency: 'USD', account: 'Main', createdAt: new Date(), updatedAt: new Date() }
    ]);
    mockPrisma.stock.count.mockResolvedValue(1);
    mockPrisma.stock.create.mockResolvedValue({
      id: 2, userId: 1, ticker: 'MSFT', companyName: 'Microsoft', shares: 5, averageCost: 300, currentPrice: 310, currency: 'USD', account: 'Main', createdAt: new Date(), updatedAt: new Date()
    });
    mockPrisma.stock.findFirst.mockResolvedValue({ id: 2, userId: 1 });
    mockPrisma.stock.update.mockResolvedValue({
      id: 2, userId: 1, ticker: 'MSFT', companyName: 'Microsoft', shares: 6, averageCost: 300, currentPrice: 310, currency: 'USD', account: 'Main', createdAt: new Date(), updatedAt: new Date()
    });
    mockPrisma.stock.delete.mockResolvedValue({ id: 2 });

    mockPrisma.bond.findMany.mockResolvedValue([]);
    mockPrisma.peFund.findMany.mockResolvedValue([]);
    mockPrisma.peDeal.findMany.mockResolvedValue([]);
    mockPrisma.account.findMany.mockResolvedValue([]);

    mockPrisma.cashDeposit.findMany.mockResolvedValue([
      { id: 1, userId: 1, name: 'Cash', amount: 1000, currency: 'USD', account: 'Main', createdAt: new Date(), updatedAt: new Date() }
    ]);
    mockPrisma.cashDeposit.count.mockResolvedValue(1);
    mockPrisma.cashDeposit.create.mockResolvedValue({ id: 2, userId: 1, name: 'New Cash', amount: 500, currency: 'EUR', account: 'Main', createdAt: new Date(), updatedAt: new Date() });
    mockPrisma.cashDeposit.findFirst.mockResolvedValue({ id: 2, userId: 1 });
    mockPrisma.cashDeposit.update.mockResolvedValue({ id: 2, userId: 1, name: 'New Cash', amount: 600, currency: 'EUR', account: 'Main', createdAt: new Date(), updatedAt: new Date() });
    mockPrisma.cashDeposit.delete.mockResolvedValue({ id: 2 });

    mockPrisma.liquidFund.findMany.mockResolvedValue([
      { id: 1, userId: 1, fundName: 'Fund A', investmentAmount: 10000, currentValue: 10500, currency: 'USD', createdAt: new Date(), updatedAt: new Date() }
    ]);
    mockPrisma.liquidFund.count.mockResolvedValue(1);
    mockPrisma.liquidFund.create.mockResolvedValue({ id: 2, userId: 1, fundName: 'Fund B', investmentAmount: 20000, currentValue: 21000, currency: 'EUR', createdAt: new Date(), updatedAt: new Date() });
    mockPrisma.liquidFund.findFirst.mockResolvedValue({ id: 2, userId: 1 });
    mockPrisma.liquidFund.update.mockResolvedValue({ id: 2, userId: 1, fundName: 'Fund B', investmentAmount: 20000, currentValue: 22000, currency: 'EUR', createdAt: new Date(), updatedAt: new Date() });
    mockPrisma.liquidFund.delete.mockResolvedValue({ id: 2 });

    mockPrisma.liability.findMany.mockResolvedValue([
      { id: 1, userId: 1, name: 'Loan', principal: 5000, outstandingBalance: 4800, currency: 'USD', account: 'Main', createdAt: new Date(), updatedAt: new Date() }
    ]);
    mockPrisma.liability.count.mockResolvedValue(1);
    mockPrisma.liability.create.mockResolvedValue({ id: 2, userId: 1, name: 'New Loan', principal: 1000, outstandingBalance: 1000, currency: 'USD', account: 'Main', createdAt: new Date(), updatedAt: new Date() });
    mockPrisma.liability.findFirst.mockResolvedValue({ id: 2, userId: 1 });
    mockPrisma.liability.update.mockResolvedValue({ id: 2, userId: 1, name: 'New Loan', principal: 900, outstandingBalance: 900, currency: 'USD', account: 'Main', createdAt: new Date(), updatedAt: new Date() });
    mockPrisma.liability.delete.mockResolvedValue({ id: 2 });
  });

  it('requires auth on portfolio routes', async () => {
    const res = await request(app).get('/api/v1/portfolio/stocks');
    expect(res.status).toBe(401);
  });

  it('lists stocks with shared secret auth', async () => {
    const res = await request(app)
      .get('/api/v1/portfolio/stocks')
      .set(baseHeaders);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(mockPrisma.stock.findMany).toHaveBeenCalled();
  });

  it('returns dashboard data with shared secret auth', async () => {
    const res = await request(app)
      .get('/api/v1/portfolio/dashboard')
      .set(baseHeaders);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      stocks: expect.any(Array),
      bonds: expect.any(Array),
      peFunds: expect.any(Array),
      peDeals: expect.any(Array),
      liquidFunds: expect.any(Array),
      cashDeposits: expect.any(Array),
      liabilities: expect.any(Array),
      accounts: expect.any(Array)
    });
    expect(mockPrisma.stock.findMany).toHaveBeenCalled();
    expect(mockPrisma.bond.findMany).toHaveBeenCalled();
    expect(mockPrisma.account.findMany).toHaveBeenCalled();
  });

  it('creates and updates a stock', async () => {
    const createRes = await request(app)
      .post('/api/v1/portfolio/stocks')
      .set(baseHeaders)
      .send({ ticker: 'MSFT', shares: 5, averageCost: 300, currency: 'USD' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.ticker).toBe('MSFT');

    const updateRes = await request(app)
      .put('/api/v1/portfolio/stocks/2')
      .set(baseHeaders)
      .send({ shares: 6 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.shares).toBe(6);
  });

  it('validates stock payloads', async () => {
    const res = await request(app)
      .post('/api/v1/portfolio/stocks')
      .set(baseHeaders)
      .send({ ticker: '', shares: -1, averageCost: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('creates cash deposit, liquid fund, and liability entries', async () => {
    const cashRes = await request(app)
      .post('/api/v1/portfolio/cash-deposits')
      .set(baseHeaders)
      .send({ name: 'New Cash', amount: 500, currency: 'EUR' });
    expect(cashRes.status).toBe(201);

    const fundRes = await request(app)
      .post('/api/v1/portfolio/liquid-funds')
      .set(baseHeaders)
      .send({ fundName: 'Fund B', investmentAmount: 20000, currentValue: 21000, currency: 'EUR' });
    expect(fundRes.status).toBe(201);

    const liabilityRes = await request(app)
      .post('/api/v1/portfolio/liabilities')
      .set(baseHeaders)
      .send({ name: 'New Loan', principal: 1000, outstandingBalance: 1000, currency: 'USD' });
    expect(liabilityRes.status).toBe(201);
  });
});
