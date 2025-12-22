import type { Response } from 'express';

export interface ErrorPayload {
  error: string;
  details?: unknown;
}

export const sendValidationError = (res: Response, errors: unknown) =>
  res.status(400).json({ error: 'Validation failed', details: errors } satisfies ErrorPayload);

export const sendUnauthorized = (res: Response, message = 'Authentication required') =>
  res.status(401).json({ error: message } satisfies ErrorPayload);

export const sendForbidden = (res: Response, message = 'Forbidden') =>
  res.status(403).json({ error: message } satisfies ErrorPayload);

export const sendNotFound = (res: Response, message = 'Not found') =>
  res.status(404).json({ error: message } satisfies ErrorPayload);

export const sendServerError = (res: Response, message = 'Internal server error') =>
  res.status(500).json({ error: message } satisfies ErrorPayload);
