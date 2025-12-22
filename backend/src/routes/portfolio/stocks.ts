import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, Stock, CreateStockRequest, UpdateStockRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';

const router = express.Router();

const serializeStockWithAliases = (stock: any) => {
  const s = serializeDecimals(stock);
  return {
    ...s,
    company_name: s.companyName,
    average_cost: s.averageCost,
    current_price: s.currentPrice,
    purchase_date: s.purchaseDate
  };
};

// GET /stocks - List all stocks
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stocks = await prisma.stock.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    // Convert Prisma Decimal fields to numbers for JSON response
    const serializedStocks = stocks.map(stock => serializeStockWithAliases(stock));
    res.json(serializedStocks);
  } catch (error) {
    logger.error('Error fetching stocks:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// POST /stocks - Create a stock
router.post('/', requireAuth, [
  body('ticker').notEmpty().trim().isLength({ max: 20 }),
  body('shares').isFloat({ gt: 0 }),
  body('average_cost').isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchase_date').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      ticker,
      company_name,
      sector,
      shares,
      average_cost,
      current_price,
      currency,
      account,
      purchase_date,
      notes
    } = req.body as CreateStockRequest & {
      company_name?: string;
      average_cost: number;
      current_price?: number;
      purchase_date?: string;
    };

    const stock = await prisma.stock.create({
      data: {
        userId: req.userId!,
        ticker,
        companyName: company_name,
        sector,
        shares,
        averageCost: average_cost,
        currentPrice: current_price,
        currency: currency || 'USD',
        account,
        purchaseDate: purchase_date ? new Date(purchase_date) : null,
        notes
      }
    });

    const serializedStock = serializeStockWithAliases(stock);
    res.status(201).json(serializedStock);
  } catch (error) {
    logger.error('Error creating stock:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create stock' });
  }
});

// PUT /stocks/:id - Update a stock
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('ticker').optional().notEmpty().trim().isLength({ max: 20 }),
  body('shares').optional().isFloat({ gt: 0 }),
  body('average_cost').optional().isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchase_date').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      ticker,
      company_name,
      sector,
      shares,
      average_cost,
      current_price,
      currency,
      account,
      purchase_date,
      notes
    } = req.body as UpdateStockRequest & {
      company_name?: string;
      average_cost?: number;
      current_price?: number;
      purchase_date?: string;
    };

    // Check if stock exists and belongs to user
    const existingStock = await prisma.stock.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingStock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const stock = await prisma.stock.update({
      where: { id: parseInt(id, 10) },
      data: {
        ticker,
        companyName: company_name,
        sector,
        shares,
        averageCost: average_cost,
        currentPrice: current_price,
        currency,
        account,
        purchaseDate: purchase_date ? new Date(purchase_date) : undefined,
        notes
      }
    });

    const serializedStock = serializeStockWithAliases(stock);
    res.json(serializedStock);
  } catch (error) {
    logger.error('Error updating stock:', { error: (error as Error).message, userId: req.userId, stockId: req.params.id });
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// DELETE /stocks/:id - Delete a stock
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Check if stock exists and belongs to user
    const existingStock = await prisma.stock.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingStock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    await prisma.stock.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    logger.error('Error deleting stock:', { error: (error as Error).message, userId: req.userId, stockId: req.params.id });
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

export default router;
