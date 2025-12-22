import express, { Response } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, CreatePeFundRequest, UpdatePeFundRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';

const router = express.Router();

const serializePeFundWithAliases = (fund: any) => {
  const s = serializeDecimals(fund);
  return {
    ...s,
    fund_name: s.fundName,
    fund_type: s.fundType,
    vintage_year: s.vintageYear,
    called_capital: s.calledCapital,
    commitment_date: s.commitmentDate
  };
};

// GET /pe-funds - List all PE funds
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const peFunds = await prisma.peFund.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    // Convert Prisma Decimal fields to numbers for JSON response and add legacy snake_case keys
    const serializedPeFunds = peFunds.map(fund => serializePeFundWithAliases(fund));
    res.json(serializedPeFunds);
  } catch (error) {
    logger.error('Error fetching PE funds:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch PE funds' });
  }
});

// POST /pe-funds - Create a PE fund
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      fund_name,
      manager,
      fund_type,
      vintage_year,
      commitment,
      called_capital,
      nav,
      distributions,
      commitment_date,
      status,
      notes
    } = req.body as {
      fund_name: string;
      manager?: string;
      fund_type?: string;
      vintage_year?: number;
      commitment?: number;
      called_capital?: number;
      nav?: number;
      distributions?: number;
      commitment_date?: string;
      status?: string;
      notes?: string;
    };

    const peFund = await prisma.peFund.create({
      data: {
        userId: req.userId!,
        fundName: fund_name,
        manager,
        fundType: fund_type,
        vintageYear: vintage_year,
        commitment,
        calledCapital: called_capital,
        nav,
        distributions,
        commitmentDate: commitment_date ? new Date(commitment_date) : null,
        status: status || 'Active',
        notes
      }
    });

    const serializedPeFund = serializePeFundWithAliases(peFund);
    res.status(201).json(serializedPeFund);
  } catch (error) {
    logger.error('Error creating PE fund:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create PE fund' });
  }
});

// PUT /pe-funds/:id - Update a PE fund
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      fund_name,
      manager,
      fund_type,
      vintage_year,
      commitment,
      called_capital,
      nav,
      distributions,
      commitment_date,
      status,
      notes
    } = req.body as {
      fund_name?: string;
      manager?: string;
      fund_type?: string;
      vintage_year?: number;
      commitment?: number;
      called_capital?: number;
      nav?: number;
      distributions?: number;
      commitment_date?: string;
      status?: string;
      notes?: string;
    };

    // Check if PE fund exists and belongs to user
    const existingPeFund = await prisma.peFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeFund) {
      return res.status(404).json({ error: 'PE Fund not found' });
    }

    const peFund = await prisma.peFund.update({
      where: { id: parseInt(id, 10) },
      data: {
        fundName: fund_name,
        manager,
        fundType: fund_type,
        vintageYear: vintage_year,
        commitment,
        calledCapital: called_capital,
        nav,
        distributions,
        commitmentDate: commitment_date ? new Date(commitment_date) : undefined,
        status,
        notes
      }
    });

    const serializedPeFund = serializePeFundWithAliases(peFund);
    res.json(serializedPeFund);
  } catch (error) {
    logger.error('Error updating PE fund:', { error: (error as Error).message, userId: req.userId, peFundId: req.params.id });
    res.status(500).json({ error: 'Failed to update PE fund' });
  }
});

// DELETE /pe-funds/:id - Delete a PE fund
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if PE fund exists and belongs to user
    const existingPeFund = await prisma.peFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeFund) {
      return res.status(404).json({ error: 'PE Fund not found' });
    }

    await prisma.peFund.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'PE Fund deleted successfully' });
  } catch (error) {
    logger.error('Error deleting PE fund:', { error: (error as Error).message, userId: req.userId, peFundId: req.params.id });
    res.status(500).json({ error: 'Failed to delete PE fund' });
  }
});

export default router;
