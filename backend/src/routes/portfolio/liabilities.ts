import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import { AuthRequest, serializeDecimals, Liability, CreateLiabilityRequest, UpdateLiabilityRequest } from '../../types/index.js';

const router = Router();

const serializeLiabilityWithAliases = (liability: any) => {
  const s = serializeDecimals(liability);
  return {
    ...s,
    liabilityType: s.liabilityType,
    outstandingBalance: s.outstandingBalance,
    interestRate: s.interestRate,
    rateType: s.rateType,
    startDate: s.startDate,
    maturityDate: s.maturityDate
  };
};

const toNumberOrNull = (val: unknown): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

const toDateOrNull = (val: unknown): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

// GET /liabilities - List all liabilities
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const liabilities = await prisma.liability.findMany({
      where: { userId: req.userId }
    });

    const serializedLiabilities = liabilities.map(liability => serializeLiabilityWithAliases(liability));
    res.json(serializedLiabilities);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching liabilities:', { error: err.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch liabilities' });
  }
});

// POST /liabilities - Create a liability
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      liability_type,
      account,
      principal,
      outstanding_balance,
      interest_rate,
      rate_type,
      collateral,
      start_date,
      maturity_date,
      currency,
      status,
      notes
    } = req.body as CreateLiabilityRequest & {
      liability_type?: string;
      outstanding_balance?: number;
      interest_rate?: number;
      rate_type?: string;
      start_date?: string;
      maturity_date?: string;
    };

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const principalNum = toNumberOrNull(principal);
    const outstandingNum = toNumberOrNull(outstanding_balance);
    const interestNum = toNumberOrNull(interest_rate);
    const startDateVal = toDateOrNull(start_date);
    const maturityDateVal = toDateOrNull(maturity_date);

    const liability = await prisma.liability.create({
      data: {
        userId: req.userId,
        name,
        liabilityType: liability_type || null,
        account: account || null,
        principal: principalNum,
        outstandingBalance: outstandingNum,
        interestRate: interestNum,
        rateType: rate_type || null,
        collateral: collateral || null,
        startDate: startDateVal,
        maturityDate: maturityDateVal,
        currency: currency || 'USD',
        status: status || 'Active',
        notes: notes || null
      }
    });

    res.status(201).json(serializeDecimals(liability));
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating liability:', { error: err.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create liability' });
  }
});

// PUT /liabilities/:id - Update a liability
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      liability_type,
      account,
      principal,
      outstanding_balance,
      interest_rate,
      rate_type,
      collateral,
      start_date,
      maturity_date,
      currency,
      status,
      notes
    } = req.body as UpdateLiabilityRequest & {
      liability_type?: string;
      outstanding_balance?: number;
      interest_rate?: number;
      rate_type?: string;
      start_date?: string;
      maturity_date?: string;
    };

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const principalNum = toNumberOrNull(principal);
    const outstandingNum = toNumberOrNull(outstanding_balance);
    const interestNum = toNumberOrNull(interest_rate);
    const startDateVal = toDateOrNull(start_date);
    const maturityDateVal = toDateOrNull(maturity_date);

    const liability = await prisma.liability.updateMany({
      where: {
        id: parseInt(id),
        userId: req.userId
      },
      data: {
        name,
        liabilityType: liability_type || null,
        account: account || null,
        principal: principalNum,
        outstandingBalance: outstandingNum,
        interestRate: interestNum,
        rateType: rate_type || null,
        collateral: collateral || null,
        startDate: startDateVal,
        maturityDate: maturityDateVal,
        currency,
        status,
        notes: notes || null,
        updatedAt: new Date()
      }
    });

    if (liability.count === 0) {
      return res.status(404).json({ error: 'Liability not found' });
    }

    // Fetch the updated record to return it
    const updatedLiability = await prisma.liability.findUnique({
      where: { id: parseInt(id) }
    });

    if (!updatedLiability) {
      return res.status(404).json({ error: 'Liability not found' });
    }

    res.json(serializeLiabilityWithAliases(updatedLiability));
  } catch (error) {
    const { id } = req.params;
    const err = error as Error;
    logger.error('Error updating liability:', { error: err.message, userId: req.userId, liabilityId: id });
    res.status(500).json({ error: 'Failed to update liability' });
  }
});

// DELETE /liabilities/:id - Delete a liability
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const liability = await prisma.liability.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.userId
      }
    });

    if (liability.count === 0) {
      return res.status(404).json({ error: 'Liability not found' });
    }

    res.json({ message: 'Liability deleted successfully' });
  } catch (error) {
    const { id } = req.params;
    const err = error as Error;
    logger.error('Error deleting liability:', { error: err.message, userId: req.userId, liabilityId: id });
    res.status(500).json({ error: 'Failed to delete liability' });
  }
});

export default router;
