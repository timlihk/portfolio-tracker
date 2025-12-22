import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import { AuthRequest, serializeDecimals, CashDeposit, CreateCashDepositRequest, UpdateCashDepositRequest } from '../../types/index.js';

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

// GET /cash-deposits - List all cash deposits
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cashDeposits = await prisma.cashDeposit.findMany({
      where: { userId: req.userId }
    });

    const serializedDeposits = cashDeposits.map(deposit => serializeDecimals(deposit));
    res.json(serializedDeposits);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching cash deposits:', { error: err.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch cash deposits' });
  }
});

// POST /cash-deposits - Create a cash deposit
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      deposit_type,
      amount,
      currency,
      interest_rate,
      maturity_date,
      account,
      notes
    } = req.body as CreateCashDepositRequest & {
      deposit_type?: string;
      interest_rate?: number;
      maturity_date?: string;
    };

    if (!name || amount === undefined || amount === null || Number(amount) <= 0 || !currency || !account) {
      return res.status(400).json({ error: 'Name, Amount (>0), Currency, and Institution are required' });
    }

    const amountNum = toNumberOrNull(amount);
    const interestNum = toNumberOrNull(interest_rate);
    const maturity = toDateOrNull(maturity_date);

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cashDeposit = await prisma.cashDeposit.create({
      data: {
        userId: req.userId,
        name,
        depositType: deposit_type || null,
        amount: amountNum,
        currency: currency || 'USD',
      interestRate: interestNum,
      maturityDate: maturity,
      account,
      notes: notes || null
    }
  });

    res.status(201).json(serializeDecimals(cashDeposit));
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating cash deposit:', { error: err.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create cash deposit' });
  }
});

// PUT /cash-deposits/:id - Update a cash deposit
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      deposit_type,
      amount,
      currency,
      interest_rate,
      maturity_date,
      account,
      notes
    } = req.body as UpdateCashDepositRequest & {
      deposit_type?: string;
      interest_rate?: number;
      maturity_date?: string;
    };

    if (!name || amount === undefined || amount === null || Number(amount) <= 0 || !currency || !account) {
      return res.status(400).json({ error: 'Name, Amount (>0), Currency, and Institution are required' });
    }

    const amountNum = toNumberOrNull(amount);
    const interestNum = toNumberOrNull(interest_rate);
    const maturity = toDateOrNull(maturity_date);

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cashDeposit = await prisma.cashDeposit.updateMany({
      where: {
        id: parseInt(id),
        userId: req.userId
      },
      data: {
        name,
        depositType: deposit_type || null,
        amount: amountNum,
        currency,
      interestRate: interestNum,
      maturityDate: maturity,
      account,
      notes: notes || null,
      updatedAt: new Date()
    }
  });

    if (cashDeposit.count === 0) {
      return res.status(404).json({ error: 'Cash Deposit not found' });
    }

    // Fetch the updated record to return it
    const updatedDeposit = await prisma.cashDeposit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!updatedDeposit) {
      return res.status(404).json({ error: 'Cash Deposit not found' });
    }

    res.json(serializeDecimals(updatedDeposit));
  } catch (error) {
    const { id } = req.params;
    const err = error as Error;
    logger.error('Error updating cash deposit:', { error: err.message, userId: req.userId, cashDepositId: id });
    res.status(500).json({ error: 'Failed to update cash deposit' });
  }
});

// DELETE /cash-deposits/:id - Delete a cash deposit
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cashDeposit = await prisma.cashDeposit.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.userId
      }
    });

    if (cashDeposit.count === 0) {
      return res.status(404).json({ error: 'Cash Deposit not found' });
    }

    res.json({ message: 'Cash Deposit deleted successfully' });
  } catch (error) {
    const { id } = req.params;
    const err = error as Error;
    logger.error('Error deleting cash deposit:', { error: err.message, userId: req.userId, cashDepositId: id });
    res.status(500).json({ error: 'Failed to delete cash deposit' });
  }
});

export default router;
