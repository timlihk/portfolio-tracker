import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import { AuthRequest, serializeDecimals, CashDeposit, CreateCashDepositRequest, UpdateCashDepositRequest } from '../../types/index.js';
import { toDateOrNull, toNumberOrNull } from './utils.js';

const router = Router();
const serializeCashDepositWithAliases = (deposit: any) => {
  const s = serializeDecimals(deposit);
  return {
    ...s,
    depositType: s.depositType,
    interestRate: s.interestRate,
    maturityDate: s.maturityDate
  };
};

// GET /cash-deposits - List all cash deposits
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cashDeposits = await prisma.cashDeposit.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    const serializedDeposits = cashDeposits.map(deposit => serializeCashDepositWithAliases(deposit));
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
    const body = req.body as any;
    const name = body.name;
    const depositType = body.depositType;
    const amount = body.amount;
    const currency = body.currency;
    const interestRate = body.interestRate;
    const maturityDate = body.maturityDate;
    const account = body.account;
    const notes = body.notes;

    if (!name || amount === undefined || amount === null || Number(amount) <= 0 || !currency || !account) {
      return res.status(400).json({ error: 'Name, Amount (>0), Currency, and Institution are required' });
    }

    const amountNum = toNumberOrNull(amount);
    const interestNum = toNumberOrNull(interestRate);
    const maturity = toDateOrNull(maturityDate);

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cashDeposit = await prisma.cashDeposit.create({
      data: {
        userId: req.userId,
        name,
        depositType: depositType || null,
        amount: amountNum,
        currency: currency || 'USD',
        interestRate: interestNum,
        maturityDate: maturity,
        account,
        notes: notes || null
      }
    });

    res.status(201).json(serializeCashDepositWithAliases(cashDeposit));
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
    const body = req.body as any;
    const name = body.name;
    const depositType = body.depositType;
    const amount = body.amount;
    const currency = body.currency;
    const interestRate = body.interestRate;
    const maturityDate = body.maturityDate;
    const account = body.account;
    const notes = body.notes;

    if (!name || amount === undefined || amount === null || Number(amount) <= 0 || !currency || !account) {
      return res.status(400).json({ error: 'Name, Amount (>0), Currency, and Institution are required' });
    }

    const amountNum = toNumberOrNull(amount);
    const interestNum = toNumberOrNull(interestRate);
    const maturity = toDateOrNull(maturityDate);

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existing = await prisma.cashDeposit.findFirst({
      where: { id: parseInt(id, 10), userId: req.userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Cash Deposit not found' });
    }

    const updatedDeposit = await prisma.cashDeposit.update({
      where: { id: parseInt(id, 10) },
      data: {
        name,
        depositType: depositType || null,
        amount: amountNum,
        currency,
        interestRate: interestNum,
        maturityDate: maturity,
        account,
        notes: notes || null,
        updatedAt: new Date()
      }
    });

    res.json(serializeCashDepositWithAliases(updatedDeposit));
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
        id: parseInt(id, 10),
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
