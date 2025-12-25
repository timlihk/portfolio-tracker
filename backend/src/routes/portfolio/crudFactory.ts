import { Router, Response } from 'express';
import type { ValidationChain } from 'express-validator';
import { getPaginationParams, setPaginationHeaders } from './pagination.js';
import { requireAuth } from '../../middleware/auth.js';
import { sendNotFound, sendServerError, sendUnauthorized } from '../response.js';
import type { AuthRequest } from '../../types/index.js';
import { handleValidationOrRespond } from './utils.js';

type PrismaModel = {
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
  create: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any | null>;
  update: (args: any) => Promise<any>;
  deleteMany: (args: any) => Promise<{ count: number }>;
};

export interface CrudConfig<TCreate = any, TUpdate = any> {
  resourceName: string;
  prismaModel: PrismaModel;
  serialize: (item: any) => any;
  createValidators: ValidationChain[];
  updateValidators: ValidationChain[];
  buildCreateData: (body: TCreate, req: AuthRequest) => Record<string, unknown>;
  buildUpdateData: (body: TUpdate) => Record<string, unknown>;
  buildFilters?: (req: AuthRequest) => Record<string, unknown>;
}

export function createCrudRouter<TCreate, TUpdate>(config: CrudConfig<TCreate, TUpdate>): Router {
  const router = Router();

  // GET list
  router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { skip, take, paginated, page, limit } = getPaginationParams(req);
      const baseFilters = config.buildFilters ? config.buildFilters(req) : {};
      const where = { userId: req.userId, ...baseFilters };
      const items = await config.prismaModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      });
      if (paginated && page && limit) {
        const total = await config.prismaModel.count({ where });
        setPaginationHeaders(res, total, page, limit);
      }
      res.json(items.map(config.serialize));
    } catch (error) {
      sendServerError(res, `Failed to fetch ${config.resourceName}`);
    }
  });

  // POST create
  router.post('/', requireAuth, config.createValidators, async (req: AuthRequest, res: Response) => {
    try {
      if (!handleValidationOrRespond(req, res)) return;
      if (!req.userId) return sendUnauthorized(res);
      const data = config.buildCreateData(req.body as TCreate, req);
      const created = await config.prismaModel.create({
        data: { userId: req.userId, ...data }
      });
      res.status(201).json(config.serialize(created));
    } catch (error) {
      sendServerError(res, `Failed to create ${config.resourceName}`);
    }
  });

  // PUT update
  router.put('/:id', requireAuth, config.updateValidators, async (req: AuthRequest, res: Response) => {
    try {
      if (!handleValidationOrRespond(req, res)) return;
      if (!req.userId) return sendUnauthorized(res);
      const id = parseInt(req.params.id, 10);
      const existing = await config.prismaModel.findFirst({ where: { id, userId: req.userId } });
      if (!existing) return sendNotFound(res, `${config.resourceName} not found`);
      const data = config.buildUpdateData(req.body as TUpdate);
      const updated = await config.prismaModel.update({
        where: { id },
        data: { ...data, updatedAt: new Date() }
      });
      res.json(config.serialize(updated));
    } catch (error) {
      sendServerError(res, `Failed to update ${config.resourceName}`);
    }
  });

  // DELETE remove
  router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await config.prismaModel.deleteMany({
        where: { id, userId: req.userId }
      });
      if (deleted.count === 0) return sendNotFound(res, `${config.resourceName} not found`);
      res.json({ message: `${config.resourceName} deleted successfully` });
    } catch (error) {
      sendServerError(res, `Failed to delete ${config.resourceName}`);
    }
  });

  return router;
}
