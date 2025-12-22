import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import { AuthRequest, serializeDecimals, Liability, CreateLiabilityRequest, UpdateLiabilityRequest } from '../../types/index.js';

const router = Router();

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

    const serializedLiabilities = liabilities.map(liability => serializeDecimals(liability));
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
      liabilityType,
      account,
      principal,
      outstandingBalance,
      interestRate,
      rateType,
      collateral,
      startDate,
      maturityDate,
      currency,
      status,
      notes
    } = req.body as CreateLiabilityRequest;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const principalNum = toNumberOrNull(principal);
    const outstandingNum = toNumberOrNull(outstandingBalance);
    const interestNum = toNumberOrNull(interestRate);
    const startDateVal = toDateOrNull(startDate);
    const maturityDateVal = toDateOrNull(maturityDate);

    const liability = await prisma.liability.create({
      data: {
        userId: req.userId,
        name,
        liabilityType: liabilityType || null,
        account: account || null,
        principal: principalNum,
        outstandingBalance: outstandingNum,
        interestRate: interestNum,
        rateType: rateType || null,
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
      liabilityType,
      account,
      principal,
      outstandingBalance,
      interestRate,
      rateType,
      collateral,
      startDate,
      maturityDate,
      currency,
      status,
      notes
    } = req.body as UpdateLiabilityRequest;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const principalNum = toNumberOrNull(principal);
    const outstandingNum = toNumberOrNull(outstandingBalance);
    const interestNum = toNumberOrNull(interestRate);
    const startDateVal = toDateOrNull(startDate);
    const maturityDateVal = toDateOrNull(maturityDate);

    const liability = await prisma.liability.updateMany({
      where: {
        id: parseInt(id),
        userId: req.userId
      },
      data: {
        name,
        liabilityType: liabilityType || null,
        account: account || null,
        principal: principalNum,
        outstandingBalance: outstandingNum,
        interestRate: interestNum,
        rateType: rateType || null,
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

    res.json(serializeDecimals(updatedLiability));
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
