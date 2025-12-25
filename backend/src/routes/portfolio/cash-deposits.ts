import { Router } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import logger from '../../services/logger.js';
import { serializeDecimals, CreateCashDepositRequest, UpdateCashDepositRequest } from '../../types/index.js';
import { handleValidationOrRespond, toDateOrNull, toNumberOrNull } from './utils.js';
import { createCrudRouter } from './crudFactory.js';

const serializeCashDepositWithAliases = (deposit: any) => {
  const s = serializeDecimals(deposit);
  return {
    ...s,
    depositType: s.depositType,
    interestRate: s.interestRate,
    maturityDate: s.maturityDate
  };
};

const createValidators = [
  body('name').notEmpty().isLength({ max: 255 }),
  body('depositType').optional().isLength({ max: 100 }),
  body('amount')
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return v;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat({ gt: 0 }),
  body('currency').notEmpty().isLength({ max: 10 }),
  body('interestRate')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat(),
  body('maturityDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('account').notEmpty().isLength({ max: 255 }),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 })
];

const updateValidators = [
  param('id').isInt({ gt: 0 }),
  body('name').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body('depositType').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body('amount')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat({ gt: 0 }),
  body('currency').optional({ nullable: true, checkFalsy: true }).isLength({ max: 10 }),
  body('interestRate')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      return parseFloat(String(v).replace(/,/g, ''));
    })
    .isFloat(),
  body('maturityDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('account').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 })
];

const router = createCrudRouter<CreateCashDepositRequest, UpdateCashDepositRequest>({
  resourceName: 'Cash Deposit',
  prismaModel: prisma.cashDeposit,
  serialize: serializeCashDepositWithAliases,
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
    const amountNum = toNumberOrNull(body.amount);
    const interestNum = toNumberOrNull(body.interestRate);
    const maturity = toDateOrNull(body.maturityDate);
    return {
      name: body.name,
      depositType: body.depositType || null,
      amount: amountNum,
      currency: body.currency || 'USD',
      interestRate: interestNum,
      maturityDate: maturity,
      account: body.account,
      notes: body.notes || null
    };
  },
  buildUpdateData: (body) => {
    const amountNum = toNumberOrNull(body.amount);
    const interestNum = toNumberOrNull(body.interestRate);
    const maturity = toDateOrNull(body.maturityDate);
    return {
      name: body.name,
      depositType: body.depositType || null,
      amount: amountNum,
      currency: body.currency,
      interestRate: interestNum,
      maturityDate: maturity,
      account: body.account,
      notes: body.notes || null
    };
  }
});

export default router;
