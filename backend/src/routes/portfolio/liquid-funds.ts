import express from 'express';
import { body, param } from 'express-validator';
import prisma from '../../lib/prisma.js';
import logger from '../../services/logger.js';
import type { CreateLiquidFundRequest, UpdateLiquidFundRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { createCrudRouter } from './crudFactory.js';

const serializeLiquidFundWithAliases = (fund: any) => {
  const s = serializeDecimals(fund);
  return {
    ...s,
    fundName: s.fundName,
    fundType: s.fundType,
    currency: s.currency,
    investmentAmount: s.investmentAmount,
    currentValue: s.currentValue,
    ytdReturn: s.ytdReturn,
    managementFee: s.managementFee,
    performanceFee: s.performanceFee,
    redemptionFrequency: s.redemptionFrequency,
    lockupEndDate: s.lockupEndDate,
    investmentDate: s.investmentDate
  };
};

const createValidators = [
  body('fundName').notEmpty().isLength({ max: 255 }),
  body('manager').optional().isLength({ max: 255 }),
  body('fundType').optional().isLength({ max: 100 }),
  body('strategy').optional().isLength({ max: 100 }),
  body('investmentAmount').isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('ytdReturn').optional().isFloat(),
  body('managementFee').optional().isFloat({ min: 0 }),
  body('performanceFee').optional().isFloat({ min: 0 }),
  body('redemptionFrequency').optional().isLength({ max: 50 }),
  body('lockupEndDate').optional().isISO8601(),
  body('investmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('currency').optional().isLength({ max: 10 }),
  body('notes').optional().isLength({ max: 1000 }),
];

const updateValidators = [
  param('id').isInt({ gt: 0 }),
  body('fundName').optional().isLength({ max: 255 }),
  body('manager').optional().isLength({ max: 255 }),
  body('fundType').optional().isLength({ max: 100 }),
  body('strategy').optional().isLength({ max: 100 }),
  body('investmentAmount').optional().isFloat({ gt: 0 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('ytdReturn').optional().isFloat(),
  body('managementFee').optional().isFloat({ min: 0 }),
  body('performanceFee').optional().isFloat({ min: 0 }),
  body('redemptionFrequency').optional().isLength({ max: 50 }),
  body('lockupEndDate').optional().isISO8601(),
  body('investmentDate').optional().isISO8601(),
  body('status').optional().isLength({ max: 50 }),
  body('currency').optional().isLength({ max: 10 }),
  body('notes').optional().isLength({ max: 1000 }),
];

const router = createCrudRouter<CreateLiquidFundRequest, UpdateLiquidFundRequest>({
  resourceName: 'Liquid Fund',
  prismaModel: prisma.liquidFund,
  serialize: serializeLiquidFundWithAliases,
  createValidators,
  updateValidators,
  buildCreateData: (body) => ({
    fundName: body.fundName,
    manager: body.manager,
    fundType: body.fundType,
    strategy: body.strategy,
    investmentAmount: body.investmentAmount,
    currentValue: body.currentValue,
    ytdReturn: body.ytdReturn,
    managementFee: body.managementFee,
    performanceFee: body.performanceFee,
    redemptionFrequency: body.redemptionFrequency,
    lockupEndDate: body.lockupEndDate ? new Date(body.lockupEndDate) : null,
    investmentDate: body.investmentDate ? new Date(body.investmentDate) : null,
    status: body.status || 'Active',
    currency: body.currency || 'USD',
    notes: body.notes
  }),
  buildUpdateData: (body) => ({
    fundName: body.fundName,
    manager: body.manager,
    fundType: body.fundType,
    strategy: body.strategy,
    investmentAmount: body.investmentAmount,
    currentValue: body.currentValue,
    ytdReturn: body.ytdReturn,
    managementFee: body.managementFee,
    performanceFee: body.performanceFee,
    redemptionFrequency: body.redemptionFrequency,
    lockupEndDate: body.lockupEndDate ? new Date(body.lockupEndDate) : undefined,
    investmentDate: body.investmentDate ? new Date(body.investmentDate) : undefined,
    status: body.status,
    currency: body.currency,
    notes: body.notes
  })
});

export default router;
