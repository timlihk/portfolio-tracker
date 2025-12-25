import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { sendValidationError } from '../response.js';

export const toNumberOrNull = (val: unknown): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

export const toDateOrNull = (val: unknown): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const handleValidationOrRespond = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendValidationError(res, errors.array());
    return false;
  }
  return true;
};
