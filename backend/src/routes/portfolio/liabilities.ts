import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import { AuthRequest, serializeDecimals, CreateLiabilityRequest, UpdateLiabilityRequest } from '../../types/index.js';
import { toDateOrNull, toNumberOrNull } from './utils.js';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';
import { sendNotFound, sendServerError, sendUnauthorized, sendValidationError } from '../response.js';

const router = Router();

// GET /liabilities - List all liabilities
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { skip, take, paginated, page, limit } = getPaginationParams(req);
    const liabilities = await prisma.liability.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    if (paginated && page && limit) {
      const total = await prisma.liability.count({ where: { userId: req.userId } });
      setPaginationHeaders(res, total, page, limit);
    }

    const serializedLiabilities = liabilities.map(liability => serializeDecimals(liability));
    res.json(serializedLiabilities);
  } catch (error) {
    const err = error as Error;
    logger.error('Error fetching liabilities:', { error: err.message, userId: req.userId });
    sendServerError(res, 'Failed to fetch liabilities');
  }
});

// POST /liabilities - Create a liability
router.post('/', requireAuth, [
  body('name').notEmpty().isLength({ max: 255 }),
  body('liabilityType').optional().isLength({ max: 100 }),
  body('account').optional().isLength({ max: 255 }),
  body('principal').optional().isFloat(),
  body('outstandingBalance').optional().isFloat(),
  body('interestRate').optional().isFloat(),
  body('rateType').optional().isLength({ max: 50 }),
  body('collateral').optional().isLength({ max: 255 }),
  body('startDate').optional().isISO8601(),
  body('maturityDate').optional().isISO8601(),
  body('currency').optional().isLength({ max: 10 }),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    if (!req.userId) {
      return sendUnauthorized(res);
    }

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
    sendServerError(res, 'Failed to create liability');
  }
});

// PUT /liabilities/:id - Update a liability
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('name').optional().notEmpty().isLength({ max: 255 }),
  body('liabilityType').optional().isLength({ max: 100 }),
  body('account').optional().isLength({ max: 255 }),
  body('principal').optional().isFloat(),
  body('outstandingBalance').optional().isFloat(),
  body('interestRate').optional().isFloat(),
  body('rateType').optional().isLength({ max: 50 }),
  body('collateral').optional().isLength({ max: 255 }),
  body('startDate').optional().isISO8601(),
  body('maturityDate').optional().isISO8601(),
  body('currency').optional().isLength({ max: 10 }),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

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
      return sendUnauthorized(res);
    }

    const principalNum = toNumberOrNull(principal);
    const outstandingNum = toNumberOrNull(outstandingBalance);
    const interestNum = toNumberOrNull(interestRate);
    const startDateVal = toDateOrNull(startDate);
    const maturityDateVal = toDateOrNull(maturityDate);

    const existingLiability = await prisma.liability.findFirst({
      where: { id: parseInt(id, 10), userId: req.userId }
    });

    if (!existingLiability) {
      return sendNotFound(res, 'Liability not found');
    }

    const updatedLiability = await prisma.liability.update({
      where: { id: parseInt(id, 10) },
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

    res.json(serializeDecimals(updatedLiability));
  } catch (error) {
    const { id } = req.params;
    const err = error as Error;
    logger.error('Error updating liability:', { error: err.message, userId: req.userId, liabilityId: id });
    sendServerError(res, 'Failed to update liability');
  }
});

// DELETE /liabilities/:id - Delete a liability
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;

    if (!req.userId) {
      return sendUnauthorized(res);
    }

    const liability = await prisma.liability.deleteMany({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (liability.count === 0) {
      return sendNotFound(res, 'Liability not found');
    }

    res.json({ message: 'Liability deleted successfully' });
  } catch (error) {
    const { id } = req.params;
    const err = error as Error;
    logger.error('Error deleting liability:', { error: err.message, userId: req.userId, liabilityId: id });
    sendServerError(res, 'Failed to delete liability');
  }
});

export default router;
