import { body, param } from 'express-validator';
import prisma from '../../lib/prisma.js';
import type { CreatePeFundRequest, UpdatePeFundRequest } from '../../types/index.js';
import { serializeDecimals } from '../../types/index.js';
import { createCrudRouter } from './crudFactory.js';
import { toDateOrNull } from './utils.js';

const serializePeFund = (fund: any) => serializeDecimals(fund);

const createValidators = [
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
];

const updateValidators = [
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
];

const router = createCrudRouter<CreatePeFundRequest, UpdatePeFundRequest>({
  resourceName: 'PE Fund',
  prismaModel: prisma.peFund,
  serialize: serializePeFund,
  createValidators,
  updateValidators,
  buildCreateData: (body) => ({
    fundName: body.fundName,
    manager: body.manager,
    fundType: body.fundType,
    vintageYear: body.vintageYear,
    commitment: body.commitment,
    calledCapital: body.calledCapital,
    nav: body.nav,
    distributions: body.distributions,
    commitmentDate: body.commitmentDate ? toDateOrNull(body.commitmentDate) : null,
    status: body.status || 'Active',
    notes: body.notes
  }),
  buildUpdateData: (body) => ({
    fundName: body.fundName,
    manager: body.manager,
    fundType: body.fundType,
    vintageYear: body.vintageYear,
    commitment: body.commitment,
    calledCapital: body.calledCapital,
    nav: body.nav,
    distributions: body.distributions,
    commitmentDate: body.commitmentDate ? toDateOrNull(body.commitmentDate) : undefined,
    status: body.status,
    notes: body.notes
  })
});

export default router;
