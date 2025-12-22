import express, { Response } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, CreateLiquidFundRequest, UpdateLiquidFundRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';

const router = express.Router();

// GET /liquid-funds - List all liquid funds
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const liquidFunds = await prisma.liquidFund.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    // Convert Prisma Decimal fields to numbers for JSON response
    const serializedLiquidFunds = liquidFunds.map(fund => serializeDecimals(fund));
    res.json(serializedLiquidFunds);
  } catch (error) {
    logger.error('Error fetching liquid funds:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch liquid funds' });
  }
});

// POST /liquid-funds - Create a liquid fund
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      fund_name,
      manager,
      fund_type,
      strategy,
      investment_amount,
      current_value,
      ytd_return,
      management_fee,
      performance_fee,
      redemption_frequency,
      lockup_end_date,
      investment_date,
      status,
      notes
    } = req.body as {
      fund_name: string;
      manager?: string;
      fund_type?: string;
      strategy?: string;
      investment_amount?: number;
      current_value?: number;
      ytd_return?: number;
      management_fee?: number;
      performance_fee?: number;
      redemption_frequency?: string;
      lockup_end_date?: string;
      investment_date?: string;
      status?: string;
      notes?: string;
    };

    const liquidFund = await prisma.liquidFund.create({
      data: {
        userId: req.userId!,
        fundName: fund_name,
        manager,
        fundType: fund_type,
        strategy,
        investmentAmount: investment_amount,
        currentValue: current_value,
        ytdReturn: ytd_return,
        managementFee: management_fee,
        performanceFee: performance_fee,
        redemptionFrequency: redemption_frequency,
        lockupEndDate: lockup_end_date ? new Date(lockup_end_date) : null,
        investmentDate: investment_date ? new Date(investment_date) : null,
        status: status || 'Active',
        notes
      }
    });

    const serializedLiquidFund = serializeDecimals(liquidFund);
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
    const {
      fund_name,
      manager,
      fund_type,
      strategy,
      investment_amount,
      current_value,
      ytd_return,
      management_fee,
      performance_fee,
      redemption_frequency,
      lockup_end_date,
      investment_date,
      status,
      notes
    } = req.body as {
      fund_name?: string;
      manager?: string;
      fund_type?: string;
      strategy?: string;
      investment_amount?: number;
      current_value?: number;
      ytd_return?: number;
      management_fee?: number;
      performance_fee?: number;
      redemption_frequency?: string;
      lockup_end_date?: string;
      investment_date?: string;
      status?: string;
      notes?: string;
    };

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
        fundName: fund_name,
        manager,
        fundType: fund_type,
        strategy,
        investmentAmount: investment_amount,
        currentValue: current_value,
        ytdReturn: ytd_return,
        managementFee: management_fee,
        performanceFee: performance_fee,
        redemptionFrequency: redemption_frequency,
        lockupEndDate: lockup_end_date ? new Date(lockup_end_date) : undefined,
        investmentDate: investment_date ? new Date(investment_date) : undefined,
        status,
        notes
      }
    });

    const serializedLiquidFund = serializeDecimals(liquidFund);
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
