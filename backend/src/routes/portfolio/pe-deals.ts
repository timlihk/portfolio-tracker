import { body, param } from 'express-validator';
import prisma from '../../lib/prisma.js';
import type { CreatePeDealRequest, UpdatePeDealRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { createCrudRouter } from './crudFactory.js';
import { toDateOrNull } from './utils.js';

const serializePeDeal = (deal: any) => serializeDecimals(deal);

const createValidators = [
  body('companyName').notEmpty().isLength({ max: 255 }),
  body('dealType').optional().isLength({ max: 100 }),
  body('sector').optional().isLength({ max: 100 }),
  body('investmentAmount').optional().isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('ownershipPercentage').optional().isFloat({ min: 0 }),
  body('investmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 })
];

const updateValidators = [
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
];

const router = createCrudRouter<CreatePeDealRequest, UpdatePeDealRequest>({
  resourceName: 'PE Deal',
  prismaModel: prisma.peDeal,
  serialize: serializePeDeal,
  createValidators,
  updateValidators,
  buildCreateData: (body) => ({
    companyName: body.companyName,
    sector: body.sector,
    dealType: body.dealType,
    investmentAmount: body.investmentAmount,
    currentValue: body.currentValue,
    ownershipPercentage: body.ownershipPercentage,
    sponsor: body.sponsor,
    status: body.status || 'Active',
    investmentDate: body.investmentDate ? toDateOrNull(body.investmentDate) : null,
    notes: body.notes
  }),
  buildUpdateData: (body) => ({
    companyName: body.companyName,
    sector: body.sector,
    dealType: body.dealType,
    investmentAmount: body.investmentAmount,
    currentValue: body.currentValue,
    ownershipPercentage: body.ownershipPercentage,
    sponsor: body.sponsor,
    status: body.status,
    investmentDate: body.investmentDate ? toDateOrNull(body.investmentDate) : undefined,
    notes: body.notes
  })
});

export default router;
