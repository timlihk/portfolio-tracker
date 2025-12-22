import express, { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import logger from '../../services/logger.js';
import type { AuthRequest, Account, CreateAccountRequest, UpdateAccountRequest } from '../../types/index.js';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';
import { sendNotFound, sendServerError, sendValidationError } from '../response.js';

const router = express.Router();
const normalizeAccountBody = (body: any) => ({
  name: body.name,
  institution: body.institution,
  accountType: body.accountType,
  accountNumber: body.accountNumber
});

// GET /accounts - List all accounts
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { skip, take, paginated, page, limit } = getPaginationParams(req);
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    if (paginated && page && limit) {
      const total = await prisma.account.count({ where: { userId: req.userId } });
      setPaginationHeaders(res, total, page, limit);
    }

    res.json(accounts);
  } catch (error) {
    logger.error('Error fetching accounts:', { error: (error as Error).message, userId: req.userId });
    sendServerError(res, 'Failed to fetch accounts');
  }
});

// POST /accounts - Create an account
router.post('/', requireAuth, [
  body('name').notEmpty().trim().isLength({ max: 255 }),
  body('institution').optional().isLength({ max: 255 }),
  body('accountType').optional().isLength({ max: 100 }),
  body('accountNumber').optional().isLength({ max: 20 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { name, institution, accountType, accountNumber } = normalizeAccountBody(req.body);

    const account = await prisma.account.create({
      data: {
        userId: req.userId!,
        name,
        institution,
        accountType,
        accountNumber
      }
    });

    res.status(201).json(account);
  } catch (error) {
    logger.error('Error creating account:', { error: (error as Error).message, userId: req.userId });
    sendServerError(res, 'Failed to create account');
  }
});

// PUT /accounts/:id - Update an account
router.put('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
  body('name').optional().notEmpty().trim().isLength({ max: 255 }),
  body('institution').optional().isLength({ max: 255 }),
  body('accountType').optional().isLength({ max: 100 }),
  body('accountNumber').optional().isLength({ max: 20 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;
    const { name, institution, accountType, accountNumber } = normalizeAccountBody(req.body);

    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingAccount) {
      return sendNotFound(res, 'Account not found');
    }

    const account = await prisma.account.update({
      where: { id: parseInt(id, 10) },
      data: {
        name,
        institution,
        accountType,
        accountNumber
      }
    });

    res.json(account);
  } catch (error) {
    logger.error('Error updating account:', { error: (error as Error).message, userId: req.userId, accountId: req.params.id });
    sendServerError(res, 'Failed to update account');
  }
});

// DELETE /accounts/:id - Delete an account
router.delete('/:id', requireAuth, [
  param('id').isInt({ gt: 0 }),
], async (req: AuthRequest, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { id } = req.params;

    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: req.userId
      }
    });

    if (!existingAccount) {
      return sendNotFound(res, 'Account not found');
    }

    await prisma.account.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Error deleting account:', { error: (error as Error).message, userId: req.userId, accountId: req.params.id });
    sendServerError(res, 'Failed to delete account');
  }
});

export default router;
