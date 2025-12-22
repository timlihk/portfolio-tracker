import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, Bond, CreateBondRequest, UpdateBondRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';

const router = express.Router();

// GET /bonds - List all bonds
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { skip, take, paginated, page, limit } = getPaginationParams(req);
    const bonds = await prisma.bond.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    if (paginated && page && limit) {
      const total = await prisma.bond.count({ where: { userId: req.userId } });
      setPaginationHeaders(res, total, page, limit);
    }

    // Convert Prisma Decimal fields to numbers for JSON response
    const serializedBonds = bonds.map(bond => serializeDecimals(bond));
    res.json(serializedBonds);
  } catch (error) {
    logger.error('Error fetching bonds:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch bonds' });
  }
});

// POST /bonds - Create a bond
router.post('/', requireAuth, [
  body('name').notEmpty().trim().isLength({ max: 255 }),
  body('isin').optional().isLength({ max: 12 }),
  body('bondType').optional().isLength({ max: 100 }),
  body('faceValue').optional().isFloat({ gt: 0 }),
  body('couponRate').optional().isFloat({ min: 0 }),
  body('maturityDate').optional().isISO8601(),
  body('rating').optional().isLength({ max: 10 }),
  body('purchasePrice').optional().isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchaseDate').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const body = req.body as any;
    const name = body.name;
    const isin = body.isin;
    const bondType = body.bondType;
    const faceValue = body.faceValue;
    const couponRate = body.couponRate;
    const maturityDate = body.maturityDate;
    const rating = body.rating;
    const purchasePrice = body.purchasePrice;
    const currentValue = body.currentValue;
    const currency = body.currency;
    const account = body.account;
    const purchaseDate = body.purchaseDate;
    const notes = body.notes;

    const bond = await prisma.bond.create({
      data: {
        userId: req.userId!,
        name,
        isin,
        bondType,
        faceValue,
        couponRate,
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        rating,
        purchasePrice,
        currentValue,
        currency: currency || 'USD',
        account,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        notes
      }
    });

    const serializedBond = serializeDecimals(bond);
    res.status(201).json(serializedBond);
  } catch (error) {
    logger.error('Error creating bond:', { error: (error as Error).message, userId: req.userId });
    res.status(500).json({ error: 'Failed to create bond' });
  }
});

// PUT /bonds/:id - Update a bond
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('name').optional().notEmpty().trim().isLength({ max: 255 }),
  body('isin').optional().isLength({ max: 12 }),
  body('bondType').optional().isLength({ max: 100 }),
  body('faceValue').optional().isFloat({ gt: 0 }),
  body('couponRate').optional().isFloat({ min: 0 }),
  body('maturityDate').optional().isISO8601(),
  body('rating').optional().isLength({ max: 10 }),
  body('purchasePrice').optional().isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchaseDate').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const body = req.body as any;
    const name = body.name;
    const isin = body.isin;
    const bondType = body.bondType;
    const faceValue = body.faceValue;
    const couponRate = body.couponRate;
    const maturityDate = body.maturityDate;
    const rating = body.rating;
    const purchasePrice = body.purchasePrice;
    const currentValue = body.currentValue;
    const currency = body.currency;
    const account = body.account;
    const purchaseDate = body.purchaseDate;
    const notes = body.notes;

    // Check if bond exists and belongs to user
    const existingBond = await prisma.bond.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingBond) {
      return res.status(404).json({ error: 'Bond not found' });
    }

    const bond = await prisma.bond.update({
      where: { id: parseInt(id, 10) },
      data: {
        name,
        isin,
        bondType,
        faceValue,
        couponRate,
        maturityDate: maturityDate ? new Date(maturityDate) : undefined,
        rating,
        purchasePrice,
        currentValue,
        currency,
        account,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        notes
      }
    });

    const serializedBond = serializeDecimals(bond);
    res.json(serializedBond);
  } catch (error) {
    logger.error('Error updating bond:', { error: (error as Error).message, userId: req.userId, bondId: req.params.id });
    res.status(500).json({ error: 'Failed to update bond' });
  }
});

// DELETE /bonds/:id - Delete a bond
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

    // Check if bond exists and belongs to user
    const existingBond = await prisma.bond.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingBond) {
      return res.status(404).json({ error: 'Bond not found' });
    }

    await prisma.bond.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'Bond deleted successfully' });
  } catch (error) {
    logger.error('Error deleting bond:', { error: (error as Error).message, userId: req.userId, bondId: req.params.id });
    res.status(500).json({ error: 'Failed to delete bond' });
  }
});

export default router;
