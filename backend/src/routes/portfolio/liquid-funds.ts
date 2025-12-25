import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, CreateLiquidFundRequest, UpdateLiquidFundRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';
import { sendNotFound, sendServerError, sendValidationError } from '../response.js';

const router = express.Router();

const serializeLiquidFundWithAliases = (fund: any) => {
  const s = serializeDecimals(fund);
  return {
    ...s,
    fundName: s.fundName,
    fundType: s.fundType,
    currency: s.currency,
    investmentAmount: s.investmentAmount,
    currentValue: s.currentValue,
    ytdReturn: s.ytdReturn,
    managementFee: s.managementFee,
    performanceFee: s.performanceFee,
    redemptionFrequency: s.redemptionFrequency,
    lockupEndDate: s.lockupEndDate,
    investmentDate: s.investmentDate
  };
};

// GET /liquid-funds - List all liquid funds
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { skip, take, paginated, page, limit } = getPaginationParams(req);
    const liquidFunds = await prisma.liquidFund.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    if (paginated && page && limit) {
      const total = await prisma.liquidFund.count({ where: { userId: req.userId } });
      setPaginationHeaders(res, total, page, limit);
    }

    const serializedLiquidFunds = liquidFunds.map(fund => serializeLiquidFundWithAliases(fund));
    res.json(serializedLiquidFunds);
  } catch (error) {
    logger.error('Error fetching liquid funds:', { error: (error as Error).message, userId: req.userId });
    sendServerError(res, 'Failed to fetch liquid funds');
  }
});

// POST /liquid-funds - Create a liquid fund
router.post('/', requireAuth, [
  body('fundName').notEmpty().isLength({ max: 255 }),
  body('manager').optional().isLength({ max: 255 }),
  body('fundType').optional().isLength({ max: 100 }),
  body('strategy').optional().isLength({ max: 100 }),
  body('investmentAmount').isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('ytdReturn').optional().isFloat(),
  body('managementFee').optional().isFloat({ min: 0 }),
  body('performanceFee').optional().isFloat({ min: 0 }),
  body('redemptionFrequency').optional().isLength({ max: 50 }),
  body('lockupEndDate').optional().isISO8601(),
  body('investmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('currency').optional().isLength({ max: 10 }),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const body = req.body as any;
    const fundName = body.fundName;
    const manager = body.manager;
    const fundType = body.fundType;
    const strategy = body.strategy;
    const investmentAmount = body.investmentAmount;
    const currentValue = body.currentValue;
    const ytdReturn = body.ytdReturn;
    const managementFee = body.managementFee;
    const performanceFee = body.performanceFee;
    const redemptionFrequency = body.redemptionFrequency;
    const lockupEndDate = body.lockupEndDate;
    const investmentDate = body.investmentDate;
    const status = body.status;
    const notes = body.notes;
    const currency = body.currency;

    const liquidFund = await prisma.liquidFund.create({
      data: {
        userId: req.userId!,
        fundName,
        manager,
        fundType,
        strategy,
        investmentAmount,
        currentValue,
        ytdReturn,
        managementFee,
        performanceFee,
        redemptionFrequency,
        lockupEndDate: lockupEndDate ? new Date(lockupEndDate) : null,
        investmentDate: investmentDate ? new Date(investmentDate) : null,
        status: status || 'Active',
        currency: currency || 'USD',
        notes
      }
    });

    const serializedLiquidFund = serializeLiquidFundWithAliases(liquidFund);
    res.status(201).json(serializedLiquidFund);
  } catch (error) {
    logger.error('Error creating liquid fund:', { error: (error as Error).message, userId: req.userId });
    sendServerError(res, 'Failed to create liquid fund');
  }
});

// PUT /liquid-funds/:id - Update a liquid fund
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('fundName').optional().isLength({ max: 255 }),
  body('manager').optional().isLength({ max: 255 }),
  body('fundType').optional().isLength({ max: 100 }),
  body('strategy').optional().isLength({ max: 100 }),
  body('investmentAmount').optional().isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('ytdReturn').optional().isFloat(),
  body('managementFee').optional().isFloat({ min: 0 }),
  body('performanceFee').optional().isFloat({ min: 0 }),
  body('redemptionFrequency').optional().isLength({ max: 50 }),
  body('lockupEndDate').optional().isISO8601(),
  body('investmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('currency').optional().isLength({ max: 10 }),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;
    const body = req.body as any;
    const fundName = body.fundName;
    const manager = body.manager;
    const fundType = body.fundType;
    const strategy = body.strategy;
    const investmentAmount = body.investmentAmount;
    const currentValue = body.currentValue;
    const ytdReturn = body.ytdReturn;
    const managementFee = body.managementFee;
    const performanceFee = body.performanceFee;
    const redemptionFrequency = body.redemptionFrequency;
    const lockupEndDate = body.lockupEndDate;
    const investmentDate = body.investmentDate;
    const status = body.status;
    const notes = body.notes;
    const currency = body.currency;

    // Check if liquid fund exists and belongs to user
    const existingLiquidFund = await prisma.liquidFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingLiquidFund) {
      return sendNotFound(res, 'Liquid Fund not found');
    }

    const liquidFund = await prisma.liquidFund.update({
      where: { id: parseInt(id, 10) },
      data: {
        fundName,
        manager,
        fundType,
        strategy,
        investmentAmount,
        currentValue,
        ytdReturn,
        managementFee,
        performanceFee,
        redemptionFrequency,
        lockupEndDate: lockupEndDate ? new Date(lockupEndDate) : undefined,
        investmentDate: investmentDate ? new Date(investmentDate) : undefined,
        status,
        currency,
        notes
      }
    });

    const serializedLiquidFund = serializeLiquidFundWithAliases(liquidFund);
    res.json(serializedLiquidFund);
  } catch (error) {
    logger.error('Error updating liquid fund:', { error: (error as Error).message, userId: req.userId, liquidFundId: req.params.id });
    sendServerError(res, 'Failed to update liquid fund');
  }
});

// DELETE /liquid-funds/:id - Delete a liquid fund
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;

    // Check if liquid fund exists and belongs to user
    const existingLiquidFund = await prisma.liquidFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingLiquidFund) {
      return sendNotFound(res, 'Liquid Fund not found');
    }

    await prisma.liquidFund.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'Liquid Fund deleted successfully' });
  } catch (error) {
    logger.error('Error deleting liquid fund:', { error: (error as Error).message, userId: req.userId, liquidFundId: req.params.id });
    sendServerError(res, 'Failed to delete liquid fund');
  }
});

export default router;
