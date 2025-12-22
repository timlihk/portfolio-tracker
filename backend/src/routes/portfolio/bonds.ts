import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, Bond, CreateBondRequest, UpdateBondRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';

const router = express.Router();

// GET /bonds - List all bonds
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const bonds = await prisma.bond.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

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
  body('bond_type').optional().isLength({ max: 100 }),
  body('face_value').optional().isFloat({ gt: 0 }),
  body('coupon_rate').optional().isFloat({ min: 0 }),
  body('maturity_date').optional().isISO8601(),
  body('rating').optional().isLength({ max: 10 }),
  body('purchase_price').optional().isFloat({ gt: 0 }),
  body('current_value').optional().isFloat({ gt: 0 }),
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
      name,
      isin,
      bond_type,
      face_value,
      coupon_rate,
      maturity_date,
      rating,
      purchase_price,
      current_value,
      currency,
      account,
      purchase_date,
      notes
    } = req.body as CreateBondRequest & {
      bond_type?: string;
      face_value?: number;
      coupon_rate?: number;
      maturity_date?: string;
      purchase_price?: number;
      current_value?: number;
      purchase_date?: string;
    };

    const bond = await prisma.bond.create({
      data: {
        userId: req.userId!,
        name,
        isin,
        bondType: bond_type,
        faceValue: face_value,
        couponRate: coupon_rate,
        maturityDate: maturity_date ? new Date(maturity_date) : null,
        rating,
        purchasePrice: purchase_price,
        currentValue: current_value,
        currency: currency || 'USD',
        account,
        purchaseDate: purchase_date ? new Date(purchase_date) : null,
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
  body('bond_type').optional().isLength({ max: 100 }),
  body('face_value').optional().isFloat({ gt: 0 }),
  body('coupon_rate').optional().isFloat({ min: 0 }),
  body('maturity_date').optional().isISO8601(),
  body('rating').optional().isLength({ max: 10 }),
  body('purchase_price').optional().isFloat({ gt: 0 }),
  body('current_value').optional().isFloat({ gt: 0 }),
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
      name,
      isin,
      bond_type,
      face_value,
      coupon_rate,
      maturity_date,
      rating,
      purchase_price,
      current_value,
      currency,
      account,
      purchase_date,
      notes
    } = req.body as UpdateBondRequest & {
      bond_type?: string;
      face_value?: number;
      coupon_rate?: number;
      maturity_date?: string;
      purchase_price?: number;
      current_value?: number;
      purchase_date?: string;
    };

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
        bondType: bond_type,
        faceValue: face_value,
        couponRate: coupon_rate,
        maturityDate: maturity_date ? new Date(maturity_date) : undefined,
        rating,
        purchasePrice: purchase_price,
        currentValue: current_value,
        currency,
        account,
        purchaseDate: purchase_date ? new Date(purchase_date) : undefined,
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
