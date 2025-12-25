import { body, param } from 'express-validator';
import prisma from '../../lib/prisma.js';
import logger from '../../services/logger.js';
import type { CreateBondRequest, UpdateBondRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { createCrudRouter } from './crudFactory.js';
import { toDateOrNull } from './utils.js';

// GET /bonds - List all bonds
const serializeBond = (bond: any) => serializeDecimals(bond);

const createValidators = [
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
];

// PUT /bonds/:id - Update a bond
const updateValidators = [
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
];

const router = createCrudRouter<CreateBondRequest, UpdateBondRequest>({
  resourceName: 'Bond',
  prismaModel: prisma.bond,
  serialize: serializeBond,
  createValidators,
  updateValidators,
  buildCreateData: (body) => ({
    name: body.name,
    isin: body.isin,
    bondType: body.bondType,
    faceValue: body.faceValue,
    couponRate: body.couponRate,
    maturityDate: body.maturityDate ? toDateOrNull(body.maturityDate) : null,
    rating: body.rating,
    purchasePrice: body.purchasePrice,
    currentValue: body.currentValue,
    currency: body.currency || 'USD',
    account: body.account,
    purchaseDate: body.purchaseDate ? toDateOrNull(body.purchaseDate) : null,
    notes: body.notes
  }),
  buildUpdateData: (body) => ({
    name: body.name,
    isin: body.isin,
    bondType: body.bondType,
    faceValue: body.faceValue,
    couponRate: body.couponRate,
    maturityDate: body.maturityDate ? toDateOrNull(body.maturityDate) : undefined,
    rating: body.rating,
    purchasePrice: body.purchasePrice,
    currentValue: body.currentValue,
    currency: body.currency,
    account: body.account,
    purchaseDate: body.purchaseDate ? toDateOrNull(body.purchaseDate) : undefined,
    notes: body.notes
  })
});

export default router;
