import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import { AuthRequest, serializeDecimals, CashDeposit, CreateCashDepositRequest, UpdateCashDepositRequest } from '../../types/index.js';
import { handleValidationOrRespond, toDateOrNull, toNumberOrNull } from './utils.js';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';
import { sendNotFound, sendServerError, sendUnauthorized } from '../response.js';

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
    const { skip, take, paginated, page, limit } = getPaginationParams(req);
    const rawAccount = (req.query as { account?: string }).account;
    const rawCurrency = (req.query as { currency?: string }).currency;
    const account = rawAccount && rawAccount !== 'undefined' ? rawAccount : undefined;
    const currency = rawCurrency && rawCurrency !== 'undefined' ? rawCurrency : undefined;
    const where = {
      userId: req.userId,
      ...(account ? { account } : {}),
      ...(currency ? { currency } : {})
    };
    const cashDeposits = await prisma.cashDeposit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    if (paginated && page && limit) {
      const total = await prisma.cashDeposit.count({ where });
      setPaginationHeaders(res, total, page, limit);
    }

    const serializedDeposits = cashDeposits.map(deposit => serializeCashDepositWithAliases(deposit));
    res.json(serializedDeposits);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching cash deposits:', { error: err.message, userId: req.userId });
    sendServerError(res, 'Failed to fetch cash deposits');
  }
});

// POST /cash-deposits - Create a cash deposit
router.post('/', requireAuth, [
  body('name').notEmpty().isLength({ max: 255 }),
  body('depositType').optional().isLength({ max: 100 }),
  body('amount')
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return v;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat({ gt: 0 }),
  body('currency').notEmpty().isLength({ max: 10 }),
  body('interestRate')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat(),
  body('maturityDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('account').notEmpty().isLength({ max: 255 }),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 })
], async (req: AuthRequest, res: Response) => {
  try {
    if (!handleValidationOrRespond(req, res)) return;

    if (!req.userId) {
      return sendUnauthorized(res);
    }

    const {
      name,
      depositType,
      amount,
      currency,
      interestRate,
      maturityDate,
      account,
      notes
    } = req.body as CreateCashDepositRequest;

    const amountNum = toNumberOrNull(amount);
    const interestNum = toNumberOrNull(interestRate);
    const maturity = toDateOrNull(maturityDate);

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
    sendServerError(res, 'Failed to create cash deposit');
  }
});

// PUT /cash-deposits/:id - Update a cash deposit
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('name').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body('depositType').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body('amount')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat({ gt: 0 }),
  body('currency').optional({ nullable: true, checkFalsy: true }).isLength({ max: 10 }),
  body('interestRate')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat(),
  body('maturityDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('account').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 })
], async (req: AuthRequest, res: Response) => {
  try {
    if (!handleValidationOrRespond(req, res)) return;

    const { id } = req.params;

    if (!req.userId) {
      return sendUnauthorized(res);
    }

    const {
      name,
      depositType,
      amount,
      currency,
      interestRate,
      maturityDate,
      account,
      notes
    } = req.body as UpdateCashDepositRequest;

    const amountNum = toNumberOrNull(amount);
    const interestNum = toNumberOrNull(interestRate);
    const maturity = toDateOrNull(maturityDate);

    const existing = await prisma.cashDeposit.findFirst({
      where: { id: parseInt(id, 10), userId: req.userId }
    });

    if (!existing) {
      return sendNotFound(res, 'Cash Deposit not found');
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
    sendServerError(res, 'Failed to update cash deposit');
  }
});

// DELETE /cash-deposits/:id - Delete a cash deposit
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    if (!handleValidationOrRespond(req, res)) return;

    const { id } = req.params;

    if (!req.userId) {
      return sendUnauthorized(res);
    }

    const cashDeposit = await prisma.cashDeposit.deleteMany({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (cashDeposit.count === 0) {
      return sendNotFound(res, 'Cash Deposit not found');
    }

    res.json({ message: 'Cash Deposit deleted successfully' });
  } catch (error) {
    const { id } = req.params;
    const err = error as Error;
    logger.error('Error deleting cash deposit:', { error: err.message, userId: req.userId, cashDepositId: id });
    sendServerError(res, 'Failed to delete cash deposit');
  }
});

export default router;
