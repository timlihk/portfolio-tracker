import express, { Response } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, CreateLiquidFundRequest, UpdateLiquidFundRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';

const router = express.Router();

const serializeLiquidFundWithAliases = (fund: any) => {
  const s = serializeDecimals(fund);
  return {
    ...s,
    fundName: s.fundName,
    fundType: s.fundType,
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
    const liquidFunds = await prisma.liquidFund.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    const serializedLiquidFunds = liquidFunds.map(fund => serializeLiquidFundWithAliases(fund));
    res.json(serializedLiquidFunds);
  } catch (error) {
    logger.error('Error fetching liquid funds:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch liquid funds' });
  }
});

// POST /liquid-funds - Create a liquid fund
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as any;
    const fundName = body.fundName ?? body.fund_name;
    const manager = body.manager;
    const fundType = body.fundType ?? body.fund_type;
    const strategy = body.strategy;
    const investmentAmount = body.investmentAmount ?? body.investment_amount;
    const currentValue = body.currentValue ?? body.current_value;
    const ytdReturn = body.ytdReturn ?? body.ytd_return;
    const managementFee = body.managementFee ?? body.management_fee;
    const performanceFee = body.performanceFee ?? body.performance_fee;
    const redemptionFrequency = body.redemptionFrequency ?? body.redemption_frequency;
    const lockupEndDate = body.lockupEndDate ?? body.lockup_end_date;
    const investmentDate = body.investmentDate ?? body.investment_date;
    const status = body.status;
    const notes = body.notes;

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
        notes
      }
    });

    const serializedLiquidFund = serializeLiquidFundWithAliases(liquidFund);
    res.status(201).json(serializedLiquidFund);
  } catch (error) {
    logger.error('Error creating liquid fund:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create liquid fund' });
  }
});

// PUT /liquid-funds/:id - Update a liquid fund
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as any;
    const fundName = body.fundName ?? body.fund_name;
    const manager = body.manager;
    const fundType = body.fundType ?? body.fund_type;
    const strategy = body.strategy;
    const investmentAmount = body.investmentAmount ?? body.investment_amount;
    const currentValue = body.currentValue ?? body.current_value;
    const ytdReturn = body.ytdReturn ?? body.ytd_return;
    const managementFee = body.managementFee ?? body.management_fee;
    const performanceFee = body.performanceFee ?? body.performance_fee;
    const redemptionFrequency = body.redemptionFrequency ?? body.redemption_frequency;
    const lockupEndDate = body.lockupEndDate ?? body.lockup_end_date;
    const investmentDate = body.investmentDate ?? body.investment_date;
    const status = body.status;
    const notes = body.notes;

    // Check if liquid fund exists and belongs to user
    const existingLiquidFund = await prisma.liquidFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingLiquidFund) {
      return res.status(404).json({ error: 'Liquid Fund not found' });
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
        notes
      }
    });

    const serializedLiquidFund = serializeLiquidFundWithAliases(liquidFund);
    res.json(serializedLiquidFund);
  } catch (error) {
    logger.error('Error updating liquid fund:', { error: (error as Error).message, userId: req.userId, liquidFundId: req.params.id });
    res.status(500).json({ error: 'Failed to update liquid fund' });
  }
});

// DELETE /liquid-funds/:id - Delete a liquid fund
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if liquid fund exists and belongs to user
    const existingLiquidFund = await prisma.liquidFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingLiquidFund) {
      return res.status(404).json({ error: 'Liquid Fund not found' });
    }

    await prisma.liquidFund.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'Liquid Fund deleted successfully' });
  } catch (error) {
    logger.error('Error deleting liquid fund:', { error: (error as Error).message, userId: req.userId, liquidFundId: req.params.id });
    res.status(500).json({ error: 'Failed to delete liquid fund' });
  }
});

export default router;
