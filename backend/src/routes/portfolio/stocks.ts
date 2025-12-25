import { body, param } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { serializeDecimals, CreateStockRequest, UpdateStockRequest } from '../../types/index.js';
import { createCrudRouter } from './crudFactory.js';
import { toDateOrNull } from './utils.js';

const serializeStock = (stock: any) => serializeDecimals(stock);

const createValidators = [
  body('ticker').notEmpty().trim().isLength({ max: 20 }),
  body('shares').isFloat({ gt: 0 }),
  body('averageCost').isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchaseDate').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
];

const updateValidators = [
  param('id').isInt({ gt: 0 }),
  body('ticker').optional().notEmpty().trim().isLength({ max: 20 }),
  body('shares').optional().isFloat({ gt: 0 }),
  body('averageCost').optional().isFloat({ gt: 0 }),
  body('currency').optional().isLength({ max: 10 }),
  body('account').optional().isLength({ max: 255 }),
  body('purchaseDate').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
];

const router = createCrudRouter<CreateStockRequest, UpdateStockRequest>({
  resourceName: 'Stock',
  prismaModel: prisma.stock,
  serialize: serializeStock,
  createValidators,
  updateValidators,
  buildFilters: (req) => {
    const rawAccount = (req.query as { account?: string }).account;
    const rawSector = (req.query as { sector?: string }).sector;
    const account = rawAccount && rawAccount !== 'undefined' ? rawAccount : undefined;
    const sector = rawSector && rawSector !== 'undefined' ? rawSector : undefined;
    return {
      ...(account ? { account } : {}),
      ...(sector ? { sector } : {})
    };
  },
  buildCreateData: (body) => ({
    ticker: body.ticker,
    companyName: body.companyName,
    sector: body.sector,
    shares: body.shares,
    averageCost: body.averageCost,
    currentPrice: body.currentPrice,
    currency: body.currency || 'USD',
    account: body.account,
    purchaseDate: body.purchaseDate ? toDateOrNull(body.purchaseDate) : null,
    notes: body.notes
  }),
  buildUpdateData: (body) => ({
    ticker: body.ticker,
    companyName: body.companyName,
    sector: body.sector,
    shares: body.shares,
    averageCost: body.averageCost,
    currentPrice: body.currentPrice,
    currency: body.currency,
    account: body.account,
    purchaseDate: body.purchaseDate ? toDateOrNull(body.purchaseDate) : undefined,
    notes: body.notes
  })
});

export default router;
