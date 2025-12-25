import { Router } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import logger from '../../services/logger.js';
import { serializeDecimals, CreateLiabilityRequest, UpdateLiabilityRequest } from '../../types/index.js';
import { handleValidationOrRespond, toDateOrNull, toNumberOrNull } from './utils.js';
import { createCrudRouter } from './crudFactory.js';

const serializeLiability = (liability: any) => serializeDecimals(liability);

const createValidators = [
  body('name').notEmpty().isLength({ max: 255 }),
  body('liabilityType').optional().isLength({ max: 100 }),
  body('account').optional().isLength({ max: 255 }),
  body('principal').optional().isFloat(),
  body('outstandingBalance').optional().isFloat(),
  body('interestRate').optional().isFloat(),
  body('rateType').optional().isLength({ max: 50 }),
  body('collateral').optional().isLength({ max: 255 }),
  body('startDate').optional().isISO8601(),
  body('maturityDate').optional().isISO8601(),
  body('currency').optional().isLength({ max: 10 }),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 })
];

const updateValidators = [
  param('id').isInt({ gt: 0 }),
  body('name').optional().notEmpty().isLength({ max: 255 }),
  body('liabilityType').optional().isLength({ max: 100 }),
  body('account').optional().isLength({ max: 255 }),
  body('principal').optional().isFloat(),
  body('outstandingBalance').optional().isFloat(),
  body('interestRate').optional().isFloat(),
  body('rateType').optional().isLength({ max: 50 }),
  body('collateral').optional().isLength({ max: 255 }),
  body('startDate').optional().isISO8601(),
  body('maturityDate').optional().isISO8601(),
  body('currency').optional().isLength({ max: 10 }),
  body('status').optional().isLength({ max: 50 }),
  body('notes').optional().isLength({ max: 1000 })
];

const router = createCrudRouter<CreateLiabilityRequest, UpdateLiabilityRequest>({
  resourceName: 'Liability',
  prismaModel: prisma.liability,
  serialize: serializeLiability,
  createValidators,
  updateValidators,
  buildFilters: (req) => {
    const rawAccount = (req.query as { account?: string }).account;
    const rawCurrency = (req.query as { currency?: string }).currency;
    const account = rawAccount && rawAccount !== 'undefined' ? rawAccount : undefined;
    const currency = rawCurrency && rawCurrency !== 'undefined' ? rawCurrency : undefined;
    return {
      ...(account ? { account } : {}),
      ...(currency ? { currency } : {})
    };
  },
  buildCreateData: (body) => {
    const principalNum = toNumberOrNull(body.principal);
    const outstandingNum = toNumberOrNull(body.outstandingBalance);
    const interestNum = toNumberOrNull(body.interestRate);
    const startDateVal = toDateOrNull(body.startDate);
    const maturityDateVal = toDateOrNull(body.maturityDate);
    return {
      name: body.name,
      liabilityType: body.liabilityType || null,
      account: body.account || null,
      principal: principalNum,
      outstandingBalance: outstandingNum,
      interestRate: interestNum,
      rateType: body.rateType || null,
      collateral: body.collateral || null,
      startDate: startDateVal,
      maturityDate: maturityDateVal,
      currency: body.currency || 'USD',
      status: body.status || 'Active',
      notes: body.notes || null
    };
  },
  buildUpdateData: (body) => {
    const principalNum = toNumberOrNull(body.principal);
    const outstandingNum = toNumberOrNull(body.outstandingBalance);
    const interestNum = toNumberOrNull(body.interestRate);
    const startDateVal = toDateOrNull(body.startDate);
    const maturityDateVal = toDateOrNull(body.maturityDate);
    return {
      name: body.name,
      liabilityType: body.liabilityType || null,
      account: body.account || null,
      principal: principalNum,
      outstandingBalance: outstandingNum,
      interestRate: interestNum,
      rateType: body.rateType || null,
      collateral: body.collateral || null,
      startDate: startDateVal,
      maturityDate: maturityDateVal,
      currency: body.currency,
      status: body.status,
      notes: body.notes || null
    };
  }
});

export default router;
