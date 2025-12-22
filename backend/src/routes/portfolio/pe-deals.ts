import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, CreatePeDealRequest, UpdatePeDealRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';
import { sendNotFound, sendServerError, sendValidationError } from '../response.js';

const router = express.Router();

// GET /pe-deals - List all PE deals
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { skip, take, paginated, page, limit } = getPaginationParams(req);
    const peDeals = await prisma.peDeal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    if (paginated && page && limit) {
      const total = await prisma.peDeal.count({ where: { userId: req.userId } });
      setPaginationHeaders(res, total, page, limit);
    }

    const serializedPeDeals = peDeals.map(deal => serializeDecimals(deal));
    res.json(serializedPeDeals);
  } catch (error) {
    logger.error('Error fetching PE deals:', { error: (error as Error).message, userId: req.userId });
    sendServerError(res, 'Failed to fetch PE deals');
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
  body('notes').optional().isLength({ max: 1000 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const {
      companyName,
      sector,
      dealType,
      investmentAmount,
      currentValue,
      ownershipPercentage,
      sponsor,
      status,
      investmentDate,
      notes
    } = req.body as CreatePeDealRequest;

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
    sendServerError(res, 'Failed to create PE deal');
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
  body('notes').optional().isLength({ max: 1000 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;
    const {
      companyName,
      sector,
      dealType,
      investmentAmount,
      currentValue,
      ownershipPercentage,
      sponsor,
      status,
      investmentDate,
      notes
    } = req.body as UpdatePeDealRequest;

    // Check if PE deal exists and belongs to user
    const existingPeDeal = await prisma.peDeal.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeDeal) {
      return sendNotFound(res, 'PE Deal not found');
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
    sendServerError(res, 'Failed to update PE deal');
  }
});

// DELETE /pe-deals/:id - Delete a PE deal
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;

    // Check if PE deal exists and belongs to user
    const existingPeDeal = await prisma.peDeal.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeDeal) {
      return sendNotFound(res, 'PE Deal not found');
    }

    await prisma.peDeal.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'PE Deal deleted successfully' });
  } catch (error) {
    logger.error('Error deleting PE deal:', { error: (error as Error).message, userId: req.userId, peDealId: req.params.id });
    sendServerError(res, 'Failed to delete PE deal');
  }
});

export default router;
