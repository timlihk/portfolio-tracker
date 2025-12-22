import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, CreatePeFundRequest, UpdatePeFundRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';
import { sendNotFound, sendServerError, sendValidationError } from '../response.js';

const router = express.Router();

// GET /pe-funds - List all PE funds
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { skip, take, paginated, page, limit } = getPaginationParams(req);
    const peFunds = await prisma.peFund.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    if (paginated && page && limit) {
      const total = await prisma.peFund.count({ where: { userId: req.userId } });
      setPaginationHeaders(res, total, page, limit);
    }

    const serializedPeFunds = peFunds.map(fund => serializeDecimals(fund));
    res.json(serializedPeFunds);
  } catch (error) {
    logger.error('Error fetching PE funds:', { error: (error as Error).message, userId: req.userId });
    sendServerError(res, 'Failed to fetch PE funds');
  }
});

// POST /pe-funds - Create a PE fund
router.post('/', requireAuth, [
  body('fundName').notEmpty().isLength({ max: 255 }),
  body('manager').optional().isLength({ max: 255 }),
  body('fundType').optional().isLength({ max: 100 }),
  body('vintageYear').optional().isInt({ min: 1900, max: 2100 }),
  body('commitment').optional().isFloat({ gt: 0 }),
  body('calledCapital').optional().isFloat({ min: 0 }),
  body('nav').optional().isFloat({ min: 0 }),
  body('distributions').optional().isFloat({ min: 0 }),
  body('commitmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const {
      fundName,
      manager,
      fundType,
      vintageYear,
      commitment,
      calledCapital,
      nav,
      distributions,
      commitmentDate,
      status,
      notes
    } = req.body as CreatePeFundRequest;

    const peFund = await prisma.peFund.create({
      data: {
        userId: req.userId!,
        fundName,
        manager,
        fundType,
        vintageYear,
        commitment,
        calledCapital,
        nav,
        distributions,
        commitmentDate: commitmentDate ? new Date(commitmentDate) : null,
        status: status || 'Active',
        notes
      }
    });

    const serializedPeFund = serializeDecimals(peFund);
    res.status(201).json(serializedPeFund);
  } catch (error) {
    logger.error('Error creating PE fund:', { error: (error as Error).message, userId: req.userId });
    sendServerError(res, 'Failed to create PE fund');
  }
});

// PUT /pe-funds/:id - Update a PE fund
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('fundName').optional().isLength({ max: 255 }),
  body('manager').optional().isLength({ max: 255 }),
  body('fundType').optional().isLength({ max: 100 }),
  body('vintageYear').optional().isInt({ min: 1900, max: 2100 }),
  body('commitment').optional().isFloat({ gt: 0 }),
  body('calledCapital').optional().isFloat({ min: 0 }),
  body('nav').optional().isFloat({ min: 0 }),
  body('distributions').optional().isFloat({ min: 0 }),
  body('commitmentDate').optional().isISO8601(),
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
      fundName,
      manager,
      fundType,
      vintageYear,
      commitment,
      calledCapital,
      nav,
      distributions,
      commitmentDate,
      status,
      notes
    } = req.body as UpdatePeFundRequest;

    // Check if PE fund exists and belongs to user
    const existingPeFund = await prisma.peFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeFund) {
      return sendNotFound(res, 'PE Fund not found');
    }

    const peFund = await prisma.peFund.update({
      where: { id: parseInt(id, 10) },
      data: {
        fundName,
        manager,
        fundType,
        vintageYear,
        commitment,
        calledCapital,
        nav,
        distributions,
        commitmentDate: commitmentDate ? new Date(commitmentDate) : undefined,
        status,
        notes
      }
    });

    const serializedPeFund = serializeDecimals(peFund);
    res.json(serializedPeFund);
  } catch (error) {
    logger.error('Error updating PE fund:', { error: (error as Error).message, userId: req.userId, peFundId: req.params.id });
    sendServerError(res, 'Failed to update PE fund');
  }
});

// DELETE /pe-funds/:id - Delete a PE fund
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;

    // Check if PE fund exists and belongs to user
    const existingPeFund = await prisma.peFund.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingPeFund) {
      return sendNotFound(res, 'PE Fund not found');
    }

    await prisma.peFund.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'PE Fund deleted successfully' });
  } catch (error) {
    logger.error('Error deleting PE fund:', { error: (error as Error).message, userId: req.userId, peFundId: req.params.id });
    sendServerError(res, 'Failed to delete PE fund');
  }
});

export default router;
