import type { Request, Response } from 'express';

export interface PaginationParams {
  skip?: number;
  take?: number;
  page?: number;
  limit?: number;
  paginated: boolean;
}

export function getPaginationParams(req: Request): PaginationParams {
  const pageRaw = req.query.page as string | undefined;
  const limitRaw = req.query.limit as string | undefined;
  const page = pageRaw ? parseInt(pageRaw, 10) : undefined;
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  if (!page || !limit || Number.isNaN(page) || Number.isNaN(limit) || page < 1 || limit < 1) {
    return { paginated: false };
  }

  const safeLimit = Math.min(limit, 100);
  const skip = (page - 1) * safeLimit;
  return { skip, take: safeLimit, page, limit: safeLimit, paginated: true };
}

export function setPaginationHeaders(res: Response, total: number, page: number, limit: number): void {
  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Page', page.toString());
  res.setHeader('X-Limit', limit.toString());
}
