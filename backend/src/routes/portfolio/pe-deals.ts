import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, CreatePeDealRequest, UpdatePeDealRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';

const router = express.Router();

// GET /pe-deals - List all PE deals
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const peDeals = await prisma.peDeal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    const serializedPeDeals = peDeals.map(deal => serializeDecimals(deal));
    res.json(serializedPeDeals);
  } catch (error) {
    logger.error('Error fetching PE deals:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch PE deals' });
  }
});

// POST /pe-deals - Create a PE deal
router.post('/', requireAuth, [
  body('companyName').notEmpty().isLength({ max: 255 }),
  body('dealType').optional().isLength({ max: 100 }),
  body('sector').optional().isLength({ max: 100 }),
  body('investmentAmount').optional().isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('ownershipPercentage').optional().isFloat({ min: 0 }),
  body('investmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const body = req.body as any;
    const companyName = body.companyName;
    const sector = body.sector;
    const dealType = body.dealType;
    const investmentAmount = body.investmentAmount;
    const currentValue = body.currentValue;
    const ownershipPercentage = body.ownershipPercentage;
    const sponsor = body.sponsor;
    const status = body.status;
    const investmentDate = body.investmentDate;
    const notes = body.notes;

    const peDeal = await prisma.peDeal.create({
      data: {
        userId: req.userId!,
        companyName,
        sector,
        dealType,
        investmentAmount,
        currentValue,
        ownershipPercentage,
        sponsor,
        status: status || 'Active',
        investmentDate: investmentDate ? new Date(investmentDate) : null,
        notes
      }
    });

    const serializedPeDeal = serializeDecimals(peDeal);
    res.status(201).json(serializedPeDeal);
  } catch (error) {
    logger.error('Error creating PE deal:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create PE deal' });
  }
});

// PUT /pe-deals/:id - Update a PE deal
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('companyName').optional().isLength({ max: 255 }),
  body('dealType').optional().isLength({ max: 100 }),
  body('sector').optional().isLength({ max: 100 }),
  body('investmentAmount').optional().isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('ownershipPercentage').optional().isFloat({ min: 0 }),
  body('investmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const body = req.body as any;
    const companyName = body.companyName;
    const sector = body.sector;
    const dealType = body.dealType;
    const investmentAmount = body.investmentAmount;
    const currentValue = body.currentValue;
    const ownershipPercentage = body.ownershipPercentage;
    const sponsor = body.sponsor;
    const status = body.status;
    const investmentDate = body.investmentDate;
    const notes = body.notes;

    // Check if PE deal exists and belongs to user
    const existingPeDeal = await prisma.peDeal.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeDeal) {
      return res.status(404).json({ error: 'PE Deal not found' });
    }

    const peDeal = await prisma.peDeal.update({
      where: { id: parseInt(id, 10) },
      data: {
        companyName,
        sector,
        dealType,
        investmentAmount,
        currentValue,
        ownershipPercentage,
        sponsor,
        status,
        investmentDate: investmentDate ? new Date(investmentDate) : undefined,
        notes
      }
    });

    const serializedPeDeal = serializeDecimals(peDeal);
    res.json(serializedPeDeal);
  } catch (error) {
    logger.error('Error updating PE deal:', { error: (error as Error).message, userId: req.userId, peDealId: req.params.id });
    res.status(500).json({ error: 'Failed to update PE deal' });
  }
});

// DELETE /pe-deals/:id - Delete a PE deal
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if PE deal exists and belongs to user
    const existingPeDeal = await prisma.peDeal.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeDeal) {
      return res.status(404).json({ error: 'PE Deal not found' });
    }

    await prisma.peDeal.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'PE Deal deleted successfully' });
  } catch (error) {
    logger.error('Error deleting PE deal:', { error: (error as Error).message, userId: req.userId, peDealId: req.params.id });
    res.status(500).json({ error: 'Failed to delete PE deal' });
  }
});

export default router;
