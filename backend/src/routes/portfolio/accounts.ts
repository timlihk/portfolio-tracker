import { Router } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import logger from '../../services/logger.js';
import { serializeDecimals, CreateAccountRequest, UpdateAccountRequest } from '../../types/index.js';
import { createCrudRouter } from './crudFactory.js';

const serializeAccount = (account: any) => serializeDecimals(account);

const createValidators = [
  body('name').notEmpty().isLength({ max: 255 }),
  body('institution').optional().isLength({ max: 255 }),
  body('accountType').optional().isLength({ max: 100 }),
  body('accountNumber').optional().isLength({ max: 20 })
];

const updateValidators = [
  param('id').isInt({ gt: 0 }),
  body('name').optional().notEmpty().isLength({ max: 255 }),
  body('institution').optional().isLength({ max: 255 }),
  body('accountType').optional().isLength({ max: 100 }),
  body('accountNumber').optional().isLength({ max: 20 })
];

const router = createCrudRouter<CreateAccountRequest, UpdateAccountRequest>({
  resourceName: 'Account',
  prismaModel: prisma.account,
  serialize: serializeAccount,
  createValidators,
  updateValidators,
  buildCreateData: (body) => ({
    name: body.name,
    institution: body.institution || null,
    accountType: body.accountType || null,
    accountNumber: body.accountNumber || null
  }),
  buildUpdateData: (body) => ({
    name: body.name,
    institution: body.institution || null,
    accountType: body.accountType || null,
    accountNumber: body.accountNumber || null
  })
});

export default router;
